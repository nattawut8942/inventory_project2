import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';

const HistoryPage = () => {
    const { transactions } = useData();
    const [filter, setFilter] = useState('ALL'); // ALL, IN, OUT

    const filteredTransactions = useMemo(() => {
        if (filter === 'ALL') return transactions || [];
        return (transactions || []).filter(t => t.TransType === filter);
    }, [transactions, filter]);

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-5">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-slate-800">Transaction Log</h2>
                <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    {['ALL', 'IN', 'OUT'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${filter === f ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
                        >
                            {f === 'ALL' ? 'All Activity' : f === 'IN' ? 'Inbound' : 'Outbound'}
                        </button>
                    ))}
                </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-widest border-b border-slate-200">
                        <tr>
                            <th className="p-4 pl-6">Timestamp</th>
                            <th className="p-4">Type</th>
                            <th className="p-4">Item Name</th>
                            <th className="p-4 text-center">Qty</th>
                            <th className="p-4">Reference</th>
                            <th className="p-4">User</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredTransactions.map(t => {
                            const isIn = (t.TransType || '').toUpperCase().trim() === 'IN' || (t.RefInfo || '').toLowerCase().includes('invoice');
                            return (
                                <tr key={t.TransID} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 pl-6 text-slate-500 font-mono text-xs">{new Date(t.TransDate).toLocaleString()}</td>
                                    <td className="p-4">
                                        <span className={`font-bold px-2.5 py-1 rounded-full text-[10px] border ${isIn ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                            {t.TransType}
                                        </span>
                                    </td>
                                    <td className="p-4 font-bold text-slate-700">{t.ProductName}</td>
                                    <td className={`p-4 text-center font-bold font-mono text-sm ${isIn ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {isIn ? '+' : '-'}{Math.abs(t.Qty)}
                                    </td>
                                    <td className="p-4 text-slate-500 text-xs">{t.RefInfo}</td>
                                    <td className="p-4">
                                        <span className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                {t.UserID?.[0]}
                                            </div>
                                            {t.UserID}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filteredTransactions.length === 0 && (
                    <div className="text-center py-10 text-slate-400">No transactions found</div>
                )}
            </div>
        </div>
    );

};

export default HistoryPage;
