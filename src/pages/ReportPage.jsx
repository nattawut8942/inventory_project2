import React, { useState, useMemo } from 'react';
import { FileSpreadsheet, Calendar, Download, CheckSquare, Square, Package, TrendingUp, TrendingDown, BarChart3, PieChart, FileText, Receipt, DollarSign, Clock, User, AlertCircle } from 'lucide-react';
import { BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { motion } from 'motion/react';
import { useData } from '../context/DataContext';
import AlertModal from '../components/AlertModal';
import { getChartColor } from '../utils/styleHelpers';
import { formatThaiDateShort } from '../utils/formatDate';

const API_BASE = 'http://localhost:3001/api';

// const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

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
        color: getChartColor(t.TypeId)
    })).filter(c => c.value > 0);

    // Calculate real stock movement from transactions (quantity-based)
    const stockMovementData = useMemo(() => {
        const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        const dataMap = {};

        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = months[d.getMonth()];
            dataMap[key] = { month: key, inbound: 0, outbound: 0 };
        }

        // Sum transactions by month
        (transactions || []).forEach(t => {
            const date = new Date(t.TransDate);
            const monthKey = months[date.getMonth()];
            if (dataMap[monthKey]) {
                const type = (t.TransType || '').toUpperCase().trim();
                const qty = Math.abs(t.Qty);
                if (type === 'IN') dataMap[monthKey].inbound += qty;
                if (type === 'OUT') dataMap[monthKey].outbound += qty;
            }
        });

        return Object.values(dataMap);
    }, [transactions]);

    // NEW: Cost & Usage Analysis (Money-based)
    const costAnalysisData = useMemo(() => {
        const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        const dataMap = {};

        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = months[d.getMonth()];
            dataMap[key] = { month: key, spending: 0, consumption: 0 };
        }

        // Create product price lookup
        const priceMap = {};
        products.forEach(p => {
            priceMap[p.ProductID] = p.LastPrice || 0;
        });

        // Sum transactions by month (value-based)
        (transactions || []).forEach(t => {
            const date = new Date(t.TransDate);
            const monthKey = months[date.getMonth()];
            if (dataMap[monthKey]) {
                const type = (t.TransType || '').toUpperCase().trim();
                const qty = Math.abs(t.Qty);
                const price = priceMap[t.ProductID] || 0;
                const value = qty * price;

                if (type === 'IN') dataMap[monthKey].spending += value;
                if (type === 'OUT') dataMap[monthKey].consumption += value;
            }
        });

        return Object.values(dataMap);
    }, [transactions, products]);

    // NEW: Slow Moving Items (No OUT transactions in last 3 months)
    const slowMovingItems = useMemo(() => {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        // Get all ProductIDs that had OUT transactions in last 3 months
        const activeProductIds = new Set();
        (transactions || []).forEach(t => {
            const date = new Date(t.TransDate);
            const type = (t.TransType || '').toUpperCase().trim();
            if (type === 'OUT' && date >= threeMonthsAgo) {
                activeProductIds.add(t.ProductID);
            }
        });

        // Filter products that are NOT in the active set and have stock > 0
        return products
            .filter(p => !activeProductIds.has(p.ProductID) && p.CurrentStock > 0)
            .sort((a, b) => (b.CurrentStock * (b.LastPrice || 0)) - (a.CurrentStock * (a.LastPrice || 0)))
            .slice(0, 10);
    }, [transactions, products]);

    // Calculate total dead stock value
    const deadStockValue = slowMovingItems.reduce((sum, p) => sum + (p.CurrentStock * (p.LastPrice || 0)), 0);

    // NEW: Top Consumers (Users who withdraw the most)
    const topConsumers = useMemo(() => {
        const userMap = {};

        (transactions || []).forEach(t => {
            const type = (t.TransType || '').toUpperCase().trim();
            if (type === 'OUT') {
                const userId = t.UserID || 'Unknown';
                if (!userMap[userId]) {
                    userMap[userId] = { userId, totalQty: 0, totalValue: 0, transactionCount: 0 };
                }
                const qty = Math.abs(t.Qty);
                const price = products.find(p => p.ProductID === t.ProductID)?.LastPrice || 0;

                userMap[userId].totalQty += qty;
                userMap[userId].totalValue += qty * price;
                userMap[userId].transactionCount += 1;
            }
        });

        return Object.values(userMap)
            .sort((a, b) => b.totalValue - a.totalValue)
            .slice(0, 5);
    }, [transactions, products]);

    // NEW: Top Withdrawn Items (Most withdrawn products)
    const topWithdrawnItems = useMemo(() => {
        const itemMap = {};
        (transactions || []).forEach(t => {
            const type = (t.TransType || '').toUpperCase().trim();
            if (type === 'OUT') {
                const productId = t.ProductID;
                const product = products.find(p => p.ProductID === productId);
                if (!itemMap[productId]) {
                    itemMap[productId] = {
                        productId,
                        productName: product?.ProductName || `ID: ${productId}`,
                        deviceType: product?.DeviceType || '-',
                        totalQty: 0,
                        totalValue: 0,
                        transactionCount: 0
                    };
                }
                const qty = Math.abs(t.Qty);
                const price = product?.LastPrice || 0;
                itemMap[productId].totalQty += qty;
                itemMap[productId].totalValue += qty * price;
                itemMap[productId].transactionCount += 1;
            }
        });
        return Object.values(itemMap)
            .sort((a, b) => b.totalQty - a.totalQty)
            .slice(0, 10);
    }, [transactions, products]);

    // NEW: Withdrawals By Category
    const withdrawalsByCategory = useMemo(() => {
        const catMap = {};
        (transactions || []).forEach(t => {
            const type = (t.TransType || '').toUpperCase().trim();
            if (type === 'OUT') {
                const product = products.find(p => p.ProductID === t.ProductID);
                const category = product?.DeviceType || 'ไม่ระบุ';
                if (!catMap[category]) {
                    catMap[category] = { name: category, value: 0, transactionCount: 0 };
                }
                catMap[category].value += Math.abs(t.Qty);
                catMap[category].transactionCount += 1;
            }
        });
        return Object.values(catMap).sort((a, b) => b.value - a.value);
    }, [transactions, products]);

    const dataOptions = [
        { id: 'products', label: 'Inventory / Products', description: 'สินค้าทั้งหมดและจำนวนคงเหลือ', icon: Package, color: 'from-blue-500 to-blue-600' },
        { id: 'lowstock', label: 'รายการต่ำกว่า Min Stock', description: 'คำนวณ (MaxStock - CurrentStock) × ราคา', icon: TrendingDown, color: 'from-red-500 to-red-600' },
        { id: 'transactions', label: 'Transaction History', description: 'ประวัติรับ-เบิกทั้งหมด', icon: TrendingUp, color: 'from-purple-500 to-purple-600' },
        { id: 'invoices', label: 'Invoice Records', description: 'ข้อมูล Invoice ทั้งหมด', icon: Receipt, color: 'from-pink-500 to-pink-600' },
        { id: 'pos', label: 'Purchase Orders', description: 'ใบสั่งซื้อทั้งหมด', icon: FileText, color: 'from-orange-500 to-orange-600' },
        { id: 'slowmoving', label: '🐢 สินค้าค้างสต็อค', description: 'ไม่มีการเบิกใน 3 เดือนล่าสุด (Dead Stock)', icon: Clock, color: 'from-yellow-500 to-yellow-600' },
        { id: 'topwithdrawn', label: '🔥 สินค้าเบิกมากสุด', description: 'อันดับสินค้าที่ถูกเบิกมากที่สุด', icon: TrendingUp, color: 'from-rose-500 to-rose-600' },
        { id: 'topconsumers', label: '👤 ผู้เบิกมากสุด', description: 'อันดับผู้ใช้ที่เบิกมากที่สุด', icon: User, color: 'from-cyan-500 to-cyan-600' },
        { id: 'bycategory', label: '📂 เบิกตามประเภท', description: 'สรุปยอดเบิกแยกตามประเภทสินค้า', icon: PieChart, color: 'from-emerald-500 to-emerald-600' }
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
                {/* Stock Movement Chart (Quantity) */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200"
                >
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">การเคลื่อนไหวสต็อค (จำนวนชิ้น)</h3>
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

                {/* NEW: Cost & Usage Chart (Money) */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <DollarSign className="w-5 h-5 text-emerald-500" />
                        <h3 className="text-lg font-semibold text-slate-900">วิเคราะห์ค่าใช้จ่าย (บาท)</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={costAnalysisData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="month" stroke="#64748b" />
                            <YAxis stroke="#64748b" tickFormatter={(v) => `฿${(v / 1000).toFixed(0)}K`} />
                            <Tooltip
                                formatter={(value) => `฿${value.toLocaleString()}`}
                                contentStyle={{
                                    backgroundColor: 'white',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="spending" stroke="#10b981" strokeWidth={3} name="ซื้อเข้า (Spending)" dot={{ fill: '#10b981' }} />
                            <Line type="monotone" dataKey="consumption" stroke="#f59e0b" strokeWidth={3} name="เบิกใช้ (Usage)" dot={{ fill: '#f59e0b' }} />
                        </LineChart>
                    </ResponsiveContainer>
                </motion.div>
            </div>

            {/* NEW: Analytics Insights Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Slow Moving Items (Dead Stock) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 lg:col-span-2"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">สินค้าค้างสต็อก (Dead Stock)</h3>
                                <p className="text-xs text-slate-500">ไม่มีการเบิกใน 3 เดือนที่ผ่านมา</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-slate-500">มูลค่าค้าง</p>
                            <p className="text-lg font-bold text-red-500">฿{deadStockValue.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="text-left py-2 px-3 text-slate-500 font-medium">สินค้า</th>
                                    <th className="text-center py-2 px-3 text-slate-500 font-medium">ประเภท</th>
                                    <th className="text-center py-2 px-3 text-slate-500 font-medium">คงเหลือ</th>
                                    <th className="text-right py-2 px-3 text-slate-500 font-medium">มูลค่า</th>
                                </tr>
                            </thead>
                            <tbody>
                                {slowMovingItems.length > 0 ? slowMovingItems.map((item, idx) => (
                                    <motion.tr
                                        key={item.ProductID}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="border-b border-slate-100 hover:bg-slate-50"
                                    >
                                        <td className="py-3 px-3">
                                            <p className="font-medium text-slate-800 truncate max-w-[200px]">{item.ProductName}</p>
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">{item.DeviceType}</span>
                                        </td>
                                        <td className="py-3 px-3 text-center font-mono text-slate-700">{item.CurrentStock}</td>
                                        <td className="py-3 px-3 text-right font-mono text-red-500">฿{(item.CurrentStock * (item.LastPrice || 0)).toLocaleString()}</td>
                                    </motion.tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4" className="py-8 text-center text-slate-400">
                                            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                            ไม่มีสินค้าค้างสต็อก 👍
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>

                {/* Top Consumers */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                            <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">ผู้เบิกสูงสุด</h3>
                            <p className="text-xs text-slate-500">จัดอันดับตามมูลค่า</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {topConsumers.length > 0 ? topConsumers.map((user, idx) => (
                            <motion.div
                                key={user.userId}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100"
                            >
                                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : idx === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-500' : idx === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700' : 'bg-slate-300'}`}>
                                    {idx + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm text-slate-800 truncate">{user.userId}</p>
                                    <p className="text-xs text-slate-500">{user.transactionCount} ครั้ง • {user.totalQty} ชิ้น</p>
                                </div>
                                <span className="text-sm font-bold text-indigo-600 font-mono">
                                    ฿{(user.totalValue / 1000).toFixed(1)}K
                                </span>
                            </motion.div>
                        )) : (
                            <div className="text-center py-8 text-slate-400">
                                <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">ยังไม่มีข้อมูลการเบิก</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Category Distribution */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
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
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </RechartsPie>
                </ResponsiveContainer>
            </motion.div>

            {/* NEW: Top Withdrawn Items & Withdrawals By Category */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Withdrawn Items */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">🔥 สินค้าเบิกมากสุด</h3>
                            <p className="text-xs text-slate-500">Top 10 รายการที่ถูกเบิกมากที่สุด</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="text-left py-2 px-2 text-slate-500 font-medium">#</th>
                                    <th className="text-left py-2 px-2 text-slate-500 font-medium">สินค้า</th>
                                    <th className="text-center py-2 px-2 text-slate-500 font-medium">ประเภท</th>
                                    <th className="text-right py-2 px-2 text-slate-500 font-medium">จำนวน</th>
                                    <th className="text-right py-2 px-2 text-slate-500 font-medium">มูลค่า</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topWithdrawnItems.length > 0 ? topWithdrawnItems.slice(0, 5).map((item, idx) => (
                                    <tr key={item.productId} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="py-2 px-2">
                                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold ${idx === 0 ? 'bg-rose-500' : idx === 1 ? 'bg-rose-400' : idx === 2 ? 'bg-rose-300' : 'bg-slate-300'}`}>
                                                {idx + 1}
                                            </span>
                                        </td>
                                        <td className="py-2 px-2 font-medium text-slate-800 truncate max-w-[150px]">{item.productName}</td>
                                        <td className="py-2 px-2 text-center text-slate-500 text-xs">{item.deviceType}</td>
                                        <td className="py-2 px-2 text-right font-bold text-rose-600">{item.totalQty.toLocaleString()}</td>
                                        <td className="py-2 px-2 text-right text-slate-600">฿{item.totalValue.toLocaleString()}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8 text-slate-400">ยังไม่มีข้อมูลการเบิก</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>

                {/* Withdrawals By Category - Card Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">📂 เบิกตามประเภท</h3>
                            <p className="text-xs text-slate-500">สรุปยอดเบิกแยกตามประเภทสินค้า</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {(() => {
                            const maxValue = Math.max(...withdrawalsByCategory.map(c => c.value), 1);
                            const categoryColors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500'];
                            return withdrawalsByCategory.map((cat, idx) => {
                                const percentage = (cat.value / maxValue) * 100;
                                return (
                                    <div key={cat.name} className="relative">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-medium text-slate-700 text-sm">{cat.name || 'ไม่ระบุ'}</span>
                                            <span className="font-bold text-slate-800 text-sm">{cat.value.toLocaleString()} ชิ้น</span>
                                        </div>
                                        <div className="h-6 bg-slate-100 rounded-lg overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${percentage}%` }}
                                                transition={{ duration: 0.5, delay: idx * 0.1 }}
                                                className={`h-full ${categoryColors[idx % categoryColors.length]} rounded-lg flex items-center justify-end pr-2`}
                                            >
                                                {percentage > 20 && (
                                                    <span className="text-white text-xs font-bold">{percentage.toFixed(0)}%</span>
                                                )}
                                            </motion.div>
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                        {withdrawalsByCategory.length === 0 && (
                            <div className="text-center py-8 text-slate-400">
                                <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">ยังไม่มีข้อมูลการเบิก</p>
                            </div>
                        )}
                    </div>
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
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">เลือกข้อมูลที่ต้องการ Export</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedTypes(dataOptions.map(o => o.id))}
                                    className="text-xs px-2 py-1 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors font-medium"
                                >
                                    เลือกทั้งหมด
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedTypes([])}
                                    className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                                >
                                    ยกเลิกทั้งหมด
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2 pr-1">
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
                                    <span className="text-slate-400"> • {formatThaiDateShort(startDate)} ถึง {formatThaiDateShort(endDate)}</span>
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
                onCancel={() => setAlertModal({ ...alertModal, isOpen: false })}
            />
        </div>
    );
};

export default ReportPage;
