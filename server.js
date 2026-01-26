import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { sql, connectDB, getPool } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// --- ADMIN USERS LIST ---
const ADMIN_USERS = ['natthawut.y', 'admin'];

// --- AUTHENTICATION (AD API) ---
app.post('/api/authen', async (req, res) => {
    const { username, password } = req.body;

    try {
        const apiUrl = 'http://websrv01.dci.daikin.co.jp/BudgetCharts/BudgetRestService/api/authen';
        const response = await axios.get(apiUrl, {
            params: { username, password },
            timeout: 10000
        });

        if (response.data && response.status === 200) {
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
        if (error.response) {
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
        }
        res.status(500).json({ success: false, message: 'Authentication service unavailable' });
    }
});

// --- FILE UPLOAD ---
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ success: true, filename: req.file.filename, path: `/uploads/${req.file.filename}` });
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

// UPDATE Product (Admin only)
app.put('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    const { ProductName, DeviceType, LastPrice, CurrentStock, MinStock } = req.body;

    try {
        const pool = getPool();
        await pool.request()
            .input('ProductID', sql.Int, id)
            .input('ProductName', sql.NVarChar, ProductName)
            .input('DeviceType', sql.VarChar, DeviceType)
            .input('MinStock', sql.Int, MinStock)
            .input('CurrentStock', sql.Int, CurrentStock)
            .input('LastPrice', sql.Decimal(18, 2), LastPrice)
            .query(`
                UPDATE dbo.Stock_Products 
                SET ProductName = @ProductName, DeviceType = @DeviceType, 
                    MinStock = @MinStock, CurrentStock = @CurrentStock, LastPrice = @LastPrice
                WHERE ProductID = @ProductID
            `);
        res.json({ success: true });
    } catch (err) {
        console.error('Update Product Error:', err);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// DELETE Product (Soft delete - set IsActive = 0)
app.delete('/api/products/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const pool = getPool();
        await pool.request()
            .input('ProductID', sql.Int, id)
            .query('UPDATE dbo.Stock_Products SET IsActive = 0 WHERE ProductID = @ProductID');
        res.json({ success: true });
    } catch (err) {
        console.error('Delete Product Error:', err);
        res.status(500).json({ error: 'Failed to delete product' });
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

            await new sql.Request(transaction)
                .input('ProductID', sql.Int, ProductID)
                .input('Qty', sql.Int, Qty)
                .query('UPDATE dbo.Stock_Products SET CurrentStock = CurrentStock - @Qty WHERE ProductID = @ProductID');

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
        const { status } = req.query;

        let query = `SELECT PO_ID, VendorName, RequestDate, DueDate, RequestedBy, Section, Status, Remark FROM dbo.Stock_PurchaseOrders`;
        if (status) {
            query += ` WHERE Status = '${status}'`;
        }
        query += ' ORDER BY RequestDate DESC';

        const posResult = await pool.request().query(query);

        const pos = await Promise.all(posResult.recordset.map(async (po) => {
            const detailsResult = await pool.request()
                .input('PO_ID', sql.NVarChar, po.PO_ID)
                .query(`
                    SELECT d.DetailID, d.ProductID, d.ItemName, p.ProductName, d.QtyOrdered, d.QtyReceived, d.UnitCost
                    FROM dbo.Stock_PODetails d
                    LEFT JOIN dbo.Stock_Products p ON d.ProductID = p.ProductID
                    WHERE d.PO_ID = @PO_ID
                `);
            return { ...po, Items: detailsResult.recordset };
        }));

        res.json(pos);
    } catch (err) {
        console.error('Get POs Error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// CREATE PO
app.post('/api/pos', async (req, res) => {
    const { PO_ID, VendorName, DueDate, RequestedBy, Section, Remark, Items } = req.body;

    try {
        const pool = getPool();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // Insert PO Header
            await new sql.Request(transaction)
                .input('PO_ID', sql.NVarChar, PO_ID)
                .input('VendorName', sql.NVarChar, VendorName)
                .input('DueDate', sql.DateTime, DueDate ? new Date(DueDate) : null)
                .input('RequestedBy', sql.NVarChar, RequestedBy)
                .input('Section', sql.NVarChar, Section)
                .input('Remark', sql.NVarChar, Remark)
                .query(`
                    INSERT INTO dbo.Stock_PurchaseOrders (PO_ID, VendorName, DueDate, RequestedBy, Section, Remark, Status)
                    VALUES (@PO_ID, @VendorName, @DueDate, @RequestedBy, @Section, @Remark, 'Open')
                `);

            // Insert PO Details
            for (const item of Items) {
                await new sql.Request(transaction)
                    .input('PO_ID', sql.NVarChar, PO_ID)
                    .input('ItemName', sql.NVarChar, item.ItemName || '')
                    .input('ProductID', sql.Int, item.ProductID || null)
                    .input('QtyOrdered', sql.Int, item.QtyOrdered)
                    .input('UnitCost', sql.Decimal(18, 2), item.UnitCost || 0)
                    .query(`
                        INSERT INTO dbo.Stock_PODetails (PO_ID, ItemName, ProductID, QtyOrdered, QtyReceived, UnitCost)
                        VALUES (@PO_ID, @ItemName, @ProductID, @QtyOrdered, 0, @UnitCost)
                    `);
            }

            await transaction.commit();
            res.json({ success: true, PO_ID });
        } catch (err) {
            await transaction.rollback();
            console.error('SQL Error details:', err);
            throw err;
        }
    } catch (err) {
        console.error('Create PO Error:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to create PO',
            details: err.message || err.toString()
        });
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
            await new sql.Request(transaction)
                .input('InvoiceNo', sql.NVarChar, InvoiceNo)
                .input('PO_ID', sql.NVarChar, PO_ID)
                .input('ReceivedBy', sql.NVarChar, UserID)
                .query(`
                    INSERT INTO dbo.Stock_Invoices (InvoiceNo, PO_ID, ReceivedBy)
                    VALUES (@InvoiceNo, @PO_ID, @ReceivedBy)
                `);

            for (const item of ItemsReceived) {
                const qty = parseInt(item.Qty);
                if (qty <= 0) continue;

                // Update Stock Master (Only if ProductID exists)
                if (item.ProductID) {
                    await new sql.Request(transaction)
                        .input('ProductID', sql.Int, item.ProductID)
                        .input('Qty', sql.Int, qty)
                        .query('UPDATE dbo.Stock_Products SET CurrentStock = CurrentStock + @Qty WHERE ProductID = @ProductID');
                }

                // Update PO Detail Status (Using DetailID if available, else fallback to ProductID)
                if (item.DetailID) {
                    await new sql.Request(transaction)
                        .input('PO_ID', sql.NVarChar, PO_ID)
                        .input('DetailID', sql.Int, item.DetailID)
                        .input('Qty', sql.Int, qty)
                        .query('UPDATE dbo.Stock_PODetails SET QtyReceived = QtyReceived + @Qty WHERE DetailID = @DetailID');
                } else if (item.ProductID) {
                    // Fallback for old frontend versions
                    await new sql.Request(transaction)
                        .input('PO_ID', sql.NVarChar, PO_ID)
                        .input('ProductID', sql.Int, item.ProductID)
                        .input('Qty', sql.Int, qty)
                        .query('UPDATE dbo.Stock_PODetails SET QtyReceived = QtyReceived + @Qty WHERE PO_ID = @PO_ID AND ProductID = @ProductID');
                }

                // Log Transaction (ProductID can be null for manual items)
                await new sql.Request(transaction)
                    .input('ProductID', sql.Int, item.ProductID || null)
                    .input('TransType', sql.VarChar, 'IN')
                    .input('Qty', sql.Int, qty)
                    .input('RefInfo', sql.NVarChar, `Invoice: ${InvoiceNo} (PO: ${PO_ID})`)
                    .input('UserID', sql.NVarChar, UserID)
                    .query(`
                        INSERT INTO dbo.Stock_Transactions (ProductID, TransType, Qty, RefInfo, UserID)
                        VALUES (@ProductID, @TransType, @Qty, @RefInfo, @UserID)
                    `);
            }

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
    const { filter, startDate, endDate } = req.query;

    try {
        const pool = getPool();
        const request = pool.request();
        let query = `
            SELECT t.TransID, t.ProductID, p.ProductName, t.TransType, t.Qty, t.RefInfo, t.UserID, t.TransDate
            FROM dbo.Stock_Transactions t
            LEFT JOIN dbo.Stock_Products p ON t.ProductID = p.ProductID
            WHERE 1=1
        `;

        if (filter === 'IN' || filter === 'OUT') {
            query += ` AND t.TransType = '${filter}'`;
        }
        if (startDate) {
            request.input('startDate', sql.DateTime, new Date(startDate));
            query += ' AND t.TransDate >= @startDate';
        }
        if (endDate) {
            request.input('endDate', sql.DateTime, new Date(endDate));
            query += ' AND t.TransDate <= @endDate';
        }

        query += ' ORDER BY t.TransDate DESC';

        const result = await request.query(query);
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

// --- EXPORT REPORT ---
app.get('/api/report/export', async (req, res) => {
    const { types, startDate, endDate, format } = req.query;
    // types = comma-separated: products,transactions,invoices,pos

    try {
        const pool = getPool();
        const dataTypes = types ? types.split(',') : ['products'];
        const workbook = XLSX.utils.book_new();

        for (const dataType of dataTypes) {
            let data = [];
            const request = pool.request();

            if (startDate) request.input('startDate', sql.DateTime, new Date(startDate));
            if (endDate) request.input('endDate', sql.DateTime, new Date(endDate));

            switch (dataType) {
                case 'products':
                    const prodResult = await pool.request().query('SELECT * FROM dbo.Stock_Products WHERE IsActive = 1');
                    data = prodResult.recordset;
                    break;
                case 'transactions':
                    let transQuery = `SELECT t.*, p.ProductName FROM dbo.Stock_Transactions t 
                                      LEFT JOIN dbo.Stock_Products p ON t.ProductID = p.ProductID WHERE 1=1`;
                    if (startDate) transQuery += ' AND t.TransDate >= @startDate';
                    if (endDate) transQuery += ' AND t.TransDate <= @endDate';
                    const transResult = await request.query(transQuery);
                    data = transResult.recordset;
                    break;
                case 'invoices':
                    let invQuery = 'SELECT * FROM dbo.Stock_Invoices WHERE 1=1';
                    if (startDate) invQuery += ' AND ReceiveDate >= @startDate';
                    if (endDate) invQuery += ' AND ReceiveDate <= @endDate';
                    const invResult = await request.query(invQuery);
                    data = invResult.recordset;
                    break;
                case 'pos':
                    let poQuery = 'SELECT * FROM dbo.Stock_PurchaseOrders WHERE 1=1';
                    if (startDate) poQuery += ' AND RequestDate >= @startDate';
                    if (endDate) poQuery += ' AND RequestDate <= @endDate';
                    const poResult = await request.query(poQuery);
                    data = poResult.recordset;
                    break;
            }

            if (data.length > 0) {
                const ws = XLSX.utils.json_to_sheet(data);
                XLSX.utils.book_append_sheet(workbook, ws, dataType);
            }
        }

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=report_${Date.now()}.xlsx`);
        res.send(buffer);
    } catch (err) {
        console.error('Export Error:', err);
        res.status(500).json({ error: 'Failed to export report' });
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
