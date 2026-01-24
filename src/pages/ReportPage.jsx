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
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black">Export Reports</h2>
            </div>

            <div className="max-w-3xl mx-auto">
                <div className="bg-gray-900/60 border border-gray-800 rounded-3xl p-8">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 flex items-center justify-center">
                            <FileSpreadsheet size={28} className="text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-xl">Generate Report</h3>
                            <p className="text-gray-500 text-sm">Select data types and date range to export</p>
                        </div>
                    </div>

                    {/* Date Range */}
                    <div className="mb-8">
                        <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2 mb-3">
                            <Calendar size={14} /> Date Range (Optional)
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-600 mb-1 block">Start Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full bg-black border border-gray-800 p-3 rounded-xl outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-600 mb-1 block">End Date</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full bg-black border border-gray-800 p-3 rounded-xl outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Data Types Selection */}
                    <div className="mb-8">
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-3 block">Select Data to Export</label>
                        <div className="space-y-3">
                            {dataOptions.map(option => {
                                const isSelected = selectedTypes.includes(option.id);
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => toggleType(option.id)}
                                        className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${isSelected
                                                ? 'bg-indigo-600/10 border-indigo-600/30 text-white'
                                                : 'bg-black/40 border-gray-800 text-gray-400 hover:border-gray-700'
                                            }`}
                                    >
                                        {isSelected ? (
                                            <CheckSquare size={20} className="text-indigo-400" />
                                        ) : (
                                            <Square size={20} className="text-gray-600" />
                                        )}
                                        <div className="flex-1">
                                            <p className="font-bold text-sm">{option.label}</p>
                                            <p className="text-xs text-gray-500">{option.description}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-black/40 border border-gray-800 rounded-xl p-4 mb-6">
                        <p className="text-xs text-gray-500 mb-2">Export Summary</p>
                        <p className="text-sm text-white">
                            <span className="font-bold text-indigo-400">{selectedTypes.length}</span> data type(s) selected
                            {startDate && endDate && (
                                <span className="text-gray-500"> • Date range: {startDate} to {endDate}</span>
                            )}
                        </p>
                    </div>

                    {/* Export Button */}
                    <button
                        onClick={handleExport}
                        disabled={isExporting || selectedTypes.length === 0}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all"
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
