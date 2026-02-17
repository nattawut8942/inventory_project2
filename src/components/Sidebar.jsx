import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    LogOut,
    Plus,
    ArrowDownToLine,
    ArrowUpFromLine,
    History,
    Database,
    FileSpreadsheet,
    Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SidebarItem = ({ icon: Icon, label, to }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            `w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-300 font-medium ${isActive
                ? 'bg-white text-indigo-900 shadow-xl shadow-indigo-900/10 scale-105'
                : 'text-indigo-100/70 hover:bg-white/10 hover:text-white hover:backdrop-blur-lg'
            }`
        }
    >
        <Icon size={18} />
        <span className="text-sm">{label}</span>
    </NavLink>
);

const Sidebar = ({ isOpen, onClose }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // Close sidebar when navigating (mobile)
    const handleNavigation = (to) => {
        navigate(to);
        if (onClose) onClose();
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
        if (onClose) onClose();
    };

    // Custom NavItem to handle click closure
    const NavItem = ({ icon: Icon, label, to }) => (
        <button
            onClick={() => handleNavigation(to)}
            className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-300 font-medium ${window.location.pathname === to
                ? 'bg-white text-indigo-900 shadow-xl shadow-indigo-900/10 scale-105'
                : 'text-indigo-100/70 hover:bg-white/10 hover:text-white hover:backdrop-blur-lg'
                }`}
        >
            <Icon size={18} />
            <span className="text-sm">{label}</span>
        </button>
    );

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Container */}
            <aside className={`
                fixed lg:static inset-y-0 left-0 z-40
                w-72 bg-slate-900 p-6 flex flex-col text-white 
                transform transition-transform duration-300 ease-in-out shadow-2xl
                ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                {/* Background Gradients */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 z-0"></div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2 z-0"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500 rounded-full blur-[100px] opacity-10 translate-y-1/2 -translate-x-1/2 z-0"></div>

                {/* Header */}
                <div className="relative z-10 flex flex-col items-center mb-10 text-center">
                    <div className="p-2 rounded-xl mb-3 w-full max-w-[200px] relative">
                        <img
                            src="/public/DAIKIN_logo.svg.png"
                            alt="DAIKIN"
                            className="h-8 w-auto mx-auto object-contain"
                        />
                        {/* Close Button Mobile */}
                        <button
                            onClick={onClose}
                            className="absolute -right-4 -top-2 lg:hidden text-slate-400 hover:text-white p-2"
                        >
                            <LogOut className="rotate-180" size={20} />
                        </button>
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-white leading-none">IT INVENTORY</h1>
                        <span className="text-[13px] font-bold text-indigo-300 tracking-[0.2em] uppercase">MANAGEMENT SYSTEM</span>
                    </div>
                </div>

                <nav className="relative z-10 flex-1 space-y-1.5 overflow-y-auto scrollbar-none pr-2">
                    <NavItem icon={LayoutDashboard} label="Dashboard" to="/" />
                    <NavItem icon={Database} label="Inventory" to="/inventory" />

                    {/* PO and Receive - viewable by all */}
                    <NavItem icon={ShoppingCart} label="Purchase Orders" to="/purchase-orders" />
                    <NavItem icon={ArrowDownToLine} label="Receive Items" to="/receive" />

                    {user?.role === 'Staff' && (
                        <>
                            <div className="pt-6 pb-2 text-[10px] font-bold uppercase text-slate-500 tracking-wider pl-3">
                                Staff Controls
                            </div>
                            <NavItem icon={Plus} label="Manual Import" to="/manual-import" />
                            <NavItem icon={Shield} label="Management" to="/management" />
                        </>
                    )}

                    <div className="pt-6 pb-2 text-[10px] font-bold uppercase text-slate-500 tracking-wider pl-3">
                        ทั่วไป (General)
                    </div>
                    <NavItem icon={ArrowUpFromLine} label="Withdraw Items" to="/withdraw" />
                    <NavItem icon={History} label="History Log" to="/history" />
                    <NavItem icon={FileSpreadsheet} label="Reports" to="/reports" />
                </nav>

                <div className="relative z-10 pt-6 border-t border-white/5 mt-2">
                    <div className="flex items-center space-x-3 px-3 py-3 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md hover:bg-white/10 transition-colors cursor-pointer group">
                        {user?.empPic ? (
                            <img
                                src={user.empPic}
                                alt={user?.name || 'User'}
                                className="w-14 h-14 rounded-xl object-cover shadow-lg ring-2 ring-white/10 group-hover:scale-105 transition-transform"
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-lg font-bold shadow-lg ring-2 ring-white/10 group-hover:scale-105 transition-transform">
                                {user?.name?.[0]?.toUpperCase() || '?'}
                            </div>
                        )}
                        <div className="flex-1 overflow-hidden">
                            <p className="text-xs font-bold truncate text-white group-hover:text-indigo-200 transition-colors">{user?.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium group-hover:text-indigo-300 transition-colors">{user?.empcode}</p>
                            <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">{user?.role}</p>
                        </div>
                        <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition-colors p-2 hover:bg-white/5 rounded-lg">
                            <LogOut size={18} />
                        </button>
                    </div>
                    <p className="text-[9px] text-center mt-5 text-center text-[13px] text-gray-500">© 2026 by: Natthawut.Y <span className="font-bold text-indigo-400">All rights reserved. </span></p>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
