import React, { useState } from 'react';
import { FileSpreadsheet, Calendar, Download, CheckSquare, Square, Package, TrendingUp, TrendingDown, BarChart3, PieChart, FileText, Receipt } from 'lucide-react';
import { BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion } from 'motion/react';
import { useData } from '../context/DataContext';
import AlertModal from '../components/AlertModal';

const API_BASE = 'http://localhost:3001/api';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

// StatCard Component
const StatCard = ({ icon: Icon, title, value, subtitle, color }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-5 shadow-lg border border-slate-200 hover:shadow-xl transition-shadow"
    >
        <div className="flex items-start justify-between">
            <div>
                <p className="text-sm text-slate-600 mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
                {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
            </div>
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
        </div>
    </motion.div>
);

const ReportPage = () => {
    const { products, deviceTypes, purchaseOrders, transactions } = useData();
    const [selectedTypes, setSelectedTypes] = useState(['products']);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [alertModal, setAlertModal] = useState({ isOpen: false, type: 'info', title: '', message: '' });

    // Calculate stats from real data
    const totalProducts = products.length;
    const totalValue = products.reduce((sum, p) => sum + (p.CurrentStock * (p.LastPrice || 0)), 0);
    const lowStockCount = products.filter(p => p.CurrentStock <= p.MinStock).length;
    const pendingPOCount = (purchaseOrders || []).filter(po => po.Status !== 'Completed').length;
    const transactionCount = (transactions || []).length;

    // Category distribution for pie chart
    const categoryData = deviceTypes.map((t, idx) => ({
        name: t.Label,
        value: products.filter(p => p.DeviceType === t.TypeId).length,
        color: COLORS[idx % COLORS.length]
    })).filter(c => c.value > 0);

    // Mock stock movement data (would come from transactions in real app)
    const stockMovementData = [
        { month: 'ม.ค.', inbound: 120, outbound: 80 },
        { month: 'ก.พ.', inbound: 95, outbound: 110 },
        { month: 'มี.ค.', inbound: 150, outbound: 90 },
        { month: 'เม.ย.', inbound: 85, outbound: 120 },
        { month: 'พ.ค.', inbound: 130, outbound: 75 },
        { month: 'มิ.ย.', inbound: 100, outbound: 95 },
    ];

    const dataOptions = [
        { id: 'products', label: 'Inventory / Products', description: 'All active products with stock levels', icon: Package, color: 'from-blue-500 to-blue-600' },
        { id: 'lowstock', label: 'รายการสินค้าต่ำกว่า Min Stock', description: 'คำนวณ (MaxStock - CurrentStock) × ราคา', icon: TrendingDown, color: 'from-red-500 to-red-600' },
        { id: 'transactions', label: 'Transaction History', description: 'All inbound/outbound movements', icon: TrendingUp, color: 'from-purple-500 to-purple-600' },
        { id: 'invoices', label: 'Invoice Records', description: 'All received invoices', icon: Receipt, color: 'from-pink-500 to-pink-600' },
        { id: 'pos', label: 'Purchase Orders', description: 'All PO records', icon: FileText, color: 'from-orange-500 to-orange-600' }
    ];

    const toggleType = (typeId) => {
        if (selectedTypes.includes(typeId)) {
            setSelectedTypes(selectedTypes.filter(t => t !== typeId));
        } else {
            setSelectedTypes([...selectedTypes, typeId]);
        }
    };

    const handleExport = async () => {
        if (selectedTypes.length === 0) {
            setAlertModal({ isOpen: true, type: 'warning', title: 'กรุณาเลือกข้อมูล', message: 'กรุณาเลือกอย่างน้อย 1 ประเภทข้อมูลเพื่อ Export' });
            return;
        }

        setIsExporting(true);

        try {
            const params = new URLSearchParams();
            params.append('types', selectedTypes.join(','));
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const response = await fetch(`${API_BASE}/report/export?${params.toString()}`);

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `report_${new Date().toISOString().split('T')[0]}.xlsx`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                setAlertModal({ isOpen: true, type: 'success', title: 'Export สำเร็จ!', message: 'ไฟล์รายงานถูกดาวน์โหลดเรียบร้อยแล้ว' });
            } else {
                setAlertModal({ isOpen: true, type: 'error', title: 'Export ล้มเหลว', message: 'ไม่สามารถสร้างรายงานได้ กรุณาลองใหม่' });
            }
        } catch (err) {
            console.error('Export error:', err);
            setAlertModal({ isOpen: true, type: 'error', title: 'Connection Error', message: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้' });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard
                    icon={Package}
                    title="สินค้าทั้งหมด"
                    value={totalProducts.toLocaleString()}
                    subtitle="รายการในคลัง"
                    color="from-blue-500 to-blue-600"
                />
                <StatCard
                    icon={BarChart3}
                    title="มูลค่าสต็อค"
                    value={`฿${(totalValue / 1000).toFixed(1)}K`}
                    subtitle="มูลค่ารวม"
                    color="from-purple-500 to-purple-600"
                />
                <StatCard
                    icon={TrendingDown}
                    title="สินค้าใกล้หมด"
                    value={lowStockCount}
                    subtitle="ต่ำกว่า Min Stock"
                    color="from-red-500 to-red-600"
                />
                <StatCard
                    icon={FileText}
                    title="PO รอดำเนินการ"
                    value={pendingPOCount}
                    subtitle="รอรับของ"
                    color="from-amber-500 to-amber-600"
                />
                <StatCard
                    icon={TrendingUp}
                    title="รายการเคลื่อนไหว"
                    value={transactionCount}
                    subtitle="ธุรกรรมทั้งหมด"
                    color="from-emerald-500 to-emerald-600"
                />
                <StatCard
                    icon={PieChart}
                    title="หมวดหมู่"
                    value={deviceTypes.length}
                    subtitle="ประเภทสินค้า"
                    color="from-pink-500 to-pink-600"
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Stock Movement Chart */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200"
                >
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">การเคลื่อนไหวสต็อค</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={stockMovementData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="month" stroke="#64748b" />
                            <YAxis stroke="#64748b" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'white',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                }}
                            />
                            <Legend />
                            <Bar dataKey="inbound" fill="#3b82f6" name="สินค้าเข้า" radius={[8, 8, 0, 0]} />
                            <Bar dataKey="outbound" fill="#8b5cf6" name="สินค้าออก" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </motion.div>

                {/* Category Distribution */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200"
                >
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">การกระจายตามหมวดหมู่</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <RechartsPie>
                            <Pie
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {categoryData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </RechartsPie>
                    </ResponsiveContainer>
                </motion.div>
            </div>

            {/* Export Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-lg"
            >
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                        <FileSpreadsheet size={24} className="text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-xl text-slate-800">Export รายงาน</h3>
                        <p className="text-slate-500 text-sm">เลือกข้อมูลและช่วงวันที่เพื่อดาวน์โหลด</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Data Types Selection */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-3 block tracking-wider">เลือกข้อมูลที่ต้องการ Export</label>
                        <div className="space-y-2">
                            {dataOptions.map((option, idx) => {
                                const isSelected = selectedTypes.includes(option.id);
                                const Icon = option.icon;
                                return (
                                    <motion.button
                                        key={option.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        type="button"
                                        onClick={() => toggleType(option.id)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${isSelected
                                            ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-300 shadow-sm'
                                            : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                                            }`}
                                    >
                                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${option.color} flex items-center justify-center`}>
                                            <Icon size={18} className="text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <p className={`font-bold text-sm ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>{option.label}</p>
                                            <p className={`text-xs ${isSelected ? 'text-indigo-500/80' : 'text-slate-400'}`}>{option.description}</p>
                                        </div>
                                        {isSelected ? (
                                            <div className="bg-indigo-600 rounded-lg p-1">
                                                <CheckSquare size={16} className="text-white" />
                                            </div>
                                        ) : (
                                            <Square size={24} className="text-slate-300" />
                                        )}
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Date Range & Export */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-3 tracking-wider">
                                <Calendar size={14} /> ช่วงวันที่ (Optional)
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-600 mb-1 block">เริ่มต้น</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-indigo-500 text-slate-700 font-medium text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-600 mb-1 block">สิ้นสุด</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-indigo-500 text-slate-700 font-medium text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-4">
                            <p className="text-xs text-slate-400 mb-2 font-bold uppercase tracking-wider">สรุปการ Export</p>
                            <p className="text-sm text-slate-600">
                                <span className="font-bold text-indigo-600">{selectedTypes.length}</span> ประเภทข้อมูลที่เลือก
                                {startDate && endDate && (
                                    <span className="text-slate-400"> • {startDate} ถึง {endDate}</span>
                                )}
                            </p>
                        </div>

                        {/* Export Button */}
                        <button
                            onClick={handleExport}
                            disabled={isExporting || selectedTypes.length === 0}
                            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-400 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-indigo-200 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
                        >
                            {isExporting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    กำลังสร้างรายงาน...
                                </>
                            ) : (
                                <>
                                    <Download size={20} />
                                    Export to Excel (.xlsx)
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Alert Modal */}
            <AlertModal
                isOpen={alertModal.isOpen}
                type={alertModal.type}
                title={alertModal.title}
                message={alertModal.message}
                onConfirm={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                confirmText="ตกลง"
            />
        </div>
    );
};

export default ReportPage;
