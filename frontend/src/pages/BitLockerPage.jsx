import React, { useState, useEffect } from 'react';
import {
    Shield, Eye, EyeOff, User, Monitor, Clock, Plus, Search,
    Lock, X, PlusCircle, Laptop, ShieldCheck, LayoutDashboard,
    Database, Contact, Edit2, Trash2, Copy, Check, ArrowRight, CheckCircle2, XCircle,
    Filter, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ArrowUpDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import AlertModal from '../components/AlertModal';
import Portal from '../components/Portal';
import { API_BASE } from '../config/api';
import { formatThaiDate } from '../utils/formatDate';

// ─── STAT CARD ───────────────────────────
const StatCard = ({ icon: Icon, title, value, color, subtitle, onClick, isActive }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={onClick}
        className={`bg-white rounded-2xl p-5 shadow-lg border transition-all ${onClick ? 'cursor-pointer hover:shadow-xl' : ''} ${isActive ? 'ring-2 ring-indigo-500 border-transparent scale-[1.02]' : 'border-slate-200'}`}
    >
        <div className="flex items-start justify-between">
            <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">{title}</p>
                <h3 className="text-2xl font-black text-slate-900">{value}</h3>
                {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
            </div>
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
        </div>
    </motion.div>
);

// ─── MAIN COMPONENT ──────────────────────
const BitLockerPage = () => {
    const { user } = useAuth();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);

    // Filters and Pagination
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: 'Hostname', direction: 'asc' });
    const itemsPerPage = 10;

    // Visibility toggles for sensitive fields
    const [visibleFields, setVisibleFields] = useState({});

    // Copied field feedback
    const [copiedField, setCopiedField] = useState(null);

    // Alert
    const [alertModal, setAlertModal] = useState({ isOpen: false, type: 'info', title: '', message: '' });

    const emptyForm = {
        EmployeeId: '',
        UserName: '',
        Hostname: '',
        DiskC_RecoveryKey: '',
        DiskD_RecoveryKey: '',
        SystemPIN: '',
        Status: true,
        Remark: ''
    };

    const [formData, setFormData] = useState(emptyForm);

    // --- DATA ---
    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/bitlocker`);
            if (res.ok) {
                setRecords(await res.json());
            }
        } catch (err) {
            console.error('Failed to fetch bitlocker records:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, []);

    // --- HANDLERS ---
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const isEdit = !!editingRecord;
            const url = isEdit ? `${API_BASE}/bitlocker/${editingRecord.RecordID}` : `${API_BASE}/bitlocker`;
            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, RecordedBy: user?.name || '' })
            });

            const data = await res.json();
            if (data.success || res.ok) {
                setAlertModal({ isOpen: true, type: 'success', title: 'สำเร็จ', message: isEdit ? 'อัปเดตข้อมูล BitLocker สำเร็จ' : 'บันทึกข้อมูล BitLocker สำเร็จ' });
                setIsModalOpen(false);
                setEditingRecord(null);
                setFormData(emptyForm);
                fetchRecords();
            } else {
                setAlertModal({ isOpen: true, type: 'error', title: 'ผิดพลาด', message: data.error || 'เกิดข้อผิดพลาด' });
            }
        } catch (err) {
            setAlertModal({ isOpen: true, type: 'error', title: 'ผิดพลาด', message: err.message });
        }
    };

    const handleDelete = (id) => {
        setAlertModal({
            isOpen: true,
            type: 'danger',
            title: 'ลบข้อมูล BitLocker',
            message: 'คุณแน่ใจหรือไม่ที่จะลบข้อมูลนี้? ข้อมูลจะไม่สามารถกู้คืนได้',
            confirmText: 'ลบ',
            cancelText: 'ยกเลิก',
            onConfirm: async () => {
                try {
                    const res = await fetch(`${API_BASE}/bitlocker/${id}`, { method: 'DELETE' });
                    if (res.ok) {
                        setAlertModal({ isOpen: true, type: 'success', title: 'สำเร็จ', message: 'ลบข้อมูล BitLocker สำเร็จ' });
                        fetchRecords();
                    }
                } catch (err) {
                    setAlertModal({ isOpen: true, type: 'error', title: 'ผิดพลาด', message: err.message });
                }
            },
            onCancel: () => setAlertModal(prev => ({ ...prev, isOpen: false }))
        });
    };

    const openAddModal = () => {
        setEditingRecord(null);
        setFormData(emptyForm);
        setIsModalOpen(true);
    };

    const openEditModal = (record) => {
        setEditingRecord(record);
        setFormData({
            EmployeeId: record.EmployeeId || '',
            UserName: record.UserName || '',
            Hostname: record.Hostname || '',
            DiskC_RecoveryKey: record.DiskC_RecoveryKey || '',
            DiskD_RecoveryKey: record.DiskD_RecoveryKey || '',
            SystemPIN: record.SystemPIN || '',
            Status: record.Status !== false && record.Status !== 0,
            Remark: record.Remark || ''
        });
        setIsModalOpen(true);
    };

    // Toggle visibility
    const toggleVisibility = (id, field) => {
        const key = `${id}-${field}`;
        setVisibleFields(prev => ({ ...prev, [key]: !prev[key] }));
    };
    const isVisible = (id, field) => visibleFields[`${id}-${field}`];

    // Copy to clipboard
    const copyToClipboard = (text, fieldKey) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldKey);
        setTimeout(() => setCopiedField(null), 2000);
    };

    // Sort handler
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Search and Status filter
    const filteredRecords = records.filter(record => {
        const matchesSearch = (record.Hostname || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (record.UserName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (record.EmployeeId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (record.RecordedBy || '').toLowerCase().includes(searchQuery.toLowerCase());

        let matchesStatus = true;
        if (statusFilter === 'active') matchesStatus = record.Status !== false && record.Status !== 0;
        if (statusFilter === 'cancelled') matchesStatus = record.Status === false || record.Status === 0;

        return matchesSearch && matchesStatus;
    });

    // Sorting Logic
    const sortedRecords = [...filteredRecords].sort((a, b) => {
        if (!sortConfig) return 0;

        let keyA = a[sortConfig.key] || '';
        let keyB = b[sortConfig.key] || '';

        // Handle specific sorting cases
        if (sortConfig.key === 'Status') {
            keyA = (a.Status !== false && a.Status !== 0) ? 1 : 0;
            keyB = (b.Status !== false && b.Status !== 0) ? 1 : 0;
        }

        if (keyA < keyB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (keyA > keyB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    // Pagination Logic
    const totalPages = Math.ceil(sortedRecords.length / itemsPerPage);
    const paginatedRecords = sortedRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter]);

    const isAdmin = user?.role === 'Staff';

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="text-3xl font-black text-slate-800">BITLOCKER </h2>
                <p className="text-slate-500 font-medium">Enterprise Data Security Management — ระบบจัดการรหัส BitLocker</p>
            </motion.div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    icon={Database}
                    title="Total Records"
                    value={records.length}
                    color="from-indigo-500 to-indigo-600"
                    subtitle="รายการทั้งหมดในระบบ"
                />
                <StatCard
                    icon={ShieldCheck}
                    title="Security Level"
                    value="Active"
                    color="from-emerald-500 to-emerald-600"
                    subtitle="สถานะความปลอดภัย"
                />
                <StatCard
                    icon={Clock}
                    title="Last Activity"
                    value={records.length > 0 && records[0].CreatedAt ? formatThaiDate(records[0].CreatedAt) : '-'}
                    color="from-amber-500 to-amber-600"
                    subtitle="อัปเดตล่าสุด"
                />
            </div>

            {/* Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                    <div className="flex gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-indigo-100 w-full sm:flex-1 lg:flex-none">
                        <Search size={16} className="text-slate-400 self-center" />
                        <input
                            type="text"
                            placeholder="ค้นหา..."
                            className="bg-transparent border-none outline-none text-sm w-full lg:w-64 text-slate-700 placeholder-slate-400"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Status Filter Dropdown */}
                    <div className="relative w-full sm:w-auto">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-white px-4 py-2.5 pr-8 rounded-xl border border-slate-200 shadow-sm text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 appearance-none min-w-[140px] w-full"
                        >
                            <option value="all">ทั้งหมด (All)</option>
                            <option value="active">ใช้งาน (Active)</option>
                            <option value="cancelled">ยกเลิก (Cancelled)</option>
                        </select>
                        <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {isAdmin && (
                    <button
                        onClick={openAddModal}
                        className="flex justify-center self-start md:self-auto items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-lg hover:shadow-xl transition-all shrink-0"
                    >
                        <Plus size={16} />
                        <span>เพิ่มบันทึกใหม่</span>
                    </button>
                )}
            </div>

            {/* Content */}
            {loading ? (
                <div className="text-center py-20 text-slate-400 font-medium">กำลังโหลดข้อมูล...</div>
            ) : filteredRecords.length === 0 ? (
                <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-slate-200">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-5">
                        <LayoutDashboard className="text-slate-200" size={40} />
                    </div>
                    <h3 className="text-xl font-black text-slate-800">ระบบว่างเปล่า</h3>
                    <p className="text-slate-400 mt-2 max-w-xs mx-auto font-medium">ไม่พบข้อมูลที่คุณกำลังมองหา หรือยังไม่มีการเพิ่มบันทึกในระบบ</p>
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden flex flex-col"
                >
                    <div className="overflow-x-auto max-h-[60vh] 2xl:max-h-[70vh] custom-scrollbar relative">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] tracking-wider border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-3 pl-4 w-12 bg-slate-50 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('RecordID')}>
                                        <div className="flex items-center justify-center gap-1">
                                            #
                                            {sortConfig.key === 'RecordID' ? (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={12} className="opacity-30" />}
                                        </div>
                                    </th>
                                    <th className="p-3 bg-slate-50 min-w-[120px] cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('Hostname')}>
                                        <div className="flex items-center gap-1">
                                            Hostname
                                            {sortConfig.key === 'Hostname' ? (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={12} className="opacity-30" />}
                                        </div>
                                    </th>
                                    <th className="p-3 bg-slate-50 min-w-[140px] cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('UserName')}>
                                        <div className="flex items-center gap-1">
                                            User
                                            {sortConfig.key === 'UserName' ? (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={12} className="opacity-30" />}
                                        </div>
                                    </th>
                                    <th className="p-3 bg-slate-50 min-w-[200px]">Disk C</th>
                                    <th className="p-3 bg-slate-50 min-w-[200px]">Disk D</th>
                                    <th className="p-3 bg-slate-50 min-w-[120px]">PIN</th>
                                    <th className="p-3 bg-slate-50 min-w-[100px] cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('RecordedBy')}>
                                        <div className="flex items-center gap-1">
                                            Record By
                                            {sortConfig.key === 'RecordedBy' ? (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={12} className="opacity-30" />}
                                        </div>
                                    </th>
                                    <th className="p-3 bg-slate-50 min-w-[100px] cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('CreatedAt')}>
                                        <div className="flex items-center gap-1">
                                            เวลาบันทึก
                                            {sortConfig.key === 'CreatedAt' ? (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={12} className="opacity-30" />}
                                        </div>
                                    </th>
                                    <th className="p-3 bg-slate-50 min-w-[100px] text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('Status')}>
                                        <div className="flex items-center justify-center gap-1">
                                            สถานะ
                                            {sortConfig.key === 'Status' ? (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={12} className="opacity-30" />}
                                        </div>
                                    </th>
                                    {isAdmin && (
                                        <th className="p-3 bg-slate-50 w-24 text-center">จัดการ</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedRecords.map((record, idx) => {
                                    const globalIdx = (currentPage - 1) * itemsPerPage + idx;
                                    return (
                                        <motion.tr
                                            key={record.RecordID}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: idx * 0.02 }}
                                            className="hover:bg-slate-50/80 transition-colors"
                                        >
                                            <td className="py-1.5 px-3 pl-4 text-center text-slate-400 font-mono text-xs">{globalIdx + 1}</td>
                                            <td className="py-1.5 px-3 font-bold text-slate-900 text-xs">
                                                {record.Hostname}
                                                {record.Remark && <div className="text-[10px] text-slate-400 font-normal truncate max-w-[140px]" title={record.Remark}>{record.Remark}</div>}
                                            </td>
                                            <td className="py-1.5 px-3 text-lm text-slate-700">
                                                <div className="font-medium">{record.UserName || '-'}</div>
                                                <div className="text-[12px] text-indigo-500">{record.EmployeeId ? `ID: ${record.EmployeeId}` : ''}</div>
                                            </td>

                                            {/* Disk C */}
                                            <td className="py-1.5 px-3">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="font-mono text-xs font-semibold text-slate-700" title={record.DiskC_RecoveryKey || 'N/A'}>
                                                        {isVisible(record.RecordID, 'diskC') ? (record.DiskC_RecoveryKey || 'N/A') : '••••••••••••••••••••••••'}
                                                    </div>
                                                    <div className="flex gap-0.5 shrink-0">
                                                        {record.DiskC_RecoveryKey && isVisible(record.RecordID, 'diskC') && (
                                                            <button onClick={() => copyToClipboard(record.DiskC_RecoveryKey, `${record.RecordID}-diskC`)} className="p-1 text-slate-400 hover:text-emerald-600 rounded bg-white border border-slate-100 shadow-sm" title="Copy">
                                                                {copiedField === `${record.RecordID}-diskC` ? <Check size={12} /> : <Copy size={12} />}
                                                            </button>
                                                        )}
                                                        <button onClick={() => toggleVisibility(record.RecordID, 'diskC')} className="p-1 text-slate-400 hover:text-indigo-600 rounded bg-slate-100">
                                                            {isVisible(record.RecordID, 'diskC') ? <EyeOff size={12} /> : <Eye size={12} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Disk D */}
                                            <td className="py-1.5 px-3">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="font-mono text-xs font-semibold text-slate-700" title={record.DiskD_RecoveryKey || 'N/A'}>
                                                        {isVisible(record.RecordID, 'diskD') ? (record.DiskD_RecoveryKey || 'N/A') : '••••••••••••••••••••••••'}
                                                    </div>
                                                    <div className="flex gap-0.5 shrink-0">
                                                        {record.DiskD_RecoveryKey && isVisible(record.RecordID, 'diskD') && (
                                                            <button onClick={() => copyToClipboard(record.DiskD_RecoveryKey, `${record.RecordID}-diskD`)} className="p-1 text-slate-400 hover:text-emerald-600 rounded bg-white border border-slate-100 shadow-sm" title="Copy">
                                                                {copiedField === `${record.RecordID}-diskD` ? <Check size={12} /> : <Copy size={12} />}
                                                            </button>
                                                        )}
                                                        <button onClick={() => toggleVisibility(record.RecordID, 'diskD')} className="p-1 text-slate-400 hover:text-indigo-600 rounded bg-slate-100">
                                                            {isVisible(record.RecordID, 'diskD') ? <EyeOff size={12} /> : <Eye size={12} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* PIN */}
                                            <td className="py-1.5 px-3">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="font-mono text-xs font-black text-amber-900">
                                                        {isVisible(record.RecordID, 'pin') ? (record.SystemPIN || '---') : '••••••••'}
                                                    </div>
                                                    <div className="flex gap-0.5 shrink-0">
                                                        {record.SystemPIN && isVisible(record.RecordID, 'pin') && (
                                                            <button onClick={() => copyToClipboard(record.SystemPIN, `${record.RecordID}-pin`)} className="p-1 text-amber-500 hover:text-emerald-600 rounded bg-white border border-slate-100 shadow-sm" title="Copy">
                                                                {copiedField === `${record.RecordID}-pin` ? <Check size={12} /> : <Copy size={12} />}
                                                            </button>
                                                        )}
                                                        <button onClick={() => toggleVisibility(record.RecordID, 'pin')} className="p-1 text-amber-500 hover:text-amber-700 rounded bg-amber-50">
                                                            {isVisible(record.RecordID, 'pin') ? <EyeOff size={12} /> : <Eye size={12} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="py-1.5 px-3 text-[10px] text-indigo-600 font-bold">
                                                {record.RecordedBy || '-'}
                                            </td>

                                            <td className="py-1.5 px-3 text-xs text-slate-500">
                                                {record.CreatedAt ? formatThaiDate(record.CreatedAt) : '-'}
                                            </td>

                                            <td className="py-1.5 px-3 text-center">
                                                <span
                                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${record.Status === false || record.Status === 0 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}
                                                >
                                                    {record.Status === false || record.Status === 0 ? 'Cancelled' : 'Active'}
                                                </span>
                                            </td>

                                            {isAdmin && (
                                                <td className="py-1.5 px-3 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button onClick={() => openEditModal(record)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="แก้ไข">
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button onClick={() => handleDelete(record.RecordID)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="ลบ">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}

            {/* Pagination */}
            {paginatedRecords.length > 0 && totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm mt-4">
                    <span className="text-sm font-bold text-slate-500">
                        แสดง {((currentPage - 1) * itemsPerPage) + 1} ถึง {Math.min(currentPage * itemsPerPage, filteredRecords.length)} จาก {filteredRecords.length} รายการ
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-slate-600 transition-colors focus:outline-none"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-sm font-bold text-slate-700 px-2 min-w-[3rem] text-center">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-slate-600 transition-colors focus:outline-none"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {isModalOpen && (
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
                                className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/20 my-8"
                            >
                                {/* Modal Header */}
                                <div className="p-5 md:p-6 bg-gradient-to-r from-slate-900 to-indigo-900 text-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                                    <div className="flex justify-between items-start relative z-10">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1 opacity-90">
                                                <ShieldCheck size={16} />
                                                <span className="text-xs font-bold uppercase tracking-wider">BitLocker </span>
                                            </div>
                                            <h3 className="font-black text-2xl tracking-tight">
                                                {editingRecord ? 'แก้ไขข้อมูล' : 'เพิ่มบันทึกใหม่'}
                                            </h3>
                                            <p className="text-indigo-200 text-sm font-medium mt-1">กรอกรายละเอียดเพื่อจัดเก็บข้อมูลเข้าระบบ</p>
                                        </div>
                                        <button
                                            onClick={() => setIsModalOpen(false)}
                                            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>

                                {/* Form */}
                                <form onSubmit={handleSubmit} className="flex flex-col max-h-[calc(100vh-10rem)]">
                                    <div className="p-5 md:p-6 space-y-5 overflow-y-auto">

                                        {/* Basic Info Section */}
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold text-slate-700 mb-1.5 block">Hostname *</label>
                                                    <input
                                                        required
                                                        name="Hostname"
                                                        value={formData.Hostname}
                                                        onChange={handleInputChange}
                                                        placeholder="e.g. PC-DEPT-001"
                                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-slate-700 mb-1.5 block">ชื่อผู้ใช้งาน *</label>
                                                    <input
                                                        required
                                                        name="UserName"
                                                        value={formData.UserName}
                                                        onChange={handleInputChange}
                                                        placeholder="ชื่อ-นามสกุล"
                                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold text-slate-700 mb-1.5 block">รหัสพนักงาน *</label>
                                                    <input
                                                        required
                                                        name="EmployeeId"
                                                        value={formData.EmployeeId}
                                                        onChange={handleInputChange}
                                                        placeholder="e.g. EMP67001"
                                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-slate-700 mb-1.5 block">System PIN</label>
                                                    <input
                                                        name="SystemPIN"
                                                        value={formData.SystemPIN}
                                                        onChange={handleInputChange}
                                                        placeholder="รหัส PIN"
                                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="h-px bg-slate-100 w-full"></div>

                                        {/* Security Keys Section */}
                                        <div className="space-y-4">
                                            <div>
                                                <div className="flex items-center gap-1.5 mb-1.5">
                                                    <Lock size={12} className="text-indigo-500" />
                                                    <label className="text-xs font-bold text-slate-700">Disk C Recovery Key</label>
                                                </div>
                                                <textarea
                                                    name="DiskC_RecoveryKey"
                                                    value={formData.DiskC_RecoveryKey}
                                                    onChange={handleInputChange}
                                                    placeholder="ใส่รหัสกู้คืน 48 หลัก..."
                                                    rows="2"
                                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-mono text-sm resize-none"
                                                />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5 mb-1.5">
                                                    <Lock size={12} className="text-indigo-500" />
                                                    <label className="text-xs font-bold text-slate-700">Disk D Recovery Key</label>
                                                </div>
                                                <textarea
                                                    name="DiskD_RecoveryKey"
                                                    value={formData.DiskD_RecoveryKey}
                                                    onChange={handleInputChange}
                                                    placeholder="ใส่รหัสกู้คืน 48 หลัก..."
                                                    rows="2"
                                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-mono text-sm resize-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-slate-700 mb-1.5 block">หมายเหตุ (Remark)</label>
                                                <textarea
                                                    name="Remark"
                                                    value={formData.Remark}
                                                    onChange={handleInputChange}
                                                    placeholder="บันทึกเพิ่มเติม..."
                                                    rows="2"
                                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-sm resize-none"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-xs font-bold text-slate-700 mb-1.5 block">สถานะ (Status)</label>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, Status: true })}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${formData.Status ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                                        >
                                                            <CheckCircle2 size={14} className="inline mr-1" /> Active
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, Status: false })}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${!formData.Status ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                                        >
                                                            <XCircle size={14} className="inline mr-1" /> Cancelled
                                                        </button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-slate-700 block">ผู้บันทึก</label>
                                                    <div className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-1.5">
                                                        <User size={14} className="text-indigo-400" /> {user?.name || 'ไม่มีข้อมูล'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="p-4 bg-white border-t border-slate-100 flex gap-3 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setIsModalOpen(false)}
                                            className="flex-1 bg-white border border-slate-200 text-slate-600 text-sm font-bold py-3 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-all"
                                        >
                                            ยกเลิก
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!formData.Hostname || !formData.UserName}
                                            className="flex-[2] bg-gradient-to-r from-slate-900 to-indigo-600 text-white text-sm font-bold py-3 rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 group"
                                        >
                                            {editingRecord ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'}
                                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    </Portal>
                )}
            </AnimatePresence>

            {/* Alert Modal */}
            <AlertModal
                isOpen={alertModal.isOpen}
                type={alertModal.type}
                title={alertModal.title}
                message={alertModal.message}
                onConfirm={alertModal.onConfirm || (() => setAlertModal(prev => ({ ...prev, isOpen: false })))}
                onCancel={alertModal.onCancel}
                confirmText={alertModal.confirmText || "ปิด"}
                cancelText={alertModal.cancelText || "ยกเลิก"}
            />
        </div>
    );
};

export default BitLockerPage;
