import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, AlertTriangle, Monitor, Network, Archive, Database, Package, X, Minus, Plus, ShoppingCart, Trash2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const API_BASE = 'http://localhost:3001/api';
const API_URL = 'http://localhost:3001';

const WithdrawPage = () => {
    const { products, refreshData } = useData();
    const { user } = useAuth();

    // Cart State
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [addQty, setAddQty] = useState(1);

    // Result Modal
    const [resultModal, setResultModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });

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

    const openAddModal = (product) => {
        setSelectedProduct(product);
        const existingItem = cart.find(c => c.ProductID === product.ProductID);
        setAddQty(existingItem ? existingItem.qty : 1);
    };

    const addToCart = () => {
        if (!selectedProduct) return;

        const existingIndex = cart.findIndex(c => c.ProductID === selectedProduct.ProductID);
        if (existingIndex >= 0) {
            const updated = [...cart];
            updated[existingIndex].qty = addQty;
            setCart(updated);
        } else {
            setCart([...cart, { ...selectedProduct, qty: addQty }]);
        }
        setSelectedProduct(null);
    };

    // Quick Withdraw - เบิกทันที (ไม่ผ่านตะกร้า)
    const executeQuickWithdraw = async () => {
        if (!selectedProduct || addQty <= 0) return;

        try {
            const res = await fetch(`${API_BASE}/products/withdraw`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ProductID: selectedProduct.ProductID,
                    Qty: addQty,
                    UserID: user.username
                })
            });

            if (res.ok) {
                setResultModal({
                    isOpen: true,
                    type: 'success',
                    title: 'เบิกสำเร็จ',
                    message: `เบิก ${selectedProduct.ProductName} จำนวน ${addQty} ชิ้น`
                });
                refreshData();
            } else {
                setResultModal({
                    isOpen: true,
                    type: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    message: 'ไม่สามารถเบิกสินค้าได้'
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
        setSelectedProduct(null);
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

    const getCartTotal = () => {
        return cart.reduce((sum, item) => sum + item.qty, 0);
    };

    const isInCart = (productId) => {
        return cart.some(c => c.ProductID === productId);
    };

    const executeWithdrawAll = async () => {
        if (cart.length === 0) return;

        const results = [];
        let successCount = 0;

        for (const item of cart) {
            try {
                const res = await fetch(`${API_BASE}/products/withdraw`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ProductID: item.ProductID,
                        Qty: item.qty,
                        UserID: user.username
                    })
                });
                if (res.ok) {
                    successCount++;
                    results.push({ name: item.ProductName, qty: item.qty, success: true });
                } else {
                    results.push({ name: item.ProductName, qty: item.qty, success: false });
                }
            } catch (err) {
                results.push({ name: item.ProductName, qty: item.qty, success: false });
            }
        }

        setCart([]);
        setIsCartOpen(false);
        refreshData();

        // Show result modal
        if (successCount === results.length) {
            setResultModal({
                isOpen: true,
                type: 'success',
                title: 'เบิกสำเร็จ',
                message: `เบิกสินค้า ${successCount} รายการเรียบร้อยแล้ว`
            });
        } else {
            setResultModal({
                isOpen: true,
                type: 'warning',
                title: 'เบิกบางส่วน',
                message: `สำเร็จ ${successCount}/${results.length} รายการ`
            });
        }
    };

    return (
        <div className="space-y-8">
            {/* Header with Cart Button */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-between items-start"
            >
                <div>
                    <h2 className="text-3xl font-black text-slate-800 mb-2">เบิกสินค้า</h2>
                    <p className="text-slate-500">เลือกสินค้าเพิ่มลงตะกร้า แล้วกดเบิกทั้งหมด</p>
                </div>
                <button
                    onClick={() => setIsCartOpen(true)}
                    className="relative bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3 rounded-xl transition-all shadow-lg flex items-center gap-2"
                >
                    <ShoppingCart size={20} />
                    ตะกร้า
                    {cart.length > 0 && (
                        <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                            {getCartTotal()}
                        </span>
                    )}
                </button>
            </motion.div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((p, idx) => {
                    const Icon = getIcon(p.DeviceType);
                    const isLow = p.CurrentStock <= p.MinStock;
                    const inCart = isInCart(p.ProductID);

                    return (
                        <motion.div
                            key={p.ProductID}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className={`group bg-white rounded-3xl border p-5 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col ${inCart ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-100'}`}
                        >
                            {/* In Cart Badge */}
                            {inCart && (
                                <div className="absolute top-3 right-3 bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded-full z-20">
                                    ในตะกร้า
                                </div>
                            )}

                            {/* Decorative Gradient Background */}
                            <div className={`absolute top-0 left-0 w-full h-24 bg-gradient-to-br ${getColorGradient(p.DeviceType)} opacity-10 z-0`}></div>

                            <div className="relative z-10 flex-1">
                                <div className="flex justify-between items-start mb-4">
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
                                <button
                                    onClick={() => openAddModal(p)}
                                    disabled={p.CurrentStock <= 0}
                                    className={`w-full font-bold py-3 rounded-xl text-sm shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${inCart
                                        ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                                        : 'bg-slate-900 text-white hover:bg-slate-800'
                                        }`}
                                >
                                    {inCart ? (
                                        <>
                                            <Check size={16} /> แก้ไขจำนวน
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={16} /> เพิ่มลงตะกร้า
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Add to Cart Modal */}
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
                            {/* Header */}
                            <div className={`p-6 bg-gradient-to-r ${getColorGradient(selectedProduct.DeviceType)} text-white`}>
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center overflow-hidden shrink-0">
                                            {selectedProduct.ImageURL ? (
                                                <img src={`${API_URL}${selectedProduct.ImageURL}`} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <Package size={28} className="text-white" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-black text-lg truncate">{selectedProduct.ProductName}</h3>
                                            <p className="text-white/80 text-sm">{selectedProduct.DeviceType}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedProduct(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors shrink-0 ml-2">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="p-6 space-y-5">
                                {/* Stock Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-2xl text-center">
                                        <p className="text-xs text-slate-500 font-bold mb-1">สต็อคคงเหลือ</p>
                                        <span className={`text-2xl font-black ${selectedProduct.CurrentStock <= selectedProduct.MinStock ? 'text-red-500' : 'text-emerald-500'}`}>
                                            {selectedProduct.CurrentStock}
                                        </span>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl text-center">
                                        <p className="text-xs text-slate-500 font-bold mb-1">Min Stock</p>
                                        <span className="text-2xl font-black text-slate-400">{selectedProduct.MinStock || 0}</span>
                                    </div>
                                </div>

                                {/* Quantity Selector */}
                                <div>
                                    <label className="text-sm font-bold text-slate-700 mb-3 block">จำนวนที่ต้องการเบิก</label>
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setAddQty(Math.max(1, addQty - 1))}
                                            className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-all active:scale-95"
                                        >
                                            <Minus size={20} />
                                        </button>
                                        <input
                                            type="number"
                                            value={addQty}
                                            onChange={(e) => setAddQty(Math.max(1, Math.min(selectedProduct.CurrentStock, parseInt(e.target.value) || 1)))}
                                            className="flex-1 text-center text-2xl font-black py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-colors"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setAddQty(Math.min(selectedProduct.CurrentStock, addQty + 1))}
                                            className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-all active:scale-95"
                                        >
                                            <Plus size={20} />
                                        </button>
                                    </div>
                                </div>

                                {/* Warning */}
                                {addQty > selectedProduct.CurrentStock && (
                                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                                        <AlertTriangle size={18} />
                                        <span>ไม่สามารถเบิกเกินสต็อกคงเหลือ</span>
                                    </div>
                                )}

                                {/* Buttons */}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setSelectedProduct(null)}
                                        className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-200 transition-all"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        onClick={addToCart}
                                        disabled={addQty > selectedProduct.CurrentStock}
                                        className="flex-1 bg-indigo-100 text-indigo-700 font-bold py-3 rounded-xl hover:bg-indigo-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        <ShoppingCart size={18} />
                                        {isInCart(selectedProduct.ProductID) ? 'อัปเดต' : 'ตะกร้า'}
                                    </button>
                                    <button
                                        onClick={executeQuickWithdraw}
                                        disabled={addQty > selectedProduct.CurrentStock}
                                        className="flex-1 bg-emerald-500 text-white font-bold py-3 rounded-xl hover:bg-emerald-600 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        <ShoppingBag size={18} />
                                        เบิกเลย
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Cart Drawer */}
            <AnimatePresence>
                {isCartOpen && (
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
                            transition={{ type: 'spring', damping: 25 }}
                            className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Cart Header */}
                            <div className="p-6 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="font-black text-xl">ตะกร้าเบิก</h3>
                                        <p className="text-indigo-200 text-sm">{cart.length} รายการ • {getCartTotal()} ชิ้น</p>
                                    </div>
                                    <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Cart Items */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {cart.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                        <ShoppingCart size={48} className="mb-3 opacity-30" />
                                        <p className="font-bold">ตะกร้าว่าง</p>
                                        <p className="text-sm">เลือกสินค้าเพื่อเริ่มเบิก</p>
                                    </div>
                                ) : (
                                    cart.map((item) => (
                                        <motion.div
                                            key={item.ProductID}
                                            layout
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="bg-slate-50 rounded-2xl p-4 border border-slate-100"
                                        >
                                            <div className="flex gap-3">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${getColorGradient(item.DeviceType)}`}>
                                                    {item.ImageURL ? (
                                                        <img src={`${API_URL}${item.ImageURL}`} alt="" className="w-full h-full object-cover rounded-xl" />
                                                    ) : (
                                                        <Package size={20} className="text-white" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-slate-800 text-sm truncate">{item.ProductName}</h4>
                                                    <p className="text-xs text-slate-400">คงเหลือ: {item.CurrentStock}</p>
                                                </div>
                                                <button
                                                    onClick={() => removeFromCart(item.ProductID)}
                                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200">
                                                <span className="text-xs text-slate-500 font-bold">จำนวนเบิก</span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => updateCartQty(item.ProductID, item.qty - 1)}
                                                        className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-all border border-slate-200"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <span className="w-12 text-center font-black text-lg">{item.qty}</span>
                                                    <button
                                                        onClick={() => updateCartQty(item.ProductID, item.qty + 1)}
                                                        disabled={item.qty >= item.CurrentStock}
                                                        className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-all border border-slate-200 disabled:opacity-50"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>

                            {/* Cart Footer */}
                            {cart.length > 0 && (
                                <div className="p-4 border-t border-slate-200 bg-white">
                                    <button
                                        onClick={executeWithdrawAll}
                                        className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold py-4 rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2"
                                    >
                                        <ShoppingBag size={20} />
                                        ยืนยันการเบิกทั้งหมด ({getCartTotal()} ชิ้น)
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Result Modal */}
            <AnimatePresence>
                {resultModal.isOpen && (
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
                            <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${resultModal.type === 'success' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                                {resultModal.type === 'success' ? (
                                    <Check size={32} className="text-emerald-600" />
                                ) : (
                                    <AlertTriangle size={32} className="text-amber-600" />
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
                )}
            </AnimatePresence>
        </div>
    );
};

export default WithdrawPage;
