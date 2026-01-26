import React, { useState } from 'react';
import { FileSpreadsheet, Calendar, Download, CheckSquare, Square } from 'lucide-react';

const API_BASE = 'http://localhost:3001/api';

const ReportPage = () => {
    const [selectedTypes, setSelectedTypes] = useState(['products']);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    const dataOptions = [
        { id: 'products', label: 'Inventory / Products', description: 'All active products with stock levels' },
        { id: 'transactions', label: 'Transaction History', description: 'All inbound/outbound movements' },
        { id: 'invoices', label: 'Invoice Records', description: 'All received invoices' },
        { id: 'pos', label: 'Purchase Orders', description: 'All PO records' }
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
            alert('Please select at least one data type');
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
            } else {
                alert('Failed to export report');
            }
        } catch (err) {
            console.error('Export error:', err);
            alert('Error exporting report');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-5">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-slate-800">Export Reports</h2>
            </div>

            <div className="max-w-3xl mx-auto">
                <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-200/50">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                            <FileSpreadsheet size={28} className="text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-xl text-slate-800">Generate Report</h3>
                            <p className="text-slate-500 text-sm">Select data types and date range to export</p>
                        </div>
                    </div>

                    {/* Date Range */}
                    <div className="mb-8">
                        <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-3 tracking-wider">
                            <Calendar size={14} /> Date Range (Optional)
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-600 mb-1 block">Start Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl outline-none focus:border-indigo-500 text-slate-700 font-medium"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-600 mb-1 block">End Date</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl outline-none focus:border-indigo-500 text-slate-700 font-medium"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Data Types Selection */}
                    <div className="mb-8">
                        <label className="text-xs font-bold text-slate-400 uppercase mb-3 block tracking-wider">Select Data to Export</label>
                        <div className="space-y-3">
                            {dataOptions.map(option => {
                                const isSelected = selectedTypes.includes(option.id);
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => toggleType(option.id)}
                                        className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${isSelected
                                            ? 'bg-indigo-50 border-indigo-500/50 text-indigo-900 shadow-sm ring-1 ring-indigo-500/20'
                                            : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-200 hover:bg-slate-50'
                                            }`}
                                    >
                                        {isSelected ? (
                                            <div className="bg-indigo-600 rounded-lg p-1">
                                                <CheckSquare size={16} className="text-white" />
                                            </div>
                                        ) : (
                                            <Square size={24} className="text-slate-300" />
                                        )}
                                        <div className="flex-1">
                                            <p className={`font-bold text-sm ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>{option.label}</p>
                                            <p className={`text-xs ${isSelected ? 'text-indigo-500/80' : 'text-slate-400'}`}>{option.description}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
                        <p className="text-xs text-slate-400 mb-2 font-bold uppercase tracking-wider">Export Summary</p>
                        <p className="text-sm text-slate-600">
                            <span className="font-bold text-indigo-600">{selectedTypes.length}</span> data type(s) selected
                            {startDate && endDate && (
                                <span className="text-slate-400"> • Range: {startDate} to {endDate}</span>
                            )}
                        </p>
                    </div>

                    {/* Export Button */}
                    <button
                        onClick={handleExport}
                        disabled={isExporting || selectedTypes.length === 0}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-indigo-200 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
                    >
                        {isExporting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Generating...
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
        </div>
    );
};

export default ReportPage;
