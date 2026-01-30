import React, { useState } from 'react';
import { Search, Monitor, Network, Archive, Database, Package, List, LayoutGrid, Edit2, Trash2, X } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import AlertModal from '../components/AlertModal';

const API_BASE = 'http://localhost:3001/api';
const API_URL = 'http://localhost:3001';

const InventoryPage = () => {
    const { products, deviceTypes, refreshData } = useData();
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('list');
    const [editItem, setEditItem] = useState(null);
    const [historyItem, setHistoryItem] = useState(null);
    const [historyData, setHistoryData] = useState([]);

    // Modal & Alert States
    const [alertModal, setAlertModal] = useState({ isOpen: false, type: 'info', title: '', message: '' });

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

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

    const isAdmin = user?.role === 'Staff';

    const getIcon = (type) => {
        switch (type) {
            case 'Monitor': return Monitor;
            case 'Network': return Network;
            case 'Asset': return Archive;
            case 'Stock': return Database;
            default: return Package;
        }
    };

    const filteredProducts = products.filter(p =>
        p.ProductName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleFileUpload = async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`${API_BASE}/upload`, {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                const data = await res.json();
                return data.path;
            } else {
                setAlertModal({ isOpen: true, type: 'error', title: 'Upload Error', message: 'Server failed to handle the upload.' });
            }
        } catch (err) {
            console.error('Upload failed', err);
            setAlertModal({ isOpen: true, type: 'error', title: 'Connection Error', message: 'Could not connect to server for upload.' });
        }
        return null;
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const file = fd.get('imageFile');
        let imageUrl = editItem.ImageURL;

        if (file && file.size > 0) {
            const uploadedPath = await handleFileUpload(file);
            if (uploadedPath) imageUrl = uploadedPath;
        }

        const payload = Object.fromEntries(fd);
        payload.ImageURL = imageUrl;

        try {
            const res = await fetch(`${API_BASE}/products/${editItem.ProductID}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setEditItem(null);
                refreshData();
                setAlertModal({ isOpen: true, type: 'success', title: 'Success', message: 'Product updated successfully!' });
            } else {
                setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'Failed to update product.' });
            }
        } catch (err) {
            setAlertModal({ isOpen: true, type: 'error', title: 'Network Error', message: 'Failed to connect to update product.' });
        }
    };

    const handleDelete = async (id) => {
        try {
            await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' });
            setShowDeleteConfirm(null);
            refreshData();
            setAlertModal({ isOpen: true, type: 'success', title: 'Deleted', message: 'Product deleted successfully.' });
        } catch (err) {
            setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'Failed to delete product.' });
        }
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-5">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-slate-800">Inventory Master</h2>
                <div className="flex items-center gap-3">
                    <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                        >
                            <List size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                    </div>
                    <div className="flex gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                        <Search size={18} className="text-slate-400 self-center" />
                        <input
                            type="text"
                            placeholder="Search devices..."
                            className="bg-transparent border-none outline-none text-sm w-48 text-slate-700 placeholder-slate-400"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* LIST VIEW */}
            {viewMode === 'list' && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-widest border-b border-slate-200">
                            <tr>
                                <th className="p-4 pl-6">Product</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Unit Price</th>
                                <th className="p-4 text-center">In Stock</th>
                                <th className="p-4 text-center">Min</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-center">History</th>
                                {isAdmin && <th className="p-4 text-center">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredProducts.map(p => {
                                const Icon = getIcon(p.DeviceType);
                                return (
                                    <tr key={p.ProductID} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                                    {p.ImageURL ? (
                                                        <img src={`${API_URL}${p.ImageURL}`} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Icon size={18} className="text-slate-400" />
                                                    )}
                                                </div>
                                                <span className="font-bold text-slate-700">{p.ProductName}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="flex items-center w-fit gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200">
                                                {p.DeviceType}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-500 font-mono">฿{p.LastPrice?.toLocaleString()}</td>
                                        <td className={`p-4 text-center font-mono font-bold text-lg ${p.CurrentStock < p.MinStock ? 'text-red-500' : 'text-emerald-600'}`}>
                                            {p.CurrentStock}
                                        </td>
                                        <td className="p-4 text-center text-slate-400 font-mono">{p.MinStock}</td>
                                        <td className="p-4">
                                            {p.CurrentStock < p.MinStock ?
                                                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100">LOW STOCK</span> :
                                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">NORMAL</span>
                                            }
                                        </td>
                                        <td className="p-4 text-center">
                                            <button onClick={() => viewHistory(p)} className="text-slate-400 hover:text-indigo-600 transition-colors p-1.5 hover:bg-indigo-50 rounded-lg">
                                                <Search size={16} />
                                            </button>
                                        </td>
                                        {isAdmin && (
                                            <td className="p-4">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => setEditItem(p)}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => setShowDeleteConfirm(p.ProductID)}
                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
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
                        <div className="text-center py-10 text-slate-400">No items found</div>
                    )}
                </div>
            )}

            {/* GRID VIEW */}
            {viewMode === 'grid' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredProducts.map(p => (
                        <div key={p.ProductID} className="group bg-white rounded-3xl border border-slate-100 p-5 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                            {/* Decorative Gradient Background */}
                            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-slate-50 to-slate-100 opacity-50 z-0"></div>

                            {/* Actions Overlay */}
                            <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => viewHistory(p)} className="p-2 bg-white/90 backdrop-blur text-indigo-600 rounded-full shadow-sm hover:bg-indigo-50"><List size={16} /></button>
                                {isAdmin && (
                                    <>
                                        <button onClick={() => setEditItem(p)} className="p-2 bg-white/90 backdrop-blur text-amber-500 rounded-full shadow-sm hover:bg-amber-50"><Edit2 size={16} /></button>
                                        <button onClick={() => setShowDeleteConfirm(p.ProductID)} className="p-2 bg-white/90 backdrop-blur text-red-500 rounded-full shadow-sm hover:bg-red-50"><Trash2 size={16} /></button>
                                    </>
                                )}
                            </div>

                            <div className="relative z-10 flex flex-col items-center text-center mt-2">
                                {/* Image or Icon Placeholder */}
                                <div className="w-24 h-24 mb-4 rounded-2xl overflow-hidden shadow-md bg-white flex items-center justify-center border border-slate-100 group-hover:scale-105 transition-transform">
                                    {p.ImageURL ? (
                                        <img src={`${API_URL}${p.ImageURL}`} alt={p.ProductName} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${p.DeviceType === 'Monitor' ? 'from-blue-100 to-cyan-100 text-blue-500' :
                                            p.DeviceType === 'Network' ? 'from-purple-100 to-fuchsia-100 text-purple-500' :
                                                p.DeviceType === 'Asset' ? 'from-amber-100 to-orange-100 text-amber-500' :
                                                    'from-emerald-100 to-teal-100 text-emerald-500'
                                            }`}>
                                            {React.createElement(getIcon(p.DeviceType), { size: 40 })}
                                        </div>
                                    )}
                                </div>

                                <h3 className="font-bold text-slate-800 text-lg mb-1 line-clamp-2 min-h-[3.5rem]">{p.ProductName}</h3>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 mb-4">{p.DeviceType}</span>

                                <div className="grid grid-cols-2 gap-4 w-full pt-4 border-t border-slate-100">
                                    <div>
                                        <p className="text-xs text-slate-400 font-bold uppercase">In Stock</p>
                                        <p className={`text-xl font-black ${p.CurrentStock <= p.MinStock ? 'text-red-500' : 'text-emerald-500'}`}>
                                            {p.CurrentStock}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-bold uppercase">Price</p>
                                        <p className="text-xl font-black text-slate-700">฿{p.LastPrice.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* HISTORY MODAL */}
            {historyItem && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <div className="w-full max-w-2xl transform overflow-hidden rounded-3xl bg-white text-left align-middle shadow-2xl transition-all animate-in zoom-in-95">
                            <div className="p-6 bg-slate-50 flex justify-between items-center border-b border-slate-100 shrink-0">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800">Stock History</h3>
                                    <p className="text-xs text-slate-500">{historyItem.ProductName}</p>
                                </div>
                                <button onClick={() => setHistoryItem(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
                            </div>
                            <div className="max-h-[60vh] overflow-y-auto scrollbar-thin">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-white text-slate-500 text-[10px] uppercase sticky top-0 border-b border-slate-100 shadow-sm z-10">
                                        <tr>
                                            <th className="p-4 bg-slate-50/90 backdrop-blur">Date</th>
                                            <th className="p-4 text-center bg-slate-50/90 backdrop-blur">Qty</th>
                                            <th className="p-4 bg-slate-50/90 backdrop-blur">Source Ref</th>
                                            <th className="p-4 bg-slate-50/90 backdrop-blur">User</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {historyData.map((h, i) => (
                                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-4 text-slate-500">{new Date(h.TransDate).toLocaleDateString()} <span className="text-xs text-slate-400">{new Date(h.TransDate).toLocaleTimeString()}</span></td>
                                                <td className="p-4 text-center font-bold text-emerald-600">+{h.Qty}</td>
                                                <td className="p-4 text-indigo-600 font-medium">{h.RefInfo}</td>
                                                <td className="p-4 text-xs text-slate-400">{h.UserID}</td>
                                            </tr>
                                        ))}
                                        {historyData.length === 0 && (
                                            <tr><td colSpan="4" className="p-8 text-center text-slate-400">No history available</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
                                <button onClick={() => setHistoryItem(null)} className="w-full bg-white border border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 hover:text-slate-800 transition-all shadow-sm">
                                    Close History
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT MODAL */}
            {editItem && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <div className="w-full max-w-lg transform overflow-hidden rounded-3xl bg-white text-left align-middle shadow-2xl transition-all animate-in zoom-in-95 my-8">
                            <div className="p-6 bg-slate-50 flex justify-between items-center border-b border-slate-100">
                                <h3 className="font-bold text-lg text-slate-800">Edit Product</h3>
                                <button onClick={() => setEditItem(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleUpdate} className="p-6 space-y-5">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block tracking-wider">Product Name</label>
                                    <input name="ProductName" defaultValue={editItem.ProductName} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl outline-none text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 font-medium" required />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block tracking-wider">Product Image</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                                            {editItem.ImageURL ? (
                                                <img src={`http://localhost:3001${editItem.ImageURL}`} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <Package className="text-slate-400" />
                                            )}
                                        </div>
                                        <input type="file" name="imageFile" accept="image/*" className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block tracking-wider">Type</label>
                                        <select name="DeviceType" defaultValue={editItem.DeviceType} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl outline-none text-slate-800 focus:border-indigo-500">
                                            {deviceTypes.map(t => <option key={t.TypeId} value={t.TypeId}>{t.Label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block tracking-wider">Price (฿)</label>
                                        <input name="LastPrice" type="number" step="0.01" defaultValue={editItem.LastPrice} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl outline-none text-slate-800 focus:border-indigo-500 font-mono" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block tracking-wider">Current Stock</label>
                                        <input name="CurrentStock" type="number" defaultValue={editItem.CurrentStock} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl outline-none text-slate-800 focus:border-indigo-500 font-mono" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block tracking-wider">Min Stock</label>
                                        <input name="MinStock" type="number" defaultValue={editItem.MinStock} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl outline-none text-slate-800 focus:border-indigo-500 font-mono" />
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setEditItem(null)} className="flex-1 bg-white border border-slate-200 text-slate-600 font-bold py-3.5 rounded-xl hover:bg-slate-50 transition-all">
                                        Cancel
                                    </button>
                                    <button type="submit" className="flex-[2] bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRM */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <div className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white p-6 text-center shadow-2xl transition-all animate-in zoom-in-95 align-middle">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                                <Trash2 size={32} />
                            </div>
                            <h3 className="font-bold text-xl mb-2 text-slate-800">Delete Product?</h3>
                            <p className="text-slate-500 text-sm mb-6">This action cannot be undone. Are you sure?</p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors">Cancel</button>
                                <button onClick={() => handleDelete(showDeleteConfirm)} className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold hover:bg-red-600 shadow-lg shadow-red-200 transition-colors">Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ALERT MODAL */}
            <AlertModal
                isOpen={alertModal.isOpen}
                type={alertModal.type}
                title={alertModal.title}
                message={alertModal.message}
                onConfirm={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                confirmText="Close"
            />
        </div>
    );
};

export default InventoryPage;
