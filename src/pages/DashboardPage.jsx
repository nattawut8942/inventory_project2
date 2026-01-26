import React, { useMemo } from 'react';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { useData } from '../context/DataContext';
import StatsCard from '../components/StatsCard';

const DashboardPage = () => {
    const { products, transactions, purchaseOrders } = useData();

    const forecast = useMemo(() => {
        return (products || []).map(p => ({
            ...p,
            Needed: p.CurrentStock < p.MinStock ? p.MinStock - p.CurrentStock : 0,
            EstimatedCost: (p.CurrentStock < p.MinStock ? p.MinStock - p.CurrentStock : 0) * p.LastPrice
        })).filter(p => p.Needed > 0);
    }, [products]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <h2 className="text-3xl font-black text-slate-800">Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatsCard label="Total Stock" value={products.reduce((a, b) => a + b.CurrentStock, 0)} sub="Items" />
                <StatsCard label="Below Minimum" value={products.filter(p => p.CurrentStock < p.MinStock).length} alert />
                <StatsCard label="Active POs" value={purchaseOrders.filter(p => p.Status !== 'Completed').length} color="indigo" />
                <StatsCard label="Forecast Cost" value={`฿${forecast.reduce((s, i) => s + i.EstimatedCost, 0).toLocaleString()}`} color="green" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="font-bold flex items-center gap-2 mb-4 text-lg text-slate-800">
                        <AlertTriangle className="text-red-500" size={18} /> Reorder Suggestions
                    </h3>
                    <div className="space-y-3">
                        {forecast.map(item => (
                            <div key={item.ProductID} className="flex justify-between items-center text-sm p-4 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
                                <div>
                                    <p className="font-bold text-slate-700">{item.ProductName}</p>
                                    <p className="text-[10px] text-slate-500 bg-white inline-block px-1 rounded mt-1 border border-slate-200">{item.DeviceType}</p>
                                </div>
                                <div className="text-right">
                                    <span className="block text-red-500 font-bold">Need: {item.Needed}</span>
                                    <span className="text-[10px] text-slate-400">Est: ฿{item.EstimatedCost.toLocaleString()}</span>
                                </div>
                            </div>
                        ))}
                        {forecast.length === 0 && <p className="text-slate-400 text-center py-4">Stock levels are healthy.</p>}
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="font-bold flex items-center gap-2 mb-4 text-lg text-slate-800">
                        <TrendingUp className="text-indigo-600" size={18} /> Recent Transactions
                    </h3>
                    <div className="space-y-3">
                        {transactions.slice(0, 5).map(t => (
                            <div key={t.TransID} className={`flex justify-between items-center text-xs p-3 rounded-xl border-l-4 ${t.TransType === 'IN' ? 'bg-emerald-50 border-emerald-500' : 'bg-red-50 border-red-500'}`}>
                                <div>
                                    <p className="font-bold text-slate-700">{t.ProductName || t.ProductID}</p>
                                    <p className="text-[10px] text-slate-500">{t.RefInfo}</p>
                                </div>
                                <div className="text-right">
                                    <span className={`block font-bold ${t.TransType === 'IN' ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {t.TransType === 'IN' ? '+' : '-'}{t.Qty}
                                    </span>
                                    <span className="text-[10px] text-slate-400">{new Date(t.TransDate).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                        {transactions.length === 0 && <p className="text-slate-400 text-center py-4">No recent activity.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
