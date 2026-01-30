import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, AlertTriangle, Monitor, Network, Archive, Database, Package } from 'lucide-react';
import AlertModal from '../components/AlertModal';

const API_BASE = 'http://localhost:3001/api';

const WithdrawPage = () => {
    const { products, refreshData } = useData();
    const { user } = useAuth();

    // Modal State
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, data: null });
    const [alertModal, setAlertModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });

    const getIcon = (type) => {
        switch (type) {
            case 'Monitor': return Monitor;
            case 'Network': return Network;
            case 'Asset': return Archive;
            case 'Stock': return Database;
            default: return Package;
        }
    };

    const handleConfirmWithdraw = (product, qty) => {
        if (!qty || qty <= 0) {
            setAlertModal({ isOpen: true, type: 'error', title: 'Invalid Quantity', message: 'Please enter a valid quantity greater than 0.' });
            return;
        }
        if (qty > product.CurrentStock) {
            setAlertModal({ isOpen: true, type: 'error', title: 'Insufficient Stock', message: `Cannot withdraw ${qty}. Only ${product.CurrentStock} left in stock.` });
            return;
        }

        setConfirmModal({
            isOpen: true,
            data: { product, qty }
        });
    };

    const executeWithdraw = async () => {
        const { product, qty } = confirmModal.data;
        try {
            const res = await fetch(`${API_BASE}/products/withdraw`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ProductID: product.ProductID,
                    Qty: qty,
                    UserID: user.username
                })
            });
            if (!res.ok) throw new Error('Failed');

            setConfirmModal({ isOpen: false, data: null });
            setAlertModal({ isOpen: true, type: 'success', title: 'Withdraw Successful', message: `Successfully withdrew ${qty} unit(s) of ${product.ProductName}.` });
            refreshData();
        } catch (err) {
            setAlertModal({ isOpen: true, type: 'error', title: 'Withdraw Failed', message: 'Could not process withdrawal. Please try again.' });
        }
    };

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-5">
            <div>
                <h2 className="text-3xl font-black text-slate-800 mb-2">Withdraw Items</h2>
                <p className="text-slate-500">Select items to withdraw from inventory</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map(p => {
                    const Icon = getIcon(p.DeviceType);
                    const isLow = p.CurrentStock <= p.MinStock;

                    return (
                        <div key={p.ProductID} className="group bg-white rounded-3xl border border-slate-100 p-5 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col">
                            {/* Decorative Gradient Background */}
                            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-slate-50 to-slate-100 opacity-50 z-0"></div>

                            <div className="relative z-10 flex-1">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${p.DeviceType === 'Monitor' ? 'bg-blue-100 text-blue-600' :
                                            p.DeviceType === 'Network' ? 'bg-purple-100 text-purple-600' :
                                                p.DeviceType === 'Asset' ? 'bg-amber-100 text-amber-600' :
                                                    'bg-emerald-100 text-emerald-600'
                                        }`}>
                                        <Icon size={24} />
                                    </div>
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-white/80 backdrop-blur px-2 py-1 rounded-lg border border-slate-100">
                                        {p.DeviceType}
                                    </span>
                                </div>

                                <h3 className="font-bold text-slate-800 text-lg mb-1 line-clamp-2 min-h-[3.5rem]">{p.ProductName}</h3>

                                <div className="flex items-baseline gap-1 mb-4">
                                    <span className="text-xs text-slate-400 font-bold uppercase">Stock:</span>
                                    <span className={`text-2xl font-black ${isLow ? 'text-red-500' : 'text-emerald-500'}`}>{p.CurrentStock}</span>
                                </div>
                            </div>

                            <div className="relative z-10 mt-auto pt-4 border-t border-slate-100">
                                <div className="flex gap-2">
                                    <input
                                        id={`qty-${p.ProductID}`}
                                        type="number"
                                        defaultValue="1"
                                        max={p.CurrentStock}
                                        min="1"
                                        className="w-16 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                                    />
                                    <button
                                        disabled={p.CurrentStock <= 0}
                                        onClick={() => {
                                            const q = document.getElementById(`qty-${p.ProductID}`).value;
                                            handleConfirmWithdraw(p, Number(q));
                                        }}
                                        className="flex-1 bg-slate-900 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-slate-800 shadow-lg shadow-slate-200 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all active:scale-95"
                                    >
                                        Withdraw
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Custom Modals */}
            <AlertModal
                isOpen={alertModal.isOpen}
                type={alertModal.type}
                title={alertModal.title}
                message={alertModal.message}
                onConfirm={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                confirmText="Close"
            />

            <AlertModal
                isOpen={confirmModal.isOpen}
                type="confirm"
                title="Confirm Withdraw"
                message={`Are you sure you want to withdraw ${confirmModal.data?.qty} unit(s) of "${confirmModal.data?.product?.ProductName}"?`}
                onConfirm={executeWithdraw}
                onCancel={() => setConfirmModal({ isOpen: false, data: null })}
                confirmText="Confirm Withdraw"
                cancelText="Cancel"
            />
        </div>
    );
};

export default WithdrawPage;
