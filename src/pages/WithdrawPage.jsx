import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, AlertTriangle, Monitor, Network, Archive, Database, Package, X, Minus, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AlertModal from '../components/AlertModal';

const API_BASE = 'http://localhost:3001/api';
const API_URL = 'http://localhost:3001';

const WithdrawPage = () => {
    const { products, refreshData } = useData();
    const { user } = useAuth();

    // Modal State
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [withdrawQty, setWithdrawQty] = useState(1);
    const [alertModal, setAlertModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });

    const getIcon = (type) => {
        switch (type) {
            case 'Monitor': return Monitor;
            case 'Network': return Network;
            case 'Asset': return Archive;
            case 'Stock': return Database;
            default: return Package;
        }
    };

    const getColorGradient = (type) => {
        switch (type) {
            case 'Monitor': return 'from-blue-500 to-blue-600';
            case 'Network': return 'from-purple-500 to-purple-600';
            case 'Asset': return 'from-amber-500 to-amber-600';
            case 'Stock': return 'from-emerald-500 to-emerald-600';
            default: return 'from-pink-500 to-pink-600';
        }
    };

    const openWithdrawModal = (product) => {
        setSelectedProduct(product);
        setWithdrawQty(1);
    };

    const executeWithdraw = async () => {
        if (!withdrawQty || withdrawQty <= 0) {
            setAlertModal({ isOpen: true, type: 'error', title: 'จำนวนไม่ถูกต้อง', message: 'กรุณาระบุจำนวนที่มากกว่า 0' });
            return;
        }
        if (withdrawQty > selectedProduct.CurrentStock) {
            setAlertModal({ isOpen: true, type: 'error', title: 'สต็อคไม่เพียงพอ', message: `ไม่สามารถเบิก ${withdrawQty} ชิ้น เหลือเพียง ${selectedProduct.CurrentStock} ชิ้น` });
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/products/withdraw`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ProductID: selectedProduct.ProductID,
                    Qty: withdrawQty,
                    UserID: user.username
                })
            });
            if (!res.ok) throw new Error('Failed');

            const productName = selectedProduct.ProductName;
            setSelectedProduct(null);
            setAlertModal({ isOpen: true, type: 'success', title: 'เบิกสำเร็จ', message: `เบิก ${withdrawQty} ชิ้น ของ ${productName} เรียบร้อยแล้ว` });
            refreshData();
        } catch (err) {
            setAlertModal({ isOpen: true, type: 'error', title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถดำเนินการเบิกได้ กรุณาลองใหม่อีกครั้ง' });
        }
    };

    return (
        <div className="space-y-8">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h2 className="text-3xl font-black text-slate-800 mb-2">เบิกสินค้า</h2>
                <p className="text-slate-500">เลือกสินค้าที่ต้องการเบิกออกจากคลัง</p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((p, idx) => {
                    const Icon = getIcon(p.DeviceType);
                    const isLow = p.CurrentStock <= p.MinStock;

                    return (
                        <motion.div
                            key={p.ProductID}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            onClick={() => openWithdrawModal(p)}
                            className="group bg-white rounded-3xl border border-slate-100 p-5 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col cursor-pointer"
                        >
                            {/* Decorative Gradient Background */}
                            <div className={`absolute top-0 left-0 w-full h-24 bg-gradient-to-br ${getColorGradient(p.DeviceType)} opacity-10 z-0`}></div>

                            <div className="relative z-10 flex-1">
                                <div className="flex justify-between items-start mb-4">
                                    {/* Product Image or Icon */}
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden bg-gradient-to-br ${getColorGradient(p.DeviceType)}`}>
                                        {p.ImageURL ? (
                                            <img src={`${API_URL}${p.ImageURL}`} alt={p.ProductName} className="w-full h-full object-cover" />
                                        ) : (
                                            <Icon size={28} className="text-white" />
                                        )}
                                    </div>
                                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-lg border shadow-sm bg-gradient-to-r ${getColorGradient(p.DeviceType)} text-white`}>
                                        {p.DeviceType}
                                    </span>
                                </div>

                                <h3 className="font-bold text-slate-800 text-lg mb-1 line-clamp-2 min-h-[3.5rem]">{p.ProductName}</h3>

                                <div className="flex items-baseline gap-2 mb-4">
                                    <span className="text-xs text-slate-400 font-bold uppercase">คงเหลือ:</span>
                                    <span className={`text-2xl font-black ${isLow ? 'text-red-500' : 'text-emerald-500'}`}>{p.CurrentStock}</span>
                                    {isLow && <AlertTriangle size={16} className="text-red-500" />}
                                </div>
                            </div>

                            <div className="relative z-10 mt-auto pt-4 border-t border-slate-100">
                                <button className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl text-sm hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2">
                                    <ShoppingBag size={16} />
                                    เบิกสินค้า
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Full Screen Withdraw Modal */}
            <AnimatePresence>
                {selectedProduct && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
                        >
                            {/* Header with Gradient */}
                            <div className={`p-6 bg-gradient-to-r ${getColorGradient(selectedProduct.DeviceType)} text-white`}>
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center overflow-hidden">
                                            {selectedProduct.ImageURL ? (
                                                <img src={`${API_URL}${selectedProduct.ImageURL}`} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <Package size={32} className="text-white" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-black text-xl truncate">{selectedProduct.ProductName}</h3>
                                            <p className="text-white/80 text-sm">{selectedProduct.DeviceType}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedProduct(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors shrink-0">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="p-6 space-y-5">
                                {/* Stock Info Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-2xl text-center">
                                        <p className="text-xs text-slate-500 font-bold mb-1">สต็อคคงเหลือ</p>
                                        <span className={`text-3xl font-black ${selectedProduct.CurrentStock <= selectedProduct.MinStock ? 'text-red-500' : 'text-emerald-500'}`}>
                                            {selectedProduct.CurrentStock}
                                        </span>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl text-center">
                                        <p className="text-xs text-slate-500 font-bold mb-1">Min Stock</p>
                                        <span className="text-3xl font-black text-slate-400">{selectedProduct.MinStock || 0}</span>
                                    </div>
                                </div>

                                {/* Quantity Selector */}
                                <div>
                                    <label className="text-sm font-bold text-slate-700 mb-3 block">จำนวนที่ต้องการเบิก</label>
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => setWithdrawQty(Math.max(1, withdrawQty - 1))}
                                            className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-all active:scale-95"
                                        >
                                            <Minus size={24} />
                                        </button>
                                        <input
                                            type="number"
                                            value={withdrawQty}
                                            onChange={(e) => setWithdrawQty(Math.max(1, Math.min(selectedProduct.CurrentStock, parseInt(e.target.value) || 1)))}
                                            className="flex-1 text-center text-3xl font-black py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:border-indigo-500 transition-colors"
                                        />
                                        <button
                                            onClick={() => setWithdrawQty(Math.min(selectedProduct.CurrentStock, withdrawQty + 1))}
                                            className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-all active:scale-95"
                                        >
                                            <Plus size={24} />
                                        </button>
                                    </div>
                                </div>

                                {/* Warning if exceeds stock */}
                                {withdrawQty > selectedProduct.CurrentStock && (
                                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                                        <AlertTriangle size={18} />
                                        <span>ไม่สามารถเบิกเกินสต็อกคงเหลือ {selectedProduct.CurrentStock} ชิ้น</span>
                                    </div>
                                )}

                                {/* Buttons */}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setSelectedProduct(null)}
                                        className="flex-1 bg-slate-100 text-slate-600 font-bold py-4 rounded-xl hover:bg-slate-200 transition-all"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        onClick={executeWithdraw}
                                        disabled={selectedProduct.CurrentStock <= 0 || withdrawQty > selectedProduct.CurrentStock}
                                        className={`flex-[2] bg-gradient-to-r ${getColorGradient(selectedProduct.DeviceType)} text-white font-bold py-4 rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                                    >
                                        <ShoppingBag size={18} />
                                        ยืนยันการเบิก
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Alert Modal */}
            <AlertModal
                isOpen={alertModal.isOpen}
                type={alertModal.type}
                title={alertModal.title}
                message={alertModal.message}
                onConfirm={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                confirmText="ปิด"
            />
        </div>
    );
};

export default WithdrawPage;
