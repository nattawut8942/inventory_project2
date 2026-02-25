import React from 'react';
import { Package } from 'lucide-react';

const EmptyState = ({
    icon: Icon = Package,
    title = 'ไม่พบข้อมูล',
    message = 'ยังไม่มีข้อมูลในส่วนนี้',
    actionLabel,
    onAction,
    className = ''
}) => {
    return (
        <div className={`flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/30 ${className}`}>
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Icon size={32} className="text-slate-400" />
            </div>
            <h3 className="text-slate-700 font-bold text-lg mb-1">{title}</h3>
            <p className="text-slate-400 text-sm max-w-xs mx-auto mb-6 font-medium">{message}</p>

            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
};

export default EmptyState;
