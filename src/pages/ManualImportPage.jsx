import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CheckCircle, X, Package, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:3001/api';

const ManualImportPage = () => {
    const { deviceTypes, refreshData } = useData();
    const { user } = useAuth();
    const navigate = useNavigate();

    // Result Modal State
    const [resultModal, setResultModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);

        try {
            const res = await fetch(`${API_BASE}/products/manual-import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...Object.fromEntries(fd),
                    UserID: user.username
                })
            });

            if (res.ok) {
                refreshData();
                setResultModal({
                    isOpen: true,
                    type: 'success',
                    title: 'นำเข้าสำเร็จ!',
                    message: 'รายการสินค้าถูกเพิ่มเข้าสู่ระบบเรียบร้อยแล้ว'
                });
            } else {
                setResultModal({
                    isOpen: true,
                    type: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    message: 'ไม่สามารถนำเข้าสินค้าได้ กรุณาลองใหม่อีกครั้ง'
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
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4"
            >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <Plus size={28} className="text-white" />
                </div>
                <div>
                    <h2 className="text-3xl font-black text-slate-800">Manual Import</h2>
                    <p className="text-slate-500">นำเข้าสินค้าใหม่โดยไม่อ้างอิง PO</p>
                </div>
            </motion.div>

            {/* Form Card - Full Width */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden"
            >
                <form onSubmit={handleSubmit}>
                    {/* Form Body */}
                    <div className="p-8 space-y-6">
                        {/* Product Name - Full Row */}
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block tracking-wider">ชื่อสินค้า *</label>
                            <input
                                name="ProductName"
                                required
                                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-slate-800 font-medium placeholder:text-slate-400 text-lg"
                                placeholder="e.g. Dell Monitor 24 inch..."
                            />
                        </div>

                        {/* 2 Column Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block tracking-wider">ประเภท *</label>
                                <select
                                    name="DeviceType"
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-slate-800 font-medium"
                                >
                                    <option value="">-- เลือกประเภท --</option>
                                    {deviceTypes.map(t => <option key={t.TypeId} value={t.TypeId}>{t.Label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block tracking-wider">ราคา (บาท) *</label>
                                <input
                                    name="LastPrice"
                                    type="number"
                                    step="0.01"
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-slate-800 font-medium"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block tracking-wider">จำนวนคงคลัง *</label>
                                <input
                                    name="CurrentStock"
                                    type="number"
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-slate-800 font-medium"
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block tracking-wider">Min Stock Alert *</label>
                                <input
                                    name="MinStock"
                                    type="number"
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-slate-800 font-medium"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        {/* Additional Fields Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block tracking-wider">Max Stock (Optional)</label>
                                <input
                                    name="MaxStock"
                                    type="number"
                                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-slate-800 font-medium"
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block tracking-wider">หมายเหตุ (Optional)</label>
                                <input
                                    name="Remark"
                                    type="text"
                                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-slate-800 font-medium"
                                    placeholder="รายละเอียดเพิ่มเติม..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Form Footer */}
                    <div className="px-8 py-6 bg-slate-50 border-t border-slate-200 flex gap-4">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="flex-1 bg-white border border-slate-200 text-slate-600 font-bold py-4 rounded-xl hover:bg-slate-100 transition-all"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            className="flex-[2] bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg hover:from-indigo-600 hover:to-indigo-700 transition-all flex items-center justify-center gap-2"
                        >
                            <Package size={20} />
                            ยืนยันการนำเข้า
                        </button>
                    </div>
                </form>
            </motion.div>

            {/* Result Modal - Centered */}
            <AnimatePresence>
                {resultModal.isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[80] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-3xl p-8 text-center max-w-md w-full shadow-2xl"
                        >
                            <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${resultModal.type === 'success' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                                {resultModal.type === 'success' ? (
                                    <Check size={40} className="text-emerald-600" />
                                ) : (
                                    <X size={40} className="text-red-600" />
                                )}
                            </div>
                            <h3 className="font-black text-2xl text-slate-800 mb-2">{resultModal.title}</h3>
                            <p className="text-slate-500 mb-6">{resultModal.message}</p>
                            <button
                                onClick={handleCloseResult}
                                className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all"
                            >
                                {resultModal.type === 'success' ? 'ไปหน้า Inventory' : 'ปิด'}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ManualImportPage;
