// MOCK SERVER - Fallback when database is not available
import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- ADMIN USERS LIST ---
const ADMIN_USERS = ['natthawut.y', 'admin'];

// --- MOCK DATA ---
const DEVICE_TYPES = [
    { TypeId: 'Monitor', Label: 'Monitor' },
    { TypeId: 'Asset', Label: 'General Asset' },
    { TypeId: 'Stock', Label: 'Consumable Stock' },
    { TypeId: 'Network', Label: 'Network Device' }
];

let products = [
    { ProductID: 1, ProductName: 'Dell UltraSharp 24"', DeviceType: 'Monitor', MinStock: 5, CurrentStock: 2, LastPrice: 7500.00, UnitOfMeasure: 'Pcs', IsActive: true },
    { ProductID: 2, ProductName: 'Cisco Switch 24-Port', DeviceType: 'Network', MinStock: 2, CurrentStock: 1, LastPrice: 15000.00, UnitOfMeasure: 'Pcs', IsActive: true },
    { ProductID: 3, ProductName: 'Logitech Mouse B100', DeviceType: 'Stock', MinStock: 20, CurrentStock: 15, LastPrice: 250.00, UnitOfMeasure: 'Pcs', IsActive: true },
    { ProductID: 4, ProductName: 'Workstation HP Z2', DeviceType: 'Asset', MinStock: 3, CurrentStock: 5, LastPrice: 45000.00, UnitOfMeasure: 'Pcs', IsActive: true },
];

let purchaseOrders = [
    {
        PO_ID: 'PO-2024-001',
        VendorName: 'IT Vendor Co.',
        RequestDate: '2024-03-01T10:00:00',
        Status: 'Partial',
        Items: [
            { DetailID: 1, ProductID: 1, QtyOrdered: 5, QtyReceived: 2, UnitCost: 7500.00 },
            { DetailID: 2, ProductID: 3, QtyOrdered: 10, QtyReceived: 0, UnitCost: 250.00 }
        ]
    }
];

let invoices = [];
let transactions = [];
let nextProductId = 5;
let nextTransId = 1;

// --- AUTH ---
app.post('/api/authen', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Try AD API first
        const apiUrl = 'http://websrv01.dci.daikin.co.jp/BudgetCharts/BudgetRestService/api/authen';
        const response = await axios.get(apiUrl, {
            params: { username, password },
            timeout: 5000
        });

        if (response.data && response.status === 200) {
            const isAdmin = ADMIN_USERS.includes(username.toLowerCase());
            const role = isAdmin ? 'Staff' : 'User';

            return res.json({
                success: true,
                user: {
                    username,
                    role,
                    name: response.data.name || response.data.empname || username
                }
            });
        }
    } catch (error) {
        console.log('AD API not available, using demo mode');
    }

    // Demo fallback
    if (username === 'admin' && password === '1234') {
        return res.json({ success: true, user: { username: 'admin', role: 'Staff', name: 'System Admin' } });
    }
    if (username === 'user' && password === '1234') {
        return res.json({ success: true, user: { username: 'user', role: 'User', name: 'General User' } });
    }
    if (username === 'natthawut.y' && password === '1234') {
        return res.json({ success: true, user: { username: 'natthawut.y', role: 'Staff', name: 'Natthawut Y.' } });
    }

    res.status(401).json({ success: false, message: 'Invalid credentials' });
});

// --- TYPES ---
app.get('/api/types', (req, res) => res.json(DEVICE_TYPES));

// --- PRODUCTS ---
app.get('/api/products', (req, res) => res.json(products));

app.post('/api/products/manual-import', (req, res) => {
    const { ProductName, DeviceType, LastPrice, CurrentStock, MinStock, UserID } = req.body;

    const newProduct = {
        ProductID: nextProductId++,
        ProductName,
        DeviceType,
        MinStock: Number(MinStock),
        CurrentStock: Number(CurrentStock),
        LastPrice: Number(LastPrice),
        UnitOfMeasure: 'Pcs',
        IsActive: true
    };
    products.push(newProduct);

    transactions.unshift({
        TransID: nextTransId++,
        ProductID: newProduct.ProductID,
        ProductName: newProduct.ProductName,
        TransType: 'IN',
        Qty: newProduct.CurrentStock,
        RefInfo: 'Manual Import (Legacy)',
        UserID: UserID || 'System',
        TransDate: new Date().toISOString()
    });

    res.json({ success: true, ProductID: newProduct.ProductID });
});

app.post('/api/products/withdraw', (req, res) => {
    const { ProductID, Qty, UserID } = req.body;
    const product = products.find(p => p.ProductID === Number(ProductID));

    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.CurrentStock < Qty) return res.status(400).json({ error: 'Insufficient stock' });

    product.CurrentStock -= Number(Qty);

    transactions.unshift({
        TransID: nextTransId++,
        ProductID: product.ProductID,
        ProductName: product.ProductName,
        TransType: 'OUT',
        Qty: Number(Qty),
        RefInfo: 'Internal Withdrawal',
        UserID,
        TransDate: new Date().toISOString()
    });

    res.json({ success: true });
});

// --- POs ---
app.get('/api/pos', (req, res) => res.json(purchaseOrders));

// --- INVOICES ---
app.get('/api/invoices', (req, res) => res.json(invoices));

app.post('/api/receive', (req, res) => {
    const { PO_ID, InvoiceNo, ItemsReceived, UserID } = req.body;

    const newInvoice = {
        InvoiceID: invoices.length + 1,
        InvoiceNo,
        PO_ID,
        ReceiveDate: new Date().toISOString(),
        ReceivedBy: UserID
    };
    invoices.push(newInvoice);

    const po = purchaseOrders.find(p => p.PO_ID === PO_ID);
    if (!po) return res.status(404).json({ error: 'PO not found' });

    ItemsReceived.forEach(item => {
        const qty = Number(item.Qty);
        if (qty <= 0) return;

        const prod = products.find(p => p.ProductID === Number(item.ProductID));
        if (prod) prod.CurrentStock += qty;

        const poItem = po.Items.find(i => i.ProductID === Number(item.ProductID));
        if (poItem) poItem.QtyReceived += qty;

        transactions.unshift({
            TransID: nextTransId++,
            ProductID: Number(item.ProductID),
            ProductName: prod?.ProductName || 'Unknown',
            TransType: 'IN',
            Qty: qty,
            RefInfo: `Invoice: ${InvoiceNo} (PO: ${PO_ID})`,
            UserID,
            TransDate: new Date().toISOString()
        });
    });

    const isCompleted = po.Items.every(i => i.QtyReceived >= i.QtyOrdered);
    po.Status = isCompleted ? 'Completed' : 'Partial';

    res.json({ success: true });
});

// --- TRANSACTIONS ---
app.get('/api/transactions', (req, res) => {
    const { filter } = req.query;
    let result = transactions;
    if (filter === 'IN' || filter === 'OUT') {
        result = result.filter(t => t.TransType === filter);
    }
    res.json(result);
});

// --- FORECAST ---
app.get('/api/forecast', (req, res) => {
    const forecast = products.map(p => ({
        ...p,
        Needed: p.CurrentStock < p.MinStock ? p.MinStock - p.CurrentStock : 0,
        EstimatedCost: (p.CurrentStock < p.MinStock ? p.MinStock - p.CurrentStock : 0) * p.LastPrice
    })).filter(p => p.Needed > 0);
    res.json(forecast);
});

app.listen(PORT, () => {
    console.log(`🔶 MOCK Server running on http://localhost:${PORT}`);
    console.log('   (No database - using in-memory data)');
    console.log('');
    console.log('   Demo accounts:');
    console.log('   - admin / 1234 (Staff)');
    console.log('   - user / 1234 (User)');
    console.log('   - natthawut.y / 1234 (Staff/Admin)');
});

export default app;
