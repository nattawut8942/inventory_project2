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
    FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SidebarItem = ({ icon: Icon, label, to }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            `w-full flex items-center space-x-3 p-3 rounded-lg transition-all font-medium ${isActive
                ? 'bg-white text-indigo-900 shadow-md'
                : 'text-indigo-100/70 hover:bg-white/10 hover:text-white'
            }`
        }
    >
        <Icon size={18} />
        <span className="text-sm">{label}</span>
    </NavLink>
);

const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <aside className="w-64 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 p-6 flex flex-col text-white shadow-xl relative z-20">
            <div className="flex items-center space-x-3 mb-10">
                <div className="bg-white/10 p-2 rounded-lg border border-white/10 backdrop-blur-sm">
                    <Package className="text-white" size={20} />
                </div>
                <h1 className="text-lg font-black tracking-tight text-white">IT STOCK PRO</h1>
            </div>

            <nav className="flex-1 space-y-1">
                <SidebarItem icon={LayoutDashboard} label="Dashboard" to="/" />
                <SidebarItem icon={Database} label="Inventory Master" to="/inventory" />

                {user?.role === 'Staff' && (
                    <>
                        <div className="pt-4 pb-2 text-[10px] font-bold uppercase text-indigo-300/50 tracking-wider">
                            Staff Operations
                        </div>
                        <SidebarItem icon={ShoppingCart} label="Purchase Orders" to="/purchase-orders" />
                        <SidebarItem icon={ArrowDownToLine} label="Receive (Invoice)" to="/receive" />
                        <SidebarItem icon={Plus} label="Manual Import" to="/manual-import" />
                    </>
                )}

                <div className="pt-4 pb-2 text-[10px] font-bold uppercase text-indigo-300/50 tracking-wider">
                    Common Actions
                </div>
                <SidebarItem icon={ArrowUpFromLine} label="Withdraw Items" to="/withdraw" />
                <SidebarItem icon={History} label="History Log" to="/history" />
                <SidebarItem icon={FileSpreadsheet} label="Export Reports" to="/reports" />
            </nav>

            <div className="pt-6 border-t border-white/10">
                <div className="flex items-center space-x-3 px-3 py-3 bg-white/5 rounded-xl border border-white/5 backdrop-blur-sm">
                    <div className="w-9 h-9 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold shadow-lg ring-2 ring-white/20">
                        {user?.username?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-xs font-bold truncate text-white">{user?.name}</p>
                        <p className="text-[10px] text-indigo-200">{user?.role}</p>
                    </div>
                    <button onClick={handleLogout} className="text-indigo-200 hover:text-white transition-colors">
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
