import React from 'react';

const StatsCard = ({ label, value, sub, color = 'blue', alert = false }) => (
    <div className={`bg-gray-900/50 backdrop-blur p-5 rounded-2xl border ${alert ? 'border-red-900/50 bg-red-900/10' : 'border-gray-800'}`}>
        <p className={`text-[10px] uppercase font-bold tracking-wider ${alert ? 'text-red-400' : 'text-gray-500'}`}>
            {label}
        </p>
        <p className={`text-3xl font-black mt-2 ${alert ? 'text-red-500' :
                color === 'green' ? 'text-green-500' :
                    color === 'indigo' ? 'text-indigo-400' : 'text-white'
            }`}>
            {value} <span className="text-sm font-normal text-gray-600">{sub}</span>
        </p>
    </div>
);

export default StatsCard;
