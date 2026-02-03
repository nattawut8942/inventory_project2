import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const API_BASE = 'http://localhost:3001/api';

const DataContext = createContext(null);

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
    const { user } = useAuth();
    const [products, setProducts] = useState([]);
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [deviceTypes, setDeviceTypes] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [prodRes, poRes, invRes, transRes, typeRes, vendorRes] = await Promise.all([
                fetch(`${API_BASE}/products`),
                fetch(`${API_BASE}/pos`),
                fetch(`${API_BASE}/invoices`),
                fetch(`${API_BASE}/transactions`),
                fetch(`${API_BASE}/types`),
                fetch(`${API_BASE}/vendors`)
            ]);
            if (prodRes.ok) setProducts(await prodRes.json());
            if (poRes.ok) setPurchaseOrders(await poRes.json());
            if (invRes.ok) setInvoices(await invRes.json());
            if (transRes.ok) setTransactions(await transRes.json());
            if (typeRes.ok) setDeviceTypes(await typeRes.json());
            if (vendorRes.ok) setVendors(await vendorRes.json());
        } catch (err) {
            console.error("Failed to fetch data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    return (
        <DataContext.Provider value={{
            products,
            purchaseOrders,
            invoices,
            transactions,
            deviceTypes,
            vendors,
            loading,
            refreshData: fetchData
        }}>
            {children}
        </DataContext.Provider>
    );
};
