import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    FileText,
    Search,
    Filter,
    Calendar,
    ChevronDown,
    ChevronUp,
    Clock,
    User,
    Database,
    Activity,
    X,
    Eye
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

const AuditLogPage = () => {
    const { user } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        actionType: 'ALL',
        tableName: 'ALL'
    });
    const [selectedLog, setSelectedLog] = useState(null);

    // Fetch Logs
    const fetchLogs = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (filters.startDate) queryParams.append('startDate', filters.startDate);
            if (filters.endDate) queryParams.append('endDate', filters.endDate);
            if (filters.actionType !== 'ALL') queryParams.append('actionType', filters.actionType);
            if (filters.tableName !== 'ALL') queryParams.append('tableName', filters.tableName);
            if (searchTerm) queryParams.append('user', searchTerm);

            const res = await fetch(`http://localhost:3001/api/audit-logs?${queryParams.toString()}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setLogs(data);
            }
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [filters]); // Refetch when filters change

    const handleSearch = (e) => {
        e.preventDefault();
        fetchLogs();
    };

    // Helper to format JSON diff
    const formatValue = (val) => {
        if (!val) return 'null';
        try {
            const obj = JSON.parse(val);
            return JSON.stringify(obj, null, 2);
        } catch (e) {
            return val;
        }
    };

    const getActionColor = (action) => {
        switch (action) {
            case 'CREATE': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'UPDATE': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'DELETE': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto min-h-screen bg-slate-50/50">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 text-white">
                            <Activity size={24} />
                        </div>
                        Audit Logs
                    </h1>
                    <p className="text-slate-500 mt-1 ml-1 font-medium">Tracking system activities and data changes</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-6">
                <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Search User</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search by username..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Start Date</label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium text-slate-600"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">End Date</label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium text-slate-600"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Action Type</label>
                        <select
                            value={filters.actionType}
                            onChange={(e) => setFilters(prev => ({ ...prev, actionType: e.target.value }))}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium text-slate-600 appearance-none cursor-pointer"
                        >
                            <option value="ALL">All Actions</option>
                            <option value="CREATE">Create</option>
                            <option value="UPDATE">Update</option>
                            <option value="DELETE">Delete</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="bg-indigo-600 text-white font-bold py-2 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all flex items-center justify-center gap-2"
                    >
                        <Search size={18} />
                        Apply Filters
                    </button>
                </form>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-left">
                                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
                                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Table / Record</th>
                                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="py-12 text-center text-slate-400">Loading logs...</td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="py-12 text-center text-slate-400">No logs found matching your criteria.</td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.LogID} className="hover:bg-slate-50 transition-colors group">
                                        <td className="py-4 px-6 text-sm text-slate-600 font-medium">
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} className="text-slate-400" />
                                                {new Date(log.ChangeDate).toLocaleString('th-TH')}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-sm">
                                            <span className="font-bold text-slate-700">{log.ChangedBy}</span>
                                            {log.IPAddress && <span className="block text-[10px] text-slate-400">{log.IPAddress}</span>}
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getActionColor(log.ActionType)}`}>
                                                {log.ActionType}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-slate-600">
                                            <div className="font-bold">{log.TableName}</div>
                                            <div className="text-xs text-slate-400 font-mono">ID: {log.RecordID}</div>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                className="text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 p-2 rounded-lg transition-colors"
                                            >
                                                <Eye size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedLog && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                            onClick={() => setSelectedLog(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">Change Details</h3>
                                    <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getActionColor(selectedLog.ActionType)}`}>
                                            {selectedLog.ActionType}
                                        </span>
                                        on <span className="font-mono bg-slate-200 px-1 rounded">{selectedLog.TableName}</span>
                                        (ID: {selectedLog.RecordID})
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedLog(null)}
                                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm">
                                        <h4 className="font-bold text-red-600 mb-3 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-red-500" />
                                            Old Value (Before)
                                        </h4>
                                        <pre className="text-xs font-mono bg-red-50/30 p-4 rounded-lg overflow-x-auto text-slate-700 min-h-[200px] border border-red-50">
                                            {formatValue(selectedLog.OldValues)}
                                        </pre>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
                                        <h4 className="font-bold text-emerald-600 mb-3 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            New Value (After)
                                        </h4>
                                        <pre className="text-xs font-mono bg-emerald-50/30 p-4 rounded-lg overflow-x-auto text-slate-700 min-h-[200px] border border-emerald-50">
                                            {formatValue(selectedLog.NewValues)}
                                        </pre>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border-t border-slate-100 bg-white flex justify-end">
                                <button
                                    onClick={() => setSelectedLog(null)}
                                    className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AuditLogPage;
