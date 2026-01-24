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
            <h2 className="text-3xl font-black">Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatsCard label="Total Stock" value={products.reduce((a, b) => a + b.CurrentStock, 0)} sub="Items" />
                <StatsCard label="Below Minimum" value={products.filter(p => p.CurrentStock < p.MinStock).length} alert />
                <StatsCard label="Active POs" value={purchaseOrders.filter(p => p.Status !== 'Completed').length} color="indigo" />
                <StatsCard label="Forecast Cost" value={`฿${forecast.reduce((s, i) => s + i.EstimatedCost, 0).toLocaleString()}`} color="green" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-950/50 backdrop-blur rounded-2xl border border-gray-800 p-6">
                    <h3 className="font-bold flex items-center gap-2 mb-4 text-lg">
                        <AlertTriangle className="text-red-500" size={18} /> Reorder Suggestions
                    </h3>
                    <div className="space-y-3">
                        {forecast.map(item => (
                            <div key={item.ProductID} className="flex justify-between items-center text-sm p-4 bg-black/40 rounded-xl border border-gray-800">
                                <div>
                                    <p className="font-bold text-white">{item.ProductName}</p>
                                    <p className="text-[10px] text-gray-500 bg-gray-900 inline-block px-1 rounded mt-1">{item.DeviceType}</p>
                                </div>
                                <div className="text-right">
                                    <span className="block text-red-400 font-bold">Need: {item.Needed}</span>
                                    <span className="text-[10px] text-gray-500">Est: ฿{item.EstimatedCost.toLocaleString()}</span>
                                </div>
                            </div>
                        ))}
                        {forecast.length === 0 && <p className="text-gray-500 text-center py-4">Stock levels are healthy.</p>}
                    </div>
                </div>
                <div className="bg-gray-950/50 backdrop-blur rounded-2xl border border-gray-800 p-6">
                    <h3 className="font-bold flex items-center gap-2 mb-4 text-lg">
                        <TrendingUp className="text-indigo-400" size={18} /> Recent Transactions
                    </h3>
                    <div className="space-y-3">
                        {transactions.slice(0, 5).map(t => (
                            <div key={t.TransID} className="flex justify-between items-center text-xs p-3 bg-black/40 rounded-xl border-l-2 border-indigo-500">
                                <div>
                                    <p className="font-bold text-gray-200">{t.ProductName || t.ProductID}</p>
                                    <p className="text-[10px] text-gray-500">{t.RefInfo}</p>
                                </div>
                                <div className="text-right">
                                    <span className={`block font-bold ${t.TransType === 'IN' ? 'text-green-400' : 'text-red-400'}`}>
                                        {t.TransType === 'IN' ? '+' : '-'}{t.Qty}
                                    </span>
                                    <span className="text-[10px] text-gray-600">{new Date(t.TransDate).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
