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
    Database
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SidebarItem = ({ icon: Icon, label, to }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            `w-full flex items-center space-x-3 p-3 rounded-lg transition-all ${isActive
                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20'
                : 'text-gray-400 hover:bg-gray-900 hover:text-white'
            }`
        }
    >
        <Icon size={18} />
        <span className="text-sm font-medium">{label}</span>
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
        <aside className="w-64 bg-gray-950 p-6 flex flex-col border-r border-gray-900">
            <div className="flex items-center space-x-3 mb-10">
                <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-2 rounded-lg shadow-lg shadow-indigo-900/20">
                    <Package className="text-white" size={20} />
                </div>
                <h1 className="text-lg font-bold tracking-tight">IT STOCK PRO</h1>
            </div>

            <nav className="flex-1 space-y-1">
                <SidebarItem icon={LayoutDashboard} label="Dashboard" to="/" />
                <SidebarItem icon={Database} label="Inventory Master" to="/inventory" />

                {user?.role === 'Staff' && (
                    <>
                        <div className="pt-4 pb-2 text-[10px] font-bold uppercase text-gray-600 tracking-wider">
                            Staff Operations
                        </div>
                        <SidebarItem icon={ShoppingCart} label="Purchase Orders" to="/purchase-orders" />
                        <SidebarItem icon={ArrowDownToLine} label="Receive (Invoice)" to="/receive" />
                        <SidebarItem icon={Plus} label="Manual Import" to="/manual-import" />
                    </>
                )}

                <div className="pt-4 pb-2 text-[10px] font-bold uppercase text-gray-600 tracking-wider">
                    Common Actions
                </div>
                <SidebarItem icon={ArrowUpFromLine} label="Withdraw Items" to="/withdraw" />
                <SidebarItem icon={History} label="History Log" to="/history" />
            </nav>

            <div className="pt-6 border-t border-gray-900">
                <div className="flex items-center space-x-3 px-3 py-3 bg-gray-900/50 rounded-xl border border-gray-800">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold shadow-md">
                        {user?.username?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-xs font-bold truncate">{user?.name}</p>
                        <p className="text-[10px] text-gray-500">{user?.role}</p>
                    </div>
                    <button onClick={handleLogout} className="text-gray-500 hover:text-white transition-colors">
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
