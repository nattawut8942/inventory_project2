import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = () => {
    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative">
                {/* Background ambient light - Subtler for Light Mode */}
                <div className="absolute top-0 left-0 w-full h-96 bg-indigo-500/5 blur-[100px] pointer-events-none -z-10"></div>
                {/* Max width container to prevent content from stretching too wide */}
                <div className="max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;
