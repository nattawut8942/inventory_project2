import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Shield, AlertTriangle, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:3001/api';

const AdminUsersPage = () => {
    const { user } = useAuth();
    const [adminUsers, setAdminUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newUsername, setNewUsername] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [resultModal, setResultModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });

    const fetchAdminUsers = async () => {
        try {
            const res = await fetch(`${API_BASE}/admin-users`);
            const data = await res.json();
            setAdminUsers(data);
        } catch (err) {
            console.error('Error fetching admin users:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdminUsers();
    }, []);

    const handleAddAdmin = async () => {
        if (!newUsername.trim()) return;

        try {
            const res = await fetch(`${API_BASE}/admin-users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: newUsername.trim(), createdBy: user?.username })
            });
            const data = await res.json();

            if (res.ok) {
                setResultModal({
                    isOpen: true,
                    type: 'success',
                    title: 'เพิ่มสำเร็จ!',
                    message: `เพิ่ม ${newUsername} เป็น Admin แล้ว`
                });
                setNewUsername('');
                setShowAddModal(false);
                fetchAdminUsers();
            } else {
                setResultModal({
                    isOpen: true,
                    type: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    message: data.error || 'ไม่สามารถเพิ่ม Admin ได้'
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

    const handleDeleteAdmin = async (username) => {
        if (!window.confirm(`ต้องการลบ ${username} ออกจาก Admin หรือไม่?`)) return;

        try {
            const res = await fetch(`${API_BASE}/admin-users/${username}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setResultModal({
                    isOpen: true,
                    type: 'success',
                    title: 'ลบสำเร็จ!',
                    message: `ลบ ${username} ออกจาก Admin แล้ว`
                });
                fetchAdminUsers();
            } else {
                const data = await res.json();
                setResultModal({
                    isOpen: true,
                    type: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    message: data.error || 'ไม่สามารถลบ Admin ได้'
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

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between"
            >
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                        <Shield size={28} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-800">Admin Users</h2>
                        <p className="text-slate-500">จัดการสิทธิ์ผู้ดูแลระบบ (Staff Role)</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                >
                    <Plus size={18} />
                    เพิ่ม Admin
                </button>
            </motion.div>

            {/* Stats Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-3xl p-6 text-white shadow-xl"
            >
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                        <Users size={32} />
                    </div>
                    <div>
                        <p className="text-white/80 text-sm">Total Admin Users</p>
                        <p className="text-4xl font-black">{adminUsers.length}</p>
                    </div>
                </div>
            </motion.div>

            {/* Admin Users List */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden"
            >
                <div className="p-6 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800">รายชื่อ Admin ทั้งหมด</h3>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-slate-400">กำลังโหลด...</div>
                ) : adminUsers.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">ไม่มีข้อมูล Admin</div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <th className="px-6 py-4">Username</th>
                                <th className="px-6 py-4">เพิ่มเมื่อ</th>
                                <th className="px-6 py-4">เพิ่มโดย</th>
                                <th className="px-6 py-4 text-right">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {adminUsers.map((admin, idx) => (
                                <motion.tr
                                    key={admin.ID}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="border-b border-slate-100 hover:bg-slate-50"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold">
                                                {admin.Username?.[0]?.toUpperCase() || '?'}
                                            </div>
                                            <span className="font-bold text-slate-800">{admin.Username}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 text-sm">{formatDate(admin.CreatedAt)}</td>
                                    <td className="px-6 py-4 text-slate-500 text-sm">{admin.CreatedBy || '-'}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDeleteAdmin(admin.Username)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="ลบ Admin"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </motion.div>

            {/* Add Admin Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                            <Plus size={20} />
                                        </div>
                                        <h3 className="text-lg font-bold">เพิ่ม Admin ใหม่</h3>
                                    </div>
                                    <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white/10 rounded-lg">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block tracking-wider">Username (AD User)</label>
                                    <input
                                        type="text"
                                        value={newUsername}
                                        onChange={(e) => setNewUsername(e.target.value)}
                                        placeholder="e.g. john.d"
                                        className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl focus:ring-2 focus:ring-amber-100 focus:border-amber-500 outline-none text-slate-800 font-medium"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        onClick={handleAddAdmin}
                                        disabled={!newUsername.trim()}
                                        className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold py-3 rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
                                    >
                                        เพิ่ม Admin
                                    </button>
                                </div>
                            </div>
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
                        className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="w-full max-w-sm bg-white rounded-3xl p-8 text-center shadow-2xl"
                        >
                            <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${resultModal.type === 'success' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                                {resultModal.type === 'success' ? (
                                    <Check size={40} className="text-emerald-600" />
                                ) : (
                                    <AlertTriangle size={40} className="text-red-600" />
                                )}
                            </div>
                            <h3 className="font-black text-2xl text-slate-800 mb-2">{resultModal.title}</h3>
                            <p className="text-slate-500 mb-6">{resultModal.message}</p>
                            <button
                                onClick={() => setResultModal({ ...resultModal, isOpen: false })}
                                className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all"
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

export default AdminUsersPage;
