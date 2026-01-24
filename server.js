import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { sql, connectDB, getPool } from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- ADMIN USERS LIST ---
const ADMIN_USERS = ['natthawut.y', 'admin'];

// --- AUTHENTICATION (AD API) ---
app.post('/api/authen', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Call the AD Authentication API
        const apiUrl = 'http://websrv01.dci.daikin.co.jp/BudgetCharts/BudgetRestService/api/authen';
        const response = await axios.get(apiUrl, {
            params: { username, password },
            timeout: 10000 // 10 second timeout
        });

        // Check if API returns valid data
        if (response.data && response.status === 200) {
            // Determine role: Check if user is in admin list
            const isAdmin = ADMIN_USERS.includes(username.toLowerCase());
            const role = isAdmin ? 'Staff' : 'User';

            res.json({
                success: true,
                user: {
                    username,
                    role,
                    name: response.data.name || response.data.empname || username
                }
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid username or password' });
        }
    } catch (error) {
        console.error('AD Auth Error:', error.message);

        // If API returned an error response (like 401)
        if (error.response) {
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
        }

        res.status(500).json({ success: false, message: 'Authentication service unavailable' });
    }
});

// --- DEVICE TYPES ---
app.get('/api/types', async (req, res) => {
    try {
        const pool = getPool();
        const result = await pool.request().query('SELECT TypeId, Label FROM dbo.Stock_DeviceTypes');
        res.json(result.recordset);
    } catch (err) {
        console.error('Get Types Error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// --- PRODUCTS ---
app.get('/api/products', async (req, res) => {
    try {
        const pool = getPool();
        const result = await pool.request().query(`
            SELECT ProductID, ProductName, DeviceType, MinStock, CurrentStock, LastPrice, UnitOfMeasure, IsActive
            FROM dbo.Stock_Products
            WHERE IsActive = 1
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Get Products Error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Manual Import (Legacy / No PO)
app.post('/api/products/manual-import', async (req, res) => {
    const { ProductName, DeviceType, LastPrice, CurrentStock, MinStock, UserID } = req.body;

    try {
        const pool = getPool();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // Insert Product
            const insertProduct = await new sql.Request(transaction)
                .input('ProductName', sql.NVarChar, ProductName)
                .input('DeviceType', sql.VarChar, DeviceType)
                .input('MinStock', sql.Int, MinStock)
                .input('CurrentStock', sql.Int, CurrentStock)
                .input('LastPrice', sql.Decimal(18, 2), LastPrice)
                .query(`
                    INSERT INTO dbo.Stock_Products (ProductName, DeviceType, MinStock, CurrentStock, LastPrice)
                    OUTPUT INSERTED.ProductID
                    VALUES (@ProductName, @DeviceType, @MinStock, @CurrentStock, @LastPrice)
                `);

            const newProductId = insertProduct.recordset[0].ProductID;

            // Log Transaction
            await new sql.Request(transaction)
                .input('ProductID', sql.Int, newProductId)
                .input('TransType', sql.VarChar, 'IN')
                .input('Qty', sql.Int, CurrentStock)
                .input('RefInfo', sql.NVarChar, 'Manual Import (Legacy)')
                .input('UserID', sql.NVarChar, UserID)
                .query(`
                    INSERT INTO dbo.Stock_Transactions (ProductID, TransType, Qty, RefInfo, UserID)
                    VALUES (@ProductID, @TransType, @Qty, @RefInfo, @UserID)
                `);

            await transaction.commit();
            res.json({ success: true, ProductID: newProductId });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error('Manual Import Error:', err);
        res.status(500).json({ error: 'Failed to import product' });
    }
});

// Withdrawal (Outbound)
app.post('/api/products/withdraw', async (req, res) => {
    const { ProductID, Qty, UserID } = req.body;

    try {
        const pool = getPool();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // Check current stock
            const checkStock = await new sql.Request(transaction)
                .input('ProductID', sql.Int, ProductID)
                .query('SELECT CurrentStock FROM dbo.Stock_Products WHERE ProductID = @ProductID');

            if (checkStock.recordset.length === 0) {
                await transaction.rollback();
                return res.status(404).json({ error: 'Product not found' });
            }

            const currentStock = checkStock.recordset[0].CurrentStock;
            if (currentStock < Qty) {
                await transaction.rollback();
                return res.status(400).json({ error: 'Insufficient stock' });
            }

            // Update stock
            await new sql.Request(transaction)
                .input('ProductID', sql.Int, ProductID)
                .input('Qty', sql.Int, Qty)
                .query('UPDATE dbo.Stock_Products SET CurrentStock = CurrentStock - @Qty WHERE ProductID = @ProductID');

            // Log Transaction
            await new sql.Request(transaction)
                .input('ProductID', sql.Int, ProductID)
                .input('TransType', sql.VarChar, 'OUT')
                .input('Qty', sql.Int, Qty)
                .input('RefInfo', sql.NVarChar, 'Internal Withdrawal')
                .input('UserID', sql.NVarChar, UserID)
                .query(`
                    INSERT INTO dbo.Stock_Transactions (ProductID, TransType, Qty, RefInfo, UserID)
                    VALUES (@ProductID, @TransType, @Qty, @RefInfo, @UserID)
                `);

            await transaction.commit();
            res.json({ success: true });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error('Withdraw Error:', err);
        res.status(500).json({ error: 'Withdrawal failed' });
    }
});

// --- PURCHASE ORDERS ---
app.get('/api/pos', async (req, res) => {
    try {
        const pool = getPool();

        // Get POs
        const posResult = await pool.request().query(`
            SELECT PO_ID, VendorName, RequestDate, DueDate, RequestedBy, Section, Status, Remark
            FROM dbo.Stock_PurchaseOrders
            WHERE Status != 'Completed'
        `);

        // Get PO Details for each PO
        const pos = await Promise.all(posResult.recordset.map(async (po) => {
            const detailsResult = await pool.request()
                .input('PO_ID', sql.NVarChar, po.PO_ID)
                .query(`
                    SELECT DetailID, ProductID, QtyOrdered, QtyReceived, UnitCost
                    FROM dbo.Stock_PODetails
                    WHERE PO_ID = @PO_ID
                `);
            return { ...po, Items: detailsResult.recordset };
        }));

        res.json(pos);
    } catch (err) {
        console.error('Get POs Error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// --- INVOICES ---
app.get('/api/invoices', async (req, res) => {
    try {
        const pool = getPool();
        const result = await pool.request().query(`
            SELECT InvoiceID, InvoiceNo, PO_ID, ReceiveDate, ReceivedBy
            FROM dbo.Stock_Invoices
            ORDER BY ReceiveDate DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Get Invoices Error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Receive Goods (Inbound from PO)
app.post('/api/receive', async (req, res) => {
    const { PO_ID, InvoiceNo, ItemsReceived, UserID } = req.body;

    try {
        const pool = getPool();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // 1. Create Invoice Record
            await new sql.Request(transaction)
                .input('InvoiceNo', sql.NVarChar, InvoiceNo)
                .input('PO_ID', sql.NVarChar, PO_ID)
                .input('ReceivedBy', sql.NVarChar, UserID)
                .query(`
                    INSERT INTO dbo.Stock_Invoices (InvoiceNo, PO_ID, ReceivedBy)
                    VALUES (@InvoiceNo, @PO_ID, @ReceivedBy)
                `);

            // 2. Process Each Item
            for (const item of ItemsReceived) {
                const qty = parseInt(item.Qty);
                if (qty <= 0) continue;

                // Update Product Stock
                await new sql.Request(transaction)
                    .input('ProductID', sql.Int, item.ProductID)
                    .input('Qty', sql.Int, qty)
                    .query('UPDATE dbo.Stock_Products SET CurrentStock = CurrentStock + @Qty WHERE ProductID = @ProductID');

                // Update PO Detail QtyReceived
                await new sql.Request(transaction)
                    .input('PO_ID', sql.NVarChar, PO_ID)
                    .input('ProductID', sql.Int, item.ProductID)
                    .input('Qty', sql.Int, qty)
                    .query('UPDATE dbo.Stock_PODetails SET QtyReceived = QtyReceived + @Qty WHERE PO_ID = @PO_ID AND ProductID = @ProductID');

                // Log Transaction
                await new sql.Request(transaction)
                    .input('ProductID', sql.Int, item.ProductID)
                    .input('TransType', sql.VarChar, 'IN')
                    .input('Qty', sql.Int, qty)
                    .input('RefInfo', sql.NVarChar, `Invoice: ${InvoiceNo} (PO: ${PO_ID})`)
                    .input('UserID', sql.NVarChar, UserID)
                    .query(`
                        INSERT INTO dbo.Stock_Transactions (ProductID, TransType, Qty, RefInfo, UserID)
                        VALUES (@ProductID, @TransType, @Qty, @RefInfo, @UserID)
                    `);
            }

            // 3. Check if PO is complete and update status
            const checkComplete = await new sql.Request(transaction)
                .input('PO_ID', sql.NVarChar, PO_ID)
                .query(`
                    SELECT 
                        CASE WHEN COUNT(*) = SUM(CASE WHEN QtyReceived >= QtyOrdered THEN 1 ELSE 0 END) 
                             THEN 'Completed' ELSE 'Partial' END as NewStatus
                    FROM dbo.Stock_PODetails
                    WHERE PO_ID = @PO_ID
                `);

            const newStatus = checkComplete.recordset[0]?.NewStatus || 'Partial';

            await new sql.Request(transaction)
                .input('PO_ID', sql.NVarChar, PO_ID)
                .input('Status', sql.NVarChar, newStatus)
                .query('UPDATE dbo.Stock_PurchaseOrders SET Status = @Status WHERE PO_ID = @PO_ID');

            await transaction.commit();
            res.json({ success: true, message: 'Received successfully' });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error('Receive Error:', err);
        res.status(500).json({ error: 'Failed to receive goods' });
    }
});

// --- TRANSACTIONS ---
app.get('/api/transactions', async (req, res) => {
    const { filter } = req.query;

    try {
        const pool = getPool();
        let query = `
            SELECT t.TransID, t.ProductID, p.ProductName, t.TransType, t.Qty, t.RefInfo, t.UserID, t.TransDate
            FROM dbo.Stock_Transactions t
            LEFT JOIN dbo.Stock_Products p ON t.ProductID = p.ProductID
        `;

        if (filter === 'IN' || filter === 'OUT') {
            query += ` WHERE t.TransType = '${filter}'`;
        }

        query += ' ORDER BY t.TransDate DESC';

        const result = await pool.request().query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error('Get Transactions Error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// --- FORECAST ---
app.get('/api/forecast', async (req, res) => {
    try {
        const pool = getPool();
        const result = await pool.request().query(`
            SELECT 
                ProductID, ProductName, DeviceType, MinStock, CurrentStock, LastPrice,
                CASE WHEN CurrentStock < MinStock THEN MinStock - CurrentStock ELSE 0 END as Needed,
                CASE WHEN CurrentStock < MinStock THEN (MinStock - CurrentStock) * LastPrice ELSE 0 END as EstimatedCost
            FROM dbo.Stock_Products
            WHERE IsActive = 1 AND CurrentStock < MinStock
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Get Forecast Error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// --- START SERVER ---
const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log('✅ Connected to SQL Server database');
        });
    } catch (err) {
        console.error('❌ Failed to start server:', err.message);
        console.error('   Please check your database connection settings in .env file');
        process.exit(1);
    }
};

startServer();
