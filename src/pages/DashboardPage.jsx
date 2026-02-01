import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Package, TrendingUp, TrendingDown, AlertTriangle, DollarSign, ShoppingCart } from 'lucide-react';
import { motion } from 'motion/react';
import { useData } from '../context/DataContext';
import StatCard from '../components/StatCard';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1'];

const DashboardPage = () => {
    const { products, transactions, purchaseOrders } = useData();
    const navigate = useNavigate();

    // 1. Calculate Stats
    const stats = useMemo(() => {
        const totalStock = products.reduce((sum, p) => sum + p.CurrentStock, 0);
        const totalValue = products.reduce((sum, p) => sum + (p.CurrentStock * p.LastPrice), 0);
        const lowStockCount = products.filter(p => p.CurrentStock < p.MinStock).length;
        const activePOs = purchaseOrders.filter(po => po.Status !== 'Completed').length;

        return { totalStock, totalValue, lowStockCount, activePOs };
    }, [products, purchaseOrders]);

    // 2. Prepare Chart Data: Category Distribution
    const categoryData = useMemo(() => {
        const map = {};
        products.forEach(p => {
            if (!map[p.DeviceType]) map[p.DeviceType] = 0;
            map[p.DeviceType] += p.CurrentStock;
        });
        return Object.keys(map).map(key => ({ name: key, value: map[key] }));
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
                if (t.TransType === 'IN') dataMap[monthKey].inbound += t.Qty;
                if (t.TransType === 'OUT') dataMap[monthKey].outbound += t.Qty;
            }
        });

        return Object.values(dataMap);
    }, [transactions]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 p-2">
            <h2 className="text-3xl font-black text-slate-800 mb-8">Dashboard ภาพรวม</h2>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={Package}
                    title="สินค้าคงคลังทั้งหมด"
                    value={stats.totalStock.toLocaleString()}
                    subValue="ชิ้น (รายการ)"
                    color="from-blue-500 to-blue-600"
                />
                <StatCard
                    icon={ShoppingCart}
                    title="ใบสั่งซื้อรอส่ง (Active PO)"
                    value={stats.activePOs}
                    subValue="รายการ"
                    color="from-purple-500 to-purple-600"
                />
                <StatCard
                    icon={DollarSign}
                    title="มูลค่าสต็อคปัจจุบัน"
                    value={`฿${(stats.totalValue / 1000000).toFixed(2)}M`}
                    subValue={`฿${stats.totalValue.toLocaleString()}`}
                    color="from-pink-500 to-pink-600"
                />
                <StatCard
                    icon={AlertTriangle}
                    title="สินค้าใกล้หมด"
                    value={stats.lowStockCount}
                    subValue="รายการที่ต้องเติม"
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
                    <h3 className="text-lg font-bold text-slate-800 mb-6">การเคลื่อนไหวสต็อค (6 เดือนล่าสุด)</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
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
                                <Bar dataKey="inbound" fill="#3b82f6" name="สินค้าเข้า" radius={[6, 6, 0, 0]} barSize={20} />
                                <Bar dataKey="outbound" fill="#8b5cf6" name="เบิกจ่าย" radius={[6, 6, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Category Distribution */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200"
                >
                    <h3 className="text-lg font-bold text-slate-800 mb-6">สัดส่วนสินค้าตามหมวดหมู่</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
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
                                <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
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
                    <h3 className="text-xl font-bold text-slate-800">กิจกรรมล่าสุด</h3>
                    <button onClick={() => navigate('/history')} className="text-indigo-600 text-sm font-bold hover:underline">ดูทั้งหมด</button>
                </div>

                <div className="space-y-4">
                    {transactions.slice(0, 5).map((t, idx) => {
                        const isIn = t.TransType === 'IN';
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
                                        <p className="text-xs text-slate-500 truncate">{t.RefInfo || 'No reference'}</p>
                                        <p className="text-xs text-slate-400 font-mono">
                                            {new Date(t.TransDate).toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right pl-4">
                                    <p className={`text-lg font-bold font-mono ${isIn ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {isIn ? '+' : '-'}{t.Qty}
                                    </p>
                                </div>
                            </motion.div>
                        );
                    })}
                    {transactions.length === 0 && (
                        <div className="text-center py-12 text-slate-400">
                            <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>ยังไม่มีรายการเคลื่อนไหว</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default DashboardPage;
