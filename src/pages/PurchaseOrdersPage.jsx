import React, { useState } from 'react';
import { ShoppingCart, Plus, X } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:3001/api';

const PurchaseOrdersPage = () => {
    const { purchaseOrders, refreshData } = useData();
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [poItems, setPoItems] = useState([{ ItemName: '', QtyOrdered: 1, UnitCost: 0 }]);

    const generatePONumber = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `PO-${year}${month}-${rand}`;
    };

    const addItem = () => {
        setPoItems([...poItems, { ItemName: '', QtyOrdered: 1, UnitCost: 0 }]);
    };

    const removeItem = (index) => {
        setPoItems(poItems.filter((_, i) => i !== index));
    };

    const updateItem = (index, field, value) => {
        const updated = [...poItems];
        updated[index][field] = value;
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
            Items: poItems.filter(i => i.ItemName.trim() !== '')
        };

        try {
            const res = await fetch(`${API_BASE}/pos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setIsModalOpen(false);
                setPoItems([{ ItemName: '', QtyOrdered: 1, UnitCost: 0 }]);
                refreshData();
            } else {
                const data = await res.json();
                alert(`Failed to create PO: ${data.details || 'Unknown error'}`);
            }
        } catch (err) {
            alert(`Error creating PO: ${err.message}`);
        }
    };

    const getTotalAmount = () => {
        return poItems.reduce((sum, item) => sum + (item.QtyOrdered * item.UnitCost), 0);
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-slate-800">Purchase Orders</h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3 rounded-xl transition-all shadow-lg shadow-indigo-200"
                >
                    <Plus size={18} /> Create New PO
                </button>
            </div>

            {/* PO List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {purchaseOrders.map(po => (
                    <div key={po.PO_ID} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="font-bold text-indigo-600 text-lg">{po.PO_ID}</h4>
                                <p className="text-xs text-slate-500 font-medium">{po.VendorName}</p>
                                {po.PR_No && <p className="text-[10px] text-slate-400 mt-0.5">PR: {po.PR_No}</p>}
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${po.Status === 'Completed' ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : po.Status === 'Partial' ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-blue-100 text-blue-600 border-blue-200'}`}>
                                {po.Status}
                            </span>
                        </div>
                        <div className="space-y-2 border-t border-slate-100 pt-4">
                            {po.Items?.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-xs">
                                    <span className="text-slate-600 font-medium">{item.ItemName || item.ProductName || `Item #${idx + 1}`}</span>
                                    <span className="font-mono text-slate-400">{item.QtyReceived || 0} / {item.QtyOrdered}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
                            <p>Requested by: <span className="text-slate-700 font-semibold">{po.RequestedBy}</span></p>
                            <p>Date: {new Date(po.RequestDate).toLocaleDateString()}</p>
                        </div>
                    </div>
                ))}
                {purchaseOrders.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center border border-dashed border-slate-300 rounded-2xl bg-white/50">
                        <ShoppingCart size={48} className="text-slate-300 mb-4" />
                        <p className="text-slate-500 text-lg font-medium">No Purchase Orders</p>
                        <p className="text-slate-400 text-sm mt-2">Create your first PO to get started</p>
                    </div>
                )}
            </div>

            {/* CREATE PO MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl my-8">
                        <div className="p-6 bg-slate-50 flex justify-between items-center rounded-t-3xl border-b border-slate-200">
                            <h3 className="font-bold text-lg text-slate-800">Create Purchase Order</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">PO Number</label>
                                    <input name="PO_ID" defaultValue={generatePONumber()} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl mt-1 text-slate-800 outline-none focus:border-indigo-500" required />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">PR Ref No.</label>
                                    <input name="PR_No" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl mt-1 text-slate-800 outline-none focus:border-indigo-500" placeholder="PR-XXXXX" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Vendor Name</label>
                                    <input name="VendorName" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl mt-1 text-slate-800 outline-none focus:border-indigo-500" required placeholder="Supplier name" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Due Date</label>
                                    <input name="DueDate" type="date" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl mt-1 text-slate-800 outline-none focus:border-indigo-500" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Section</label>
                                    <input name="Section" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl mt-1 text-slate-800 outline-none focus:border-indigo-500" placeholder="IT, Admin, etc." />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Remark</label>
                                <textarea name="Remark" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl mt-1 h-20 text-slate-800 outline-none focus:border-indigo-500" placeholder="Additional notes..."></textarea>
                            </div>

                            {/* Items - Manual Input */}
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Order Items</label>
                                    <button type="button" onClick={addItem} className="text-xs text-indigo-600 hover:text-indigo-500 flex items-center gap-1 font-bold">
                                        <Plus size={14} /> Add Item
                                    </button>
                                </div>

                                {/* Header */}
                                <div className="grid grid-cols-12 gap-2 mb-2 px-3 text-[10px] text-slate-400 uppercase font-bold">
                                    <div className="col-span-6">Item Description</div>
                                    <div className="col-span-2 text-center">Qty</div>
                                    <div className="col-span-3 text-center">Unit Cost (฿)</div>
                                    <div className="col-span-1"></div>
                                </div>

                                <div className="space-y-2">
                                    {poItems.map((item, idx) => (
                                        <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm">
                                            <input
                                                type="text"
                                                value={item.ItemName}
                                                onChange={(e) => updateItem(idx, 'ItemName', e.target.value)}
                                                className="col-span-6 bg-white border border-slate-200 p-2 rounded-lg text-sm text-slate-800 outline-none focus:border-indigo-500"
                                                placeholder="Enter item name..."
                                            />
                                            <input
                                                type="number"
                                                value={item.QtyOrdered}
                                                onChange={(e) => updateItem(idx, 'QtyOrdered', Number(e.target.value))}
                                                className="col-span-2 bg-white border border-slate-200 p-2 rounded-lg text-sm text-center text-slate-800 outline-none focus:border-indigo-500"
                                                placeholder="Qty"
                                                min="1"
                                            />
                                            <input
                                                type="number"
                                                value={item.UnitCost}
                                                onChange={(e) => updateItem(idx, 'UnitCost', Number(e.target.value))}
                                                className="col-span-3 bg-white border border-slate-200 p-2 rounded-lg text-sm text-center text-slate-800 outline-none focus:border-indigo-500"
                                                placeholder="0.00"
                                                step="0.01"
                                            />
                                            <div className="col-span-1 flex justify-center">
                                                {poItems.length > 1 && (
                                                    <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 p-1 transition-colors">
                                                        <X size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Total */}
                                <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                                    <span className="text-slate-500 font-medium">Total Amount</span>
                                    <span className="text-xl font-bold text-indigo-600 font-mono">
                                        ฿{getTotalAmount().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 bg-white border border-slate-200 text-slate-600 font-bold py-4 rounded-xl hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-200"
                                >
                                    Create Purchase Order
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseOrdersPage;
