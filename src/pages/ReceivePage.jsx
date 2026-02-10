import React, { useState, useEffect } from 'react';
import { FileText, Search, Calendar, Eye, X, Package, Check, ArrowDownCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import Portal from '../components/Portal';

const API_BASE = 'http://localhost:3001/api';

import { formatThaiDate } from '../utils/formatDate';

const ReceivePage = () => {
    const { purchaseOrders, invoices, products, refreshData } = useData();
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activePo, setActivePo] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    // Default to current month (YYYY-MM format)
    const getCurrentMonth = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    };
    const [filterMonth, setFilterMonth] = useState(getCurrentMonth());
    const [selectedPO, setSelectedPO] = useState(null); // For detail view
    const [resultModal, setResultModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });

    // Selection state for Receive Modal
    const [selectedItems, setSelectedItems] = useState({});

    // Initialize selection when opening modal
    useEffect(() => {
        if (isModalOpen && activePo) {
            const initial = {};
            activePo.Items.forEach((item, idx) => {
                const remaining = item.QtyOrdered - (item.QtyReceived || 0);
                if (remaining > 0) {
                    initial[idx] = true; // Default to selected if not fully received
                }
            });
            setSelectedItems(initial);
        }
    }, [isModalOpen, activePo]);

    const toggleSelection = (idx) => {
        setSelectedItems(prev => ({
            ...prev,
            [idx]: !prev[idx]
        }));
    };

    const handleReceive = async (poId, invoiceNo, itemsReceived) => {
        if (!itemsReceived || itemsReceived.length === 0) {
            setResultModal({ isOpen: true, type: 'error', title: 'ข้อผิดพลาด', message: 'กรุณาเลือกรายการที่ต้องการรับอย่างน้อย 1 รายการ' });
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/receive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    PO_ID: poId,
                    InvoiceNo: invoiceNo,
                    ItemsReceived: itemsReceived,
                    UserID: user.username
                })
            });
            if (res.ok) {
                setIsModalOpen(false);
                refreshData();
                setResultModal({ isOpen: true, type: 'success', title: 'รับของสำเร็จ', message: `บันทึก Invoice ${invoiceNo} เรียบร้อยแล้ว` });
            } else {
                const err = await res.json();
                setResultModal({ isOpen: true, type: 'error', title: 'เกิดข้อผิดพลาด', message: err.details || 'ไม่สามารถบันทึกได้' });
            }
        } catch (err) {
            setResultModal({ isOpen: true, type: 'error', title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้' });
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'Partial': return 'bg-amber-100 text-amber-700 border-amber-200';
            default: return 'bg-blue-100 text-blue-700 border-blue-200';
        }
    };

    const pendingPOs = purchaseOrders
        .filter(po => po.Status !== 'Completed')
        .filter(po => {
            const matchSearch = po.PO_ID.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (po.VendorName && po.VendorName.toLowerCase().includes(searchTerm.toLowerCase()));

            // Month filter: check if RequestDate starts with YYYY-MM
            // Debugging
            // console.log(`[DEBUG Date Filter] Filter: ${filterMonth} | PO Date: ${po.RequestDate} | Match: ${!filterMonth || (po.RequestDate && po.RequestDate.startsWith(filterMonth))}`);

            // Month filter: check if RequestDate starts with YYYY-MM
            const reqDate = po.RequestDate ? new Date(po.RequestDate).toISOString().slice(0, 7) : '';
            const matchMonth = !filterMonth || reqDate === filterMonth;

            return matchSearch && matchMonth;

        });

    // Filter Invoices
    const filteredInvoices = (Array.isArray(invoices) ? invoices : [])
        .filter(inv => {
            const matchSearch = (inv.InvoiceNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (inv.PO_ID || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (inv.BudgetNo || '').toLowerCase().includes(searchTerm.toLowerCase());

            // Month filter: check if ReceiveDate starts with YYYY-MM
            const recvDate = inv.ReceiveDate ? new Date(inv.ReceiveDate).toISOString().slice(0, 7) : '';
            const matchMonth = !filterMonth || recvDate === filterMonth;

            return matchSearch && matchMonth;
        });

    return (
        <div className="space-y-8 animate-in fade-in">
            <div>
                <h2 className="text-3xl font-black mb-4 text-slate-800">Pending Purchase Orders</h2>

                {/* Filter Controls */}
                <div className="flex flex-wrap gap-3 items-center mb-6">
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
                    {(searchTerm || filterMonth !== getCurrentMonth()) && (
                        <button
                            onClick={() => { setSearchTerm(''); setFilterMonth(getCurrentMonth()); }}
                            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                            ล้างตัวกรอง
                        </button>
                    )}
                </div>

                {/* Compact PO Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {pendingPOs.map((po, i) => (
                        <motion.div
                            key={po.PO_ID}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm hover:shadow-lg transition-all"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                                        <Package size={18} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="font-bold text-slate-800 text-sm truncate">{po.PO_ID}</h4>
                                        <p className="text-[10px] text-slate-400 truncate">{po.VendorName || '-'}</p>
                                        <div className="flex flex-wrap gap-1 mt-0.5">
                                            {po.BudgetNo && (
                                                <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 inline-block truncate max-w-full">
                                                    Budget: {po.BudgetNo}
                                                </span>
                                            )}
                                            {po.PR_No && (
                                                <span className="text-[9px] bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded border border-indigo-100 inline-block truncate max-w-full">
                                                    PR: {po.PR_No}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <span className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(po.Status)}`}>
                                    {po.Status === 'Open' ? 'Pending' : po.Status}
                                </span>
                            </div>
                            <div className="text-xs text-slate-500 mb-3">
                                <span>{formatDateTime(po.RequestDate)}</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSelectedPO(po)}
                                    className="flex-1 bg-slate-100 text-slate-600 font-bold py-2 rounded-lg text-xs hover:bg-slate-200 transition-all flex items-center justify-center gap-1"
                                >
                                    <Eye size={14} /> ดูรายละเอียด
                                </button>
                                {user?.role === 'Staff' && (
                                    <button
                                        onClick={() => { setActivePo(po); setIsModalOpen(true); }}
                                        className="flex-1 bg-emerald-600 text-white font-bold py-2 rounded-lg text-xs hover:bg-emerald-700 transition-all flex items-center justify-center gap-1"
                                    >
                                        <Check size={14} /> รับของ
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ))}
                    {pendingPOs.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-emerald-200 rounded-2xl bg-emerald-50/30">
                            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mb-3 text-emerald-600">
                                <FileText size={28} />
                            </div>
                            <p className="text-emerald-800 font-bold">All caught up!</p>
                            <p className="text-emerald-600 text-sm">ไม่มี PO รอรับของ</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Invoice History Section */}
            <div className="border-t border-slate-200 pt-8">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-700">
                    <FileText className="text-slate-400" /> Invoice History
                </h2>
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
                            <tr>
                                <th className="p-4">Invoice No</th>
                                <th className="p-4">PO Ref</th>
                                <th className="p-4">Budget No</th>
                                <th className="p-4">Date & Time</th>
                                <th className="p-4">Received By</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInvoices.map((inv, i) => (
                                <tr
                                    key={inv.InvoiceID || i}
                                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                                >
                                    <td className="p-4 font-mono font-bold text-slate-700">{inv.InvoiceNo}</td>
                                    <td className="p-4 text-indigo-600 font-bold">{inv.PO_ID}</td>
                                    <td className="p-4 text-slate-500">{inv.BudgetNo || '-'}</td>
                                    <td className="p-4 text-slate-500">{formatThaiDate(inv.ReceiveDate)}</td>
                                    <td className="p-4 text-slate-600">{inv.ReceivedBy}</td>
                                </tr>
                            ))}
                            {filteredInvoices.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-slate-400">No invoices recorded yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
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
                                <div className="p-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-black text-2xl">{selectedPO.PO_ID}</h3>
                                            <p className="text-amber-100">{selectedPO.VendorName || 'ไม่ระบุผู้ขาย'}</p>
                                        </div>
                                        <button onClick={() => setSelectedPO(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                                    {/* Info */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 p-4 rounded-xl">
                                            <p className="text-xs text-slate-500 font-bold mb-1">สถานะ</p>
                                            <span className={`text-sm font-bold px-3 py-1 rounded-full border ${getStatusColor(selectedPO.Status)}`}>
                                                {selectedPO.Status === 'Open' ? 'Pending' : selectedPO.Status}
                                            </span>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-xl">
                                            <p className="text-xs text-slate-500 font-bold mb-1">วันที่สร้าง</p>
                                            <p className="text-sm font-bold text-slate-800">{formatThaiDate(selectedPO.RequestDate)}</p>
                                        </div>
                                        {selectedPO.BudgetNo && (
                                            <div className="bg-slate-50 p-4 rounded-xl">
                                                <p className="text-xs text-slate-500 font-bold mb-1">Budget No.</p>
                                                <p className="text-sm font-bold text-slate-800">{selectedPO.BudgetNo}</p>
                                            </div>
                                        )}
                                        {selectedPO.PR_No && (
                                            <div className="bg-slate-50 p-4 rounded-xl">
                                                <p className="text-xs text-slate-500 font-bold mb-1">PR No.</p>
                                                <p className="text-sm font-bold text-slate-800">{selectedPO.PR_No}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Items */}
                                    <div>
                                        <h4 className="font-bold text-slate-800 mb-3">รายการ ({selectedPO.Items?.length || 0})</h4>
                                        <div className="bg-slate-50 rounded-xl overflow-hidden overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-100">
                                                    <tr>
                                                        <th className="text-left p-3 font-bold text-slate-600">ชื่อรายการ</th>
                                                        <th className="text-center p-3 font-bold text-slate-600 w-28">รับแล้ว / สั่ง</th>
                                                        <th className="text-center p-3 font-bold text-slate-600 w-28">สถานะ</th>
                                                        <th className="text-right p-3 font-bold text-slate-600 w-24">ราคา</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedPO.Items?.map((item, idx) => {
                                                        const prodName = item.ItemName || products.find(p => p.ProductID === item.ProductID)?.ProductName || `Item #${idx + 1}`;
                                                        const isFullyReceived = (item.QtyReceived || 0) >= item.QtyOrdered;
                                                        return (
                                                            <tr key={idx} className={`border-t ${isFullyReceived ? 'bg-emerald-50/60' : 'border-slate-200'}`}>
                                                                <td className={`p-3 ${isFullyReceived ? 'text-emerald-700 line-through' : 'text-slate-700'}`}>
                                                                    {prodName}
                                                                </td>
                                                                <td className="p-3 text-center font-mono">
                                                                    <span className="text-emerald-600 font-bold">{item.QtyReceived || 0}</span>
                                                                    <span className="text-slate-400"> / {item.QtyOrdered}</span>
                                                                </td>
                                                                <td className="p-3 text-center">
                                                                    {isFullyReceived ? (
                                                                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-bold border border-emerald-200">
                                                                            <Check size={12} /> รับครบแล้ว
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                                                            ค้างรับ
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
                                </div>

                                {/* Footer */}
                                <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
                                    <button
                                        onClick={() => setSelectedPO(null)}
                                        className="flex-1 bg-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-300 transition-all"
                                    >
                                        ปิด
                                    </button>
                                    {user?.role === 'Staff' && (
                                        <button
                                            onClick={() => { setActivePo(selectedPO); setSelectedPO(null); setIsModalOpen(true); }}
                                            className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Check size={18} /> รับของ
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    </Portal>
                )}
            </AnimatePresence>

            {/* RECEIVE MODAL */}
            {isModalOpen && activePo && (
                <Portal>
                    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm">
                        <div className="flex min-h-screen items-center justify-center p-4">
                            <div className="w-full max-w-2xl transform overflow-hidden rounded-3xl bg-white text-left align-middle shadow-2xl transition-all my-8">
                                <div className="p-6 bg-white flex justify-between items-center border-b border-slate-200">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800">Receive Invoice - {activePo.PO_ID}</h3>
                                        <p className="text-slate-500 text-sm">
                                            {activePo.VendorName}
                                            {activePo.PR_No && <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100 ml-2 font-bold">PR: {activePo.PR_No}</span>}
                                        </p>
                                    </div>
                                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                                </div>
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    const fd = new FormData(e.target);
                                    const items = activePo.Items.map((item, idx) => ({
                                        DetailID: item.DetailID,
                                        Qty: parseInt(fd.get(`qty-${idx}`)) || 0
                                    })).filter(i => i.Qty > 0);
                                    handleReceive(activePo.PO_ID, fd.get('InvoiceNo'), items);
                                }} className="p-6 space-y-6">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block tracking-wider">Invoice Number</label>
                                        <input
                                            name="InvoiceNo"
                                            required
                                            placeholder="INV-XXXX-XXXX"
                                            className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-indigo-500 font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block tracking-wider">Items to Receive</label>
                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                            {activePo.Items.map((item, idx) => {
                                                const prodName = item.ItemName || products.find(p => p.ProductID === item.ProductID)?.ProductName || 'Unknown';
                                                const remaining = item.QtyOrdered - (item.QtyReceived || 0);
                                                const isFullyReceived = remaining <= 0;
                                                return (
                                                    <div key={idx} className={`flex gap-3 items-center p-3 rounded-xl border transition-all ${isFullyReceived
                                                        ? 'bg-emerald-50 border-emerald-200 opacity-70'
                                                        : selectedItems[idx]
                                                            ? 'bg-white border-indigo-200 shadow-sm'
                                                            : 'bg-slate-50 border-slate-100 opacity-60'
                                                        }`}>
                                                        {/* Checkbox */}
                                                        {!isFullyReceived && (
                                                            <div className="flex items-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={!!selectedItems[idx]}
                                                                    onChange={() => toggleSelection(idx)}
                                                                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                />
                                                            </div>
                                                        )}

                                                        <div className="flex-1">
                                                            <p className={`font-medium text-sm ${isFullyReceived ? 'text-emerald-700 line-through' : 'text-slate-700'}`}>{prodName}</p>
                                                            <p className="text-xs text-slate-400">
                                                                {isFullyReceived
                                                                    ? `รับครบ ${item.QtyOrdered} ชิ้นแล้ว`
                                                                    : `คงเหลือ: ${remaining} / ${item.QtyOrdered}`
                                                                }
                                                            </p>
                                                        </div>
                                                        {isFullyReceived ? (
                                                            <>
                                                                <input type="hidden" name={`qty-${idx}`} value="0" />
                                                                <span className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-200">
                                                                    <Check size={14} /> รับครบแล้ว
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <div className={`flex items-center gap-2 ${!selectedItems[idx] ? 'pointer-events-none opacity-50' : ''}`}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (!selectedItems[idx]) toggleSelection(idx);
                                                                        const el = document.querySelector(`input[name="qty-${idx}"]`);
                                                                        if (el) el.value = remaining;
                                                                    }}
                                                                    className="text-emerald-600 hover:bg-emerald-50 p-1 rounded transition-colors"
                                                                    title="รับทั้งหมด"
                                                                >
                                                                    <ArrowDownCircle size={16} />
                                                                </button>
                                                                <span className="text-xs text-slate-500 font-bold">จำนวน:</span>
                                                                <input
                                                                    name={`qty-${idx}`}
                                                                    type="number"
                                                                    min="0"
                                                                    max={remaining}
                                                                    defaultValue={remaining}
                                                                    disabled={!selectedItems[idx]}
                                                                    className="w-16 bg-white border border-slate-200 p-2 rounded-lg text-center text-sm font-mono outline-none focus:border-indigo-500 disabled:bg-slate-100"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="flex gap-3 pt-4">
                                        <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all">
                                            Cancel
                                        </button>
                                        <button type="submit" className="flex-[2] bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2">
                                            <Check size={18} /> Confirm Receive
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}

            {/* Result Modal */}
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

export default ReceivePage;
