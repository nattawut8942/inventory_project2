import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Package, TrendingUp, TrendingDown, AlertTriangle, DollarSign, ShoppingCart, Clock, ArrowRight, Flame } from 'lucide-react';
import { motion } from 'motion/react';
import { useData } from '../context/DataContext';
import { API_BASE } from '../config/api';
import { formatThaiDate } from '../utils/formatDate';
import StatCard from '../components/StatCard';
import LoadingState from '../components/LoadingState';
import { getChartColor, getBadgeStyle, getDeviceTypeColor } from '../utils/styleHelpers';

// const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1'];

const DashboardPage = () => {
    const { products, transactions, purchaseOrders, loading } = useData();
    const navigate = useNavigate();
    const [maItems, setMaItems] = useState([]);

    React.useEffect(() => {
        const fetchMa = async () => {
            try {
                const res = await fetch(`${API_BASE}/ma`);
                if (res.ok) setMaItems(await res.json());
            } catch (err) { }
        };
        fetchMa();
    }, []);

    // 1. Calculate Stats
    const stats = useMemo(() => {
        const productCount = products.length;
        const totalStock = products.reduce((sum, p) => sum + p.CurrentStock, 0);
        const totalValue = products.reduce((sum, p) => sum + (p.CurrentStock * p.LastPrice), 0);
        const lowStockCount = products.filter(p => p.CurrentStock <= p.MinStock).length;
        const activePOs = purchaseOrders.filter(po => po.Status !== 'Completed').length;

        return { productCount, totalStock, totalValue, lowStockCount, activePOs };
    }, [products, purchaseOrders]);

    // 2. Prepare Chart Data: Category Distribution
    const categoryData = useMemo(() => {
        const map = {};
        products.forEach(p => {
            if (!map[p.DeviceType]) map[p.DeviceType] = 0;
            map[p.DeviceType] += 1; // Count items, not stock quantity
        });
        return Object.keys(map).map(key => ({
            name: key,
            value: map[key],
            fill: getChartColor(key)
        }));
    }, [products]);

    // 3. Prepare Chart Data: Stock Movement (Last 6 Months)
    const stockData = useMemo(() => {
        const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        const dataMap = {};

        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = `${months[d.getMonth()]}`;
            dataMap[key] = { month: key, inbound: 0, outbound: 0 };
        }

        transactions.forEach(t => {
            const date = new Date(t.TransDate);
            const monthKey = months[date.getMonth()];

            // Only count if within our map range (simple check)
            if (dataMap[monthKey]) {
                const type = (t.TransType || '').toUpperCase().trim();
                const qty = Math.abs(t.Qty);
                if (type === 'IN' && !(t.RefInfo || '').includes('ยกเลิก Invoice')) dataMap[monthKey].inbound += qty;
                if (type === 'OUT' && !(t.RefInfo || '').includes('ยกเลิก Invoice')) dataMap[monthKey].outbound += qty;
            }
        });

        return Object.values(dataMap);
    }, [transactions]);

    // 4. NEW: Critical Low Stock Items (Top 5)
    const lowStockItems = useMemo(() => {
        return products
            .filter(p => p.CurrentStock <= p.MinStock)
            .sort((a, b) => (a.CurrentStock - a.MinStock) - (b.CurrentStock - b.MinStock))
            .slice(0, 5);
    }, [products]);

    // 5. NEW: Top 5 Most Withdrawn (Current Month)
    const topWithdrawn = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const withdrawMap = {};
        transactions.forEach(t => {
            const date = new Date(t.TransDate);
            const type = (t.TransType || '').toUpperCase().trim();
            const refInfo = t.RefInfo || '';
            // Only count actual withdrawals, exclude invoice cancellations
            if (type === 'OUT' && date.getMonth() === currentMonth && date.getFullYear() === currentYear && !refInfo.includes('ยกเลิก Invoice')) {
                const productId = t.ProductID;
                if (!withdrawMap[productId]) {
                    const product = products.find(p => p.ProductID === productId);
                    withdrawMap[productId] = {
                        ProductID: productId,
                        ProductName: t.ProductName || `ID: ${productId}`,
                        DeviceType: product ? product.DeviceType : 'Unknown',
                        totalQty: 0
                    };
                }
                withdrawMap[productId].totalQty += Math.abs(t.Qty);
            }
        });

        return Object.values(withdrawMap)
            .sort((a, b) => b.totalQty - a.totalQty)
            .slice(0, 5);
    }, [transactions]);

    // 6. NEW: Pending POs (Open/Partial, sorted by oldest first)
    const pendingPOs = useMemo(() => {
        return purchaseOrders
            .filter(po => po.Status !== 'Completed')
            .map(po => ({
                ...po,
                daysAgo: Math.floor((new Date() - new Date(po.RequestDate)) / (1000 * 60 * 60 * 24))
            }))
            .sort((a, b) => b.daysAgo - a.daysAgo)
            .slice(0, 5);
    }, [purchaseOrders]);

    // 8. NEW: Recommended Order Trend (Items close to MinStock, sorted by % needed to reach MaxStock)
    const orderTrendItems = useMemo(() => {
        return products
            .filter(p => p.CurrentStock > p.MinStock && p.MaxStock && p.MaxStock > 0)
            .map(p => {
                const orderNeedPercent = Math.round(((p.MaxStock - p.CurrentStock) / p.MaxStock) * 100);
                return {
                    ...p,
                    orderNeedPercent
                };
            })
            .sort((a, b) => b.orderNeedPercent - a.orderNeedPercent)
            .slice(0, 5);
    }, [products]);

    // 7. Recent Transactions (Last 5)
    const recentTransactions = useMemo(() => {
        return [...transactions]
            .sort((a, b) => new Date(b.TransDate) - new Date(a.TransDate))
            .slice(0, 5);
    }, [transactions]);

    // 9. NEW: MA Expiry Alerts (Expired or <= 90 days)
    const maAlerts = useMemo(() => {
        return maItems
            .filter(ma => {
                if (ma.Status === 'Cancelled' || !ma.EndDate) return false;
                const daysRemaining = Math.ceil((new Date(ma.EndDate) - new Date()) / (1000 * 60 * 60 * 24));
                return daysRemaining <= 90;
            })
            .map(ma => {
                const daysRemaining = Math.ceil((new Date(ma.EndDate) - new Date()) / (1000 * 60 * 60 * 24));
                return { ...ma, daysRemaining };
            })
            .sort((a, b) => a.daysRemaining - b.daysRemaining)
            .slice(0, 5);
    }, [maItems]);

    if (loading && products.length === 0) {
        return <LoadingState message="กำลังประมวลผลข้อมูล Dashboard... (Loading Dashboard...)" />;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-black text-slate-800 mb-2">DASHBOARD</h2>
                <p className="text-slate-500 font-medium">สรุปข้อมูลและสถานะคลังอุปกรณ์</p>
            </div>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={Package}
                    title="อุปกรณ์ทั้งหมด "
                    value={stats.productCount.toLocaleString()}
                    subValue={`รวม ${stats.totalStock.toLocaleString()} ชิ้น `}
                    color="from-blue-500 to-blue-600"
                />
                <StatCard
                    icon={ShoppingCart}
                    title="ใบสั่งซื้อรอส่ง "
                    value={stats.activePOs}
                    subValue="รายการ "
                    color="from-purple-500 to-purple-600"
                />
                <StatCard
                    icon={DollarSign}
                    title="มูลค่าสต็อคปัจจุบัน "
                    value={`฿${(stats.totalValue / 1000000).toFixed(2)}M`}
                    subValue={`รวมมูลค่า ฿${stats.totalValue.toLocaleString()}`}
                    color="from-pink-500 to-pink-600"
                />
                <StatCard
                    icon={AlertTriangle}
                    title="สต็อกต่ำ "
                    value={stats.lowStockCount}
                    subValue="รายการที่ต้องเติม "
                    changeType="down"
                    color="from-orange-500 to-orange-600"
                    isAlert={stats.lowStockCount > 0}
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* Stock Movement Chart */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200"
                >
                    <h3 className="text-lg font-bold text-slate-800 mb-6">ความเคลื่อนไหวสต็อค 6 เดือน </h3>
                    <div className="h-[250px] lg:h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <BarChart data={stockData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis dataKey="month" stroke="#64748b" tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="#64748b" tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        border: 'none',
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                        padding: '12px'
                                    }}
                                    cursor={{ fill: '#f1f5f9' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="inbound" stackId="a" fill="#3b82f6" name="รับเข้า (Inbound)" radius={[0, 0, 0, 0]} barSize={32} />
                                <Bar dataKey="outbound" stackId="a" fill="#8b5cf6" name="เบิกจ่าย (Outbound)" radius={[6, 6, 0, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Category Distribution (Count) */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200"
                >
                    <h3 className="text-lg font-bold text-slate-800 mb-6">สัดส่วนอุปกรณ์ </h3>
                    <div className="h-[250px] lg:h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, value }) => `${name} (${value})`}
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} strokeWidth={0} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                                    }}
                                />
                                <Legend
                                    verticalAlign="middle"
                                    align="right"
                                    layout="vertical"
                                    iconType="circle"
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* NEW: Stock Value Distribution */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-800">มูลค่าสต็อกตามหมวดหมู่ </h3>
                        <div className="text-sm font-bold text-slate-500">
                            มูลค่ารวม : ฿{stats.totalValue.toLocaleString()}
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                {(() => {
                                    const stockValueData = categoryData.map(c => {
                                        const categoryProducts = products.filter(p => p.DeviceType === c.name);
                                        const dataObj = { name: c.name, fill: c.fill };
                                        let totalValue = 0;
                                        categoryProducts.forEach(p => {
                                            const val = p.CurrentStock * p.LastPrice;
                                            if (val > 0) {
                                                const key = p.ProductName || `Product ID: ${p.ProductID}`;
                                                dataObj[key] = (dataObj[key] || 0) + val;
                                                totalValue += val;
                                            }
                                        });
                                        dataObj.totalValue = totalValue;
                                        return dataObj;
                                    }).sort((a, b) => b.totalValue - a.totalValue);

                                    const allKeys = Array.from(new Set(
                                        stockValueData.flatMap(d => Object.keys(d).filter(k => k !== 'name' && k !== 'fill' && k !== 'totalValue'))
                                    ));

                                    const keyToColor = {};
                                    allKeys.forEach(k => {
                                        const cat = stockValueData.find(d => d[k] > 0);
                                        if (cat) {
                                            keyToColor[k] = cat.fill;
                                        }
                                    });

                                    return (
                                        <BarChart
                                            data={stockValueData}
                                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="name" stroke="#64748b" tickLine={false} axisLine={false} />
                                            <YAxis stroke="#64748b" tickLine={false} axisLine={false} tickFormatter={(value) => `฿${(value / 1000).toFixed(0)}k`} />
                                            <Tooltip
                                                cursor={{ fill: '#f8fafc' }}
                                                formatter={(value, name) => [`฿${value.toLocaleString()}`, name]}
                                                contentStyle={{
                                                    backgroundColor: 'white',
                                                    borderRadius: '12px',
                                                    border: 'none',
                                                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                                }}
                                                itemSorter={(item) => -item.value}
                                            />
                                            {allKeys.map(key => (
                                                <Bar
                                                    key={key}
                                                    dataKey={key}
                                                    stackId="a"
                                                    fill={keyToColor[key] || '#8884d8'}
                                                    stroke="rgba(255,255,255,0.4)"
                                                    strokeWidth={1}
                                                    barSize={40}
                                                />
                                            ))}
                                        </BarChart>
                                    );
                                })()}
                            </ResponsiveContainer>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Critical Alerts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* Critical Low Stock */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="font-bold text-slate-800">สต็อกวิกฤต </h3>
                        </div>
                        <button onClick={() => navigate('/inventory', { state: { filter: 'lowstock' } })} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                            ดูทั้งหมด  <ArrowRight size={14} />
                        </button>
                    </div>
                    <div className="space-y-3">
                        {lowStockItems.length > 0 ? lowStockItems.map((item, idx) => (
                            <motion.div
                                key={item.ProductID}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm text-slate-800 truncate">{item.ProductName}</p>
                                    <p className="text-xs text-red-500">คงเหลือ: {item.CurrentStock} | ขั้นต่ำ : {item.MinStock}</p>
                                </div>
                                <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-lg">
                                    ขาด  {item.MinStock - item.CurrentStock}
                                </span>
                            </motion.div>
                        )) : (
                            <div className="text-center py-8 text-slate-400">
                                <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">สต็อกเพียงพอ👍</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* MA Expiry Alerts */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="font-bold text-slate-800">MA / License ใกล้หมดอายุ</h3>
                        </div>
                        <button onClick={() => navigate('/ma-license')} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                            จัดการ MA <ArrowRight size={14} />
                        </button>
                    </div>
                    <div className="space-y-3">
                        {maAlerts.length > 0 ? maAlerts.map((ma, idx) => {
                            const isExpired = ma.daysRemaining <= 0;
                            return (
                                <motion.div
                                    key={ma.ItemID}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={`flex items-center justify-between p-3 rounded-xl border ${isExpired ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'}`}
                                >
                                    <div className="flex-1 min-w-0 pr-2">
                                        <p className="font-bold text-sm text-slate-800 truncate">{ma.ItemName}</p>
                                        <p className={`text-xs truncate ${isExpired ? 'text-red-500' : 'text-orange-600'}`}>หมวด: {ma.Category}</p>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${isExpired ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-700'}`}>
                                        {isExpired ? 'Expired' : `${ma.daysRemaining} วัน`}
                                    </span>
                                </motion.div>
                            );
                        }) : (
                            <div className="text-center py-8 text-slate-400">
                                <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">ไม่มีสัญญาใกล้หมดอายุ ✅</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* NEW: Operational Insights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Recommended Order Trend */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="font-bold text-slate-800">แนวโน้มสั่งซื้อ </h3>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {orderTrendItems.length > 0 ? orderTrendItems.map((item, idx) => (
                            <motion.div
                                key={item.ProductID}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl border border-indigo-100"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm text-slate-800 truncate">{item.ProductName}</p>
                                    <p className="text-xs text-indigo-500">สต็อกปัจจุบัน: {item.CurrentStock} / {item.MaxStock}</p>
                                </div>
                                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${item.orderNeedPercent >= 80 ? 'bg-red-100 text-red-600' : item.orderNeedPercent >= 50 ? 'bg-orange-100 text-orange-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                    เพิ่ม {item.orderNeedPercent}%
                                </span>
                            </motion.div>
                        )) : (
                            <div className="text-center py-8 text-slate-400">
                                <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">ไม่มีข้อมูลแนวโน้ม</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Pending POs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="font-bold text-slate-800">รอรับของ </h3>
                        </div>
                        <button onClick={() => navigate('/receive')} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                            รับอุปกรณ์ <ArrowRight size={14} />
                        </button>
                    </div>
                    <div className="space-y-3">
                        {pendingPOs.length > 0 ? pendingPOs.map((po, idx) => (
                            <motion.div
                                key={po.PO_ID}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-slate-800">{po.PO_ID}</p>
                                    <p className="text-xs text-amber-600 truncate">{po.VendorName || 'ไม่ระบุผู้ขาย (Unknown Vendor)'}</p>
                                </div>
                                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${po.daysAgo > 7 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                                    {po.daysAgo} วัน
                                </span>
                            </motion.div>
                        )) : (
                            <div className="text-center py-8 text-slate-400">
                                <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">ไม่มี PO ค้าง ✅</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Top Withdrawn */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                                <Flame className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="font-bold text-slate-800">เบิกสูงสุดเดือนนี้ </h3>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {topWithdrawn.length > 0 ? topWithdrawn.map((item, idx) => (
                            <motion.div
                                key={item.ProductID}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100"
                            >
                                <span className={`w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center bg-gradient-to-br ${getDeviceTypeColor(item.DeviceType).gradient}`}>
                                    {idx + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm text-slate-800 truncate">{item.ProductName}</p>
                                </div>
                                <span className="text-sm font-bold text-purple-600 font-mono">
                                    {item.totalQty} ชิ้น
                                </span>
                            </motion.div>
                        )) : (
                            <div className="text-center py-8 text-slate-400">
                                <TrendingDown className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">ยังไม่มีข้อมูลการเบิกเดือนนี้</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Recent Activities styled */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200"
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800">กิจกรรมล่าสุด </h3>
                    <button onClick={() => navigate('/history')} className="text-indigo-600 text-sm font-bold hover:underline flex items-center gap-1">
                        ดูทั้งหมด  <ArrowRight size={14} />
                    </button>
                </div>

                <div className="space-y-4">
                    {recentTransactions.map((t, idx) => {
                        const isIn = (t.TransType || '').toUpperCase().trim() === 'IN';
                        return (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-md transition-all group"
                            >
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isIn ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                    {isIn ? <Package className="w-6 h-6" /> : <ShoppingCart className="w-6 h-6" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <p className="text-sm font-bold text-slate-800 truncate pr-4">
                                            {t.ProductName || `Product ID: ${t.ProductID}`}
                                        </p>
                                        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${isIn ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                            {isIn ? 'รับเข้า' : 'เบิกจ่าย'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <p className="text-xs text-slate-500 truncate">{t.RefInfo || 'ไม่มีข้อมูลอ้างอิง (No reference)'}</p>
                                        <p className="text-xs text-slate-400 font-mono">
                                            {formatThaiDate(t.TransDate)}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right pl-4">
                                    <p className={`text-lg font-bold font-mono ${isIn ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {isIn ? '+' : '-'}{Math.abs(t.Qty)}
                                    </p>
                                </div>
                            </motion.div>
                        );
                    })}
                    {recentTransactions.length === 0 && (
                        <div className="text-center py-12 text-slate-400">
                            <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>ไม่มีข้อมูล</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default DashboardPage;
