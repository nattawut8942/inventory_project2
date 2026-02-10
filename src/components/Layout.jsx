import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
            {/* Sidebar (Responsive) */}
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            <main className="flex-1 flex flex-col h-full relative w-full">
                {/* Mobile Header */}
                <div className="lg:hidden bg-slate-900 text-white p-4 flex items-center justify-between shadow-md z-30 shrink-0">
                    <div className="flex items-center gap-3">
                        <img
                            src="/public/DAIKIN_logo.svg.png"
                            alt="DAIKIN"
                            className="h-6 w-auto object-contain"
                        />
                        <span className="font-bold tracking-wider">IT INVENTORY</span>
                    </div>
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <Menu size={24} />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative">
                    {/* Background ambient light */}
                    <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none -z-10"></div>

                    {/* Max width container */}
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Layout;
