import React from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:3001/api';

const WithdrawPage = () => {
    const { products, refreshData } = useData();
    const { user } = useAuth();

    const handleWithdraw = async (productId, qty) => {
        try {
            const res = await fetch(`${API_BASE}/products/withdraw`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ProductID: productId,
                    Qty: qty,
                    UserID: user.username
                })
            });
            if (!res.ok) throw new Error('Failed');
            refreshData();
        } catch (err) {
            alert('Withdrawal failed (Check stock?)');
        }
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-5">
            <h2 className="text-3xl font-black text-slate-800">Withdrawal</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {products.map(p => (
                    <div key={p.ProductID} className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col justify-between group hover:shadow-lg transition-all hover:border-indigo-200">
                        <div>
                            <div className="flex justify-between mb-3">
                                <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full border border-slate-200">
                                    {p.DeviceType}
                                </span>
                            </div>
                            <h4 className="font-bold text-sm mb-1 truncate text-slate-800">{p.ProductName}</h4>
                            <p className="text-xs text-slate-400 mb-4 font-medium">
                                In Stock: <span className="text-emerald-600 font-bold text-lg align-middle ml-1">{p.CurrentStock}</span>
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <input
                                id={`qty-${p.ProductID}`}
                                type="number"
                                defaultValue="1"
                                max={p.CurrentStock}
                                min="1"
                                className="w-14 bg-slate-50 border border-slate-200 rounded-xl p-2 text-sm text-center outline-none focus:border-indigo-500 text-slate-800 font-bold"
                            />
                            <button
                                disabled={p.CurrentStock <= 0}
                                onClick={() => {
                                    const q = document.getElementById(`qty-${p.ProductID}`).value;
                                    if (q) handleWithdraw(p.ProductID, Number(q));
                                }}
                                className="flex-1 bg-indigo-600 text-white font-bold py-2 rounded-xl text-xs hover:bg-indigo-700 shadow-md shadow-indigo-200 disabled:opacity-50 disabled:shadow-none disabled:bg-slate-300 transition-all"
                            >
                                Withdraw
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
    );
};

export default WithdrawPage;
