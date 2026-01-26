import React, { useState } from 'react';
import { FileText, LogOut } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:3001/api';

const ReceivePage = () => {
    const { purchaseOrders, invoices, products, refreshData } = useData();
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activePo, setActivePo] = useState(null);

    const handleReceive = async (poId, invoiceNo, itemsReceived) => {
        if (!itemsReceived || itemsReceived.length === 0) {
            alert('Please receive at least one item.');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/receive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    PO_ID: poId,
                    InvoiceNo: invoiceNo,
                    ItemsReceived: itemsReceived,
                    UserID: user.username
                })
            });
            if (res.ok) {
                setIsModalOpen(false);
                refreshData();
                alert('Stock received successfully!');
            } else {
                const err = await res.json();
                alert(`Error: ${err.details || 'Failed to receive'}`);
            }
        } catch (err) {
            alert('Error receiving goods connection');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in">
            <div>
                <h2 className="text-3xl font-black mb-6 text-slate-800">Pending Purchase Orders</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {purchaseOrders.filter(po => po.Status !== 'Completed').map(po => (
                        <div key={po.PO_ID} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-bold text-indigo-600 text-lg">{po.PO_ID}</h4>
                                    <p className="text-xs text-slate-500 font-medium">{po.VendorName}</p>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-600 border border-amber-200">
                                    {po.Status}
                                </span>
                            </div>
                            <div className="space-y-2 mb-6 border-t border-slate-100 pt-4">
                                {po.Items.map(item => {
                                    const prodName = item.ItemName || products.find(p => p.ProductID === item.ProductID)?.ProductName || 'Unknown Item';
                                    return (
                                        <div key={item.DetailID} className="flex justify-between text-xs">
                                            <span className="text-slate-600 font-medium">{prodName}</span>
                                            <span className="font-mono text-slate-400">{item.QtyReceived} / {item.QtyOrdered}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => { setActivePo(po); setIsModalOpen(true); }}
                                className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl text-sm hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
                            >
                                Receive Invoice Items
                            </button>
                        </div>
                    ))}
                    {purchaseOrders.filter(po => po.Status !== 'Completed').length === 0 && (
                        <div className="col-span-full text-center py-10 text-slate-400 border border-dashed border-slate-300 rounded-2xl bg-white/50">
                            No open POs found. All good!
                        </div>
                    )}
                </div>
            </div>

            {/* Invoice History Section */}
            <div className="border-t border-slate-200 pt-8">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-700">
                    <FileText className="text-slate-400" /> Invoice History
                </h2>
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
                            <tr>
                                <th className="p-4">Reference No</th>
                                <th className="p-4">Invoice No</th>
                                <th className="p-4">PO Ref</th>
                                <th className="p-4">Date</th>
                                <th className="p-4">Received By</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {invoices.map(inv => (
                                <tr key={inv.InvoiceID} className="hover:bg-slate-50">
                                    <td className="p-4 text-slate-400">#{inv.InvoiceID}</td>
                                    <td className="p-4 font-bold text-slate-700">{inv.InvoiceNo}</td>
                                    <td className="p-4 text-indigo-500 font-medium">{inv.PO_ID}</td>
                                    <td className="p-4 text-slate-500">{new Date(inv.ReceiveDate).toLocaleDateString()}</td>
                                    <td className="p-4 text-slate-600 text-xs uppercase">{inv.ReceivedBy}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL */}
            {/* MODAL */}
            {isModalOpen && activePo && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 bg-slate-50 flex justify-between items-center border-b border-slate-100">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">Receive Goods</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded">
                                        PO: {activePo.PO_ID}
                                    </span>
                                    <span className="text-xs text-slate-400">{activePo.VendorName}</span>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                <LogOut size={18} />
                            </button>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const fd = new FormData(e.target);
                            // Collect Items first
                            const items = activePo.Items.map(it => {
                                const qty = Number(fd.get(`r-${it.DetailID}`));
                                return {
                                    DetailID: it.DetailID,
                                    ProductID: it.ProductID,
                                    Qty: qty
                                };
                            }).filter(it => it.Qty > 0);

                            handleReceive(activePo.PO_ID, fd.get('inv'), items);
                        }} className="p-6 space-y-6">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Invoice Number</label>
                                <input
                                    name="inv"
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-slate-800 font-medium transition-all"
                                    placeholder="IV-XXXXXXXX"
                                />
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-end">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confirm Quantities</label>
                                    <span className="text-[10px] text-indigo-500 font-bold cursor-pointer hover:underline" onClick={() => {
                                        // Optional: Auto-fill helper could go here
                                    }}>Auto-fill Remaining</span>
                                </div>
                                <div className="max-h-[40vh] overflow-y-auto pr-2 space-y-2">
                                    {activePo.Items.map(item => {
                                        const rem = item.QtyOrdered - item.QtyReceived;
                                        const prodName = item.ItemName || products.find(p => p.ProductID === item.ProductID)?.ProductName || 'Unknown Item';

                                        if (rem <= 0) return null;
                                        return (
                                            <div key={item.DetailID} className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors group">
                                                <div className="flex-1 text-xs">
                                                    <p className="font-bold text-slate-700 group-hover:text-indigo-700 transition-colors">{prodName}</p>
                                                    <div className="flex gap-2 mt-1 ">
                                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Ord: {item.QtyOrdered}</span>
                                                        <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded">Rcv: {item.QtyReceived}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Receive</span>
                                                    <input
                                                        name={`r-${item.DetailID}`}
                                                        type="number"
                                                        max={rem}
                                                        defaultValue={rem}
                                                        className="w-20 bg-slate-50 border border-slate-200 rounded-lg p-2 text-center text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white text-indigo-600"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 items-center justify-center flex gap-2"
                            >
                                <FileText size={18} /> CONFIRM RECEIPT
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReceivePage;
