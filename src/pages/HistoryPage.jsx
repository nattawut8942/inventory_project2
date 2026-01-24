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
        <div className="space-y-6 animate-in slide-in-from-bottom-2">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black">Transaction Log</h2>
                <div className="flex bg-gray-900/80 p-1 rounded-xl border border-gray-800">
                    {['ALL', 'IN', 'OUT'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${filter === f ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                        >
                            {f === 'ALL' ? 'All Activity' : f === 'IN' ? 'Inbound' : 'Outbound'}
                        </button>
                    ))}
                </div>
            </div>
            <div className="bg-gray-900/40 rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs">
                    <thead className="bg-black/40 text-gray-400 uppercase text-[9px] tracking-widest border-b border-gray-800">
                        <tr>
                            <th className="p-4 pl-6">Timestamp</th>
                            <th className="p-4">Type</th>
                            <th className="p-4">Item Name</th>
                            <th className="p-4 text-center">Qty</th>
                            <th className="p-4">Reference</th>
                            <th className="p-4">User</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                        {filteredTransactions.map(t => (
                            <tr key={t.TransID} className="hover:bg-indigo-900/5 transition-colors">
                                <td className="p-4 pl-6 text-gray-500 font-mono">{new Date(t.TransDate).toLocaleString()}</td>
                                <td className="p-4">
                                    <span className={`font-bold px-2 py-1 rounded text-[10px] ${t.TransType === 'IN' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                        {t.TransType}
                                    </span>
                                </td>
                                <td className="p-4 font-bold text-gray-200">{t.ProductName}</td>
                                <td className={`p-4 text-center font-bold font-mono text-sm ${t.TransType === 'IN' ? 'text-green-400' : 'text-red-400'}`}>
                                    {t.TransType === 'IN' ? '+' : '-'}{t.Qty}
                                </td>
                                <td className="p-4 text-gray-400">{t.RefInfo}</td>
                                <td className="p-4">
                                    <span className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center text-[9px]">
                                            {t.UserID?.[0]}
                                        </div>
                                        {t.UserID}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default HistoryPage;
