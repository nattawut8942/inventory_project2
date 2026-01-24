import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:3001/api';

const ManualImportPage = () => {
    const { deviceTypes, refreshData } = useData();
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);

        try {
            await fetch(`${API_BASE}/products/manual-import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...Object.fromEntries(fd),
                    UserID: user.username
                })
            });
            refreshData();
            navigate('/inventory');
        } catch (err) {
            alert('Error importing');
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 pt-10">
            <div className="bg-gray-900/60 border border-gray-800 p-8 rounded-3xl shadow-2xl backdrop-blur-sm">
                <h2 className="text-2xl font-black mb-2 flex items-center gap-3 text-white">
                    <Plus className="text-indigo-500" /> Manual Import
                </h2>
                <p className="text-gray-500 text-sm mb-8">Import legacy items manually without PO reference.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Product Name</label>
                            <input
                                name="ProductName"
                                required
                                className="w-full bg-black/50 border border-gray-800 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                placeholder="e.g. Dell Monitor..."
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Type</label>
                            <select
                                name="DeviceType"
                                className="w-full bg-black/50 border border-gray-800 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-300"
                            >
                                {deviceTypes.map(t => <option key={t.TypeId} value={t.TypeId}>{t.Label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Price</label>
                            <input
                                name="LastPrice"
                                type="number"
                                step="0.01"
                                required
                                className="w-full bg-black/50 border border-gray-800 p-3 rounded-xl outline-none"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Current Stock</label>
                            <input
                                name="CurrentStock"
                                type="number"
                                required
                                className="w-full bg-black/50 border border-gray-800 p-3 rounded-xl outline-none"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Min. Alert</label>
                            <input
                                name="MinStock"
                                type="number"
                                required
                                className="w-full bg-black/50 border border-gray-800 p-3 rounded-xl outline-none"
                                placeholder="0"
                            />
                        </div>
                    </div>
                    <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl mt-4 transition-all">
                        Confirm Import
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ManualImportPage;
