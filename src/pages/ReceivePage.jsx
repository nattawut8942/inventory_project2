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
        try {
            await fetch(`${API_BASE}/receive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    PO_ID: poId,
                    InvoiceNo: invoiceNo,
                    ItemsReceived: itemsReceived,
                    UserID: user.username
                })
            });
            setIsModalOpen(false);
            refreshData();
        } catch (err) {
            alert('Error receiving goods');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in">
            <div>
                <h2 className="text-3xl font-black mb-6">Pending Purchase Orders</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {purchaseOrders.filter(po => po.Status !== 'Completed').map(po => (
                        <div key={po.PO_ID} className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-lg hover:border-indigo-500/50 transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-bold text-indigo-400 text-lg">{po.PO_ID}</h4>
                                    <p className="text-xs text-gray-500">{po.VendorName}</p>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-900/20 text-amber-500 border border-amber-800">
                                    {po.Status}
                                </span>
                            </div>
                            <div className="space-y-2 mb-6 border-t border-gray-800 pt-4">
                                {po.Items.map(item => {
                                    const prodName = item.ItemName || products.find(p => p.ProductID === item.ProductID)?.ProductName || 'Unknown Item';
                                    return (
                                        <div key={item.DetailID} className="flex justify-between text-xs">
                                            <span className="text-gray-400">{prodName}</span>
                                            <span className="font-mono text-gray-300">{item.QtyReceived} / {item.QtyOrdered}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => { setActivePo(po); setIsModalOpen(true); }}
                                className="w-full bg-white text-black font-bold py-3 rounded-xl text-sm hover:bg-indigo-500 hover:text-white transition-colors shadow-lg"
                            >
                                Receive Invoice Items
                            </button>
                        </div>
                    ))}
                    {purchaseOrders.filter(po => po.Status !== 'Completed').length === 0 && (
                        <div className="col-span-full text-center py-10 text-gray-500 border border-dashed border-gray-800 rounded-2xl">
                            No open POs found. All good!
                        </div>
                    )}
                </div>
            </div>

            {/* Invoice History Section */}
            <div className="border-t border-gray-800 pt-8">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <FileText className="text-gray-500" /> Invoice History
                </h2>
                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-black/30 text-xs text-gray-500 uppercase border-b border-gray-800">
                            <tr>
                                <th className="p-4">Reference No</th>
                                <th className="p-4">Invoice No</th>
                                <th className="p-4">PO Ref</th>
                                <th className="p-4">Date</th>
                                <th className="p-4">Received By</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {invoices.map(inv => (
                                <tr key={inv.InvoiceID} className="hover:bg-gray-800/20">
                                    <td className="p-4 text-gray-500">#{inv.InvoiceID}</td>
                                    <td className="p-4 font-bold text-white">{inv.InvoiceNo}</td>
                                    <td className="p-4 text-indigo-400">{inv.PO_ID}</td>
                                    <td className="p-4 text-gray-400">{new Date(inv.ReceiveDate).toLocaleDateString()}</td>
                                    <td className="p-4 text-gray-600 text-xs uppercase">{inv.ReceivedBy}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL */}
            {isModalOpen && activePo && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-950 w-full max-w-lg rounded-3xl border border-gray-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 bg-gradient-to-r from-indigo-900 to-gray-900 text-white flex justify-between items-center border-b border-gray-800">
                            <div>
                                <h3 className="font-bold text-lg">Receive Goods</h3>
                                <p className="text-xs text-indigo-300">PO: {activePo.PO_ID}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                                <LogOut size={16} />
                            </button>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const fd = new FormData(e.target);
                            const items = activePo.Items.map(it => ({
                                DetailID: it.DetailID, // Use DetailID for identification
                                ProductID: it.ProductID,
                                Qty: fd.get(`r-${it.DetailID}`) // Get qty by DetailID
                            })).filter(it => it.Qty > 0);
                            handleReceive(activePo.PO_ID, fd.get('inv'), items);
                        }} className="p-8 space-y-6">
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Invoice Number</label>
                                <input
                                    name="inv"
                                    required
                                    className="w-full bg-black border border-gray-800 p-3 rounded-xl mt-1 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    placeholder="IV-XXXXXXXX"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Confirm Quantities</label>
                                {activePo.Items.map(item => {
                                    const rem = item.QtyOrdered - item.QtyReceived;
                                    // Handle itemName for manual or product name for stock items
                                    const prodName = item.ItemName || products.find(p => p.ProductID === item.ProductID)?.ProductName || 'Unknown Item';

                                    if (rem <= 0) return null;
                                    return (
                                        <div key={item.DetailID} className="flex items-center gap-4 bg-gray-900 p-3 rounded-xl border border-gray-800">
                                            <div className="flex-1 text-xs">
                                                <p className="font-bold text-gray-300">{prodName}</p>
                                                <p className="text-gray-500 text-[10px]">Ordering: {item.QtyOrdered} | Received: {item.QtyReceived}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-gray-600">Receive:</span>
                                                <input
                                                    name={`r-${item.DetailID}`} // Use DetailID for input name
                                                    type="number"
                                                    max={rem}
                                                    defaultValue={rem}
                                                    className="w-16 bg-black border border-gray-700 rounded p-2 text-center text-sm font-bold outline-none focus:border-indigo-500"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-indigo-500 transition-all"
                            >
                                CONFIRM & UPDATE STOCK
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReceivePage;
