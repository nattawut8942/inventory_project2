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
        <div className="space-y-6 animate-in fade-in">
            <h2 className="text-3xl font-black">Withdrawal</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {products.map(p => (
                    <div key={p.ProductID} className="bg-gray-900 border border-gray-800 p-5 rounded-2xl flex flex-col justify-between group hover:border-gray-700 transition-all">
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full border border-gray-700">
                                    {p.DeviceType}
                                </span>
                            </div>
                            <h4 className="font-bold text-sm mb-1 truncate text-white">{p.ProductName}</h4>
                            <p className="text-xs text-gray-500 mb-4">
                                In Stock: <span className="text-white font-bold text-lg align-middle ml-1">{p.CurrentStock}</span>
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <input
                                id={`qty-${p.ProductID}`}
                                type="number"
                                defaultValue="1"
                                max={p.CurrentStock}
                                min="1"
                                className="w-12 bg-black border border-gray-800 rounded-lg p-1 text-xs text-center outline-none focus:border-indigo-500"
                            />
                            <button
                                disabled={p.CurrentStock <= 0}
                                onClick={() => {
                                    const q = document.getElementById(`qty-${p.ProductID}`).value;
                                    if (q) handleWithdraw(p.ProductID, Number(q));
                                }}
                                className="flex-1 bg-indigo-600/20 text-indigo-300 border border-indigo-600/30 font-bold py-2 rounded-lg text-xs hover:bg-indigo-600 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-indigo-300 transition-all"
                            >
                                Withdraw
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WithdrawPage;
