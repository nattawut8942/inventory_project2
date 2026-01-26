import React, { useState } from 'react';
import { Search, Monitor, Network, Archive, Database, Package, List, LayoutGrid, Edit2, Trash2, X } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:3001/api';

const InventoryPage = () => {
    const { products, deviceTypes, refreshData } = useData();
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('list');
    const [editItem, setEditItem] = useState(null);
    const [historyItem, setHistoryItem] = useState(null);
    const [historyData, setHistoryData] = useState([]);

    const viewHistory = async (product) => {
        setHistoryItem(product);
        try {
            const res = await fetch(`${API_BASE}/stock/history/${product.ProductID}`);
            if (res.ok) {
                const data = await res.json();
                setHistoryData(data);
            }
        } catch (err) {
            console.error('Failed to fetch history');
        }
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-5">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black">Inventory Master</h2>
                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-900/80 p-1 rounded-xl border border-gray-800">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-white'}`}
                        >
                            <List size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-white'}`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                    </div>
                    <div className="flex gap-2 bg-gray-900/80 px-4 py-2.5 rounded-xl border border-gray-800">
                        <Search size={18} className="text-gray-500 self-center" />
                        <input
                            type="text"
                            placeholder="Search devices..."
                            className="bg-transparent border-none outline-none text-sm w-48 text-white placeholder-gray-600"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* LIST VIEW */}
            {viewMode === 'list' && (
                <div className="bg-gray-900/40 rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-black/40 text-gray-400 uppercase text-[10px] tracking-widest border-b border-gray-800">
                            <tr>
                                <th className="p-4 pl-6">Device Name</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Unit Price</th>
                                <th className="p-4 text-center">In Stock</th>
                                <th className="p-4 text-center">Min</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-center">History</th>
                                {isAdmin && <th className="p-4 text-center">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50">
                            {filteredProducts.map(p => {
                                const Icon = getIcon(p.DeviceType);
                                return (
                                    <tr key={p.ProductID} className="hover:bg-indigo-900/5 transition-colors">
                                        <td className="p-4 pl-6 font-bold text-white">{p.ProductName}</td>
                                        <td className="p-4">
                                            <span className="flex items-center w-fit gap-1.5 px-2.5 py-1 rounded-full bg-gray-800 text-gray-300 text-[10px] font-medium border border-gray-700">
                                                <Icon size={12} />
                                                {p.DeviceType}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-400 font-mono">฿{p.LastPrice?.toLocaleString()}</td>
                                        <td className={`p-4 text-center font-mono font-bold text-lg ${p.CurrentStock < p.MinStock ? 'text-red-500' : 'text-green-500'}`}>
                                            {p.CurrentStock}
                                        </td>
                                        <td className="p-4 text-center text-gray-600 font-mono">{p.MinStock}</td>
                                        <td className="p-4">
                                            {p.CurrentStock < p.MinStock ?
                                                <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">LOW STOCK</span> :
                                                <span className="text-[10px] font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded border border-green-500/20">NORMAL</span>
                                            }
                                        </td>
                                        <td className="p-4 text-center">
                                            <button onClick={() => viewHistory(p)} className="text-gray-400 hover:text-indigo-400 transition-colors">
                                                <Search size={16} />
                                            </button>
                                        </td>
                                        {isAdmin && (
                                            <td className="p-4">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => setEditItem(p)}
                                                        className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => setShowDeleteConfirm(p.ProductID)}
                                                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredProducts.length === 0 && (
                        <div className="text-center py-10 text-gray-500">No items found</div>
                    )}
                </div>
            )}

            {/* GRID VIEW */}
            {viewMode === 'grid' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredProducts.map(p => {
                        const Icon = getIcon(p.DeviceType);
                        const isLow = p.CurrentStock < p.MinStock;
                        return (
                            <div key={p.ProductID} className={`bg-gray-900/60 border rounded-2xl p-5 transition-all hover:border-indigo-500/50 ${isLow ? 'border-red-900/50' : 'border-gray-800'}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-800 text-gray-300 text-[10px] font-medium border border-gray-700">
                                        <Icon size={12} />
                                        {p.DeviceType}
                                    </span>
                                    <div className="flex gap-1">
                                        <button onClick={() => viewHistory(p)} className="p-1.5 text-gray-500 hover:text-indigo-400 rounded">
                                            <Search size={14} />
                                        </button>
                                        {isAdmin && (
                                            <>
                                                <button onClick={() => setEditItem(p)} className="p-1.5 text-gray-500 hover:text-indigo-400 rounded">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button onClick={() => setShowDeleteConfirm(p.ProductID)} className="p-1.5 text-gray-500 hover:text-red-400 rounded">
                                                    <Trash2 size={14} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <h3 className="font-bold text-white text-sm mb-2 line-clamp-2">{p.ProductName}</h3>
                                <div className="flex justify-between items-end mt-4">
                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase">Price</p>
                                        <p className="text-gray-300 font-mono text-sm">฿{p.LastPrice?.toLocaleString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-gray-500 uppercase">Stock</p>
                                        <p className={`font-bold text-2xl font-mono ${isLow ? 'text-red-500' : 'text-green-500'}`}>{p.CurrentStock}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* HISTORY MODAL */}
            {historyItem && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-950 w-full max-w-2xl rounded-3xl border border-gray-800 shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 bg-gradient-to-r from-indigo-900 to-gray-900 flex justify-between items-center rounded-t-3xl">
                            <div>
                                <h3 className="font-bold text-lg text-white">Stock History</h3>
                                <p className="text-xs text-indigo-300">{historyItem.ProductName}</p>
                            </div>
                            <button onClick={() => setHistoryItem(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-black/50 text-gray-500 text-[10px] uppercase sticky top-0 backdrop-blur-md">
                                    <tr>
                                        <th className="p-4">Date</th>
                                        <th className="p-4 text-center">Qty</th>
                                        <th className="p-4">Source Ref</th>
                                        <th className="p-4">User</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {historyData.map((h, i) => (
                                        <tr key={i} className="hover:bg-gray-900/50">
                                            <td className="p-4 text-gray-400">{new Date(h.TransDate).toLocaleDateString()} {new Date(h.TransDate).toLocaleTimeString()}</td>
                                            <td className="p-4 text-center font-bold text-green-500">+{h.Qty}</td>
                                            <td className="p-4 text-indigo-300">{h.RefInfo}</td>
                                            <td className="p-4 text-xs text-gray-600">{h.UserID}</td>
                                        </tr>
                                    ))}
                                    {historyData.length === 0 && (
                                        <tr><td colSpan="4" className="p-8 text-center text-gray-600">No history available</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT MODAL */}
            {editItem && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-950 w-full max-w-lg rounded-3xl border border-gray-800 shadow-2xl overflow-hidden">
                        <div className="p-6 bg-gradient-to-r from-indigo-900 to-gray-900 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-white">Edit Product</h3>
                            <button onClick={() => setEditItem(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleUpdate} className="p-8 space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Product Name</label>
                                <input name="ProductName" defaultValue={editItem.ProductName} className="w-full bg-black border border-gray-800 p-3 rounded-xl mt-1 outline-none" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Type</label>
                                    <select name="DeviceType" defaultValue={editItem.DeviceType} className="w-full bg-black border border-gray-800 p-3 rounded-xl mt-1">
                                        {deviceTypes.map(t => <option key={t.TypeId} value={t.TypeId}>{t.Label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Price</label>
                                    <input name="LastPrice" type="number" step="0.01" defaultValue={editItem.LastPrice} className="w-full bg-black border border-gray-800 p-3 rounded-xl mt-1" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Current Stock</label>
                                    <input name="CurrentStock" type="number" defaultValue={editItem.CurrentStock} className="w-full bg-black border border-gray-800 p-3 rounded-xl mt-1" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Min Stock</label>
                                    <input name="MinStock" type="number" defaultValue={editItem.MinStock} className="w-full bg-black border border-gray-800 p-3 rounded-xl mt-1" />
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl mt-4">Save Changes</button>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRM */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-950 w-full max-w-sm rounded-2xl border border-gray-800 p-6 text-center">
                        <Trash2 size={48} className="mx-auto text-red-500 mb-4" />
                        <h3 className="font-bold text-xl mb-2">Delete Product?</h3>
                        <p className="text-gray-500 text-sm mb-6">This action cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 bg-gray-800 text-white py-3 rounded-xl font-bold">Cancel</button>
                            <button onClick={() => handleDelete(showDeleteConfirm)} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryPage;
