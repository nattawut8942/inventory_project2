import React, { useState } from 'react';
import { ShoppingCart, Plus, X } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:3001/api';

const PurchaseOrdersPage = () => {
    const { products, purchaseOrders, refreshData } = useData();
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [poItems, setPoItems] = useState([{ ProductID: '', QtyOrdered: 1, UnitCost: 0 }]);

    const generatePONumber = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `PO-${year}${month}-${rand}`;
    };

    const addItem = () => {
        setPoItems([...poItems, { ProductID: '', QtyOrdered: 1, UnitCost: 0 }]);
    };

    const removeItem = (index) => {
        setPoItems(poItems.filter((_, i) => i !== index));
    };

    const updateItem = (index, field, value) => {
        const updated = [...poItems];
        updated[index][field] = value;
        if (field === 'ProductID') {
            const prod = products.find(p => p.ProductID === Number(value));
            if (prod) updated[index].UnitCost = prod.LastPrice;
        }
        setPoItems(updated);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);

        const payload = {
            PO_ID: fd.get('PO_ID'),
            VendorName: fd.get('VendorName'),
            DueDate: fd.get('DueDate'),
            RequestedBy: user.username,
            Section: fd.get('Section'),
            Remark: fd.get('Remark'),
            Items: poItems.filter(i => i.ProductID)
        };

        try {
            const res = await fetch(`${API_BASE}/pos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setIsModalOpen(false);
                setPoItems([{ ProductID: '', QtyOrdered: 1, UnitCost: 0 }]);
                refreshData();
            } else {
                alert('Failed to create PO');
            }
        } catch (err) {
            alert('Error creating PO');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black">Purchase Orders</h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-3 rounded-xl transition-all"
                >
                    <Plus size={18} /> Create New PO
                </button>
            </div>

            {/* PO List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {purchaseOrders.map(po => (
                    <div key={po.PO_ID} className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="font-bold text-indigo-400 text-lg">{po.PO_ID}</h4>
                                <p className="text-xs text-gray-500">{po.VendorName}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${po.Status === 'Completed' ? 'bg-green-900/20 text-green-500 border-green-800' : po.Status === 'Partial' ? 'bg-amber-900/20 text-amber-500 border-amber-800' : 'bg-blue-900/20 text-blue-500 border-blue-800'}`}>
                                {po.Status}
                            </span>
                        </div>
                        <div className="space-y-2 border-t border-gray-800 pt-4">
                            {po.Items?.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-xs">
                                    <span className="text-gray-400">{item.ProductName || `Product #${item.ProductID}`}</span>
                                    <span className="font-mono text-gray-300">{item.QtyReceived || 0} / {item.QtyOrdered}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-800 text-xs text-gray-600">
                            <p>Requested by: {po.RequestedBy}</p>
                            <p>Date: {new Date(po.RequestDate).toLocaleDateString()}</p>
                        </div>
                    </div>
                ))}
                {purchaseOrders.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center border border-dashed border-gray-800 rounded-2xl bg-gray-900/20">
                        <ShoppingCart size={48} className="text-gray-700 mb-4" />
                        <p className="text-gray-500 text-lg font-medium">No Purchase Orders</p>
                        <p className="text-gray-600 text-sm mt-2">Create your first PO to get started</p>
                    </div>
                )}
            </div>

            {/* CREATE PO MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-gray-950 w-full max-w-2xl rounded-3xl border border-gray-800 shadow-2xl my-8">
                        <div className="p-6 bg-gradient-to-r from-indigo-900 to-gray-900 flex justify-between items-center rounded-t-3xl">
                            <h3 className="font-bold text-lg text-white">Create Purchase Order</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">PO Number</label>
                                    <input name="PO_ID" defaultValue={generatePONumber()} className="w-full bg-black border border-gray-800 p-3 rounded-xl mt-1" required />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Vendor Name</label>
                                    <input name="VendorName" className="w-full bg-black border border-gray-800 p-3 rounded-xl mt-1" required placeholder="Supplier name" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Due Date</label>
                                    <input name="DueDate" type="date" className="w-full bg-black border border-gray-800 p-3 rounded-xl mt-1" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Section</label>
                                    <input name="Section" className="w-full bg-black border border-gray-800 p-3 rounded-xl mt-1" placeholder="IT, Admin, etc." />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Remark</label>
                                <textarea name="Remark" className="w-full bg-black border border-gray-800 p-3 rounded-xl mt-1 h-20" placeholder="Additional notes..."></textarea>
                            </div>

                            {/* Items */}
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Order Items</label>
                                    <button type="button" onClick={addItem} className="text-xs text-indigo-400 hover:text-indigo-300">+ Add Item</button>
                                </div>
                                <div className="space-y-3">
                                    {poItems.map((item, idx) => (
                                        <div key={idx} className="flex gap-3 items-center bg-gray-900 p-3 rounded-xl border border-gray-800">
                                            <select
                                                value={item.ProductID}
                                                onChange={(e) => updateItem(idx, 'ProductID', e.target.value)}
                                                className="flex-1 bg-black border border-gray-700 p-2 rounded-lg text-sm"
                                            >
                                                <option value="">Select Product</option>
                                                {products.map(p => (
                                                    <option key={p.ProductID} value={p.ProductID}>{p.ProductName}</option>
                                                ))}
                                            </select>
                                            <input
                                                type="number"
                                                value={item.QtyOrdered}
                                                onChange={(e) => updateItem(idx, 'QtyOrdered', Number(e.target.value))}
                                                className="w-20 bg-black border border-gray-700 p-2 rounded-lg text-sm text-center"
                                                placeholder="Qty"
                                                min="1"
                                            />
                                            <input
                                                type="number"
                                                value={item.UnitCost}
                                                onChange={(e) => updateItem(idx, 'UnitCost', Number(e.target.value))}
                                                className="w-28 bg-black border border-gray-700 p-2 rounded-lg text-sm text-center"
                                                placeholder="Unit Cost"
                                                step="0.01"
                                            />
                                            {poItems.length > 1 && (
                                                <button type="button" onClick={() => removeItem(idx)} className="text-red-500 p-1">
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl">Create Purchase Order</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseOrdersPage;
