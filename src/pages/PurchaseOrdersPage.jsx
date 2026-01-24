import React from 'react';
import { ShoppingCart } from 'lucide-react';

const PurchaseOrdersPage = () => {
    return (
        <div className="space-y-6 animate-in fade-in">
            <h2 className="text-3xl font-black">Purchase Orders</h2>
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-gray-800 rounded-2xl bg-gray-900/20">
                <ShoppingCart size={48} className="text-gray-700 mb-4" />
                <p className="text-gray-500 text-lg font-medium">Coming Soon</p>
                <p className="text-gray-600 text-sm mt-2">PO Management module is under development.</p>
            </div>
        </div>
    );
};

export default PurchaseOrdersPage;
