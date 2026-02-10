import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Plus, X, Eye, Search, Calendar, Filter, Check, Building2, Upload, FileText, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import ProductCombobox from '../components/ProductCombobox';
import VendorCombobox from '../components/VendorCombobox';
import Portal from '../components/Portal';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Initialize PDF.js worker safely
try {
    if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
    }
} catch (e) {
    console.error('Failed to initialize PDF.js worker:', e);
}

const API_BASE = 'http://localhost:3001/api';

// Format datetime with time
const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString('th-TH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const PurchaseOrdersPage = () => {
    const { purchaseOrders, products, vendors, refreshData } = useData();
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [poItems, setPoItems] = useState([{ ProductID: null, ItemName: '', QtyOrdered: 1, UnitCost: 0 }]);
    const [selectedVendor, setSelectedVendor] = useState({ VendorID: null, VendorName: '' });

    // OCR State
    const [activeTab, setActiveTab] = useState('manual');
    const [ocrFile, setOcrFile] = useState(null);
    const [ocrLoading, setOcrLoading] = useState(false);
    const [ocrProgress, setOcrProgress] = useState({ step: '', percent: 0 });
    const [ocrDebugText, setOcrDebugText] = useState('');
    const [extractedFormData, setExtractedFormData] = useState(null); // Store extracted data for form filling

    // ... (existing code) ...

    // Effect to populate form when switching to manual tab with extracted data
    useEffect(() => {
        if (activeTab === 'manual' && extractedFormData) {
            // Wait for DOM to render (Increased timeout)
            setTimeout(() => {
                const setVal = (name, val) => {
                    if (!val) return;
                    // Try querySelector
                    let el = document.querySelector(`input[name="${name}"]`);
                    // Fallback to getElementsByName
                    if (!el) el = document.getElementsByName(name)[0];

                    if (el) {
                        el.value = val;
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                    } else {
                        console.warn(`Could not find input for ${name}`);
                    }
                };

                console.log('Auto-filling form with:', extractedFormData);

                if (extractedFormData.poNum) setVal('PO_ID', extractedFormData.poNum);

                // Use Ref for Section to be 100% sure
                if (extractedFormData.section && sectionRef.current) {
                    console.log('Setting Section via Ref:', extractedFormData.section);
                    sectionRef.current.value = extractedFormData.section;
                    sectionRef.current.dispatchEvent(new Event('input', { bubbles: true }));
                } else if (extractedFormData.section) {
                    setVal('Section', extractedFormData.section);
                }

                if (extractedFormData.prNum) setVal('PR_No', extractedFormData.prNum);
                if (extractedFormData.bgNum) setVal('BudgetNo', extractedFormData.bgNum);
                if (extractedFormData.dueDate) setVal('DueDate', extractedFormData.dueDate);

                setExtractedFormData(null);
            }, 300);
        }
    }, [activeTab, extractedFormData]);

    // ... (existing code) ...

    const handleOCRExtract = async () => {
        if (!ocrFile) return;
        setOcrLoading(true);
        setOcrProgress({ step: 'Initializing...', percent: 0 });
        setOcrDebugText('');

        try {
            // ... (image conversion logic remains same) ...
            let imgSource;
            if (ocrFile.type === 'application/pdf') {
                setOcrProgress({ step: 'Rendering PDF...', percent: 10 });
                imgSource = await pdfToImage(ocrFile);
            } else {
                imgSource = await fileToDataUrl(ocrFile);
            }

            setOcrProgress({ step: 'Loading OCR engine...', percent: 25 });
            const worker = await Tesseract.createWorker('eng', 1, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        setOcrProgress({ step: 'Recognizing text...', percent: 30 + (m.progress * 60) });
                    }
                }
            });

            const { data: { text } } = await worker.recognize(imgSource);
            setOcrDebugText(text);

            setOcrProgress({ step: 'Parsing data...', percent: 95 });

            // Parse and set state
            console.log('OCR Raw Text:', text);
            const result = parseDaikinPO(text);
            console.log('OCR Parsed Result:', result);

            if (result.vendorName) {
                const foundVendor = vendors.find(v => v.VendorName.toLowerCase().includes(result.vendorName.toLowerCase()));
                setSelectedVendor({
                    VendorID: foundVendor?.VendorID || null,
                    VendorName: result.vendorName
                });
            }

            if (result.items.length > 0) {
                // Try to auto-link items with Master Products
                const linkedItems = result.items.map(item => {
                    const found = products.find(p =>
                        p.ProductName.toLowerCase().trim() === item.ItemName.toLowerCase().trim()
                    );
                    if (found) {
                        return {
                            ...item,
                            ProductID: found.ProductID,
                            ItemName: found.ProductName, // Standardize name to Master
                            UnitCost: item.UnitCost || found.UnitCost || 0 // Prefer PO cost, fallback to Master
                        };
                    }
                    return item;
                });
                setPoItems(linkedItems);
            }

            // Store form data for the Effect to pick up
            setExtractedFormData({
                poNum: result.poNum,
                prNum: result.prNum,
                bgNum: result.bgNum,
                section: result.section, // Added Section
                dueDate: result.firstDueDate
            });

            setOcrProgress({ step: 'Complete!', percent: 100 });
            await worker.terminate();

            // Switch to manual tab
            setTimeout(() => {
                setActiveTab('manual');
                setOcrLoading(false);
            }, 500);

        } catch (err) {
            console.error(err);
            setOcrDebugText(`Error: ${err.message}`);
            setOcrLoading(false);
        }
    };

    // ... (helper functions) ...

    const parseDaikinPO = (text) => {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        const findWithRegex = (regex) => {
            const match = text.match(regex);
            return match ? match[1].trim() : "";
        };

        // 1. PO Number
        const poNum = findWithRegex(/[Pp][Oo]\s*[:\s]*\s*([A-Z0-9]+)/);

        // 2. Vendor Name
        let vendorName = "";
        const supplierLineIndex = lines.findIndex(l => l.toUpperCase().includes('SUPPLIER'));
        if (supplierLineIndex !== -1 && lines[supplierLineIndex + 1]) {
            let vendorLine = lines[supplierLineIndex + 1];
            vendorName = vendorLine.split(/Issue Date|Print Date|PO:/i)[0].trim();
        }

        // 3. PR and BG
        let prNum = "";
        let bgNum = "";
        const itemRegex = /(\d+)\s+(.+?)\s+(\d{2}[/.-]\d{2}[/.-]\d{2,4})\s+([\d,.]+)\s+(\w+)\s+([\d,.]+)\s+([\d,.]+)$/;

        let lastItemIndex = -1;
        const newItems = [];
        let firstDueDate = "";

        lines.forEach((line, index) => {
            const match = line.match(itemRegex);
            if (match) {
                // Convert DD/MM/YYYY to YYYY-MM-DD for firstDueDate
                if (!firstDueDate && match[3]) {
                    const parts = match[3].split(/[/.-]/);
                    if (parts.length === 3) {
                        const y = parts[2].length === 2 ? '20' + parts[2] : parts[2];
                        firstDueDate = `${y}-${parts[1]}-${parts[0]}`;
                    }
                }

                // Fix Qty Parsing: Remove commas, then parse float, then round to integer
                const qtyRaw = match[4].replace(/,/g, '');
                const qty = Math.round(parseFloat(qtyRaw)) || 1;

                // Fix Price Parsing: Remove commas, keep decimals
                const priceRaw = match[6].replace(/,/g, '');
                const price = parseFloat(priceRaw) || 0;

                newItems.push({
                    ProductID: null,
                    ItemName: match[2].trim(),
                    QtyOrdered: qty,
                    UnitCost: price
                });
                lastItemIndex = index;
            }
        });

        if (lastItemIndex !== -1) {
            for (let i = 1; i <= 10; i++) {
                const searchLine = lines[lastItemIndex + i] || "";
                if (!prNum) {
                    const prMatch = searchLine.match(/PR\s*[:\s]*\s*([A-Z0-9]+)/i);
                    if (prMatch) prNum = prMatch[1];
                }
                if (!bgNum) {
                    const bgMatch = searchLine.match(/B\/G\s?NO\s*[:\s]*\s*([A-Z0-9]+)/i);
                    if (bgMatch) bgNum = bgMatch[1];
                }
            }
        } // Close if (lastItemIndex !== -1)

        // 4. Section (Who)
        let section = "";

        // Find line starting with "Who:" or "Who " (case insensitive)
        const whoIndex = lines.findIndex(l => l.match(/^[Ww]ho\s*[:]/i));

        if (whoIndex !== -1) {
            // Check current line for value
            const line = lines[whoIndex];
            const match = line.match(/^[Ww]ho\s*[:]\s*(.+)/i);
            if (match && match[1].trim().length > 1) {
                section = match[1].trim();
            } else if (lines[whoIndex + 1]) {
                // If value empty, take next line
                section = lines[whoIndex + 1];
            }
        }

        console.log('Parsed Section (Strict Who):', section);

        return { poNum, vendorName, prNum, bgNum, section, firstDueDate, items: newItems };
    };

    const [searchTerm, setSearchTerm] = useState('');
    const sectionRef = useRef(null);

    // Default to current month (YYYY-MM format)
    const getCurrentMonth = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    };
    const [filterMonth, setFilterMonth] = useState(getCurrentMonth());
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedPO, setSelectedPO] = useState(null); // For detail modal
    const [resultModal, setResultModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });



    const generatePONumber = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `PO-${year}${month}-${rand}`;
    };

    const addItem = () => {
        setPoItems([...poItems, { ProductID: null, ItemName: '', QtyOrdered: 1, UnitCost: 0 }]);
    };

    const removeItem = (index) => {
        setPoItems(poItems.filter((_, i) => i !== index));
    };

    const updateItem = (index, field, value) => {
        const updated = [...poItems];
        updated[index][field] = value;
        setPoItems(updated);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);

        // Validation - Require PO, Vendor, Budget, and PR No
        if (!fd.get('PO_ID') || !selectedVendor.VendorName || !fd.get('BudgetNo') || !fd.get('PR_No')) {
            setResultModal({
                isOpen: true,
                type: 'error',
                title: 'ข้อมูลไม่ครบถ้วน',
                message: 'กรุณาระบุ PO Number, PR No, Vendor และ Budget No. ให้ครบถ้วน'
            });
            return;
        }

        const payload = {
            PO_ID: fd.get('PO_ID'),
            PR_No: fd.get('PR_No'),
            VendorName: selectedVendor.VendorName,
            DueDate: fd.get('DueDate'),
            RequestedBy: user.username,
            Section: fd.get('Section'),
            BudgetNo: fd.get('BudgetNo'),
            Remark: fd.get('Remark'),
            Items: poItems.filter(i => i.ItemName.trim() !== '')
        };

        console.log('[DEBUG Frontend] handleSubmit payload:', payload);
        console.log('[DEBUG Frontend] BudgetNo value:', payload.BudgetNo);

        try {
            const res = await fetch(`${API_BASE}/pos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setIsModalOpen(false);
                setPoItems([{ ProductID: null, ItemName: '', QtyOrdered: 1, UnitCost: 0 }]);
                setSelectedVendor({ VendorID: null, VendorName: '' });
                refreshData();
                setResultModal({
                    isOpen: true,
                    type: 'success',
                    title: 'สร้าง PO สำเร็จ',
                    message: `Purchase Order ${payload.PO_ID} ถูกสร้างเรียบร้อยแล้ว`
                });

            } else {
                const data = await res.json();
                setResultModal({
                    isOpen: true,
                    type: 'error',
                    title: 'สร้าง PO ไม่สำเร็จ',
                    message: data.details || 'Unknown error'
                });
            }
        } catch (err) {
            setResultModal({
                isOpen: true,
                type: 'error',
                title: 'ข้อผิดพลาด',
                message: err.message
            });
        }
    };

    const pdfToImage = async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const scale = 2.8;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        return canvas.toDataURL('image/png');
    };

    const fileToDataUrl = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    };


    const getTotalAmount = () => {
        return poItems.reduce((sum, item) => sum + (item.QtyOrdered * item.UnitCost), 0);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'Partial': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'Cancelled': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-blue-100 text-blue-700 border-blue-200'; // Pending/Open
        }
    };

    // Filter POs
    const filteredPOs = purchaseOrders.filter(po => {
        const matchSearch = po.PO_ID.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (po.VendorName && po.VendorName.toLowerCase().includes(searchTerm.toLowerCase()));
        // Month filter: check if RequestDate starts with YYYY-MM
        const matchMonth = !filterMonth || (po.RequestDate && po.RequestDate.startsWith(filterMonth));
        const matchStatus = filterStatus === 'all' || po.Status === filterStatus ||
            (filterStatus === 'Pending' && (po.Status === 'Pending' || po.Status === 'Open'));
        return matchSearch && matchMonth && matchStatus;
    });

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-slate-800">Purchase Orders</h2>
                {user?.role === 'Staff' && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3 rounded-xl transition-all shadow-lg shadow-indigo-200"
                    >
                        <Plus size={18} /> Create New PO
                    </button>
                )}
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-5 rounded-2xl text-white shadow-lg">
                    <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1">Total POs</p>
                    <h3 className="text-3xl font-black">{purchaseOrders.length}</h3>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition-all" onClick={() => setFilterStatus('Pending')}>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Pending</p>
                    <h3 className="text-2xl font-black text-blue-500">{purchaseOrders.filter(p => p.Status === 'Open' || p.Status === 'Pending').length}</h3>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition-all" onClick={() => setFilterStatus('Partial')}>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">รอรับของ</p>
                    <h3 className="text-2xl font-black text-amber-500">{purchaseOrders.filter(p => p.Status === 'Partial').length}</h3>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition-all" onClick={() => setFilterStatus('Completed')}>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Completed</p>
                    <h3 className="text-2xl font-black text-emerald-500">{purchaseOrders.filter(p => p.Status === 'Completed').length}</h3>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition-all" onClick={() => setFilterStatus('Cancelled')}>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Cancelled</p>
                    <h3 className="text-2xl font-black text-red-500">{purchaseOrders.filter(p => p.Status === 'Cancelled').length}</h3>
                </div>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="flex gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                    <Search size={18} className="text-slate-400 self-center" />
                    <input
                        type="text"
                        placeholder="ค้นหา PO / ผู้ขาย..."
                        className="bg-transparent border-none outline-none text-sm w-40 text-slate-700 placeholder-slate-400"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                    <Calendar size={18} className="text-slate-400 self-center" />
                    <input
                        type="month"
                        className="bg-transparent border-none outline-none text-sm text-slate-700"
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm">
                    <Filter size={18} className="text-slate-400 self-center" />
                    <select
                        className="bg-transparent border-none outline-none text-sm text-slate-700"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">ทุกสถานะ</option>
                        <option value="Pending">Pending</option>
                        <option value="Partial">Partial (รอรับ)</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>
                </div>
                {(searchTerm || filterMonth !== getCurrentMonth() || filterStatus !== 'all') && (
                    <button
                        onClick={() => { setSearchTerm(''); setFilterMonth(getCurrentMonth()); setFilterStatus('all'); }}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                        ล้างตัวกรอง
                    </button>
                )}
            </div>

            {/* PO List - Compact Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredPOs.map((po, i) => (
                    <motion.div
                        key={po.PO_ID}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm hover:shadow-lg transition-all cursor-pointer"
                        onClick={() => setSelectedPO(po)}
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                    <ShoppingCart size={18} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-slate-800 text-sm truncate">{po.PO_ID}</h4>
                                    <p className="text-[10px] text-slate-400 truncate">{po.VendorName || '-'}</p>
                                    {po.BudgetNo && (
                                        <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 mt-0.5 inline-block truncate max-w-full">
                                            Budget: {po.BudgetNo}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <span className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(po.Status)}`}>
                                {po.Status === 'Open' ? 'Pending' : po.Status}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-100">
                            <span>{formatDateTime(po.RequestDate)}</span>
                            <button className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium">
                                <Eye size={14} /> ดูรายละเอียด
                            </button>
                        </div>
                    </motion.div>
                ))}
                {filteredPOs.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                        <ShoppingCart size={40} className="text-slate-300 mb-3" />
                        <p className="text-slate-500 font-bold">ไม่พบ PO</p>
                        <p className="text-slate-400 text-sm">ลองเปลี่ยนตัวกรอง หรือสร้าง PO ใหม่</p>
                    </div>
                )}
            </div>

            {/* DETAIL MODAL */}
            <AnimatePresence>
                {selectedPO && (
                    <Portal>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
                            >
                                {/* Header */}
                                <div className="p-6 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-black text-2xl">{selectedPO.PO_ID}</h3>
                                            <p className="text-indigo-200">{selectedPO.VendorName || 'ไม่ระบุผู้ขาย'}</p>
                                        </div>
                                        <button onClick={() => setSelectedPO(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                                    {/* Status & Date */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 p-4 rounded-xl">
                                            <p className="text-xs text-slate-500 font-bold mb-1">สถานะ</p>
                                            <span className={`text-sm font-bold px-3 py-1 rounded-full border ${getStatusColor(selectedPO.Status)}`}>
                                                {selectedPO.Status === 'Open' ? 'Pending' : selectedPO.Status}
                                            </span>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-xl">
                                            <p className="text-xs text-slate-500 font-bold mb-1">วันที่สร้าง</p>
                                            <p className="text-sm font-bold text-slate-800">{formatDateTime(selectedPO.RequestDate)}</p>
                                        </div>
                                    </div>

                                    {/* Info Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 p-4 rounded-xl">
                                            <p className="text-xs text-slate-500 font-bold mb-1">ผู้ขอ</p>
                                            <p className="text-sm font-bold text-slate-800">{selectedPO.RequestedBy || '-'}</p>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-xl">
                                            <p className="text-xs text-slate-500 font-bold mb-1">แผนก</p>
                                            <p className="text-sm font-bold text-slate-800">{selectedPO.Section || '-'}</p>
                                        </div>
                                        {selectedPO.DueDate && (
                                            <div className="bg-slate-50 p-4 rounded-xl">
                                                <p className="text-xs text-slate-500 font-bold mb-1">กำหนดส่ง</p>
                                                <p className="text-sm font-bold text-slate-800">{formatDateTime(selectedPO.DueDate)}</p>
                                            </div>
                                        )}
                                        {selectedPO.PR_No && (
                                            <div className="bg-slate-50 p-4 rounded-xl">
                                                <p className="text-xs text-slate-500 font-bold mb-1">PR No</p>
                                                <p className="text-sm font-bold text-slate-800">{selectedPO.PR_No}</p>
                                            </div>
                                        )}
                                        {selectedPO.BudgetNo && (
                                            <div className="bg-slate-50 p-4 rounded-xl">
                                                <p className="text-xs text-slate-500 font-bold mb-1">Budget No.</p>
                                                <p className="text-sm font-bold text-slate-800">{selectedPO.BudgetNo}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Items List */}
                                    <div>
                                        <h4 className="font-bold text-slate-800 mb-3">รายการสินค้า ({selectedPO.Items?.length || 0})</h4>
                                        <div className="bg-slate-50 rounded-xl overflow-hidden overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-100">
                                                    <tr>
                                                        <th className="text-left p-3 font-bold text-slate-600">รายการ</th>
                                                        <th className="text-center p-3 font-bold text-slate-600 w-24">จำนวน</th>
                                                        <th className="text-center p-3 font-bold text-slate-600 w-28">สถานะ</th>
                                                        <th className="text-right p-3 font-bold text-slate-600 w-28">ราคา/หน่วย</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedPO.Items?.map((item, idx) => {
                                                        const isFullyReceived = (item.QtyReceived || 0) >= item.QtyOrdered;
                                                        return (
                                                            <tr key={idx} className={`border-t ${isFullyReceived ? 'bg-emerald-50/60' : 'border-slate-200'}`}>
                                                                <td className={`p-3 ${isFullyReceived ? 'text-emerald-700 line-through' : 'text-slate-700'}`}>
                                                                    {item.ItemName || item.ProductName || `Item #${idx + 1}`}
                                                                </td>
                                                                <td className="p-3 text-center font-mono">
                                                                    <span className="text-slate-600 font-bold">{item.QtyReceived || 0}</span>
                                                                    <span className="text-slate-400"> / {item.QtyOrdered}</span>
                                                                </td>
                                                                <td className="p-3 text-center">
                                                                    {isFullyReceived ? (
                                                                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-bold border border-emerald-200">
                                                                            <Check size={12} /> รับครบแล้ว
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                                                            รอรับ
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="p-3 text-right font-mono text-slate-600">฿{(item.UnitCost || 0).toLocaleString()}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Remark */}
                                    {selectedPO.Remark && (
                                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                                            <p className="text-xs text-amber-600 font-bold mb-1">หมายเหตุ</p>
                                            <p className="text-sm text-amber-800">{selectedPO.Remark}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="p-4 bg-slate-50 border-t border-slate-200">
                                    <button
                                        onClick={() => setSelectedPO(null)}
                                        className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-700 transition-all"
                                    >
                                        ปิด
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    </Portal>
                )}
            </AnimatePresence>

            {/* CREATE PO MODAL */}
            {isModalOpen && (
                <Portal>
                    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm">
                        <div className="flex min-h-screen items-center justify-center p-4">
                            <div className="w-full max-w-2xl transform overflow-hidden rounded-3xl bg-white text-left align-middle shadow-2xl transition-all animate-in zoom-in-95 my-8">
                                <div className="bg-slate-50 rounded-t-3xl border-b border-slate-200">
                                    <div className="p-6 flex justify-between items-center">
                                        <h3 className="font-bold text-lg text-slate-800">Create Purchase Order</h3>
                                        <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                                    </div>

                                    {/* Tabs */}
                                    <div className="flex px-6 gap-4">
                                        <button
                                            onClick={() => setActiveTab('manual')}
                                            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'manual' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                        >
                                            <span className="flex items-center gap-2"><FileText size={16} /> กรอกข้อมูลเอง</span>
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('scan')}
                                            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'scan' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                        >
                                            <span className="flex items-center gap-2"><Upload size={16} /> สแกนเอกสาร (OCR)</span>
                                        </button>
                                    </div>
                                </div>

                                {activeTab === 'scan' ? (
                                    <div className="p-8 min-h-[400px]">
                                        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:bg-slate-50 transition-colors relative group">
                                            <input
                                                type="file"
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                accept="application/pdf,image/*"
                                                onChange={(e) => setOcrFile(e.target.files[0])}
                                            />
                                            <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                                <Upload size={32} />
                                            </div>
                                            <h4 className="font-bold text-slate-700 mb-1">
                                                {ocrFile ? ocrFile.name : 'Click or Drag file here'}
                                            </h4>
                                            <p className="text-xs text-slate-400">Support PDF, JPG, PNG from Daikin System</p>
                                        </div>

                                        {ocrLoading && (
                                            <div className="mt-8 space-y-2">
                                                <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                                                    <span>{ocrProgress.step}</span>
                                                    <span>{Math.round(ocrProgress.percent)}%</span>
                                                </div>
                                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-indigo-600 transition-all duration-300 ease-out"
                                                        style={{ width: `${ocrProgress.percent}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="mt-8 flex gap-3">
                                            <button
                                                onClick={handleOCRExtract}
                                                disabled={!ocrFile || ocrLoading}
                                                className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                            >
                                                {ocrLoading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                                                Start Extraction
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setOcrFile(null);
                                                    setOcrDebugText('');
                                                }}
                                                className="px-4 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200"
                                            >
                                                <RefreshCw size={20} />
                                            </button>
                                        </div>

                                        {ocrDebugText && (
                                            <div className="mt-6 p-4 bg-slate-900 rounded-xl overflow-hidden">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">OCR Debug Output</p>
                                                <div className="h-32 overflow-y-auto text-[10px] font-mono text-emerald-400 whitespace-pre-wrap scrollbar-thin scrollbar-thumb-slate-700">
                                                    {ocrDebugText}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block tracking-wider">PO Number</label>
                                                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block tracking-wider">PO Number</label>
                                                <input name="PO_ID" defaultValue={extractedFormData?.poNum || generatePONumber()} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-indigo-500 font-mono" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block tracking-wider">Vendor Name</label>
                                                <VendorCombobox
                                                    vendors={vendors}
                                                    value={selectedVendor}
                                                    onChange={(v) => {
                                                        console.log('Selected Vendor:', v);
                                                        setSelectedVendor(v);
                                                    }}
                                                />

                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block tracking-wider">Section</label>
                                                <input
                                                    name="Section"
                                                    defaultValue={extractedFormData?.section || ''}
                                                    ref={sectionRef}
                                                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block tracking-wider">Budget No.</label>
                                                <input name="BudgetNo" defaultValue={extractedFormData?.bgNum || ''} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-indigo-500" placeholder="ระบุเลขงบประมาณ" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block tracking-wider">PR No.</label>
                                                <input name="PR_No" defaultValue={extractedFormData?.prNum || ''} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-indigo-500" placeholder="ระบุเลข PR" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block tracking-wider">Due Date</label>
                                                <input name="DueDate" type="date" defaultValue={extractedFormData?.dueDate || ''} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-indigo-500" />
                                            </div>
                                        </div>


                                        <div>
                                            <div className="flex justify-between items-center mb-3">
                                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Order Items</label>
                                                <button type="button" onClick={addItem} className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-sm font-bold">
                                                    <Plus size={16} /> เพิ่มรายการ
                                                </button>
                                            </div>
                                            {/* Header Row */}
                                            <div className="flex gap-2 items-center px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                <div className="flex-1">ชื่อสินค้า</div>
                                                <div className="w-16 text-center">จำนวน</div>
                                                <div className="w-24 text-right">ราคา/หน่วย</div>
                                                <div className="w-6"></div>
                                            </div>
                                            <div className="space-y-2 relative z-[100]">
                                                {poItems.map((item, index) => (
                                                    <div key={index} className="flex gap-2 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                                                        <div className="flex-1">
                                                            <ProductCombobox
                                                                products={products}
                                                                value={{ ProductID: item.ProductID, ItemName: item.ItemName }}
                                                                onChange={({ ProductID, ItemName, LastPrice }) => {
                                                                    const updated = [...poItems];
                                                                    updated[index].ProductID = ProductID;
                                                                    updated[index].ItemName = ItemName;
                                                                    // Auto-fill price from master (only if coming from master)
                                                                    if (ProductID && LastPrice !== undefined) {
                                                                        updated[index].UnitCost = LastPrice;
                                                                    }
                                                                    setPoItems(updated);
                                                                }}
                                                            />
                                                            {/* New Item Warning */}
                                                            {item.ItemName && !item.ProductID && (
                                                                <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded-md border border-amber-100 animate-in fade-in slide-in-from-top-1">
                                                                    <AlertTriangle size={12} />
                                                                    <span>สินค้าใหม่ (ไม่อยู่ในระบบ)</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={item.QtyOrdered}
                                                            onChange={(e) => updateItem(index, 'QtyOrdered', parseInt(e.target.value) || 1)}
                                                            className="w-16 bg-white border border-slate-200 p-2 rounded-lg text-sm text-center outline-none focus:border-indigo-500"
                                                        />
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            placeholder="ราคา"
                                                            value={item.UnitCost}
                                                            onChange={(e) => updateItem(index, 'UnitCost', parseFloat(e.target.value) || 0)}
                                                            className="w-24 bg-white border border-slate-200 p-2 rounded-lg text-sm text-right outline-none focus:border-indigo-500"
                                                        />
                                                        {poItems.length > 1 && (
                                                            <button type="button" onClick={() => removeItem(index)} className="text-red-400 hover:text-red-600 p-1">
                                                                <X size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-right text-sm font-bold text-slate-600 mt-2">ยอดรวม: ฿{getTotalAmount().toLocaleString()}</p>
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block tracking-wider">Remark</label>
                                            <textarea name="Remark" rows="2" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-indigo-500 resize-none"></textarea>
                                        </div>

                                        <div className="flex gap-3 pt-4">
                                            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all">
                                                Cancel
                                            </button>
                                            <button type="submit" className="flex-[2] bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
                                                Create PO
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </Portal>
            )}
            {/* RESULT MODAL */}
            <AnimatePresence>
                {resultModal.isOpen && (
                    <Portal>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[80] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="bg-white rounded-3xl p-8 text-center max-w-sm w-full shadow-2xl"
                            >
                                <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${resultModal.type === 'success' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                                    {resultModal.type === 'success' ? (
                                        <Check size={32} className="text-emerald-600" />
                                    ) : (
                                        <X size={32} className="text-red-600" />
                                    )}
                                </div>
                                <h3 className="font-black text-xl text-slate-800 mb-2">{resultModal.title}</h3>
                                <p className="text-slate-500 mb-6">{resultModal.message}</p>
                                <button
                                    onClick={() => setResultModal({ ...resultModal, isOpen: false })}
                                    className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-all"
                                >
                                    ปิด
                                </button>
                            </motion.div>
                        </motion.div>
                    </Portal>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PurchaseOrdersPage;
