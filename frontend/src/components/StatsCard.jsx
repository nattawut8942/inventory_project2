import React from 'react';

const StatsCard = ({ label, value, sub, color = 'blue', alert = false }) => (
    <div className={`bg-white p-5 rounded-2xl border shadow-sm transition-all hover:shadow-md ${alert ? 'border-red-100 bg-red-50/50' : 'border-slate-200'}`}>
        <p className={`text-[10px] uppercase font-bold tracking-wider ${alert ? 'text-red-500' : 'text-slate-400'}`}>
            {label}
        </p>
        <p className={`text-3xl font-black mt-2 font-mono ${alert ? 'text-red-500' :
            color === 'green' ? 'text-emerald-600' :
                color === 'indigo' ? 'text-indigo-600' : 'text-slate-800'
            }`}>
            {value} <span className="text-sm font-normal text-slate-400 font-sans">{sub}</span>
        </p>
    </div>
);

export default StatsCard;
