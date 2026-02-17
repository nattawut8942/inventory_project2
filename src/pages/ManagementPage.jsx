import React, { useState, useEffect } from 'react';
import { Users, Settings, Truck, Plus, Trash2, Edit2, Search, Check, X, Shield, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import Portal from '../components/Portal';
import AlertModal from '../components/AlertModal';

const API_BASE = 'http://localhost:3001/api';

const ManagementPage = () => {
    const { user } = useAuth();
    const { deviceTypes, vendors, refreshData } = useData();
    const [activeTab, setActiveTab] = useState('admin'); // admin, types, vendors
    const [searchTerm, setSearchTerm] = useState('');

    // Admin Users State
    const [adminUsers, setAdminUsers] = useState([]);
    const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);
    const [newAdmin, setNewAdmin] = useState('');
    const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);

    // Types State
    const [isAddTypeOpen, setIsAddTypeOpen] = useState(false);
    const [editingType, setEditingType] = useState(null);
    const [typeForm, setTypeForm] = useState({ TypeId: '', Label: '' });

    // Vendors State
    const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState(null);
    const [vendorForm, setVendorForm] = useState({ VendorName: '', ContactInfo: '' });

    // Use AlertModal state instead of local alert
    const [alertModal, setAlertModal] = useState({ isOpen: false, type: 'info', title: '', message: '' });

    // --- Admin Users Logic ---
    const fetchAdminUsers = async () => {
        setIsLoadingAdmins(true);
        try {
            const res = await fetch(`${API_BASE}/admin-users`);
            if (res.ok) {
                setAdminUsers(await res.json());
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingAdmins(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'admin') fetchAdminUsers();
        setSearchTerm(''); // Clear search when tab changes
    }, [activeTab]);

    const handleAddAdmin = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_BASE}/admin-users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: newAdmin, createdBy: user?.username })
            });
            const data = await res.json();
            if (data.success) {
                setAlertModal({ isOpen: true, type: 'success', title: 'สำเร็จ (Success)', message: 'เพิ่มผู้ดูแลระบบสำเร็จ (Admin added successfully)' });
                setNewAdmin('');
                setIsAddAdminOpen(false);
                fetchAdminUsers();
            } else {
                setAlertModal({ isOpen: true, type: 'error', title: 'เกิดข้อผิดพลาด (Error)', message: data.error || 'ไม่สามารถเพิ่มผู้ดูแลได้ (Failed to add admin)' });
            }
        } catch (err) {
            setAlertModal({ isOpen: true, type: 'error', title: 'เกิดข้อผิดพลาด (Error)', message: err.message });
        }
    };

    const handleDeleteAdmin = (username) => {
        setAlertModal({
            isOpen: true,
            type: 'danger',
            title: 'ยืนยันการลบ ',
            message: `คุณแน่ใจหรือไม่ที่จะลบสิทธิ์ผู้ดูแลระบบของ ${username}? (Are you sure you want to remove admin access for ${username}?)`,
            confirmText: 'ลบผู้ดูแล ',
            cancelText: 'ยกเลิก ',
            onConfirm: async () => {
                try {
                    const res = await fetch(`${API_BASE}/admin-users/${username}`, { method: 'DELETE' });
                    if (res.ok) {
                        setAlertModal({ isOpen: true, type: 'success', title: 'สำเร็จ (Success)', message: 'ลบผู้ดูแลระบบสำเร็จ (Admin removed successfully)' });
                        fetchAdminUsers();
                    } else {
                        const data = await res.json();
                        setAlertModal({ isOpen: true, type: 'error', title: 'เกิดข้อผิดพลาด (Error)', message: data.error || 'ไม่สามารถลบผู้ดูแลได้ (Failed to remove admin)' });
                    }
                } catch (err) {
                    setAlertModal({ isOpen: true, type: 'error', title: 'เกิดข้อผิดพลาด (Error)', message: err.message });
                }
            },
            onCancel: () => setAlertModal(prev => ({ ...prev, isOpen: false }))
        });
    };

    // --- Types Logic ---
    const handleSaveType = async (e) => {
        e.preventDefault();
        try {
            const isEdit = !!editingType;
            const url = isEdit ? `${API_BASE}/types/${typeForm.TypeId}` : `${API_BASE}/types`;
            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(typeForm)
            });

            const data = await res.json();
            if (data.success) {
                setAlertModal({ isOpen: true, type: 'success', title: 'สำเร็จ (Success)', message: `บันทึกข้อมูลหมวดหมู่สำเร็จ (Category ${isEdit ? 'Updated' : 'Added'})` });
                setIsAddTypeOpen(false);
                setEditingType(null);
                setTypeForm({ TypeId: '', Label: '' });
                refreshData();
            } else {
                setAlertModal({ isOpen: true, type: 'error', title: 'เกิดข้อผิดพลาด (Error)', message: data.error });
            }
        } catch (err) {
            setAlertModal({ isOpen: true, type: 'error', title: 'เกิดข้อผิดพลาด (Error)', message: err.message });
        }
    };

    const handleDeleteType = (id) => {
        setAlertModal({
            isOpen: true,
            type: 'danger',
            title: 'ลบหมวดหมู่ ',
            message: `คุณแน่ใจหรือไม่ที่จะลบหมวดหมู่ "${id}"? (Are you sure you want to delete Device Type "${id}"?)`,
            confirmText: 'ลบหมวดหมู่ ',
            cancelText: 'ยกเลิก ',
            onConfirm: async () => {
                try {
                    const res = await fetch(`${API_BASE}/types/${id}`, { method: 'DELETE' });
                    const data = await res.json();
                    if (data.success) {
                        setAlertModal({ isOpen: true, type: 'success', title: 'สำเร็จ (Success)', message: 'ลบหมวดหมู่สำเร็จ (Device Type deleted successfully)' });
                        refreshData();
                    } else {
                        setAlertModal({ isOpen: true, type: 'error', title: 'เกิดข้อผิดพลาด (Error)', message: data.error });
                    }
                } catch (err) {
                    setAlertModal({ isOpen: true, type: 'error', title: 'เกิดข้อผิดพลาด (Error)', message: err.message });
                }
            },
            onCancel: () => setAlertModal(prev => ({ ...prev, isOpen: false }))
        });
    };

    // --- Vendors Logic ---
    const handleSaveVendor = async (e) => {
        e.preventDefault();
        try {
            const isEdit = !!editingVendor;
            const url = isEdit ? `${API_BASE}/vendors/${editingVendor.VendorID}` : `${API_BASE}/vendors`;
            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(vendorForm)
            });

            const data = await res.json();
            if (data.success) {
                setAlertModal({ isOpen: true, type: 'success', title: 'สำเร็จ (Success)', message: `บันทึกข้อมูลผู้จัดหาสำเร็จ (Vendor ${isEdit ? 'Updated' : 'Added'})` });
                setIsAddVendorOpen(false);
                setEditingVendor(null);
                setVendorForm({ VendorName: '', ContactInfo: '' });
                refreshData();
            } else {
                setAlertModal({ isOpen: true, type: 'error', title: 'เกิดข้อผิดพลาด (Error)', message: data.error });
            }
        } catch (err) {
            setAlertModal({ isOpen: true, type: 'error', title: 'เกิดข้อผิดพลาด (Error)', message: err.message });
        }
    };

    const handleDeleteVendor = (id) => {
        setAlertModal({
            isOpen: true,
            type: 'danger',
            title: 'ลบผู้จัดหา ',
            message: 'คุณแน่ใจหรือไม่ที่จะลบผู้จัดหานี้? (Are you sure you want to delete this vendor?)',
            confirmText: 'ลบผู้จัดหา ',
            cancelText: 'ยกเลิก ',
            onConfirm: async () => {
                try {
                    const res = await fetch(`${API_BASE}/vendors/${id}`, { method: 'DELETE' });
                    const data = await res.json();
                    if (data.success) {
                        setAlertModal({ isOpen: true, type: 'success', title: 'สำเร็จ (Success)', message: 'ลบผู้จัดหาสำเร็จ (Vendor deleted successfully)' });
                        refreshData();
                    } else {
                        setAlertModal({ isOpen: true, type: 'error', title: 'เกิดข้อผิดพลาด (Error)', message: data.error });
                    }
                } catch (err) {
                    setAlertModal({ isOpen: true, type: 'error', title: 'เกิดข้อผิดพลาด (Error)', message: err.message });
                }
            },
            onCancel: () => setAlertModal(prev => ({ ...prev, isOpen: false }))
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header & Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 mb-2">Management System</h2>
                    <p className="text-slate-500 font-medium">จัดการผู้ใช้งาน หมวดหมู่อุปกรณ์ และผู้จัดหา </p>
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl self-start md:self-auto">
                    {[
                        { id: 'admin', label: 'Admin', icon: Users },
                        { id: 'types', label: 'Types', icon: Settings },
                        { id: 'vendors', label: 'Vendors', icon: Truck }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Global Search Bar for Active Tab */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                    type="text"
                    placeholder={`ค้นหาใน ${activeTab === 'admin' ? 'ผู้ดูแลระบบ (Admins)' : activeTab === 'types' ? 'หมวดหมู่ (Types)' : 'ผู้จัดหา (Vendors)'}...`}
                    className="w-full bg-white border border-slate-200 pl-12 pr-4 py-3 rounded-xl shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 min-h-[400px]">
                {/* ADMIN TAB */}
                {activeTab === 'admin' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-2">System Administrators</h3>
                                <p className="text-slate-500 text-xs">จัดการผู้ใช้งานที่มีสิทธิ์เข้าถึงเต็มรูปแบบ (Manage full access users)</p>
                            </div>
                            <button
                                onClick={() => setIsAddAdminOpen(true)}
                                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all hover:scale-105"
                            >
                                <Plus size={18} />
                                เพิ่ม Admin
                            </button>
                        </div>

                        {isLoadingAdmins ? (
                            <div className="text-center py-10 text-slate-400">Loading...</div>
                        ) : (
                            <>
                                {adminUsers.filter(u => u.Username.toLowerCase().includes(searchTerm.toLowerCase())).length > 0 ? (
                                    <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                                        {adminUsers.filter(u => u.Username.toLowerCase().includes(searchTerm.toLowerCase())).map(admin => (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                whileHover={{ y: -2 }}
                                                key={admin.ID}
                                                className="relative overflow-hidden flex justify-between items-center p-4 rounded-xl border border-slate-100 hover:bg-white hover:border-indigo-100 hover:shadow-lg transition-all group bg-white"
                                            >
                                                {/* Decorative Gradient */}
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 opacity-[0.03] rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

                                                <div className="flex items-center gap-4 relative z-10">
                                                    <div className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-110 transition-transform">
                                                        <Shield size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800">{admin.Username}</p>
                                                        <p className="text-xs text-slate-400">เพิ่มโดย  {admin.CreatedBy || 'System'}</p>
                                                    </div>
                                                </div>
                                                {admin.Username.toLowerCase() !== 'admin' && (
                                                    <button
                                                        onClick={() => handleDeleteAdmin(admin.Username)}
                                                        className="relative z-10 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-slate-400">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Search className="h-8 w-8 text-slate-300" />
                                        </div>
                                        <p className="font-medium text-slate-600">ไม่พบผู้ดูแลระบบ (No admins found)</p>
                                        <p className="text-xs">ลองปรับคำค้นหาใหม่ (Try adjusting your search terms)</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )
                }

                {/* TYPES TAB */}
                {
                    activeTab === 'types' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-2">Device Types</h3>
                                    <p className="text-slate-500 text-xs">จัดการประเภทและหมวดหมู่ของอุปกรณ์ (Manage Product Categorization)</p>
                                </div>
                                <button
                                    onClick={() => { setEditingType(null); setTypeForm({ TypeId: '', Label: '' }); setIsAddTypeOpen(true); }}
                                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all hover:scale-105"
                                >
                                    <Plus size={18} />
                                    เพิ่ม Types
                                </button>
                            </div>

                            {deviceTypes.filter(t => t.Label.toLowerCase().includes(searchTerm.toLowerCase()) || t.TypeId.toLowerCase().includes(searchTerm.toLowerCase())).length > 0 ? (
                                <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                                    {deviceTypes.filter(t => t.Label.toLowerCase().includes(searchTerm.toLowerCase()) || t.TypeId.toLowerCase().includes(searchTerm.toLowerCase())).map(type => (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            whileHover={{ y: -2 }}
                                            key={type.TypeId}
                                            className="relative overflow-hidden flex justify-between items-center p-4 rounded-xl border border-slate-100 hover:shadow-lg hover:border-emerald-100 transition-all group bg-white"
                                        >
                                            {/* Decorative Gradient */}
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-600 opacity-[0.05] rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

                                            <div className="flex items-center gap-3 relative z-10">
                                                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                                                    <Settings size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800">{type.Label}</p>
                                                    <p className="text-xs text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded w-fit mt-0.5">{type.TypeId}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity relative z-10">
                                                <button
                                                    onClick={() => { setEditingType(type); setTypeForm(type); setIsAddTypeOpen(true); }}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteType(type.TypeId)}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-slate-400">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Search className="h-8 w-8 text-slate-300" />
                                    </div>
                                    <p className="font-medium text-slate-600">ไม่พบหมวดหมู่ (No types found)</p>
                                    <p className="text-xs">ลองปรับคำค้นหาใหม่ (Try adjusting your search terms)</p>
                                </div>
                            )}
                        </div>
                    )
                }

                {/* VENDORS TAB */}
                {
                    activeTab === 'vendors' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-2">Vendors</h3>
                                    <p className="text-slate-500 text-xs">จัดการข้อมูลผู้จัดหาและข้อมูลติดต่อ (Manage Suppliers & Contact Info)</p>
                                </div>
                                <button
                                    onClick={() => { setEditingVendor(null); setVendorForm({ VendorName: '', ContactInfo: '' }); setIsAddVendorOpen(true); }}
                                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all hover:scale-105"
                                >
                                    <Plus size={18} />
                                    เพิ่ม Vendor
                                </button>
                            </div>

                            {vendors.filter(v => v.VendorName.toLowerCase().includes(searchTerm.toLowerCase())).length > 0 ? (
                                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                                    {vendors.filter(v => v.VendorName.toLowerCase().includes(searchTerm.toLowerCase())).map(vendor => (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            whileHover={{ y: -2 }}
                                            key={vendor.VendorID}
                                            className="relative overflow-hidden p-4 rounded-xl border border-slate-100 hover:shadow-lg hover:border-orange-100 transition-all group bg-white"
                                        >
                                            {/* Decorative Gradient */}
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500 to-amber-600 opacity-[0.05] rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

                                            <div className="flex justify-between items-start mb-2 relative z-10">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                                                        <Truck size={20} />
                                                    </div>
                                                    <h4 className="font-bold text-slate-800">{vendor.VendorName}</h4>
                                                </div>
                                                <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => { setEditingVendor(vendor); setVendorForm(vendor); setIsAddVendorOpen(true); }}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteVendor(vendor.VendorID)}
                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 relative z-10">{vendor.ContactInfo || 'ไม่มีข้อมูลติดต่อ (No contact info)'}</p>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-slate-400">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Search className="h-8 w-8 text-slate-300" />
                                    </div>
                                    <p className="font-medium text-slate-600">ไม่พบผู้จัดหา (No vendors found)</p>
                                    <p className="text-xs">ลองปรับคำค้นหาใหม่ (Try adjusting your search terms)</p>
                                </div >
                            )
                            }
                        </div >
                    )
                }
            </div >

            {/* MODALS */}

            {/* Add Admin Modal */}
            <AnimatePresence>
                {isAddAdminOpen && (
                    <Portal>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4"
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/20"
                            >
                                <div className="p-6 bg-gradient-to-r from-violet-600 to-indigo-600 text-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                                    <div className="flex justify-between items-start relative z-10">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1 opacity-90">
                                                <Shield size={16} />
                                                <span className="text-sm font-bold uppercase tracking-wider">ผู้ดูแลระบบ (Admin)</span>
                                            </div>
                                            <h3 className="font-black text-2xl tracking-tight">เพิ่มผู้ดูแลใหม่</h3>
                                        </div>
                                        <button onClick={() => setIsAddAdminOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>

                                <form onSubmit={handleAddAdmin} className="flex flex-col h-full">
                                    <div className="p-6 bg-slate-50/50 space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">ชื่อผู้ใช้งาน (Username)</label>
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="e.g. jdoe"
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-slate-700"
                                                value={newAdmin}
                                                onChange={(e) => setNewAdmin(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsAddAdminOpen(false)}
                                            className="flex-1 bg-white border border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-all"
                                        >
                                            ยกเลิก
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!newAdmin}
                                            className="flex-[2] bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold py-3 rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none"
                                        >
                                            เพิ่ม Admin
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    </Portal>
                )}
            </AnimatePresence>

            {/* Add/Edit Type Modal */}
            <AnimatePresence>
                {isAddTypeOpen && (
                    <Portal>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4"
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/20"
                            >
                                <div className="p-6 bg-gradient-to-r from-violet-600 to-indigo-600 text-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                                    <div className="flex justify-between items-start relative z-10">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1 opacity-90">
                                                <Settings size={16} />
                                                <span className="text-sm font-bold uppercase tracking-wider">หมวดหมู่ (Device Type)</span>
                                            </div>
                                            <h3 className="font-black text-2xl tracking-tight">{editingType ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}</h3>
                                        </div>
                                        <button onClick={() => setIsAddTypeOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>

                                <form onSubmit={handleSaveType} className="flex flex-col h-full">
                                    <div className="p-6 bg-slate-50/50 space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">รหัสหมวดหมู่ (Type ID)</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Laptop"
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
                                                value={typeForm.TypeId}
                                                onChange={(e) => setTypeForm({ ...typeForm, TypeId: e.target.value })}
                                                disabled={!!editingType}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">ชื่อหมวดหมู่ (Label)</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Laptop Computer"
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-slate-700"
                                                value={typeForm.Label}
                                                onChange={(e) => setTypeForm({ ...typeForm, Label: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsAddTypeOpen(false)}
                                            className="flex-1 bg-white border border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-all"
                                        >
                                            ยกเลิก
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!typeForm.TypeId || !typeForm.Label}
                                            className="flex-[2] bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold py-3 rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none"
                                        >
                                            {editingType ? 'บันทึกการแก้ไข' : 'บันทึก'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    </Portal>
                )}
            </AnimatePresence>

            {/* Add/Edit Vendor Modal */}
            <AnimatePresence>
                {isAddVendorOpen && (
                    <Portal>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4"
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/20"
                            >
                                <div className="p-6 bg-gradient-to-r from-violet-600 to-indigo-600 text-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                                    <div className="flex justify-between items-start relative z-10">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1 opacity-90">
                                                <Truck size={16} />
                                                <span className="text-sm font-bold uppercase tracking-wider">ผู้จัดหา (Vendor)</span>
                                            </div>
                                            <h3 className="font-black text-2xl tracking-tight">{editingVendor ? 'แก้ไขผู้จัดหา' : 'เพิ่มผู้จัดหาใหม่'}</h3>
                                        </div>
                                        <button onClick={() => setIsAddVendorOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>

                                <form onSubmit={handleSaveVendor} className="flex flex-col h-full">
                                    <div className="p-6 bg-slate-50/50 space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">ชื่อผู้จัดหา (Vendor Name)</label>
                                            <input
                                                type="text"
                                                placeholder="Company Name"
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-slate-700"
                                                value={vendorForm.VendorName}
                                                onChange={(e) => setVendorForm({ ...vendorForm, VendorName: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">ข้อมูลติดต่อ (Contact Info)</label>
                                            <textarea
                                                rows={3}
                                                placeholder="ที่อยู่, เบอร์โทร, อีเมล... (Address, Phone, Email...)"
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-slate-700 resize-none"
                                                value={vendorForm.ContactInfo}
                                                onChange={(e) => setVendorForm({ ...vendorForm, ContactInfo: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsAddVendorOpen(false)}
                                            className="flex-1 bg-white border border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-all"
                                        >
                                            ยกเลิก
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!vendorForm.VendorName}
                                            className="flex-[2] bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold py-3 rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none"
                                        >
                                            {editingVendor ? 'บันทึกการแก้ไข' : 'บันทึก'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    </Portal>
                )}
            </AnimatePresence>

            <AlertModal
                isOpen={alertModal.isOpen}
                type={alertModal.type}
                title={alertModal.title}
                message={alertModal.message}
                onConfirm={alertModal.onConfirm || (() => setAlertModal(prev => ({ ...prev, isOpen: false })))}
                onCancel={alertModal.onCancel}
                confirmText={alertModal.confirmText || "ปิด "}
                cancelText={alertModal.cancelText || "ยกเลิก "}
            />
        </div >
    );
};

export default ManagementPage;
