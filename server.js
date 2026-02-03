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

// Create uploads folder if not exists
import fs from 'fs';
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
    fs.mkdirSync(path.join(__dirname, 'uploads'));
    console.log('Created uploads directory');
}

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
            // API returns array, get first element
            const apiData = Array.isArray(response.data) ? response.data[0] : response.data;

            // Debug: Log what Daikin API returns
            console.log('=== Daikin API Response ===');
            console.log(JSON.stringify(apiData, null, 2));
            console.log('===========================');

            // Check if we got valid data
            if (!apiData) {
                return res.status(401).json({ success: false, message: 'Invalid username or password' });
            }

            // Get user data - check multiple field name variations
            const empCode = apiData.EmpCode || apiData.empcode || apiData.Empcode || '';
            const shortName = apiData.ShortName || apiData.Shortname || apiData.shortname || apiData.empname || '';
            const empPic = apiData.EmpPic || apiData.Emppic || apiData.emppic || '';

            // Validate that API returned actual user data
            if (!empCode && !shortName) {
                return res.status(401).json({ success: false, message: 'Invalid username or password' });
            }

            // Check if user is admin from database
            const pool = getPool();
            const adminCheck = await pool.request()
                .input('username', sql.NVarChar, username.toLowerCase())
                .query('SELECT 1 FROM dbo.Stock_UserRole WHERE LOWER(Username) = @username');

            const isAdmin = adminCheck.recordset.length > 0;
            const role = isAdmin ? 'Staff' : 'User';

            res.json({
                success: true,
                user: {
                    username,
                    role,
                    name: shortName || username,
                    empcode: empCode,
                    empPic: empPic
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

// --- ADMIN USERS MANAGEMENT ---
// Get all admin users
app.get('/api/admin-users', async (req, res) => {
    try {
        const pool = getPool();
        const result = await pool.request().query(`
            SELECT ID, Username, CreatedAt, CreatedBy 
            FROM dbo.Stock_UserRole 
            ORDER BY CreatedAt DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Get admin users error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Add new admin user
app.post('/api/admin-users', async (req, res) => {
    const { username, createdBy } = req.body;

    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    try {
        const pool = getPool();
        await pool.request()
            .input('username', sql.NVarChar, username.toLowerCase())
            .input('createdBy', sql.NVarChar, createdBy || 'SYSTEM')
            .query(`
                INSERT INTO dbo.Stock_UserRole (Username, CreatedBy)
                VALUES (@username, @createdBy)
            `);
        res.json({ success: true, message: 'Admin user added successfully' });
    } catch (err) {
        console.error('Add admin user error:', err);
        if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Username already exists as admin' });
        }
        res.status(500).json({ error: err.message });
    }
});

// Delete admin user
app.delete('/api/admin-users/:username', async (req, res) => {
    const { username } = req.params;

    try {
        const pool = getPool();
        const result = await pool.request()
            .input('username', sql.NVarChar, username.toLowerCase())
            .query('DELETE FROM dbo.Stock_UserRole WHERE LOWER(Username) = @username');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Admin user not found' });
        }

        res.json({ success: true, message: 'Admin user removed successfully' });
    } catch (err) {
        console.error('Delete admin user error:', err);
        res.status(500).json({ error: err.message });
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

// --- VENDORS ---
app.get('/api/vendors', async (req, res) => {
    try {
        const pool = getPool();
        const result = await pool.request().query(`
            SELECT VendorID, VendorName, ContactInfo 
            FROM dbo.Stock_Vendors 
            WHERE IsActive = 1 
            ORDER BY VendorName
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Get Vendors Error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/vendors', async (req, res) => {
    const { VendorName, ContactInfo } = req.body;
    if (!VendorName) {
        return res.status(400).json({ error: 'VendorName is required' });
    }
    try {
        const pool = getPool();
        const result = await pool.request()
            .input('VendorName', sql.NVarChar, VendorName.trim())
            .input('ContactInfo', sql.NVarChar, ContactInfo || '')
            .query(`
                INSERT INTO dbo.Stock_Vendors (VendorName, ContactInfo)
                VALUES (@VendorName, @ContactInfo);
                SELECT SCOPE_IDENTITY() AS VendorID;
            `);
        res.json({ success: true, VendorID: result.recordset[0].VendorID });
    } catch (err) {
        console.error('Create Vendor Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- PRODUCTS ---
app.get('/api/products', async (req, res) => {
    try {
        const pool = getPool();
        const result = await pool.request().query(`
            SELECT ProductID, ProductName, DeviceType, MinStock, MaxStock, CurrentStock, LastPrice, UnitOfMeasure, IsActive, ImageURL
            FROM dbo.Stock_Products
            WHERE IsActive = 1
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Get Products Error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});



// UPDATE Product (Admin only)
app.put('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    const { ProductName, DeviceType, LastPrice, CurrentStock, MinStock, MaxStock } = req.body;

    try {
        const pool = getPool();
        const request = pool.request();

        request.input('ProductID', sql.Int, id)
            .input('ProductName', sql.NVarChar, ProductName)
            .input('DeviceType', sql.VarChar, DeviceType)
            .input('MinStock', sql.Int, MinStock)
            .input('MaxStock', sql.Int, MaxStock || 0)
            .input('CurrentStock', sql.Int, CurrentStock)
            .input('LastPrice', sql.Decimal(18, 2), LastPrice);

        let query = `
            UPDATE dbo.Stock_Products 
            SET ProductName = @ProductName, DeviceType = @DeviceType, 
                MinStock = @MinStock, MaxStock = @MaxStock, CurrentStock = @CurrentStock, LastPrice = @LastPrice
        `;

        if (req.body.ImageURL !== undefined) {
            request.input('ImageURL', sql.NVarChar, req.body.ImageURL);
            query += `, ImageURL = @ImageURL`;
        }

        query += ` WHERE ProductID = @ProductID`;

        await request.query(query);
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

// Manual Import Product
app.post('/api/products/manual-import', async (req, res) => {
    const { ProductName, DeviceType, LastPrice, CurrentStock, MinStock, MaxStock, Remark, UserID } = req.body;

    const qty = parseInt(CurrentStock) || 0;
    const unitCost = parseFloat(LastPrice) || 0;
    const minStock = parseInt(MinStock) || 0;
    const maxStock = parseInt(MaxStock) || 0;

    try {
        const pool = getPool();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // 1. Check if product exists
            let productID;
            const checkRes = await new sql.Request(transaction)
                .input('ProductName', sql.NVarChar, ProductName.trim())
                .query('SELECT ProductID FROM dbo.Stock_Products WHERE ProductName = @ProductName');

            if (checkRes.recordset.length > 0) {
                // Update Existing
                productID = checkRes.recordset[0].ProductID;
                await new sql.Request(transaction)
                    .input('ProductID', sql.Int, productID)
                    .input('Qty', sql.Int, qty)
                    .input('UnitCost', sql.Decimal(18, 2), unitCost)
                    .input('MinStock', sql.Int, minStock)
                    .input('MaxStock', sql.Int, maxStock)
                    .query(`
                        UPDATE dbo.Stock_Products 
                        SET CurrentStock = CurrentStock + @Qty,
                            LastPrice = @UnitCost,
                            MinStock = @MinStock,
                            MaxStock = @MaxStock,
                            IsActive = 1
                        WHERE ProductID = @ProductID
                    `);
            } else {
                // Create New
                const createRes = await new sql.Request(transaction)
                    .input('ProductName', sql.NVarChar, ProductName.trim())
                    .input('DeviceType', sql.VarChar, DeviceType || 'Consumable')
                    .input('CurrentStock', sql.Int, qty)
                    .input('UnitCost', sql.Decimal(18, 2), unitCost)
                    .input('MinStock', sql.Int, minStock)
                    .input('MaxStock', sql.Int, maxStock)
                    .query(`
                        INSERT INTO dbo.Stock_Products (ProductName, DeviceType, CurrentStock, LastPrice, MinStock, MaxStock, IsActive)
                        VALUES (@ProductName, @DeviceType, @CurrentStock, @UnitCost, @MinStock, @MaxStock, 1);
                        SELECT SCOPE_IDENTITY() AS NewID;
                    `);
                productID = createRes.recordset[0].NewID;
            }

            // 2. Log Transaction
            await new sql.Request(transaction)
                .input('ProductID', sql.Int, productID)
                .input('TransType', sql.VarChar, 'IN')
                .input('Qty', sql.Int, qty)
                .input('RefInfo', sql.NVarChar, Remark || 'Manual Import')
                .input('UserID', sql.NVarChar, UserID)
                .query(`
                    INSERT INTO dbo.Stock_Transactions (ProductID, TransType, Qty, RefInfo, UserID)
                    VALUES (@ProductID, @TransType, @Qty, @RefInfo, @UserID)
                `);

            await transaction.commit();
            res.json({ success: true, message: 'Import successful' });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error('Manual Import Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Withdrawal (Outbound)
app.post('/api/products/withdraw', async (req, res) => {
    const { ProductID, Qty, UserID, RefInfo } = req.body;

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
                .input('RefInfo', sql.NVarChar, RefInfo || 'Internal Withdrawal')
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



// GET Invoices
app.get('/api/invoices', async (req, res) => {
    try {
        const pool = getPool();
        const result = await pool.request().query(`
            SELECT *
            FROM dbo.Stock_Invoices
            ORDER BY ReceiveDate DESC
        `);


        const invoices = result.recordset.map(inv => ({
            ...inv,
            Items: JSON.parse(inv.Items || '[]')
        }));

        res.json(invoices);
    } catch (err) {
        console.error('Get Invoices Error:', err);
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
                .input('PR_No', sql.NVarChar, req.body.PR_No || null)
                .input('VendorName', sql.NVarChar, VendorName)
                .input('DueDate', sql.Date, DueDate || null)
                .input('RequestedBy', sql.NVarChar, RequestedBy)
                .input('Section', sql.NVarChar, Section)
                .input('Remark', sql.NVarChar, Remark)
                .query(`
                    INSERT INTO dbo.Stock_PurchaseOrders (PO_ID, PR_No, VendorName, DueDate, RequestedBy, Section, Remark, Status)
                    VALUES (@PO_ID, @PR_No, @VendorName, @DueDate, @RequestedBy, @Section, @Remark, 'Open')
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
            console.error('Create PO Transaction Error:', err);
            res.status(500).json({ error: 'Failed to create PO', details: err.message });
        }
    } catch (err) {
        console.error('Create PO Connection Error:', err);
        res.status(500).json({ error: 'Database connection error' });
    }
});

// Get Stock History for a Product
app.get('/api/stock/history/:id', async (req, res) => {
    try {
        const pool = getPool();
        const result = await pool.request()
            .input('ProductID', sql.Int, req.params.id)
            .query(`
                SELECT 
                    t.TransDate,
                    t.Qty,
                    t.TransType,
                    t.RefInfo,
                    t.UserID
                FROM dbo.Stock_Transactions t
                WHERE t.ProductID = @ProductID
                ORDER BY t.TransDate DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Get History Error:', err);
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
    console.log('Receive Payload:', JSON.stringify(req.body, null, 2));

    try {
        const pool = getPool();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // 1. Create Invoice Record
            const newInvoices = await new sql.Request(transaction)
                .input('InvoiceNo', sql.NVarChar, InvoiceNo)
                .input('PO_ID', sql.NVarChar, PO_ID)
                .input('ReceivedBy', sql.NVarChar, UserID)
                .query(`
                    INSERT INTO dbo.Stock_Invoices (InvoiceNo, PO_ID, ReceivedBy)
                    VALUES (@InvoiceNo, @PO_ID, @ReceivedBy);
                    SELECT SCOPE_IDENTITY() AS InvoiceID;
                `);

            const invoiceID = newInvoices.recordset[0].InvoiceID;

            // 2. Process Each Item
            for (const item of ItemsReceived) {
                const qty = Number(item.Qty) || 0;
                if (qty <= 0) continue;

                let finalProductID = item.ProductID; // This might be null for manual items

                // 2a. Handle Manual Items (No ProductID initially)
                if (item.DetailID) {
                    // Check DB for Detail Info
                    const detRes = await new sql.Request(transaction)
                        .input('DetailID', sql.Int, item.DetailID)
                        .query('SELECT ItemName, UnitCost, ProductID FROM dbo.Stock_PODetails WHERE DetailID = @DetailID');

                    const detail = detRes.recordset[0];

                    if (detail) {
                        // If DB already has ProductID, use it (override client)
                        if (detail.ProductID) {
                            finalProductID = detail.ProductID;
                        }
                        // If NO ProductID, try to resolve by Name or Create New
                        else if (!finalProductID && detail.ItemName) {
                            // Try find by name in Products table
                            const prodRes = await new sql.Request(transaction)
                                .input('ProductName', sql.NVarChar, detail.ItemName.trim())
                                .query('SELECT ProductID FROM dbo.Stock_Products WHERE ProductName = @ProductName');

                            if (prodRes.recordset.length > 0) {
                                finalProductID = prodRes.recordset[0].ProductID;
                            } else {
                                // Create New Product
                                // First ensure 'Stock' type exists to prevent FK violation
                                await new sql.Request(transaction).query(`
                                        IF NOT EXISTS (SELECT 1 FROM dbo.Stock_DeviceTypes WHERE TypeId = 'Consumable')
                                        BEGIN
                                            INSERT INTO dbo.Stock_DeviceTypes (TypeId, Label) VALUES ('Consumable', 'Consumable Stock')
                                        END
                                    `);

                                const createRes = await new sql.Request(transaction)
                                    .input('ProductName', sql.NVarChar, detail.ItemName.trim())
                                    .input('Qty', sql.Int, qty) // Initial Stock
                                    .input('UnitCost', sql.Decimal(18, 2), detail?.UnitCost || 0)
                                    .query(`
                                        INSERT INTO dbo.Stock_Products (ProductName, DeviceType, CurrentStock, LastPrice, MinStock, IsActive)
                                        VALUES (@ProductName, 'Consumable', 0, @UnitCost, 0, 1); -- Start 0 stock, we add below
                                        SELECT SCOPE_IDENTITY() AS NewID;
                                    `);
                                finalProductID = createRes.recordset[0].NewID;
                            }

                            // Link PO Detail to this new/found ProductID
                            await new sql.Request(transaction)
                                .input('DetailID', sql.Int, item.DetailID)
                                .input('ProductID', sql.Int, finalProductID)
                                .query('UPDATE dbo.Stock_PODetails SET ProductID = @ProductID WHERE DetailID = @DetailID');
                        }
                    }
                }

                // 2b. Validate Final Product ID
                // If we absolutely cannot determine a ProductID, we cannot insert into Stock_Transactions (FK constraint).
                // But for manual items without 'ItemName' in DB, this is an edge case.

                // 3. Update Stock Level (only if we have a valid ProductID)
                if (finalProductID) {
                    await new sql.Request(transaction)
                        .input('ProductID', sql.Int, finalProductID)
                        .input('Qty', sql.Int, qty)
                        .query('UPDATE dbo.Stock_Products SET CurrentStock = CurrentStock + @Qty WHERE ProductID = @ProductID');


                }

                // 4. Update PO Detail 'QtyReceived'
                if (item.DetailID) {
                    await new sql.Request(transaction)
                        .input('DetailID', sql.Int, item.DetailID)
                        .input('Qty', sql.Int, qty)
                        .query('UPDATE dbo.Stock_PODetails SET QtyReceived = QtyReceived + @Qty WHERE DetailID = @DetailID');
                } else if (item.ProductID) {
                    // Fallback to update via ProductID and PO_ID if DetailID missing (should unlikely happen with new frontend)
                    await new sql.Request(transaction)
                        .input('PO_ID', sql.NVarChar, PO_ID)
                        .input('ProductID', sql.Int, item.ProductID)
                        .input('Qty', sql.Int, qty)
                        .query('UPDATE dbo.Stock_PODetails SET QtyReceived = QtyReceived + @Qty WHERE PO_ID = @PO_ID AND ProductID = @ProductID');
                }

                // 5. Log Transaction (only if finalProductID exists)
                if (finalProductID) {
                    await new sql.Request(transaction)
                        .input('ProductID', sql.Int, finalProductID)
                        .input('TransType', sql.VarChar, 'IN')
                        .input('Qty', sql.Int, qty)
                        .input('RefInfo', sql.NVarChar, `Invoice: ${InvoiceNo} (PO: ${PO_ID})`)
                        .input('UserID', sql.NVarChar, UserID)
                        .query(`
                        INSERT INTO dbo.Stock_Transactions (ProductID, TransType, Qty, RefInfo, UserID)
                        VALUES (@ProductID, @TransType, @Qty, @RefInfo, @UserID)
                    `);
                }
            }

            // 6. Update PO Status
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
            console.error('Transaction Error:', err);
            await transaction.rollback();
            res.status(500).json({ error: 'Transaction failed', details: err.message });
        }
    } catch (err) {
        console.error('Receive Error:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
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

// --- FORECAST / LOW STOCK REPORT ---
app.get('/api/forecast', async (req, res) => {
    try {
        const pool = getPool();
        const result = await pool.request().query(`
            SELECT 
                ProductID, ProductName, DeviceType, MinStock, MaxStock, CurrentStock, LastPrice,
                CASE WHEN CurrentStock <= MinStock THEN ISNULL(MaxStock, MinStock) - CurrentStock ELSE 0 END as OrderQty,
                CASE WHEN CurrentStock <= MinStock THEN (ISNULL(MaxStock, MinStock) - CurrentStock) * ISNULL(LastPrice, 0) ELSE 0 END as EstimatedCost
            FROM dbo.Stock_Products
            WHERE IsActive = 1 AND CurrentStock <= MinStock
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
                case 'lowstock':
                    const lowStockResult = await pool.request().query(`
                        SELECT ProductID, ProductName, DeviceType, MinStock, MaxStock, CurrentStock, LastPrice,
                            ISNULL(MaxStock, MinStock) - CurrentStock as OrderQty,
                            (ISNULL(MaxStock, MinStock) - CurrentStock) * ISNULL(LastPrice, 0) as EstimatedCost
                        FROM dbo.Stock_Products
                        WHERE IsActive = 1 AND CurrentStock <= MinStock
                    `);
                    data = lowStockResult.recordset;
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

// --- SERVER STARTUP & SCHEMA CHECK ---
const startServer = async () => {
    try {
        await connectDB();

        // Auto-Migration: Ensure ImageURL and MaxStock columns exist
        try {
            const pool = getPool();
            await pool.request().query(`
                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Stock_Products' AND COLUMN_NAME = 'ImageURL')
                BEGIN
                    ALTER TABLE dbo.Stock_Products ADD ImageURL NVARCHAR(MAX);
                END
            `);
            await pool.request().query(`
                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Stock_Products' AND COLUMN_NAME = 'MaxStock')
                BEGIN
                    ALTER TABLE dbo.Stock_Products ADD MaxStock INT DEFAULT 0;
                END
            `);


            console.log('✅ Schema Check: ImageURL and MaxStock columns verified');

            // Seed Device Types (Ensure new types exist)
            const typesToSeed = [
                { id: 'Asset', label: 'General Asset' },
                { id: 'Consumable', label: 'Consumable Stock' },
                { id: 'Monitor', label: 'Monitor' },
                { id: 'Network', label: 'Network Device' },
                { id: 'Peripheral', label: 'Peripheral Devices' },
                { id: 'Storage', label: 'Storage Stock' }
            ];

            for (const t of typesToSeed) {
                await pool.request().query(`
                     IF NOT EXISTS (SELECT 1 FROM dbo.Stock_DeviceTypes WHERE TypeId = '${t.id}')
                     INSERT INTO dbo.Stock_DeviceTypes (TypeId, Label) VALUES ('${t.id}', '${t.label}')
                 `);
            }
            console.log('✅ Device Types verified/seeded');

            // Ensure Stock_Vendors table exists and seed vendors
            await pool.request().query(`
                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Stock_Vendors')
                BEGIN
                    CREATE TABLE dbo.Stock_Vendors (
                        VendorID INT IDENTITY(1,1) PRIMARY KEY,
                        VendorName NVARCHAR(200) NOT NULL UNIQUE,
                        ContactInfo NVARCHAR(500),
                        IsActive BIT DEFAULT 1,
                        CreatedAt DATETIME DEFAULT GETDATE()
                    );
                END
            `);

            const vendorsToSeed = ['SAMAPHAN TECHNOLOGIES', 'NITHIKASEM TELECOM'];
            for (const v of vendorsToSeed) {
                await pool.request().query(`
                     IF NOT EXISTS (SELECT 1 FROM dbo.Stock_Vendors WHERE VendorName = '${v}')
                     INSERT INTO dbo.Stock_Vendors (VendorName) VALUES ('${v}')
                 `);
            }
            console.log('✅ Vendors verified/seeded');

        } catch (err) {
            console.warn('⚠️ Schema Check Warning:', err.message);
        }

        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log('✅ Connected to SQL Server database');
        });
    } catch (err) {
        console.error('❌ Failed to start server:', err.message);
        process.exit(1);
    }
};

startServer();


