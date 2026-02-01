import React, { useState } from 'react';
import { FileText, Search, Calendar, Eye, X, Package, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:3001/api';

// Format datetime with time
const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString('th-TH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const ReceivePage = () => {
    const { purchaseOrders, invoices, products, refreshData } = useData();
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activePo, setActivePo] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [selectedPO, setSelectedPO] = useState(null); // For detail view
    const [resultModal, setResultModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });

    const handleReceive = async (poId, invoiceNo, itemsReceived) => {
        if (!itemsReceived || itemsReceived.length === 0) {
            setResultModal({ isOpen: true, type: 'error', title: 'ข้อผิดพลาด', message: 'กรุณาเลือกรายการที่ต้องการรับอย่างน้อย 1 รายการ' });
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
                setResultModal({ isOpen: true, type: 'success', title: 'รับของสำเร็จ', message: `บันทึก Invoice ${invoiceNo} เรียบร้อยแล้ว` });
            } else {
                const err = await res.json();
                setResultModal({ isOpen: true, type: 'error', title: 'เกิดข้อผิดพลาด', message: err.details || 'ไม่สามารถบันทึกได้' });
            }
        } catch (err) {
            setResultModal({ isOpen: true, type: 'error', title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้' });
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'Partial': return 'bg-amber-100 text-amber-700 border-amber-200';
            default: return 'bg-blue-100 text-blue-700 border-blue-200';
        }
    };

    const pendingPOs = purchaseOrders
        .filter(po => po.Status !== 'Completed')
        .filter(po => {
            const matchSearch = po.PO_ID.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (po.VendorName && po.VendorName.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchDate = !filterDate || (po.RequestDate && po.RequestDate.includes(filterDate));
            return matchSearch && matchDate;
        });

    return (
        <div className="space-y-8 animate-in fade-in">
            <div>
                <h2 className="text-3xl font-black mb-4 text-slate-800">Pending Purchase Orders</h2>

                {/* Filter Controls */}
                <div className="flex flex-wrap gap-3 items-center mb-6">
                    <div className="flex gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                        <Search size={18} className="text-slate-400 self-center" />
                        <input
                            type="text"
                            placeholder="ค้นหา PO / ผู้ขาย..."
                            className="bg-transparent border-none outline-none text-sm w-40 text-slate-700 placeholder-slate-400"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                        <Calendar size={18} className="text-slate-400 self-center" />
                        <input
                            type="date"
                            className="bg-transparent border-none outline-none text-sm text-slate-700"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                        />
                    </div>
                    {(searchTerm || filterDate) && (
                        <button
                            onClick={() => { setSearchTerm(''); setFilterDate(''); }}
                            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                            ล้างตัวกรอง
                        </button>
                    )}
                </div>

                {/* Compact PO Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {pendingPOs.map((po, i) => (
                        <motion.div
                            key={po.PO_ID}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm hover:shadow-lg transition-all"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                                        <Package size={18} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-sm">{po.PO_ID}</h4>
                                        <p className="text-[10px] text-slate-400">{po.VendorName || '-'}</p>
                                    </div>
                                </div>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(po.Status)}`}>
                                    {po.Status === 'Open' ? 'Pending' : po.Status}
                                </span>
                            </div>
                            <div className="text-xs text-slate-500 mb-3">
                                <span>{formatDateTime(po.RequestDate)}</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSelectedPO(po)}
                                    className="flex-1 bg-slate-100 text-slate-600 font-bold py-2 rounded-lg text-xs hover:bg-slate-200 transition-all flex items-center justify-center gap-1"
                                >
                                    <Eye size={14} /> ดูรายละเอียด
                                </button>
                                <button
                                    onClick={() => { setActivePo(po); setIsModalOpen(true); }}
                                    className="flex-1 bg-emerald-600 text-white font-bold py-2 rounded-lg text-xs hover:bg-emerald-700 transition-all flex items-center justify-center gap-1"
                                >
                                    <Check size={14} /> รับของ
                                </button>
                            </div>
                        </motion.div>
                    ))}
                    {pendingPOs.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-emerald-200 rounded-2xl bg-emerald-50/30">
                            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mb-3 text-emerald-600">
                                <FileText size={28} />
                            </div>
                            <p className="text-emerald-800 font-bold">All caught up!</p>
                            <p className="text-emerald-600 text-sm">ไม่มี PO รอรับของ</p>
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
                                <th className="p-4">Invoice No</th>
                                <th className="p-4">PO Ref</th>
                                <th className="p-4">Date & Time</th>
                                <th className="p-4">Received By</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.slice(0, 10).map((inv, i) => (
                                <tr key={inv.InvoiceID || i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-mono font-bold text-slate-700">{inv.InvoiceNo}</td>
                                    <td className="p-4 text-indigo-600 font-bold">{inv.PO_ID}</td>
                                    <td className="p-4 text-slate-500">{formatDateTime(inv.ReceiveDate)}</td>
                                    <td className="p-4 text-slate-600">{inv.ReceivedBy}</td>
                                </tr>
                            ))}
                            {invoices.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-slate-400">No invoices recorded yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* DETAIL MODAL */}
            <AnimatePresence>
                {selectedPO && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
                        >
                            {/* Header */}
                            <div className="p-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-black text-2xl">{selectedPO.PO_ID}</h3>
                                        <p className="text-amber-100">{selectedPO.VendorName || 'ไม่ระบุผู้ขาย'}</p>
                                    </div>
                                    <button onClick={() => setSelectedPO(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                                {/* Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-4 rounded-xl">
                                        <p className="text-xs text-slate-500 font-bold mb-1">สถานะ</p>
                                        <span className={`text-sm font-bold px-3 py-1 rounded-full border ${getStatusColor(selectedPO.Status)}`}>
                                            {selectedPO.Status === 'Open' ? 'Pending' : selectedPO.Status}
                                        </span>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-xl">
                                        <p className="text-xs text-slate-500 font-bold mb-1">วันที่สร้าง</p>
                                        <p className="text-sm font-bold text-slate-800">{formatDateTime(selectedPO.RequestDate)}</p>
                                    </div>
                                </div>

                                {/* Items */}
                                <div>
                                    <h4 className="font-bold text-slate-800 mb-3">รายการ ({selectedPO.Items?.length || 0})</h4>
                                    <div className="bg-slate-50 rounded-xl overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-100">
                                                <tr>
                                                    <th className="text-left p-3 font-bold text-slate-600">ชื่อรายการ</th>
                                                    <th className="text-center p-3 font-bold text-slate-600 w-28">รับแล้ว / สั่ง</th>
                                                    <th className="text-right p-3 font-bold text-slate-600 w-24">ราคา</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedPO.Items?.map((item, idx) => {
                                                    const prodName = item.ItemName || products.find(p => p.ProductID === item.ProductID)?.ProductName || `Item #${idx + 1}`;
                                                    return (
                                                        <tr key={idx} className="border-t border-slate-200">
                                                            <td className="p-3 text-slate-700">{prodName}</td>
                                                            <td className="p-3 text-center font-mono">
                                                                <span className="text-emerald-600">{item.QtyReceived || 0}</span>
                                                                <span className="text-slate-400"> / {item.QtyOrdered}</span>
                                                            </td>
                                                            <td className="p-3 text-right font-mono text-slate-600">฿{(item.UnitCost || 0).toLocaleString()}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
                                <button
                                    onClick={() => setSelectedPO(null)}
                                    className="flex-1 bg-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-300 transition-all"
                                >
                                    ปิด
                                </button>
                                <button
                                    onClick={() => { setActivePo(selectedPO); setSelectedPO(null); setIsModalOpen(true); }}
                                    className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                                >
                                    <Check size={18} /> รับของ
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* RECEIVE MODAL */}
            {isModalOpen && activePo && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <div className="w-full max-w-2xl transform overflow-hidden rounded-3xl bg-white text-left align-middle shadow-2xl transition-all my-8">
                            <div className="p-6 bg-white flex justify-between items-center border-b border-slate-200">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800">Receive Invoice - {activePo.PO_ID}</h3>
                                    <p className="text-slate-500 text-sm">{activePo.VendorName}</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                            </div>
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const fd = new FormData(e.target);
                                const items = activePo.Items.map((item, idx) => ({
                                    DetailID: item.DetailID,
                                    QtyReceived: parseInt(fd.get(`qty-${idx}`)) || 0
                                })).filter(i => i.QtyReceived > 0);
                                handleReceive(activePo.PO_ID, fd.get('InvoiceNo'), items);
                            }} className="p-6 space-y-6">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block tracking-wider">Invoice Number</label>
                                    <input
                                        name="InvoiceNo"
                                        required
                                        placeholder="INV-XXXX-XXXX"
                                        className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none focus:border-indigo-500 font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block tracking-wider">Items to Receive</label>
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {activePo.Items.map((item, idx) => {
                                            const prodName = item.ItemName || products.find(p => p.ProductID === item.ProductID)?.ProductName || 'Unknown';
                                            const remaining = item.QtyOrdered - (item.QtyReceived || 0);
                                            return (
                                                <div key={idx} className="flex gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                                                    <div className="flex-1">
                                                        <p className="font-medium text-sm text-slate-700">{prodName}</p>
                                                        <p className="text-xs text-slate-400">Remaining: {remaining} of {item.QtyOrdered}</p>
                                                    </div>
                                                    <input
                                                        name={`qty-${idx}`}
                                                        type="number"
                                                        min="0"
                                                        max={remaining}
                                                        defaultValue={remaining}
                                                        className="w-20 bg-white border border-slate-200 p-2 rounded-lg text-center text-sm font-mono outline-none focus:border-indigo-500"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all">
                                        Cancel
                                    </button>
                                    <button type="submit" className="flex-[2] bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2">
                                        <Check size={18} /> Confirm Receive
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Result Modal */}
            <AnimatePresence>
                {resultModal.isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[80] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white rounded-3xl p-8 text-center max-w-sm w-full shadow-2xl"
                        >
                            <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${resultModal.type === 'success' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                                {resultModal.type === 'success' ? (
                                    <Check size={32} className="text-emerald-600" />
                                ) : (
                                    <X size={32} className="text-red-600" />
                                )}
                            </div>
                            <h3 className="font-black text-xl text-slate-800 mb-2">{resultModal.title}</h3>
                            <p className="text-slate-500 mb-6">{resultModal.message}</p>
                            <button
                                onClick={() => setResultModal({ ...resultModal, isOpen: false })}
                                className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-all"
                            >
                                ปิด
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ReceivePage;
