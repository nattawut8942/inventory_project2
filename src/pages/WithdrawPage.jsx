import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, AlertTriangle, Monitor, Network, Archive, Database, Package, X, Minus, Plus, ShoppingCart, Trash2, Check, Search, List, LayoutGrid, HardDrive, Mouse, Droplet, FileEdit, ScanLine } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Portal from '../components/Portal';
import AlertModal from '../components/AlertModal';
import LoadingState from '../components/LoadingState';

const API_BASE = 'http://localhost:3001/api';
const API_URL = 'http://localhost:3001';

const WithdrawPage = () => {
    const { products, deviceTypes, refreshData, loading } = useData();
    const { user } = useAuth();

    // Filter & View State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState('all');
    const [viewMode, setViewMode] = useState('grid');

    // Cart State
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);

    // Withdrawal Reason State
    const reasonOptions = [
        { id: 'New Withdrawal', label: 'เบิกใหม่ (New Withdrawal)' },
        { id: 'Replacement', label: 'ทดแทน (Replacement)' },
        { id: 'Upgrade', label: 'อัปเกรด (Upgrade)' },
        { id: 'Testing', label: 'ยืมทดสอบ (Testing)' },
        { id: 'Other', label: 'อื่นๆ (Other)' }
    ];
    const [selectedReason, setSelectedReason] = useState('New Withdrawal');
    const [reasonDetail, setReasonDetail] = useState('');

    // Qty Modal State (only for selecting quantity)
    const [qtyModal, setQtyModal] = useState({ isOpen: false, product: null, mode: 'cart' }); // mode: 'cart' | 'withdraw'
    const [selectQty, setSelectQty] = useState(1);

    // Result Modal
    const [resultModal, setResultModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });

    // Scan Modal State
    const [scanModal, setScanModal] = useState({ isOpen: false, scannedCode: '', foundProduct: null, error: '' });
    const [scanQty, setScanQty] = useState(1);
    const [scanReason, setScanReason] = useState('New Withdrawal');
    const [scanReasonDetail, setScanReasonDetail] = useState('');

    const getIcon = (type) => {
        switch (type) {
            case 'Monitor': return Monitor;
            case 'Network': return Network;
            case 'Asset': return Archive;
            case 'Consumable': return Droplet;
            case 'Storage': return HardDrive;
            case 'Peripheral': return Mouse;
            default: return Package;
        }
    };

    const getColorGradient = (type) => {
        switch (type) {
            case 'Monitor': return 'from-blue-500 to-blue-600';
            case 'Network': return 'from-purple-500 to-purple-600';
            case 'Asset': return 'from-amber-500 to-amber-600';
            case 'Consumable': return 'from-emerald-500 to-emerald-600';
            case 'Storage': return 'from-orange-500 to-orange-600';
            case 'Peripheral': return 'from-cyan-500 to-cyan-600';
            default: return 'from-slate-500 to-slate-600';
        }
    };

    // Filter products
    const filteredProducts = products.filter(p =>
        p.ProductName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (selectedType === 'all' || p.DeviceType === selectedType)
    );

    // Open qty modal for cart
    const openCartModal = (product) => {
        const existing = cart.find(c => c.ProductID === product.ProductID);
        setSelectQty(existing ? existing.qty : 1);
        setQtyModal({ isOpen: true, product, mode: 'cart' });
    };

    // Open qty modal for quick withdraw
    const openWithdrawModal = (product) => {
        setSelectQty(1);
        setSelectedReason('New Withdrawal'); // Reset default
        setReasonDetail('');
        setQtyModal({ isOpen: true, product, mode: 'withdraw' });
    };

    // Helper: Construct RefInfo
    const getRefInfo = () => {
        let info = selectedReason;
        if (reasonDetail.trim()) {
            info += `: ${reasonDetail.trim()}`;
        }
        return info;
    };

    // Confirm action based on mode
    const handleQtyConfirm = async () => {
        const product = qtyModal.product;
        if (!product || selectQty <= 0) return;

        if (qtyModal.mode === 'cart') {
            // Add to cart
            const existingIndex = cart.findIndex(c => c.ProductID === product.ProductID);
            if (existingIndex >= 0) {
                const updated = [...cart];
                updated[existingIndex].qty = selectQty;
                setCart(updated);
            } else {
                setCart([...cart, { ...product, qty: selectQty }]);
            }
            setQtyModal({ isOpen: false, product: null, mode: 'cart' });
        } else {
            // Quick withdraw
            try {
                const res = await fetch(`${API_BASE}/products/withdraw`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ProductID: product.ProductID,
                        Qty: selectQty,
                        UserID: user.username,
                        RefInfo: getRefInfo() // Send Reason
                    })
                });

                if (res.ok) {
                    setResultModal({
                        isOpen: true,
                        type: 'success',
                        title: 'เบิกสำเร็จ',
                        message: `เบิก ${product.ProductName} จำนวน ${selectQty} ชิ้น`
                    });
                    refreshData();
                } else {
                    setResultModal({
                        isOpen: true,
                        type: 'error',
                        title: 'เกิดข้อผิดพลาด',
                        message: 'ไม่สามารถเบิกอุปกรณ์ได้'
                    });
                }
            } catch (err) {
                setResultModal({
                    isOpen: true,
                    type: 'error',
                    title: 'Connection Error',
                    message: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'
                });
            }
            setQtyModal({ isOpen: false, product: null, mode: 'cart' });
        }
    };

    const removeFromCart = (productId) => {
        setCart(cart.filter(c => c.ProductID !== productId));
    };

    const updateCartQty = (productId, newQty) => {
        const updated = cart.map(c =>
            c.ProductID === productId ? { ...c, qty: Math.max(1, Math.min(c.CurrentStock, newQty)) } : c
        );
        setCart(updated);
    };

    const getCartTotal = () => cart.reduce((sum, item) => sum + item.qty, 0);

    const isInCart = (productId) => cart.some(c => c.ProductID === productId);

    const executeWithdrawAll = async () => {
        if (cart.length === 0) return;

        let successCount = 0;
        const refInfo = getRefInfo(); // Use global reason for bulk withdraw

        for (const item of cart) {
            try {
                const res = await fetch(`${API_BASE}/products/withdraw`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ProductID: item.ProductID,
                        Qty: item.qty,
                        UserID: user.username,
                        RefInfo: refInfo
                    })
                });
                if (res.ok) successCount++;
            } catch (err) { }
        }

        setCart([]);
        setIsCartOpen(false);
        refreshData();

        setResultModal({
            isOpen: true,
            type: successCount === cart.length ? 'success' : 'warning',
            title: successCount === cart.length ? 'เบิกสำเร็จ' : 'เบิกบางส่วน',
            message: `สำเร็จ ${successCount}/${cart.length} รายการ`
        });
    };

    // Scan Handler
    const handleScanLookup = (code) => {
        if (!code.trim()) return;
        const found = products.find(p => String(p.ProductID) === code.trim() || p.ProductName.toLowerCase() === code.trim().toLowerCase());
        if (found) {
            setScanModal(prev => ({ ...prev, foundProduct: found, error: '' }));
            setScanQty(1);
            setScanReason('New Withdrawal');
            setScanReasonDetail('');
        } else {
            setScanModal(prev => ({ ...prev, foundProduct: null, error: `ไม่พบอุปกรณ์รหัส "${code.trim()}"` }));
        }
    };

    const handleScanWithdraw = async () => {
        const product = scanModal.foundProduct;
        if (!product || scanQty <= 0 || scanQty > product.CurrentStock) return;

        let refInfo = scanReason;
        if (scanReasonDetail.trim()) refInfo += `: ${scanReasonDetail.trim()}`;

        try {
            const res = await fetch(`${API_BASE}/products/withdraw`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ProductID: product.ProductID,
                    Qty: scanQty,
                    UserID: user.username,
                    RefInfo: refInfo
                })
            });
            if (res.ok) {
                setResultModal({ isOpen: true, type: 'success', title: 'เบิกสำเร็จ', message: `เบิก ${product.ProductName} จำนวน ${scanQty} ชิ้น` });
                refreshData();
                setScanModal({ isOpen: false, scannedCode: '', foundProduct: null, error: '' });
            } else {
                setResultModal({ isOpen: true, type: 'error', title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถเบิกอุปกรณ์ได้' });
            }
        } catch {
            setResultModal({ isOpen: true, type: 'error', title: 'Connection Error', message: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' });
        }
    };

    if (loading && products.length === 0) {
        return <LoadingState message="กำลังโหลดข้อมูลอุปกรณ์..." />;
    }

    return (
        <div className="space-y-6">
            {/* Header with Controls */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4"
            >
                <div>
                    <h2 className="text-3xl font-black text-slate-800 mb-2">เบิกอุปกรณ์</h2>
                    <p className="text-slate-500">เลือกอุปกรณ์ที่ต้องการเบิก</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">

                    {/* View Toggle */}
                    <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                        >
                            <List size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="flex gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                        <Search size={18} className="text-slate-400 self-center" />
                        <input
                            type="text"
                            placeholder="ค้นหาอุปกรณ์... (พร้อมสแกน)"
                            className="bg-transparent border-none outline-none text-sm w-40 text-slate-700 placeholder-slate-400"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {/* Type Filter */}
                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-500 outline-none cursor-pointer"
                    >
                        <option value="all">ทุกประเภท</option>
                        {deviceTypes.map(t => <option key={t.TypeId} value={t.TypeId}>{t.Label}</option>)}
                    </select>

                    {/* Cart Button */}
                    <button
                        onClick={() => {
                            setSelectedReason('New Withdrawal'); // Reset default
                            setReasonDetail('');
                            setIsCartOpen(true);
                        }}
                        className="relative bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg flex items-center gap-2"
                    >
                        <ShoppingCart size={18} />
                        ตะกร้า
                        {cart.length > 0 && (
                            <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                                {getCartTotal()}
                            </span>
                        )}
                    </button>
                    {/* Scan Button */}
                    <button
                        onClick={() => setScanModal({ isOpen: true, scannedCode: '', foundProduct: null, error: '' })}
                        className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-200 hover:from-emerald-600 hover:to-teal-600 transition-all"
                    >
                        <ScanLine size={18} /> สแกนเบิก
                    </button>
                </div>
            </motion.div>

            {/* LIST VIEW */}
            {viewMode === 'list' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-lg overflow-x-auto"
                >
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-bold text-slate-600">อุปกรณ์</th>
                                <th className="px-4 py-4 font-bold text-slate-600">ประเภท</th>
                                <th className="px-4 py-4 font-bold text-slate-600 text-center">คงเหลือ</th>
                                <th className="px-4 py-4 font-bold text-slate-600 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map((p) => {
                                const Icon = getIcon(p.DeviceType);
                                const isLow = p.CurrentStock <= p.MinStock;
                                const inCart = isInCart(p.ProductID);

                                return (
                                    <tr key={p.ProductID} className={`border-b border-slate-100 hover:bg-slate-50 ${inCart ? 'bg-indigo-50/50' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getColorGradient(p.DeviceType)} flex items-center justify-center overflow-hidden`}>
                                                    {p.ImageURL ? (
                                                        <img src={`${API_URL}${p.ImageURL}`} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Icon size={18} className="text-white" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800">{p.ProductName}</p>
                                                    {inCart && <span className="text-xs text-indigo-600 font-bold">ในตะกร้า</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-xs font-bold text-slate-500">{p.DeviceType}</span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={`text-lg font-black ${isLow ? 'text-red-500' : 'text-emerald-500'}`}>
                                                {p.CurrentStock}
                                            </span>
                                            {isLow && <AlertTriangle size={14} className="inline ml-1 text-red-500" />}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => openCartModal(p)}
                                                    disabled={p.CurrentStock <= 0}
                                                    className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-bold text-xs hover:bg-indigo-200 disabled:opacity-50 flex items-center gap-1"
                                                >
                                                    <ShoppingCart size={14} /> ตะกร้า
                                                </button>
                                                <button
                                                    onClick={() => openWithdrawModal(p)}
                                                    disabled={p.CurrentStock <= 0}
                                                    className="px-3 py-2 bg-emerald-500 text-white rounded-lg font-bold text-xs hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-1"
                                                >
                                                    <ShoppingBag size={14} /> เบิกเลย
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </motion.div>
            )}

            {/* GRID VIEW */}
            {viewMode === 'grid' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
                    {filteredProducts.map((p, idx) => {
                        const Icon = getIcon(p.DeviceType);
                        const isLow = p.CurrentStock <= p.MinStock;
                        const inCart = isInCart(p.ProductID);

                        return (
                            <motion.div
                                key={p.ProductID}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.02 }}
                                className={`group bg-white rounded-2xl border p-4 shadow-lg hover:shadow-xl transition-all relative overflow-hidden ${inCart ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-100'}`}
                            >
                                <div className={`absolute top-0 left-0 w-full h-16 bg-gradient-to-br ${getColorGradient(p.DeviceType)} opacity-10 z-0`}></div>

                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg overflow-hidden bg-gradient-to-br ${getColorGradient(p.DeviceType)}`}>
                                            {p.ImageURL ? (
                                                <img src={`${API_URL}${p.ImageURL}`} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <Icon size={22} className="text-white" />
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            {inCart && (
                                                <span className="bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                                                    ในตะกร้า
                                                </span>
                                            )}
                                            <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-lg border shadow-sm bg-gradient-to-r ${getColorGradient(p.DeviceType)} text-white`}>
                                                {p.DeviceType}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <h3 className="font-bold text-slate-800 text-sm mb-1 line-clamp-2 min-h-[2.5rem]">{p.ProductName}</h3>

                                <div className="flex items-baseline gap-2 mb-3">
                                    <span className="text-[12px] text-slate-400 font-bold">คงเหลือ:</span>
                                    <span className={`text-xl font-black ${isLow ? 'text-red-500' : 'text-emerald-500'}`}>{p.CurrentStock}</span>
                                    {isLow && <AlertTriangle size={12} className="text-red-500" />}
                                </div>

                                {/* Buttons on Card */}
                                <div className="flex gap-2 pt-2 border-t border-slate-100">
                                    <button
                                        onClick={() => openCartModal(p)}
                                        disabled={p.CurrentStock <= 0}
                                        className="flex-1 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-bold text-xs hover:bg-indigo-200 disabled:opacity-50 flex items-center justify-center gap-1"
                                    >
                                        <ShoppingCart size={14} />
                                    </button>
                                    <button
                                        onClick={() => openWithdrawModal(p)}
                                        disabled={p.CurrentStock <= 0}
                                        className="flex-1 py-2 bg-emerald-500 text-white rounded-lg font-bold text-xs hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-1"
                                    >
                                        <ShoppingBag size={14} /> เบิก
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* QTY MODAL - Now with Reason Section (Only for Withdraw Mode) */}
            <AnimatePresence>
                {qtyModal.isOpen && qtyModal.product && (
                    <Portal>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                            >
                                {/* Header */}
                                <div className={`p-5 bg-gradient-to-r ${getColorGradient(qtyModal.product.DeviceType)} text-white flex-shrink-0`}>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                                <Package size={20} className="text-white" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-sm truncate max-w-[200px]">{qtyModal.product.ProductName}</h3>
                                                <p className="text-white/80 text-xs">คงเหลือ: {qtyModal.product.CurrentStock}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setQtyModal({ isOpen: false, product: null, mode: 'cart' })} className="p-1.5 hover:bg-white/20 rounded-full">
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Scrollable Body */}
                                <div className="p-6 overflow-y-auto">
                                    <label className="text-sm font-bold text-slate-700 mb-3 block text-center">เลือกจำนวน</label>
                                    <div className="flex items-center gap-3 justify-center mb-6">
                                        <button
                                            type="button"
                                            onClick={() => setSelectQty(Math.max(1, selectQty - 1))}
                                            className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-all"
                                        >
                                            <Minus size={20} />
                                        </button>
                                        <input
                                            type="number"
                                            value={selectQty}
                                            onChange={(e) => setSelectQty(Math.max(1, Math.min(qtyModal.product.CurrentStock, parseInt(e.target.value) || 1)))}
                                            className="w-24 text-center text-3xl font-black py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setSelectQty(Math.min(qtyModal.product.CurrentStock, selectQty + 1))}
                                            className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-all"
                                        >
                                            <Plus size={20} />
                                        </button>
                                    </div>

                                    {selectQty > qtyModal.product.CurrentStock && (
                                        <p className="text-red-500 text-xs text-center mt-3 flex items-center justify-center gap-1 mb-4">
                                            <AlertTriangle size={12} /> ไม่สามารถเบิกเกินสต็อก
                                        </p>
                                    )}

                                    {/* REASON SECTION (Only for Quick Withdraw) */}
                                    {qtyModal.mode === 'withdraw' && (
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">ระบุเหตุผลการเบิก</label>
                                            <div className="space-y-2">
                                                {reasonOptions.map((opt) => (
                                                    <label key={opt.id} className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-indigo-300 transition-all">
                                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedReason === opt.id ? 'border-indigo-500' : 'border-slate-300'}`}>
                                                            {selectedReason === opt.id && <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full" />}
                                                        </div>
                                                        <input
                                                            type="radio"
                                                            name="withdrawReason"
                                                            value={opt.id}
                                                            checked={selectedReason === opt.id}
                                                            onChange={(e) => setSelectedReason(e.target.value)}
                                                            className="hidden"
                                                        />
                                                        <span className={`text-sm font-medium ${selectedReason === opt.id ? 'text-indigo-700' : 'text-slate-600'}`}>{opt.label}</span>
                                                    </label>
                                                ))}
                                            </div>

                                            {/* Optional Detail Input */}
                                            <div className="mt-3">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <FileEdit size={14} className="text-slate-400" />
                                                    <span className="text-xs font-bold text-slate-500">รายละเอียดเพิ่มเติม (Optional)</span>
                                                </div>
                                                <textarea
                                                    value={reasonDetail}
                                                    onChange={(e) => setReasonDetail(e.target.value)}
                                                    placeholder="เช่น ระบุชื่อโปรเจกต์ หรือหมายเลขแจ้งซ่อม..."
                                                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:border-indigo-500 outline-none h-20 resize-none"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-3 flex-shrink-0">
                                    <button
                                        onClick={() => setQtyModal({ isOpen: false, product: null, mode: 'cart' })}
                                        className="flex-1 bg-slate-200 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-300 transition-all"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        onClick={handleQtyConfirm}
                                        disabled={selectQty > qtyModal.product.CurrentStock || selectQty <= 0}
                                        className={`flex-1 font-bold py-3 rounded-xl transition-all shadow-lg disabled:opacity-50 ${qtyModal.mode === 'withdraw'
                                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                            }`}
                                    >
                                        {qtyModal.mode === 'withdraw' ? 'ยืนยันเบิก' : 'เพิ่มลงตะกร้า'}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    </Portal>
                )}
            </AnimatePresence>

            {/* Cart Drawer */}
            <AnimatePresence>
                {isCartOpen && (
                    <Portal>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[70] bg-slate-900/70 backdrop-blur-sm"
                            onClick={() => setIsCartOpen(false)}
                        >
                            <motion.div
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Cart Header */}
                                <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                    <div>
                                        <h3 className="font-black text-xl text-slate-800">ตะกร้าเบิก</h3>
                                        <p className="text-slate-500 text-sm">{cart.length} รายการ</p>
                                    </div>
                                    <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                        <X size={20} className="text-slate-600" />
                                    </button>
                                </div>

                                {/* Cart Items */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {cart.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                            <ShoppingCart size={48} className="mb-3 opacity-30" />
                                            <p className="font-bold">ตะกร้าว่าง</p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Items List */}
                                            <div className="space-y-3 mb-6">
                                                {cart.map((item) => (
                                                    <div key={item.ProductID} className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="font-bold text-slate-800 text-sm truncate">{item.ProductName}</h4>
                                                                <p className="text-xs text-slate-500">{item.DeviceType}</p>
                                                            </div>
                                                            <button onClick={() => removeFromCart(item.ProductID)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => updateCartQty(item.ProductID, item.qty - 1)}
                                                                className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center hover:bg-slate-100"
                                                            >
                                                                <Minus size={14} />
                                                            </button>
                                                            <span className="w-12 text-center font-bold text-lg">{item.qty}</span>
                                                            <button
                                                                onClick={() => updateCartQty(item.ProductID, item.qty + 1)}
                                                                className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center hover:bg-slate-100"
                                                            >
                                                                <Plus size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* REASON SECTION (For Cart) */}
                                            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 space-y-3">
                                                <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider block mb-2">ระบุเหตุผลสำหรับการเบิกครั้งนี้</label>
                                                <div className="space-y-2">
                                                    {reasonOptions.map((opt) => (
                                                        <label key={opt.id} className="flex items-center gap-3 p-2 bg-white rounded-xl border border-indigo-100 cursor-pointer hover:border-indigo-300 transition-all">
                                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedReason === opt.id ? 'border-indigo-500' : 'border-slate-300'}`}>
                                                                {selectedReason === opt.id && <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full" />}
                                                            </div>
                                                            <input
                                                                type="radio"
                                                                name="cartReason"
                                                                value={opt.id}
                                                                checked={selectedReason === opt.id}
                                                                onChange={(e) => setSelectedReason(e.target.value)}
                                                                className="hidden"
                                                            />
                                                            <span className={`text-sm font-medium ${selectedReason === opt.id ? 'text-indigo-700' : 'text-slate-600'}`}>{opt.label}</span>
                                                        </label>
                                                    ))}
                                                </div>

                                                {/* Optional Detail Input */}
                                                <div className="mt-3">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <FileEdit size={14} className="text-indigo-400" />
                                                        <span className="text-xs font-bold text-indigo-500">รายละเอียดเพิ่มเติม (Optional)</span>
                                                    </div>
                                                    <textarea
                                                        value={reasonDetail}
                                                        onChange={(e) => setReasonDetail(e.target.value)}
                                                        placeholder="เช่น ระบุชื่อโปรเจกต์..."
                                                        className="w-full bg-white border border-indigo-100 rounded-xl p-3 text-sm focus:border-indigo-500 outline-none h-20 resize-none"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Cart Footer */}
                                {cart.length > 0 && (
                                    <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-slate-600">รวมทั้งหมด</span>
                                            <span className="text-2xl font-black text-indigo-600">{getCartTotal()} ชิ้น</span>
                                        </div>
                                        <button
                                            onClick={executeWithdrawAll}
                                            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold py-4 rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2"
                                        >
                                            <Check size={20} /> ยืนยันเบิกอุปกรณ์
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        </motion.div>
                    </Portal>
                )}
            </AnimatePresence>

            {/* Scan Modal */}
            <AnimatePresence>
                {scanModal.isOpen && (
                    <Portal>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
                            onClick={() => setScanModal({ isOpen: false, scannedCode: '', foundProduct: null, error: '' })}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Header */}
                                <div className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 flex justify-between items-center flex-shrink-0">
                                    <div>
                                        <h3 className="font-bold text-white flex items-center gap-2"><ScanLine size={18} /> สแกนเบิกอุปกรณ์</h3>
                                    </div>
                                    <button onClick={() => setScanModal({ isOpen: false, scannedCode: '', foundProduct: null, error: '' })} className="p-1.5 hover:bg-white/20 rounded-full text-white transition-colors"><X size={18} /></button>
                                </div>

                                {/* Scan Input */}
                                <div className="px-5 py-3 border-b border-slate-100">
                                    <div className="flex gap-2">
                                        <div className="flex-1 flex items-center gap-2 bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-emerald-500 transition-all">
                                            <ScanLine size={16} className="text-slate-400" />
                                            <input
                                                type="text"
                                                autoFocus
                                                placeholder="สแกนบาร์โค้ด หรือพิมพ์รหัสอุปกรณ์..."
                                                value={scanModal.scannedCode}
                                                onChange={(e) => setScanModal(prev => ({ ...prev, scannedCode: e.target.value, error: '' }))}
                                                onKeyDown={(e) => { if (e.key === 'Enter') handleScanLookup(scanModal.scannedCode); }}
                                                className="flex-1 bg-transparent outline-none text-sm text-slate-700 placeholder-slate-400 font-mono"
                                            />
                                        </div>
                                        <button
                                            onClick={() => handleScanLookup(scanModal.scannedCode)}
                                            className="bg-emerald-600 text-white px-4 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all"
                                        >
                                            ค้นหา
                                        </button>
                                    </div>
                                    {scanModal.error && (
                                        <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><AlertTriangle size={12} /> {scanModal.error}</p>
                                    )}
                                </div>

                                {/* Body */}
                                <div className="flex-1">
                                    {scanModal.foundProduct ? (
                                        <div className="px-5 py-4 space-y-3">
                                            {/* Product Info + Stats Row */}
                                            <div className="flex gap-3 items-start">
                                                <div className={`w-14 h-14 flex-shrink-0 rounded-xl bg-gradient-to-br ${getColorGradient(scanModal.foundProduct.DeviceType)} flex items-center justify-center shadow-md overflow-hidden`}>
                                                    {scanModal.foundProduct.ImageURL ? (
                                                        <img src={`${API_URL}${scanModal.foundProduct.ImageURL}`} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        React.createElement(getIcon(scanModal.foundProduct.DeviceType), { size: 24, className: 'text-white' })
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-slate-800 text-sm truncate">{scanModal.foundProduct.ProductName}</h4>
                                                    <p className="text-[11px] text-slate-400">{scanModal.foundProduct.DeviceType} • รหัส: {scanModal.foundProduct.ProductID}</p>
                                                    <div className="flex gap-2 mt-2">
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${scanModal.foundProduct.CurrentStock <= scanModal.foundProduct.MinStock ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                            คงเหลือ: {scanModal.foundProduct.CurrentStock}
                                                        </span>
                                                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500">
                                                            ขั้นต่ำ: {scanModal.foundProduct.MinStock}
                                                        </span>
                                                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600">
                                                            ฿{scanModal.foundProduct.LastPrice?.toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Qty Selector - compact */}
                                            <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-200">
                                                <span className="text-xs font-bold text-slate-500 uppercase">จำนวน</span>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => setScanQty(Math.max(1, scanQty - 1))} className="w-9 h-9 bg-white rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-all border border-slate-200"><Minus size={16} /></button>
                                                    <input
                                                        type="number"
                                                        value={scanQty}
                                                        onChange={(e) => setScanQty(Math.max(1, Math.min(scanModal.foundProduct.CurrentStock, parseInt(e.target.value) || 1)))}
                                                        className="w-16 text-center text-xl font-black py-1.5 bg-white border-2 border-slate-200 rounded-lg outline-none focus:border-emerald-500"
                                                    />
                                                    <button onClick={() => setScanQty(Math.min(scanModal.foundProduct.CurrentStock, scanQty + 1))} className="w-9 h-9 bg-white rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-all border border-slate-200"><Plus size={16} /></button>
                                                </div>
                                            </div>
                                            {scanQty > scanModal.foundProduct.CurrentStock && (
                                                <p className="text-red-500 text-xs flex items-center gap-1"><AlertTriangle size={12} /> ไม่สามารถเบิกเกินสต็อก</p>
                                            )}

                                            {/* Reason - compact 2-col grid */}
                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">เหตุผลการเบิก</label>
                                                <div className="grid grid-cols-2 gap-1.5">
                                                    {reasonOptions.map((opt) => (
                                                        <label key={opt.id} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all text-xs font-medium border ${scanReason === opt.id ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200'}`}>
                                                            <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${scanReason === opt.id ? 'border-emerald-500' : 'border-slate-300'}`}>
                                                                {scanReason === opt.id && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />}
                                                            </div>
                                                            <input type="radio" name="scanReason" value={opt.id} checked={scanReason === opt.id} onChange={(e) => setScanReason(e.target.value)} className="hidden" />
                                                            <span className="truncate">{opt.label}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                                <textarea
                                                    value={scanReasonDetail}
                                                    onChange={(e) => setScanReasonDetail(e.target.value)}
                                                    placeholder="รายละเอียดเพิ่มเติม (Optional)..."
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:border-emerald-500 outline-none h-12 resize-none mt-2"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-10 text-center text-slate-400">
                                            <ScanLine size={40} className="mx-auto mb-2 opacity-30" />
                                            <p className="font-bold text-sm">สแกนบาร์โค้ดหรือพิมพ์รหัสอุปกรณ์</p>
                                            <p className="text-xs mt-0.5">ระบบจะแสดงข้อมูลอุปกรณ์อัตโนมัติ</p>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                {scanModal.foundProduct && (
                                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex gap-3 flex-shrink-0">
                                        <button
                                            onClick={() => setScanModal({ isOpen: false, scannedCode: '', foundProduct: null, error: '' })}
                                            className="flex-1 bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl hover:bg-slate-300 transition-all text-sm"
                                        >
                                            ยกเลิก
                                        </button>
                                        <button
                                            onClick={handleScanWithdraw}
                                            disabled={scanQty > scanModal.foundProduct.CurrentStock || scanQty <= 0}
                                            className="flex-[2] bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold py-2.5 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                                        >
                                            <Check size={16} /> ยืนยันเบิก
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        </motion.div>
                    </Portal>
                )}
            </AnimatePresence>

            {/* Result Modal */}
            {/* ALERT MODAL (Replaces ResultModal) */}
            <AlertModal
                isOpen={resultModal.isOpen}
                onConfirm={() => {
                    const onClose = resultModal.onClose || (() => setResultModal({ ...resultModal, isOpen: false }));
                    onClose();
                }}
                type={resultModal.type}
                title={resultModal.title}
                message={resultModal.message}
                confirmText="ตกลง (OK)"
            />
        </div >
    );
};

export default WithdrawPage;
