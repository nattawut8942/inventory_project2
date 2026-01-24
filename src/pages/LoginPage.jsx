import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:3001/api';

const LoginPage = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const formData = new FormData(e.target);

        try {
            const res = await fetch(`${API_BASE}/authen`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(Object.fromEntries(formData))
            });
            const data = await res.json();

            if (data.success) {
                login(data.user);
                navigate('/');
            } else {
                setError(data.message || 'Login failed');
            }
        } catch (err) {
            setError('Server error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-gray-950 font-sans text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-indigo-900/10 z-0"></div>
            <div className="z-10 w-full max-w-md p-8 bg-black/50 backdrop-blur-xl border border-gray-800 rounded-3xl shadow-2xl">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-600 mb-4 shadow-lg shadow-indigo-600/50">
                        <Package size={32} />
                    </div>
                    <h1 className="text-3xl font-black tracking-tight">IT STOCK PRO</h1>
                    <p className="text-gray-400 mt-2 text-sm">Sign in to manage inventory & assets</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Username</label>
                        <input
                            name="username"
                            placeholder="AD User (e.g. admin)"
                            className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 outline-none focus:border-indigo-500 transition-all text-sm"
                            required
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Password</label>
                        <input
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 outline-none focus:border-indigo-500 transition-all text-sm"
                            required
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-red-500 text-xs flex items-center gap-2">
                            <AlertTriangle size={12} /> {error}
                        </div>
                    )}

                    <button
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-900/40 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? 'Authenticating...' : 'Secure Sign In'}
                    </button>
                </form>
                <p className="mt-8 text-center text-[10px] text-gray-600">
                    Connects to DCI BudgetRestService for Authentication
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
