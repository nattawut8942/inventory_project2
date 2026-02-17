import React, { useState, useRef } from 'react';
import { Search, Monitor, Network, Archive, Database, Package, List, LayoutGrid, Edit2, Trash2, X, TrendingUp, TrendingDown, AlertTriangle, DollarSign, HardDrive, Mouse, Droplet, Printer } from 'lucide-react';
import Barcode from 'react-barcode';
import { motion } from 'motion/react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import AlertModal from '../components/AlertModal';
import Portal from '../components/Portal';
import { getBadgeStyle, getColorGradient, getChartColor } from '../utils/styleHelpers';
import { formatThaiDate } from '../utils/formatDate';

const API_BASE = 'http://localhost:3001/api';
const API_URL = 'http://localhost:3001';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

// StatCard Component
const StatCard = ({ icon: Icon, title, value, change, changeType, color }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-shadow"
    >
        <div className="flex items-start justify-between">
            <div>
                <p className="text-sm text-slate-600 mb-1">{title}</p>
                <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
                {change !== undefined && (
                    <div className="flex items-center gap-1 mt-2">
                        {changeType === 'up' ? (
                            <TrendingUp className="w-4 h-4 text-green-500" />
                        ) : (
                            <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                        <span className={`text-sm font-medium ${changeType === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                            {change}
                        </span>
                    </div>
                )}
            </div>
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center`}>
                <Icon className="w-7 h-7 text-white" />
            </div>
        </div>
    </motion.div>
);

const InventoryPage = () => {
    const { products, deviceTypes, refreshData } = useData();
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState('all');
    const [showLowStock, setShowLowStock] = useState(false);
    const [viewMode, setViewMode] = useState('grid');
    const [editItem, setEditItem] = useState(null);
    const [historyItem, setHistoryItem] = useState(null);
    const [historyData, setHistoryData] = useState([]);

    // Modal & Alert States
    const [alertModal, setAlertModal] = useState({ isOpen: false, type: 'info', title: '', message: '' });

    const viewHistory = async (product) => {
        setHistoryItem(product);
        try {
            const res = await fetch(`${API_BASE}/stock/history/${product.ProductID}`);
            if (res.ok) {
                const data = await res.json();
                setHistoryData(data);
            }
        } catch (err) {
            console.error('Failed to fetch history');
        }
    };

    const [barcodeItem, setBarcodeItem] = useState(null);
    const printRef = useRef();

    const isAdmin = user?.role === 'Staff';

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





    const filteredProducts = products.filter(p =>
        p.ProductName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (selectedType === 'all' || p.DeviceType === selectedType) &&
        (!showLowStock || p.CurrentStock <= p.MinStock)
    );

    // Stats Calculations
    const totalProducts = products.length;
    const lowStockCount = products.filter(p => p.CurrentStock <= p.MinStock).length;
    const totalValue = products.reduce((sum, p) => sum + (p.CurrentStock * (p.LastPrice || 0)), 0);
    const typeDistribution = deviceTypes.map(t => ({
        name: t.Label,
        count: products.filter(p => p.DeviceType === t.TypeId).length
    }));

    const handleFileUpload = async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`${API_BASE}/upload`, {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                const data = await res.json();
                return data.path;
            } else {
                setAlertModal({ isOpen: true, type: 'error', title: 'ข้อผิดพลาดการอัปโหลด (Upload Error)', message: 'เซิร์ฟเวอร์ไม่สามารถประมวลผลการอัปโหลดได้ (Server Error)' });
            }
        } catch (err) {
            console.error('Upload failed', err);
            setAlertModal({ isOpen: true, type: 'error', title: 'ข้อผิดพลาดการเชื่อมต่อ (Connection Error)', message: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ (Cannot connect to server)' });
        }
        return null;
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const file = fd.get('imageFile');
        let imageUrl = editItem.ImageURL;

        if (file && file.size > 0) {
            const uploadedPath = await handleFileUpload(file);
            if (uploadedPath) imageUrl = uploadedPath;
        }

        const payload = Object.fromEntries(fd);
        payload.ImageURL = imageUrl;
        // Ensure numeric fields are properly converted
        payload.MinStock = parseInt(payload.MinStock, 10) || 0;
        payload.MaxStock = parseInt(payload.MaxStock, 10) || 0;
        payload.CurrentStock = parseInt(payload.CurrentStock, 10) || 0;
        payload.LastPrice = parseFloat(payload.LastPrice) || 0;


        try {
            const res = await fetch(`${API_BASE}/products/${editItem.ProductID}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setEditItem(null);
                refreshData();
                setAlertModal({ isOpen: true, type: 'success', title: 'สำเร็จ (Success)', message: 'อัปเดตข้อมูลอุปกรณ์เรียบร้อยแล้ว (Product updated successfully!)' });
            } else {
                setAlertModal({ isOpen: true, type: 'error', title: 'ข้อผิดพลาด (Error)', message: 'ไม่สามารถอัปเดตข้อมูลอุปกรณ์ได้ (Failed to update product)' });
            }
        } catch (err) {
            setAlertModal({ isOpen: true, type: 'error', title: 'ข้อผิดพลาดเครือข่าย (Network Error)', message: 'ไม่สามารถเชื่อมต่อเพื่ออัปเดตอุปกรณ์ได้ (Failed to connect to update)' });
        }
    };

    const handleDelete = (id) => {
        setAlertModal({
            isOpen: true,
            type: 'danger',
            title: 'ลบอุปกรณ์? ',
            message: 'การดำเนินการนี้ไม่สามารถย้อนกลับได้ คุณแน่ใจหรือไม่ว่าต้องการลบอุปกรณ์ชิ้นนี้? (This action cannot be undone)',
            confirmText: 'ลบ ',
            cancelText: 'ยกเลิก ',
            onConfirm: async () => {
                try {
                    await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' });
                    setAlertModal({ isOpen: true, type: 'success', title: 'ลบเรียบร้อย ', message: 'ลบข้อมูลอุปกรณ์ออกจากระบบแล้ว (Product deleted successfully)', onConfirm: () => setAlertModal(prev => ({ ...prev, isOpen: false })) });
                    refreshData();
                } catch (err) {
                    setAlertModal({ isOpen: true, type: 'error', title: 'ข้อผิดพลาด ', message: 'ไม่สามารถลบข้อมูลอุปกรณ์ได้ (Failed to delete product)' });
                }
            },
            onCancel: () => setAlertModal(prev => ({ ...prev, isOpen: false }))
        });
    };

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={Package}
                    title="อุปกรณ์ทั้งหมด "
                    value={totalProducts.toLocaleString()}
                    color="from-blue-500 to-blue-600"
                />
                <StatCard
                    icon={DollarSign}
                    title="มูลค่าสต็อค"
                    value={`฿${(totalValue / 1000).toFixed(1)}K`}
                    color="from-purple-500 to-purple-600"
                />
                <StatCard
                    icon={AlertTriangle}
                    title="สต็อกต่ำ "
                    value={lowStockCount}
                    changeType={lowStockCount > 0 ? 'down' : 'up'}
                    color="from-orange-500 to-orange-600"
                />
                <StatCard
                    icon={LayoutGrid}
                    title="หมวดหมู่ "
                    value={deviceTypes.length}
                    color="from-pink-500 to-pink-600"
                />
            </div>

            {/* Header Controls */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black mb-2 text-slate-800 mb-2">Inventory</h2>
                    <p className="text-slate-500 font-medium">จัดการและตรวจสอบสถานะอุปกรณ์ </p>
                </div>
                <div className="flex items-center gap-3">
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
                    <div className="flex gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                        <Search size={18} className="text-slate-400 self-center" />
                        <input
                            type="text"
                            placeholder="ค้นหาอุปกรณ์ (Search)..."
                            className="bg-transparent border-none outline-none text-sm w-48 text-slate-700 placeholder-slate-400"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-500 outline-none cursor-pointer"
                    >
                        <option value="all">ทุกประเภท (All Types)</option>
                        {deviceTypes.map(t => <option key={t.TypeId} value={t.TypeId}>{t.Label}</option>)}
                    </select>
                    <button
                        onClick={() => setShowLowStock(!showLowStock)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all font-bold text-sm ${showLowStock
                            ? 'bg-red-50 text-red-600 border-red-200 shadow-sm ring-2 ring-red-100'
                            : 'bg-white text-slate-500 border-slate-200 hover:text-red-500 hover:border-red-200'
                            }`}
                    >
                        <AlertTriangle size={16} className={showLowStock ? "fill-current" : ""} />
                        <span>สต็อกต่ำ</span>
                    </button>
                </div>
            </motion.div>

            {/* LIST VIEW */}
            {viewMode === 'list' && (
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-lg overflow-x-auto"
                >
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gradient-to-r from-slate-50 to-slate-100 text-slate-500 uppercase text-[12px] tracking-widest border-b border-slate-200">
                            <tr>
                                <th className="p-4 pl-6">อุปกรณ์ </th>
                                <th className="p-4">หมวดหมู่ </th>
                                <th className="p-4">ราคา/หน่วย </th>
                                <th className="p-4 text-center">คงเหลือ </th>
                                <th className="p-4 text-center">ขั้นต่ำ </th>
                                <th className="p-4">สถานะ </th>
                                <th className="p-4 text-center">ประวัติ </th>
                                {isAdmin && <th className="p-4 text-center">จัดการ </th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredProducts.map((p, idx) => {
                                const Icon = getIcon(p.DeviceType);
                                return (
                                    <motion.tr
                                        key={p.ProductID}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                        className="hover:bg-slate-50 transition-colors"
                                    >
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getColorGradient(p.DeviceType)} flex items-center justify-center overflow-hidden shrink-0 shadow-md`}>
                                                    {p.ImageURL ? (
                                                        <img src={`${API_URL}${p.ImageURL}`} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Icon size={18} className="text-white" />
                                                    )}
                                                </div>
                                                <span className="font-bold text-slate-700 truncate min-w-0 flex-1">{p.ProductName}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="flex items-center w-fit gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm text-white" style={{ backgroundColor: getChartColor(p.DeviceType) }}>
                                                {p.DeviceType}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-500 font-mono">฿{p.LastPrice?.toLocaleString()}</td>
                                        <td className={`p-4 text-center font-mono font-bold text-lg ${p.CurrentStock <= p.MinStock ? 'text-red-500' : 'text-emerald-600'}`}>
                                            {p.CurrentStock}
                                        </td>
                                        <td className="p-4 text-center text-slate-400 font-mono">{p.MinStock}</td>
                                        <td className="p-4">
                                            {p.CurrentStock <= p.MinStock ?
                                                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg border border-red-100 flex items-center gap-1 w-fit">
                                                    <AlertTriangle size={12} /> สต็อกต่ำ (LOW)
                                                </span> :
                                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">ปกติ (OK)</span>
                                            }
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex justify-center gap-1">
                                                <button onClick={() => viewHistory(p)} className="text-slate-400 hover:text-indigo-600 transition-colors p-1.5 hover:bg-indigo-50 rounded-lg" title="ดูประวัติ (History)">
                                                    <Search size={16} />
                                                </button>
                                                <button onClick={() => setBarcodeItem(p)} className="text-slate-400 hover:text-emerald-600 transition-colors p-1.5 hover:bg-emerald-50 rounded-lg" title="พิมพ์บาร์โค้ด (Print Barcode)">
                                                    <Printer size={16} />
                                                </button>
                                            </div>
                                        </td>
                                        {isAdmin && (
                                            <td className="p-4">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => setEditItem(p)}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(p.ProductID)}
                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredProducts.length === 0 && (
                        <div className="text-center py-10 text-slate-400">ไม่พบอุปกรณ์ (No Items Found)</div>
                    )}
                </motion.div>
            )}

            {/* GRID VIEW */}
            {viewMode === 'grid' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredProducts.map((p, idx) => (
                        <motion.div
                            key={p.ProductID}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className="group bg-white rounded-2xl border border-slate-100 p-3 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                        >
                            {/* Decorative Gradient Background */}
                            <div className={`absolute top-0 left-0 w-full h-20 bg-gradient-to-br ${getColorGradient(p.DeviceType)} opacity-10 z-0`}></div>

                            {/* Actions Overlay - Always visible on mobile, hover on desktop */}
                            <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                <button onClick={() => viewHistory(p)} className="p-1.5 bg-white/90 backdrop-blur text-indigo-600 rounded-full shadow-sm hover:bg-indigo-50" title="ดูประวัติ (History)"><List size={14} /></button>
                                <button onClick={() => setBarcodeItem(p)} className="p-1.5 bg-white/90 backdrop-blur text-emerald-600 rounded-full shadow-sm hover:bg-emerald-50" title="พิมพ์บาร์โค้ด (Print Barcode)"><Printer size={14} /></button>
                                {isAdmin && (
                                    <>
                                        <button onClick={() => setEditItem(p)} className="p-1.5 bg-white/90 backdrop-blur text-amber-500 rounded-full shadow-sm hover:bg-amber-50"><Edit2 size={14} /></button>
                                        <button onClick={() => handleDelete(p.ProductID)} className="p-1.5 bg-white/90 backdrop-blur text-red-500 rounded-full shadow-sm hover:bg-red-50"><Trash2 size={14} /></button>
                                    </>
                                )}
                            </div>

                            <div className="relative z-10 flex flex-col items-center text-center">
                                {/* Larger Image */}
                                <div className={`w-28 h-28 mb-3 rounded-xl overflow-hidden shadow-lg flex items-center justify-center border-2 border-white group-hover:scale-105 transition-transform bg-gradient-to-br ${getColorGradient(p.DeviceType)}`}>
                                    {p.ImageURL ? (
                                        <img src={`${API_URL}${p.ImageURL}`} alt={p.ProductName} className="w-full h-full object-cover" />
                                    ) : (
                                        React.createElement(getIcon(p.DeviceType), { size: 40, className: 'text-white' })
                                    )}
                                </div>

                                <h3 className="font-bold text-slate-800 text-sm mb-1 line-clamp-2 min-h-[2.5rem]">{p.ProductName}</h3>
                                <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full mb-2 shadow-sm text-white" style={{ backgroundColor: getChartColor(p.DeviceType) }}>{p.DeviceType}</span>

                                <div className="grid grid-cols-2 gap-2 w-full pt-2 border-t border-slate-100">
                                    <div>
                                        <p className="text-[12px] text-slate-400 font-bold uppercase">คงเหลือ </p>
                                        <p className={`text-lg font-black ${p.CurrentStock <= p.MinStock ? 'text-red-500' : 'text-emerald-500'}`}>
                                            {p.CurrentStock}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[12px] text-slate-400 font-bold uppercase">ราคา </p>
                                        <p className="text-lg font-black text-slate-700">฿{p.LastPrice?.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* HISTORY MODAL */}
            {historyItem && (
                <Portal>
                    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/20"
                        >
                            <div className="p-6 bg-gradient-to-r from-violet-600 to-indigo-600 text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                                <div className="flex justify-between items-start relative z-10">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1 opacity-90">
                                            <List size={16} />
                                            <span className="text-sm font-bold uppercase tracking-wider">ประวัติอุปกรณ์</span>
                                        </div>
                                        <h3 className="font-black text-2xl tracking-tight">{historyItem.ProductName}</h3>
                                        <p className="text-indigo-100 text-sm font-medium mt-1 font-mono opacity-80">{historyItem.ProductID}</p>
                                    </div>
                                    <button onClick={() => setHistoryItem(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50/50 max-h-[60vh] overflow-y-auto">
                                {/* 1. ตรวจสอบว่ามี overflow-x-auto และใส่ min-w-max เพื่อให้ตารางกว้างตามเนื้อหา */}
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                                    <table className="w-full text-left text-sm table-auto min-w-max">
                                        <thead className="bg-slate-50 border-b border-slate-100 uppercase text-xs font-bold text-slate-500 tracking-wider">
                                            <tr>
                                                {/* 2. ใส่ whitespace-nowrap ให้หัวตารางทุกตัวเพื่อความเป๊ะ */}
                                                <th className="p-4 whitespace-nowrap">Date</th>
                                                <th className="p-4 text-center whitespace-nowrap">Qty</th>
                                                <th className="p-4 whitespace-nowrap">Reason</th>
                                                <th className="p-4 whitespace-nowrap">Budget No.</th>
                                                <th className="p-4 whitespace-nowrap">User</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {historyData.map((h, i) => (
                                                <motion.tr
                                                    key={i}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: i * 0.05 }}
                                                    className="hover:bg-slate-50/50 transition-colors"
                                                >
                                                    <td className="p-4 text-slate-600 font-medium whitespace-nowrap">
                                                        {formatThaiDate(h.TransDate)}
                                                    </td>
                                                    <td className={`p-4 text-center font-bold font-mono whitespace-nowrap ${(h.TransType || '').toUpperCase().trim() === 'IN' || (h.RefInfo || '').toLowerCase().includes('invoice') ? 'text-emerald-600' : 'text-red-500'}`}>
                                                        {(h.TransType || '').toUpperCase().trim() === 'IN' || (h.RefInfo || '').toLowerCase().includes('invoice') ? '+' : '-'}{Math.abs(h.Qty)}
                                                    </td>

                                                    {/* 3. ลบ truncate และ max-w ออก แล้วใส่ whitespace-nowrap แทน */}
                                                    <td className="p-4 text-indigo-600 font-medium whitespace-nowrap">
                                                        {h.RefInfo}
                                                    </td>
                                                    <td className="p-4 text-slate-500 font-mono text-xs whitespace-nowrap">
                                                        {h.BudgetNo || '-'}
                                                    </td>
                                                    <td className="p-4 text-xs text-slate-400 whitespace-nowrap">
                                                        {h.UserID}
                                                    </td>
                                                </motion.tr>
                                            ))}
                                            {historyData.length === 0 && (
                                                <tr>
                                                    <td colSpan="5" className="p-8 text-center text-slate-400">
                                                        ไม่มีประวัติ (No History Found)
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="p-4 bg-white border-t border-slate-100">
                                <button onClick={() => setHistoryItem(null)} className="w-full bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-200 transition-all">
                                    ปิดหน้าต่าง
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </Portal>
            )}

            {/* EDIT MODAL */}
            {editItem && (
                <Portal>
                    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/20"
                        >
                            <div className="p-6 bg-gradient-to-r from-violet-600 to-indigo-600 text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                                <div className="flex justify-between items-start relative z-10">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1 opacity-90">
                                            <Edit2 size={16} />
                                            <span className="text-sm font-bold uppercase tracking-wider">แก้ไขอุปกรณ์ (Edit Item)</span>
                                        </div>
                                        <h3 className="font-black text-2xl tracking-tight">{editItem.ProductName}</h3>
                                        <p className="text-indigo-100 text-sm font-medium mt-1 font-mono opacity-80">{editItem.ProductID}</p>
                                    </div>
                                    <button onClick={() => setEditItem(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                            <form onSubmit={handleUpdate} className="flex flex-col h-full">
                                <div className="p-6 bg-slate-50/50 space-y-4 max-h-[60vh] overflow-y-auto">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">ชื่ออุปกรณ์ (Name)</label>
                                            <input name="ProductName" defaultValue={editItem.ProductName} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-slate-700" required />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">รูปอุปกรณ์ (Image)</label>
                                            <div className="flex items-center gap-4">
                                                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${getColorGradient(editItem.DeviceType)} flex items-center justify-center overflow-hidden shadow-md ring-2 ring-white ring-offset-2`}>
                                                    {editItem.ImageURL ? (
                                                        <img src={`${API_URL}${editItem.ImageURL}`} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Package className="text-white" size={24} />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <input type="file" name="imageFile" accept="image/*" className="block w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer transition-all" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-2">หมวดหมู่</label>
                                                <select name="DeviceType" defaultValue={editItem.DeviceType} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-slate-700">
                                                    {deviceTypes.map(t => <option key={t.TypeId} value={t.TypeId}>{t.Label}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-2">ราคาต่อหน่วย</label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">฿</span>
                                                    <input name="LastPrice" type="number" step="0.01" defaultValue={editItem.LastPrice} className="w-full pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono font-medium text-slate-700" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-2">คงเหลือ</label>
                                                <input name="CurrentStock" type="number" defaultValue={editItem.CurrentStock} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono font-medium text-slate-700" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-2">สต็อคขั้นต่ำ</label>
                                                <input name="MinStock" type="number" defaultValue={editItem.MinStock} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono font-medium text-slate-700" />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-sm font-bold text-slate-700 mb-2">สต็อคสูงสุด</label>
                                                <input name="MaxStock" type="number" defaultValue={editItem.MaxStock || 0} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono font-medium text-slate-700" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setEditItem(null)}
                                        className="flex-1 bg-white border border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-all"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-[2] bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold py-3 rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg shadow-indigo-200"
                                    >
                                        บันทึกการแก้ไข
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                </Portal>
            )}



            {/* BARCODE PRINT MODAL */}
            {barcodeItem && (
                <Portal>
                    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/20"
                        >
                            <div className="p-6 bg-gradient-to-r from-violet-600 to-indigo-600 text-white relative overflow-hidden print:hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                                <div className="flex justify-between items-start relative z-10">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1 opacity-90">
                                            <Printer size={16} />
                                            <span className="text-sm font-bold uppercase tracking-wider">พิมพ์บาร์โค้ด (Print Barcode)</span>
                                        </div>
                                        <h3 className="font-black text-xl tracking-tight">{barcodeItem.ProductName}</h3>
                                        <p className="text-indigo-100 text-xs font-medium mt-1 font-mono opacity-80">{barcodeItem.ProductID}</p>
                                    </div>
                                    <button onClick={() => setBarcodeItem(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                            <div className="p-6 bg-slate-50/50 flex flex-col items-center gap-4">
                                <div ref={printRef} className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center gap-3 w-full shadow-sm" id="barcode-print-area">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">IT INVENTORY</p>
                                    <h4 className="text-base font-bold text-slate-800 text-center leading-tight mb-2">{barcodeItem.ProductName}</h4>
                                    <Barcode
                                        value={barcodeItem.ProductID}
                                        width={1.5}
                                        height={50}
                                        fontSize={12}
                                        margin={0}
                                        displayValue={true}
                                    />
                                    <div className="flex gap-4 text-[10px] text-slate-400 font-medium mt-2 uppercase tracking-wide">
                                        <span>Type: {barcodeItem.DeviceType}</span>
                                        <span>Min: {barcodeItem.MinStock}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-white border-t border-slate-100 flex gap-3 print:hidden">
                                <button
                                    onClick={() => setBarcodeItem(null)}
                                    className="flex-1 bg-white border border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-all"
                                >
                                    ปิด
                                </button>
                                <button
                                    onClick={() => {
                                        const printContents = document.getElementById('barcode-print-area').innerHTML;
                                        const win = window.open('', '_blank', 'width=400,height=300');
                                        win.document.write(`
                                                <html><head><title>Barcode - ${barcodeItem.ProductName}</title>
                                                <style>
                                                    body { font-family: 'Segoe UI', Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
                                                    .label { border: 2px dashed #e2e8f0; border-radius: 16px; padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
                                                    .title { font-size: 10px; font-weight: bold; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; }
                                                    .name { font-size: 14px; font-weight: bold; color: #1e293b; text-align: center; }
                                                    .meta { font-size: 9px; color: #94a3b8; display: flex; gap: 16px; }
                                                    @media print { body { margin: 0; } .label { border: none; } }
                                                </style></head><body>
                                                <div class="label">${printContents}</div>
                                                </body></html>
                                            `);
                                        win.document.close();
                                        win.focus();
                                        win.print();
                                    }}
                                    className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                                >
                                    <Printer size={18} /> พิมพ์
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </Portal>
            )}

            {/* ALERT MODAL */}
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
        </div >
    );
};

export default InventoryPage;
