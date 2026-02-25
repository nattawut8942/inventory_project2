import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const StatCard = ({ icon: Icon, title, value, subValue, color, isAlert, change, changeType }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white rounded-2xl p-6 shadow-lg border hover:shadow-xl transition-all ${isAlert ? 'border-red-200 bg-red-50/10' : 'border-slate-200'}`}
    >
        <div className="flex items-start justify-between">
            <div>
                <p className="text-sm text-slate-600 mb-1">{title}</p>
                <h3 className={`text-3xl font-bold ${isAlert ? 'text-red-600' : 'text-slate-900'}`}>{value}</h3>
                <div className="flex flex-col mt-2">
                    {change && (
                        <div className="flex items-center gap-1 mb-1">
                            {changeType === 'up' ? (
                                <TrendingUp className="w-4 h-4 text-emerald-500" />
                            ) : changeType === 'down' ? (
                                <TrendingDown className="w-4 h-4 text-red-500" />
                            ) : null}
                            <span className={`text-xs font-bold ${changeType === 'up' ? 'text-emerald-600' : changeType === 'down' ? 'text-red-600' : 'text-slate-500'}`}>
                                {change}
                            </span>
                        </div>
                    )}
                    {subValue && (
                        <span className="text-xs text-slate-500">{subValue}</span>
                    )}
                </div>
            </div>
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-md`}>
                <Icon className="w-7 h-7 text-white" />
            </div>
        </div>
    </motion.div>
);

export default StatCard;
