import React, { useState } from 'react';
import { Search, Monitor, Network, Archive, Database, Package, List, LayoutGrid } from 'lucide-react';
import { useData } from '../context/DataContext';

const InventoryPage = () => {
    const { products } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'

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

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-5">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black">Inventory Master</h2>
                <div className="flex items-center gap-3">
                    {/* View Toggle */}
                    <div className="flex bg-gray-900/80 p-1 rounded-xl border border-gray-800">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-white'}`}
                            title="List View"
                        >
                            <List size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-white'}`}
                            title="Grid View"
                        >
                            <LayoutGrid size={18} />
                        </button>
                    </div>
                    {/* Search */}
                    <div className="flex gap-2 bg-gray-900/80 px-4 py-2.5 rounded-xl border border-gray-800 ring-1 ring-white/5 focus-within:ring-indigo-500 transition-all">
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
                            <div
                                key={p.ProductID}
                                className={`bg-gray-900/60 border rounded-2xl p-5 transition-all hover:border-indigo-500/50 ${isLow ? 'border-red-900/50' : 'border-gray-800'}`}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-800 text-gray-300 text-[10px] font-medium border border-gray-700">
                                        <Icon size={12} />
                                        {p.DeviceType}
                                    </span>
                                    {isLow && (
                                        <span className="text-[9px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                                            LOW
                                        </span>
                                    )}
                                </div>
                                <h3 className="font-bold text-white text-sm mb-2 line-clamp-2">{p.ProductName}</h3>
                                <div className="flex justify-between items-end mt-4">
                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase">Price</p>
                                        <p className="text-gray-300 font-mono text-sm">฿{p.LastPrice?.toLocaleString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-gray-500 uppercase">Stock</p>
                                        <p className={`font-bold text-2xl font-mono ${isLow ? 'text-red-500' : 'text-green-500'}`}>
                                            {p.CurrentStock}
                                        </p>
                                        <p className="text-[10px] text-gray-600">min: {p.MinStock}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {filteredProducts.length === 0 && (
                        <div className="col-span-full text-center py-10 text-gray-500 border border-dashed border-gray-800 rounded-2xl">
                            No items found
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default InventoryPage;
