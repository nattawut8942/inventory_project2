import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CheckCircle } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import AlertModal from '../components/AlertModal';

const API_BASE = 'http://localhost:3001/api';

const ManualImportPage = () => {
    const { deviceTypes, refreshData } = useData();
    const { user } = useAuth();
    const navigate = useNavigate();

    // Modal State
    const [alertModal, setAlertModal] = useState({ isOpen: false, type: 'info', title: '', message: '' });

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
                setAlertModal({
                    isOpen: true,
                    type: 'success',
                    title: 'นำเข้าสำเร็จ!',
                    message: 'รายการสินค้าถูกเพิ่มเข้าสู่ระบบเรียบร้อยแล้ว'
                });
            } else {
                setAlertModal({
                    isOpen: true,
                    type: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    message: 'ไม่สามารถนำเข้าสินค้าได้ กรุณาลองใหม่อีกครั้ง'
                });
            }
        } catch (err) {
            setAlertModal({
                isOpen: true,
                type: 'error',
                title: 'Connection Error',
                message: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้'
            });
        }
    };

    const handleCloseAlert = () => {
        setAlertModal({ ...alertModal, isOpen: false });
        if (alertModal.type === 'success') {
            navigate('/inventory');
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 pt-10 animate-in fade-in slide-in-from-bottom-5">
            <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-xl shadow-slate-200/50">
                <h2 className="text-2xl font-black mb-2 flex items-center gap-3 text-slate-800">
                    <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
                        <Plus size={24} />
                    </div>
                    Manual Import
                </h2>
                <p className="text-slate-500 text-sm mb-8 ml-14">Import legacy items manually without PO reference.</p>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-2 gap-5">
                        <div className="col-span-2">
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block tracking-wider">Product Name</label>
                            <input
                                name="ProductName"
                                required
                                className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-slate-800 font-medium placeholder:text-slate-400"
                                placeholder="e.g. Dell Monitor..."
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block tracking-wider">Type</label>
                            <select
                                name="DeviceType"
                                className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-slate-800 font-medium"
                            >
                                {deviceTypes.map(t => <option key={t.TypeId} value={t.TypeId}>{t.Label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block tracking-wider">Price</label>
                            <input
                                name="LastPrice"
                                type="number"
                                step="0.01"
                                required
                                className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-slate-800 font-medium"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block tracking-wider">Current Stock</label>
                            <input
                                name="CurrentStock"
                                type="number"
                                required
                                className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-slate-800 font-medium"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block tracking-wider">Min. Alert</label>
                            <input
                                name="MinStock"
                                type="number"
                                required
                                className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-slate-800 font-medium"
                                placeholder="0"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="flex-1 bg-white border border-slate-200 text-slate-600 font-bold py-4 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-all hover:shadow-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02]"
                        >
                            Confirm Import
                        </button>
                    </div>
                </form>
            </div>

            {/* Success/Error Modal */}
            <AlertModal
                isOpen={alertModal.isOpen}
                onClose={handleCloseAlert}
                type={alertModal.type}
                title={alertModal.title}
                message={alertModal.message}
            />
        </div>
    );
};

export default ManualImportPage;

