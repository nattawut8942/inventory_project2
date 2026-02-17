import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Plus, X, Eye, Search, Calendar, Filter, Check, Building2, Upload, FileText, Loader2, RefreshCw, AlertTriangle, Phone, Trash2, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import ProductCombobox from '../components/ProductCombobox';
import VendorCombobox from '../components/VendorCombobox';
import Portal from '../components/Portal';
import AlertModal from '../components/AlertModal';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import Pagination from '../components/Pagination';
import POFormModal from '../components/POFormModal';

const API_BASE = 'http://localhost:3001/api';

import { formatThaiDate } from '../utils/formatDate';

const PurchaseOrdersPage = () => {
    const { purchaseOrders, products, vendors, refreshData, loading } = useData();
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    const [selectedPO, setSelectedPO] = useState(null);

    // Form State (Only for passing to Modal)
    const [modalInitialData, setModalInitialData] = useState(null);

    // Filter & Pagination State
    const [searchTerm, setSearchTerm] = useState('');

    const getDefaultDateRange = () => {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth();
        const startDate = `${y}-${String(m + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(y, m + 1, 0).getDate();
        const endDate = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        return { startDate, endDate };
    };
    const defaultRange = getDefaultDateRange();
    const [dateFrom, setDateFrom] = useState(defaultRange.startDate);
    const [dateTo, setDateTo] = useState(defaultRange.endDate);
    const [filterStatus, setFilterStatus] = useState('all');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const [resultModal, setResultModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });

    const handleEditPO = (po) => {
        setModalInitialData(po);
        setIsEditMode(true);
        setIsModalOpen(true);
    };

    const handleOpenCreateModal = () => {
        setModalInitialData(null);
        setIsEditMode(false);
        setIsModalOpen(true);
    };

    const handleDeletePO = (po) => {
        setResultModal({
            isOpen: true,
            type: 'danger',
            title: 'ยืนยันการลบ',
            message: `คุณต้องการลบใบสั่งซื้อ ${po.PO_ID} ใช่หรือไม่?`,
            onConfirm: async () => {
                try {
                    const res = await fetch(`${API_BASE}/pos/${po.PO_ID}`, {
                        method: 'DELETE'
                    });
                    const data = await res.json();
                    if (res.ok) {
                        setResultModal({
                            isOpen: true,
                            type: 'success',
                            title: 'ลบสำเร็จ',
                            message: 'ลบใบสั่งซื้อเรียบร้อยแล้ว'
                        });
                        refreshData();
                    } else {
                        setResultModal({
                            isOpen: true,
                            type: 'error',
                            title: 'ลบไม่สำเร็จ',
                            message: data.error || data.message
                        });
                    }
                } catch (err) {
                    setResultModal({
                        isOpen: true,
                        type: 'error',
                        title: 'ข้อผิดพลาด',
                        message: err.message
                    });
                }
            }
        });
    };

    const handleModalSuccess = async (formData) => {
        try {
            const url = isEditMode ? `${API_BASE}/pos/${formData.PO_ID}` : `${API_BASE}/pos`;
            const method = isEditMode ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok) {
                setResultModal({
                    isOpen: true,
                    type: 'success',
                    title: isEditMode ? 'แก้ไขใบสั่งซื้อสำเร็จ' : 'สร้างใบสั่งซื้อสำเร็จ',
                    message: isEditMode ? `แก้ไขข้อมูล PO ${formData.PO_ID} เรียบร้อยแล้ว` : `สร้างใบสั่งซื้อ ${formData.PO_ID} เรียบร้อยแล้ว`
                });
                setIsModalOpen(false);
                refreshData();
            } else {
                setResultModal({
                    isOpen: true,
                    type: 'error',
                    title: isEditMode ? 'แก้ไขล้มเหลว' : 'สร้าง PO ไม่สำเร็จ',
                    message: data.error || data.message
                });
            }
        } catch (err) {
            setResultModal({
                isOpen: true,
                type: 'error',
                title: 'ข้อผิดพลาด',
                message: err.message
            });
        }
    };





    const getStatusColor = (status) => {
        switch (status) {
            case 'Completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'Partial': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'Cancelled': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-blue-100 text-blue-700 border-blue-200'; // Pending/Open
        }
    };

    // Filter POs
    const filteredPOs = purchaseOrders.filter(po => {
        const matchSearch = po.PO_ID.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (po.VendorName && po.VendorName.toLowerCase().includes(searchTerm.toLowerCase()));
        // Date range filter
        let matchDate = true;
        if (po.RequestDate) {
            const d = po.RequestDate.slice(0, 10);
            if (dateFrom) matchDate = matchDate && d >= dateFrom;
            if (dateTo) matchDate = matchDate && d <= dateTo;
        }
        const matchStatus = filterStatus === 'all' || po.Status === filterStatus ||
            (filterStatus === 'Pending' && (po.Status === 'Pending' || po.Status === 'Open'));
        return matchSearch && matchDate && matchStatus;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredPOs.length / itemsPerPage);
    const currentTableData = filteredPOs.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, dateFrom, dateTo, filterStatus]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-between items-center"
            >
                <div>
                    <h2 className="text-3xl font-black mb-2 text-slate-800">Purchase Orders</h2>
                    <p className="text-slate-500 font-medium">จัดการใบสั่งซื้อ</p>
                </div>
                {user?.role === 'Staff' && (
                    <button
                        onClick={handleOpenCreateModal}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3 rounded-xl transition-all shadow-lg shadow-indigo-200"
                    >
                        <Plus size={18} /> สร้าง PO ใหม่
                    </button>
                )}
            </motion.div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-5 rounded-2xl text-white shadow-lg  cursor-pointer transition-all " onClick={() => setFilterStatus('all')}>
                    <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1">ทั้งหมด </p>
                    <h3 className="text-3xl font-black">{purchaseOrders.length}</h3>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition-all" onClick={() => setFilterStatus('Pending')}>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">รอดำเนินการ </p>
                    <h3 className="text-2xl font-black text-blue-500">{purchaseOrders.filter(p => p.Status === 'Open' || p.Status === 'Pending').length}</h3>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition-all" onClick={() => setFilterStatus('Partial')}>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">รับบางส่วน </p>
                    <h3 className="text-2xl font-black text-amber-500">{purchaseOrders.filter(p => p.Status === 'Partial').length}</h3>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition-all" onClick={() => setFilterStatus('Completed')}>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">เสร็จสิ้น</p>
                    <h3 className="text-2xl font-black text-emerald-500">{purchaseOrders.filter(p => p.Status === 'Completed').length}</h3>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition-all" onClick={() => setFilterStatus('Cancelled')}>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">ยกเลิก </p>
                    <h3 className="text-2xl font-black text-red-500">{purchaseOrders.filter(p => p.Status === 'Cancelled').length}</h3>
                </div>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap gap-3 items-center scroll-mt-24">
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
                <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                    <Calendar size={18} className="text-slate-400 shrink-0" />
                    <span className="text-xs text-slate-400 shrink-0">เริ่ม</span>
                    <input
                        type="date"
                        className="bg-transparent border-none outline-none text-sm text-slate-700"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                    />
                </div>
                <span className="text-slate-400 font-bold">—</span>
                <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                    <Calendar size={18} className="text-slate-400 shrink-0" />
                    <span className="text-xs text-slate-400 shrink-0">สิ้นสุด</span>
                    <input
                        type="date"
                        className="bg-transparent border-none outline-none text-sm text-slate-700"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm">
                    <Filter size={18} className="text-slate-400 self-center" />
                    <select
                        className="bg-transparent border-none outline-none text-sm text-slate-700"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">ทุกสถานะ</option>
                        <option value="Pending">Pending</option>
                        <option value="Partial">Partial</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>
                </div>
                {(searchTerm || dateFrom !== defaultRange.startDate || dateTo !== defaultRange.endDate || filterStatus !== 'all') && (
                    <button
                        onClick={() => { setSearchTerm(''); setDateFrom(defaultRange.startDate); setDateTo(defaultRange.endDate); setFilterStatus('all'); }}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                        ล้างตัวกรอง
                    </button>
                )}
            </div>

            {/* PO List - Compact Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {currentTableData.map((po, i) => (
                    <motion.div
                        key={po.PO_ID}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group bg-white border border-slate-200 p-4 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden cursor-pointer"
                        onClick={() => setSelectedPO(po)}
                    >
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${po.Status === 'Partial' ? 'from-amber-400 to-orange-500' : po.Status === 'Completed' ? 'from-emerald-400 to-green-500' : po.Status === 'Cancelled' ? 'from-red-400 to-pink-500' : 'from-blue-400 to-indigo-500'} opacity-10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`}></div>

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md bg-gradient-to-br ${po.Status === 'Partial' ? 'from-amber-400 to-orange-500' : po.Status === 'Completed' ? 'from-emerald-500 to-green-600' : po.Status === 'Cancelled' ? 'from-red-500 to-pink-600' : 'from-blue-500 to-indigo-600'}`}>
                                        <ShoppingCart size={20} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="font-black text-slate-800 text-sm truncate">{po.PO_ID}</h4>
                                        <p className="text-[10px] text-slate-500 font-medium truncate">{po.VendorName || 'ไม่ระบุผู้ขาย'}</p>
                                    </div>
                                </div>
                                <span className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full border shadow-sm ${getStatusColor(po.Status)}`}>
                                    {po.Status === 'Open' ? 'Pending' : po.Status}
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-4">
                                {po.BudgetNo && (
                                    <span className="text-[9px] bg-slate-50 text-slate-500 px-2 py-1 rounded-lg border border-slate-100 font-mono">
                                     BudgetNo.: {po.BudgetNo}
                                    </span>
                                )}
                                <span className="text-[9px] bg-slate-50 text-slate-500 px-2 py-1 rounded-lg border border-slate-100 flex items-center gap-1">
                                    <Calendar size={10} /> {formatThaiDate(po.RequestDate)}
                                </span>
                            </div>

                            <div className="mt-auto pt-2 border-t border-slate-50 flex gap-2">
                                <button
                                    className="flex-1 bg-slate-50 text-slate-600 font-bold py-2 rounded-xl text-xs hover:bg-indigo-50 hover:text-indigo-600 border border-slate-100 transition-all flex items-center justify-center gap-1 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 group-hover:shadow-lg"
                                >
                                    <Eye size={14} /> ดูรายละเอียด
                                </button>
                                {user?.role === 'Staff' && (po.Status === 'Open' || po.Status === 'Pending') && (
                                    <>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleEditPO(po); }}
                                            className="px-3 bg-amber-50 text-amber-600 font-bold rounded-xl text-xs hover:bg-amber-100 border border-amber-100 transition-all flex items-center justify-center"
                                            title="แก้ไข"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeletePO(po); }}
                                            className="px-3 bg-red-50 text-red-600 font-bold rounded-xl text-xs hover:bg-red-100 border border-red-100 transition-all flex items-center justify-center"
                                            title="ลบ"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}
                {filteredPOs.length === 0 && (
                    <div className="col-span-full">
                        <EmptyState
                            title="ไม่พบ PO"
                            message="ลองเปลี่ยนตัวกรอง หรือสร้าง PO ใหม่"
                            icon={ShoppingCart}
                            actionLabel={searchTerm || dateFrom !== defaultRange.startDate || filterStatus !== 'all' ? "ล้างตัวกรอง" : "สร้าง PO ใหม่"}
                            onAction={() => {
                                if (searchTerm || dateFrom !== defaultRange.startDate || filterStatus !== 'all') {
                                    setSearchTerm(''); setDateFrom(defaultRange.startDate); setDateTo(defaultRange.endDate); setFilterStatus('all');
                                } else {
                                    handleOpenCreateModal();
                                }
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Pagination */}
            {
                filteredPOs.length > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                        itemsPerPage={itemsPerPage}
                        totalItems={filteredPOs.length}
                    />
                )
            }

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
                                <div className="p-6 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-black text-2xl">{selectedPO.PO_ID}</h3>
                                            <p className="text-indigo-200">{selectedPO.VendorName || 'ไม่ระบุผู้ขาย'}</p>
                                            {(() => {
                                                const normalize = (str) => str ? str.toLowerCase().trim() : '';
                                                const vendor = (vendors || []).find(v => normalize(v.VendorName) === normalize(selectedPO.VendorName));

                                                if (vendor?.ContactInfo) {
                                                    return (
                                                        <div className="mt-2 text-xs bg-white/10 p-2 rounded-lg backdrop-blur-sm border border-white/10 text-indigo-50">
                                                            <p className="font-bold mb-0.5 flex items-center gap-1"><Phone size={10} /> Contact Info:</p>
                                                            <p className="whitespace-pre-wrap">{vendor.ContactInfo}</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}

                                        </div>
                                        <button onClick={() => setSelectedPO(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                                    {/* Status & Date */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 p-4 rounded-xl">
                                            <p className="text-xs text-slate-500 font-bold mb-1">สถานะ</p>
                                            <span className={`text-sm font-bold px-3 py-1 rounded-full border ${getStatusColor(selectedPO.Status)}`}>
                                                {selectedPO.Status === 'Open' ? 'Pending' : selectedPO.Status}
                                            </span>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-xl">
                                            <p className="text-xs text-slate-500 font-bold mb-1">วันที่สร้าง</p>
                                            <p className="text-sm  text-slate-800">{formatThaiDate(selectedPO.RequestDate)}</p>
                                        </div>
                                    </div>

                                    {/* Info Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 p-4 rounded-xl">
                                            <p className="text-xs text-slate-500 font-bold mb-1">ผู้ขอ</p>
                                            <p className="text-sm  text-slate-800">{selectedPO.RequestedBy || '-'}</p>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-xl">
                                            <p className="text-xs text-slate-500 font-bold mb-1">แผนก</p>
                                            <p className="text-sm  text-slate-800">{selectedPO.Section || '-'}</p>
                                        </div>
                                        {selectedPO.DueDate && (
                                            <div className="bg-slate-50 p-4 rounded-xl">
                                                <p className="text-xs text-slate-500 font-bold mb-1">กำหนดส่ง</p>
                                                <p className="text-sm  text-slate-800">{formatThaiDate(selectedPO.DueDate)}</p>
                                            </div>
                                        )}
                                        {selectedPO.PR_No && (
                                            <div className="bg-slate-50 p-4 rounded-xl">
                                                <p className="text-xs text-slate-500 font-bold mb-1">PR No</p>
                                                <p className="text-sm  text-slate-800">{selectedPO.PR_No}</p>
                                            </div>
                                        )}
                                        {selectedPO.BudgetNo && (
                                            <div className="bg-slate-50 p-4 rounded-xl">
                                                <p className="text-xs text-slate-500 font-bold mb-1">Budget No.</p>
                                                <p className="text-sm  text-slate-800">{selectedPO.BudgetNo}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Items List */}
                                    <div >
                                        <h4 className="font-bold text-slate-800 mb-3">รายการอุปกรณ์ ({selectedPO.Items?.length || 0})</h4>
                                        <div className="bg-slate-50 rounded-xl overflow-hidden overflow-x-auto">
                                            <table className="w-full  text-sm">
                                                <thead className="bg-slate-100">
                                                    <tr>
                                                        <th className="text-left p-3 font-bold text-slate-600">รายการ</th>
                                                        <th className="text-center p-3 font-bold text-slate-600 w-24">จำนวน</th>
                                                        <th className="text-center p-3 font-bold text-slate-600 w-28">สถานะ</th>
                                                        <th className="text-right p-3 font-bold text-slate-600 w-28">ราคา/หน่วย</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedPO.Items?.map((item, idx) => {
                                                        const isFullyReceived = (item.QtyReceived || 0) >= item.QtyOrdered;
                                                        return (
                                                            <tr key={idx} className={`border-t ${isFullyReceived ? 'bg-emerald-50/60' : 'border-slate-200'}`}>
                                                                <td className={`p-3 ${isFullyReceived ? 'text-emerald-700 line-through' : 'text-slate-700'}`}>
                                                                    {item.ItemName || item.ProductName || `Item #${idx + 1}`}
                                                                </td>
                                                                <td className="p-3 text-center font-mono">
                                                                    <span className="text-slate-600 font-bold">{item.QtyReceived || 0}</span>
                                                                    <span className="text-slate-400"> / {item.QtyOrdered}</span>
                                                                </td>
                                                                <td className="p-3 text-center">
                                                                    {isFullyReceived ? (
                                                                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-bold border border-emerald-200">
                                                                            <Check size={12} /> รับแล้ว
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                                                            รอรับ
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

                                    {/* Remark */}
                                    {selectedPO.Remark && (
                                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                                            <p className="text-xs text-amber-600 font-bold mb-1">หมายเหตุ</p>
                                            <p className="text-sm text-amber-800">{selectedPO.Remark}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="p-4 bg-slate-50 border-t border-slate-200">
                                    <button
                                        onClick={() => setSelectedPO(null)}
                                        className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-700 transition-all"
                                    >
                                        ปิด
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    </Portal>
                )}
            </AnimatePresence>

            {/* CREATE PO MODAL */}
            <POFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialData={modalInitialData}
                isEditMode={isEditMode}
                products={products}
                vendors={vendors}
                user={user}
                onSuccess={handleModalSuccess}
            />
            {/* RESULT MODAL */}
            {/* ALERT MODAL (Replaces ResultModal) */}
            <AlertModal
                isOpen={resultModal.isOpen}
                onConfirm={() => {
                    if (resultModal.onConfirm) {
                        resultModal.onConfirm();
                    } else {
                        setResultModal({ ...resultModal, isOpen: false });
                    }
                }}
                onCancel={resultModal.type === 'danger' || resultModal.type === 'confirm' ? () => setResultModal({ ...resultModal, isOpen: false }) : undefined}
                type={resultModal.type}
                title={resultModal.title}
                message={resultModal.message}
                confirmText={resultModal.confirmText || "ตกลง "}
                cancelText={resultModal.cancelText || "ยกเลิก"}
            />
        </div >
    );
};

export default PurchaseOrdersPage;
