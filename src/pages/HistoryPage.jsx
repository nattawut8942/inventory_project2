import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { useData } from '../context/DataContext';
import { formatThaiDate } from '../utils/formatDate';

const HistoryPage = () => {
    const { transactions } = useData();
    const [filter, setFilter] = useState('ALL'); // ALL, IN, OUT
    const [searchTerm, setSearchTerm] = useState('');

    const filteredTransactions = useMemo(() => {
        let result = transactions || [];

        // Filter by type
        if (filter !== 'ALL') {
            result = result.filter(t => t.TransType === filter);
        }

        // Filter by search term (UserID, ProductName, or RefInfo)
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            result = result.filter(t =>
                (t.UserID || '').toLowerCase().includes(term) ||
                (t.ProductName || '').toLowerCase().includes(term) ||
                (t.RefInfo || '').toLowerCase().includes(term)
            );
        }

        return result;
    }, [transactions, filter, searchTerm]);

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-5">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-slate-800">Transaction Log</h2>
                <div className="flex items-center gap-4">
                    {/* Search Box */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="ค้นหา User, Item, Reference..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 w-64 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                        />
                    </div>
                    {/* Filter Buttons */}
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
            </div>
            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm overflow-x-auto">
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
                                    <td className="p-4 pl-6 text-slate-500 font-mono text-xs whitespace-nowrap">{formatThaiDate(t.TransDate)}</td>
                                    <td className="p-4">
                                        <span className={`font-bold px-2.5 py-1 rounded-full text-[10px] border ${isIn ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                            {t.TransType}
                                        </span>
                                    </td>
                                    <td className="p-4 font-bold text-slate-700 max-w-[200px] truncate" title={t.ProductName}>{t.ProductName}</td>
                                    <td className={`p-4 text-center font-bold font-mono text-sm ${isIn ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {isIn ? '+' : '-'}{Math.abs(t.Qty)}
                                    </td>
                                    <td className="p-4 text-slate-500 text-xs max-w-[150px] truncate" title={t.RefInfo}>{t.RefInfo}</td>
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

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
                {filteredTransactions.map((t) => {
                    const isIn = (t.TransType || '').toUpperCase().trim() === 'IN' || (t.RefInfo || '').toLowerCase().includes('invoice');
                    return (
                        <div key={t.TransID} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isIn ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                        {isIn ? '+' : '-'}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{t.ProductName}</h4>
                                        <p className="text-xs text-slate-500">{formatThaiDate(t.TransDate)}</p>
                                    </div>
                                </div>
                                <span className={`font-bold px-2 py-0.5 rounded-lg text-[10px] border ${isIn ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                    {t.TransType}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                <div className="bg-slate-50 p-2 rounded-lg">
                                    <span className="text-slate-400 block mb-0.5">Reference</span>
                                    <span className="font-medium text-slate-700 truncate block">{t.RefInfo || '-'}</span>
                                </div>
                                <div className="bg-slate-50 p-2 rounded-lg">
                                    <span className="text-slate-400 block mb-0.5">User</span>
                                    <span className="font-medium text-slate-700 truncate block">{t.UserID}</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                <span className="text-xs font-bold text-slate-400">Quantity</span>
                                <span className={`text-lg font-black font-mono ${isIn ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {isIn ? '+' : '-'}{Math.abs(t.Qty)}
                                </span>
                            </div>
                        </div>
                    );
                })}
                {filteredTransactions.length === 0 && (
                    <div className="text-center py-10 text-slate-400">No transactions found</div>
                )}
            </div>
        </div>
    );

};

export default HistoryPage;
