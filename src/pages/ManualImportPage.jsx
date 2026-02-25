import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CheckCircle, X, Package, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import Portal from '../components/Portal';
import AlertModal from '../components/AlertModal';
import { API_BASE } from '../config/api';

const ManualImportPage = () => {
    const { deviceTypes, products, refreshData } = useData();
    const { user } = useAuth();
    const navigate = useNavigate();

    // Form State
    const [formData, setFormData] = useState({
        ProductName: '',
        DeviceType: '',
        LastPrice: '',
        Quantity: '', // Renamed from CurrentStock for clarity (Qty to add)
        MinStock: '',
        MaxStock: ''
    });

    // Result Modal State
    const [resultModal, setResultModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Auto-fill logic when ProductName changes
        if (name === 'ProductName') {
            const existingProduct = products.find(p => p.ProductName.toLowerCase() === value.toLowerCase());
            if (existingProduct) {
                setFormData(prev => ({
                    ...prev,
                    ProductName: value,
                    DeviceType: existingProduct.DeviceType,
                    LastPrice: existingProduct.LastPrice,
                    MinStock: existingProduct.MinStock,
                    MaxStock: existingProduct.MaxStock || '',
                    // Keep Quantity empty as it's new import
                }));
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const res = await fetch(`${API_BASE}/products/manual-import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ProductName: formData.ProductName,
                    DeviceType: formData.DeviceType,
                    LastPrice: formData.LastPrice,
                    CurrentStock: formData.Quantity, // Server expects 'CurrentStock' as the Qty to add/set (checking server logic)
                    // Wait, server logic:
                    // If Exists: CurrentStock = CurrentStock + @Qty (Variable name in API body was 'CurrentStock'? No)
                    // Server: const { ProductName, DeviceType, CurrentStock: qty ... } = req.body;
                    // So server accepts 'CurrentStock' as the quantity. Correct.
                    MinStock: formData.MinStock,
                    MaxStock: formData.MaxStock,
                    UserID: user.username
                })
            });

            if (res.ok) {
                refreshData();
                setResultModal({
                    isOpen: true,
                    type: 'success',
                    title: 'นำเข้าสำเร็จ!',
                    message: 'รายการอุปกรณ์ถูกเพิ่มเข้าสู่ระบบเรียบร้อยแล้ว'
                });
            } else {
                setResultModal({
                    isOpen: true,
                    type: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    message: 'ไม่สามารถนำเข้าอุปกรณ์ได้ กรุณาลองใหม่อีกครั้ง'
                });
            }
        } catch (err) {
            setResultModal({
                isOpen: true,
                type: 'error',
                title: 'Connection Error',
                message: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้'
            });
        }
    };

    const handleCloseResult = () => {
        setResultModal({ ...resultModal, isOpen: false });
        if (resultModal.type === 'success') {
            navigate('/inventory');
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in">
            {/* Premium Header */}
            <div className="mb-6">
                <h2 className="text-3xl font-black mb-2  text-slate-800">MANUAL STOCK IMPORT</h2>
                <p className="text-slate-500 font-medium">เพิ่มไอเทมโดยไม่ต้องใช้ PO </p>
            </div>

            {/* Form Card - Full Width */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
            >
                <form onSubmit={handleSubmit}>
                    <div className="flex flex-col lg:flex-row">
                        {/* LEFT COLUMN: Main Info */}
                        <div className="flex-1 p-8 space-y-6 border-b lg:border-b-0 lg:border-r border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                                <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">1</span>
                                Product Details
                            </h3>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block tracking-wider">ชื่ออุปกรณ์</label>
                                <input
                                    list="product-suggestions"
                                    name="ProductName"
                                    value={formData.ProductName}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl focus:ring-2 focus:ring-cyan-100 focus:border-cyan-500 outline-none transition-all text-slate-800 font-bold placeholder:text-slate-400 text-lm"
                                    placeholder="พิมพ์ชื่ออุปกรณ์เพื่อเลือกหรือเพิ่มใหม่"
                                    autoComplete="off"
                                />
                                <datalist id="product-suggestions">
                                    {products.map(p => (
                                        <option key={p.ProductID} value={p.ProductName} />
                                    ))}
                                </datalist>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block tracking-wider">หมวดหมู่</label>
                                <div className="relative">
                                    <select
                                        name="DeviceType"
                                        value={formData.DeviceType}
                                        onChange={handleChange}
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl focus:ring-2 focus:ring-cyan-100 focus:border-cyan-500 outline-none text-slate-800 font-medium appearance-none"
                                    >
                                        <option value="">-- เลือก Category --</option>
                                        {deviceTypes.map(t => <option key={t.TypeId} value={t.TypeId}>{t.Label}</option>)}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Stock & Price */}
                        <div className="flex-1 p-8 space-y-6 bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                                <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm">2</span>
                                STOCK & PRICING
                            </h3>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block tracking-wider">จำนวน </label>
                                    <input
                                        name="Quantity"
                                        type="number"
                                        value={formData.Quantity}
                                        onChange={handleChange}
                                        required
                                        className="w-full bg-white border border-slate-200 p-4 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none text-slate-800 font-bold text-xl"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block tracking-wider">ราคาต่อชิ้น</label>
                                    <input
                                        name="LastPrice"
                                        type="number"
                                        step="0.01"
                                        value={formData.LastPrice}
                                        onChange={handleChange}
                                        required
                                        className="w-full bg-white border border-slate-200 p-4 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none text-slate-800 font-bold text-xl"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 space-y-4">
                                <h4 className="text-sm font-bold text-orange-800 uppercase tracking-wide">Stock Limits</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-orange-600/70 uppercase mb-1 block">สต็อกขั้นต่ำ</label>
                                        <input
                                            name="MinStock"
                                            type="number"
                                            value={formData.MinStock}
                                            onChange={handleChange}
                                            required
                                            className="w-full bg-white border border-orange-200 p-3 rounded-xl focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none text-slate-800 font-bold"
                                            placeholder="Min"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-orange-600/70 uppercase mb-1 block">สต็อกสูงสุด</label>
                                        <input
                                            name="MaxStock"
                                            type="number"
                                            value={formData.MaxStock}
                                            onChange={handleChange}
                                            className="w-full bg-white border border-orange-200 p-3 rounded-xl focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none text-slate-800 font-bold"
                                            placeholder="Max"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Form Footer */}
                    <div className="px-8 py-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="px-8 py-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-all"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            className="px-10 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl shadow-lg hover:from-cyan-700 hover:to-blue-700 hover:shadow-cyan-200/50 transition-all flex items-center gap-2 transform active:scale-95"
                        >
                            <Package size={20} />
                            ยืนยันการนำเข้า
                        </button>
                    </div>
                </form>
            </motion.div>

            {/* Result Modal - Centered */}
            {/* Alert Modal */}
            <AlertModal
                isOpen={resultModal.isOpen}
                onConfirm={handleCloseResult}
                type={resultModal.type}
                title={resultModal.title}
                message={resultModal.message}
                confirmText={resultModal.type === 'success' ? 'ไปหน้า Inventory' : 'ปิด'}
            />
        </div>
    );
};

export default ManualImportPage;
