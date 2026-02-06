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

// --- AUDIT LOG HELPER ---
async function logAudit(pool, tableName, recordId, action, oldVal, newVal, user, ip = null) {
    console.log(`[DEBUG] logAudit called: ${tableName}, ID: ${recordId}, Action: ${action}, User: ${user}`);
    try {
        const oldStr = oldVal ? JSON.stringify(oldVal) : null;
        const newStr = newVal ? JSON.stringify(newVal) : null;

        // Don't log if no changes (for updates)
        if (action === 'UPDATE' && oldStr === newStr) {
            console.log('[DEBUG] logAudit skipped: No changes detected');
            return;
        }

        const request = pool.request();
        // Log parameters for debugging
        // console.log('Audit Params:', { tableName, recordId, action, user, ip });

        await request
            .input('TableName', sql.NVarChar, tableName)
            .input('RecordID', sql.VarChar, String(recordId))
            .input('ActionType', sql.NVarChar, action)
            .input('OldValues', sql.NVarChar, oldStr)
            .input('NewValues', sql.NVarChar, newStr)
            .input('ChangedBy', sql.NVarChar, user || 'System')
            .input('IPAddress', sql.NVarChar, ip)
            .query(`
                INSERT INTO dbo.Stock_AuditLogs (TableName, RecordID, ActionType, OldValues, NewValues, ChangedBy, IPAddress)
                VALUES (@TableName, @RecordID, @ActionType, @OldValues, @NewValues, @ChangedBy, @IPAddress)
            `);
        console.log('[DEBUG] logAudit success');
    } catch (err) {
        console.error('[ERROR] Audit Log Failed:', err);
        console.error('Failed Params:', { tableName, recordId, action, user });
    }
}


// --- AUDIT LOGS ENDPOINT ---


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

        // Fetch Old Data
        const oldDataRes = await pool.request()
            .input('ProductID', sql.Int, id)
            .query('SELECT * FROM dbo.Stock_Products WHERE ProductID = @ProductID');
        const oldData = oldDataRes.recordset[0];

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

        // Fetch Old Data
        const oldDataRes = await pool.request()
            .input('ProductID', sql.Int, id)
            .query('SELECT * FROM dbo.Stock_Products WHERE ProductID = @ProductID');
        const oldData = oldDataRes.recordset[0];

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
                    // Get current stock for audit (optional but good for consistency)
                    const stockCheck = await new sql.Request(transaction)
                        .input('ProductID', sql.Int, finalProductID)
                        .query('SELECT CurrentStock FROM dbo.Stock_Products WHERE ProductID = @ProductID');
                    const currentStock = stockCheck.recordset[0]?.CurrentStock || 0;

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

// --- EXPORT REPORT (Enhanced with Thai columns) ---
app.get('/api/report/export', async (req, res) => {
    const { types, startDate, endDate } = req.query;

    try {
        const pool = getPool();
        const dataTypes = types ? types.split(',') : ['products'];
        const workbook = XLSX.utils.book_new();

        for (const dataType of dataTypes) {
            let data = [];
            let sheetName = dataType;

            switch (dataType) {
                case 'products': {
                    sheetName = '📦 สินค้าทั้งหมด';
                    const prodResult = await pool.request().query(`
                        SELECT 
                            p.ProductID, p.ProductName, p.DeviceType, 
                            p.CurrentStock, p.MinStock, p.MaxStock, 
                            p.LastPrice, p.IsActive
                        FROM dbo.Stock_Products p
                        WHERE p.IsActive = 1
                        ORDER BY p.DeviceType, p.ProductName
                    `);
                    data = prodResult.recordset.map(row => ({
                        'รหัสสินค้า': row.ProductID,
                        'ชื่อสินค้า': row.ProductName,
                        'ประเภท': row.DeviceType,
                        'คงเหลือ': row.CurrentStock,
                        'ต่ำสุด (Min)': row.MinStock,
                        'สูงสุด (Max)': row.MaxStock || '-',
                        'ราคา/หน่วย (฿)': row.LastPrice || 0,
                        'มูลค่ารวม (฿)': (row.CurrentStock || 0) * (row.LastPrice || 0),
                        'สถานะ': row.CurrentStock <= row.MinStock ? '⚠️ ต่ำ' : '✅ ปกติ'
                    }));
                    break;
                }
                case 'lowstock': {
                    sheetName = '⚠️ สินค้าต่ำกว่า Min';
                    const lowStockResult = await pool.request().query(`
                        SELECT 
                            ProductID, ProductName, DeviceType, 
                            MinStock, MaxStock, CurrentStock, LastPrice
                        FROM dbo.Stock_Products
                        WHERE IsActive = 1 AND CurrentStock <= MinStock
                        ORDER BY (ISNULL(MaxStock, MinStock) - CurrentStock) * ISNULL(LastPrice, 0) DESC
                    `);
                    data = lowStockResult.recordset.map(row => {
                        const orderQty = (row.MaxStock || row.MinStock) - row.CurrentStock;
                        const estimatedCost = orderQty * (row.LastPrice || 0);
                        return {
                            'รหัสสินค้า': row.ProductID,
                            'ชื่อสินค้า': row.ProductName,
                            'ประเภท': row.DeviceType,
                            'คงเหลือ': row.CurrentStock,
                            'ต่ำสุด (Min)': row.MinStock,
                            'สูงสุด (Max)': row.MaxStock || '-',
                            'ต้องสั่งเพิ่ม': orderQty > 0 ? orderQty : 0,
                            'ราคา/หน่วย (฿)': row.LastPrice || 0,
                            'มูลค่าที่ต้องสั่ง (฿)': estimatedCost > 0 ? estimatedCost : 0
                        };
                    });
                    break;
                }
                case 'transactions': {
                    sheetName = '📊 ประวัติรับ-เบิก';
                    const transRequest = pool.request();
                    if (startDate) transRequest.input('startDate', sql.DateTime, new Date(startDate));
                    if (endDate) transRequest.input('endDate', sql.DateTime, new Date(endDate));

                    let transQuery = `
                        SELECT t.TransID, t.TransDate, t.TransType, t.Qty, t.RefInfo, t.UserID,
                               p.ProductName, p.DeviceType, p.LastPrice
                        FROM dbo.Stock_Transactions t 
                        LEFT JOIN dbo.Stock_Products p ON t.ProductID = p.ProductID 
                        WHERE 1=1
                    `;
                    if (startDate) transQuery += ' AND t.TransDate >= @startDate';
                    if (endDate) transQuery += ' AND t.TransDate <= @endDate';
                    transQuery += ' ORDER BY t.TransDate DESC';

                    const transResult = await transRequest.query(transQuery);
                    data = transResult.recordset.map(row => ({
                        'เลขที่': row.TransID,
                        'วันที่': row.TransDate ? new Date(row.TransDate).toLocaleDateString('th-TH') : '-',
                        'เวลา': row.TransDate ? new Date(row.TransDate).toLocaleTimeString('th-TH') : '-',
                        'ชื่อสินค้า': row.ProductName || '-',
                        'ประเภท': row.DeviceType || '-',
                        'ประเภทรายการ': row.TransType === 'IN' ? 'รับเข้า' : row.TransType === 'OUT' ? 'เบิกออก' : row.TransType,
                        'จำนวน': row.Qty,
                        'ราคา/หน่วย (฿)': row.LastPrice || 0,
                        'มูลค่า (฿)': Math.abs(row.Qty) * (row.LastPrice || 0),
                        'ผู้ทำรายการ': row.UserID || '-',
                        'อ้างอิง': row.RefInfo || '-'
                    }));
                    break;
                }
                case 'invoices': {
                    sheetName = '🧾 ข้อมูล Invoice';
                    const invRequest = pool.request();
                    if (startDate) invRequest.input('startDate', sql.DateTime, new Date(startDate));
                    if (endDate) invRequest.input('endDate', sql.DateTime, new Date(endDate));

                    let invQuery = `
                        SELECT i.InvoiceID, i.InvoiceNo, i.PO_ID, i.ReceiveDate, i.ReceivedBy,
                               po.VendorName, po.RequestedBy
                        FROM dbo.Stock_Invoices i
                        LEFT JOIN dbo.Stock_PurchaseOrders po ON i.PO_ID = po.PO_ID
                        WHERE 1=1
                    `;
                    if (startDate) invQuery += ' AND i.ReceiveDate >= @startDate';
                    if (endDate) invQuery += ' AND i.ReceiveDate <= @endDate';
                    invQuery += ' ORDER BY i.ReceiveDate DESC';

                    const invResult = await invRequest.query(invQuery);
                    data = invResult.recordset.map(row => ({
                        'เลข Invoice': row.InvoiceNo || '-',
                        'วันที่รับ': row.ReceiveDate ? new Date(row.ReceiveDate).toLocaleDateString('th-TH') : '-',
                        'เลข PO': row.PO_ID || '-',
                        'Vendor': row.VendorName || '-',
                        'ผู้สั่งซื้อ': row.RequestedBy || '-',
                        'ผู้รับ': row.ReceivedBy || '-'
                    }));
                    break;
                }
                case 'pos': {
                    sheetName = '📋 ใบสั่งซื้อ (PO)';
                    const poRequest = pool.request();
                    if (startDate) poRequest.input('startDate', sql.DateTime, new Date(startDate));
                    if (endDate) poRequest.input('endDate', sql.DateTime, new Date(endDate));

                    let poQuery = `
                        SELECT po.PO_ID, po.PR_No, po.VendorName, po.RequestDate, po.DueDate,
                               po.RequestedBy, po.Section, po.Status, po.Remark,
                               (SELECT SUM(d.QtyOrdered * ISNULL(d.UnitCost, 0)) 
                                FROM dbo.Stock_PODetails d 
                                WHERE d.PO_ID = po.PO_ID) as TotalAmount
                        FROM dbo.Stock_PurchaseOrders po
                        WHERE 1=1
                    `;
                    if (startDate) poQuery += ' AND po.RequestDate >= @startDate';
                    if (endDate) poQuery += ' AND po.RequestDate <= @endDate';
                    poQuery += ' ORDER BY po.RequestDate DESC';

                    const poResult = await poRequest.query(poQuery);
                    data = poResult.recordset.map(row => ({
                        'เลข PO': row.PO_ID,
                        'เลข PR': row.PR_No || '-',
                        'วันที่สร้าง': row.RequestDate ? new Date(row.RequestDate).toLocaleDateString('th-TH') : '-',
                        'วันกำหนดส่ง': row.DueDate ? new Date(row.DueDate).toLocaleDateString('th-TH') : '-',
                        'Vendor': row.VendorName || '-',
                        'สถานะ': row.Status === 'Open' ? 'รอดำเนินการ' :
                            row.Status === 'Partial' ? 'รับบางส่วน' :
                                row.Status === 'Completed' ? 'เสร็จสิ้น' : row.Status,
                        'มูลค่ารวม (฿)': row.TotalAmount || 0,
                        'ผู้สร้าง': row.RequestedBy || '-',
                        'แผนก': row.Section || '-',
                        'หมายเหตุ': row.Remark || '-'
                    }));
                    break;
                }
                case 'slowmoving': {
                    sheetName = '🐢 สินค้าค้างสต็อค';
                    // Get products with no OUT transactions in last 3 months
                    const slowResult = await pool.request().query(`
                        SELECT p.ProductID, p.ProductName, p.DeviceType, p.CurrentStock, p.LastPrice,
                               p.CurrentStock * ISNULL(p.LastPrice, 0) as StockValue,
                               (SELECT MAX(t.TransDate) FROM dbo.Stock_Transactions t 
                                WHERE t.ProductID = p.ProductID AND t.TransType = 'OUT') as LastWithdraw
                        FROM dbo.Stock_Products p
                        WHERE p.IsActive = 1 AND p.CurrentStock > 0
                        AND (NOT EXISTS (
                            SELECT 1 FROM dbo.Stock_Transactions t 
                            WHERE t.ProductID = p.ProductID 
                            AND t.TransType = 'OUT' 
                            AND t.TransDate >= DATEADD(month, -3, GETDATE())
                        ))
                        ORDER BY p.CurrentStock * ISNULL(p.LastPrice, 0) DESC
                    `);
                    data = slowResult.recordset.map(row => ({
                        'รหัสสินค้า': row.ProductID,
                        'ชื่อสินค้า': row.ProductName,
                        'ประเภท': row.DeviceType || '-',
                        'คงเหลือ': row.CurrentStock,
                        'ราคา/หน่วย (฿)': row.LastPrice || 0,
                        'มูลค่าค้างสต็อค (฿)': row.StockValue || 0,
                        'เบิกล่าสุด': row.LastWithdraw ? new Date(row.LastWithdraw).toLocaleDateString('th-TH') : 'ไม่เคยเบิก'
                    }));
                    break;
                }
                case 'topwithdrawn': {
                    sheetName = '🔥 สินค้าเบิกมากสุด';
                    const topRequest = pool.request();
                    if (startDate) topRequest.input('startDate', sql.DateTime, new Date(startDate));
                    if (endDate) topRequest.input('endDate', sql.DateTime, new Date(endDate));

                    let topQuery = `
                        SELECT p.ProductID, p.ProductName, p.DeviceType,
                               SUM(ABS(t.Qty)) as TotalQty,
                               COUNT(*) as TransactionCount,
                               SUM(ABS(t.Qty) * ISNULL(p.LastPrice, 0)) as TotalValue
                        FROM dbo.Stock_Transactions t
                        JOIN dbo.Stock_Products p ON t.ProductID = p.ProductID
                        WHERE t.TransType = 'OUT'
                    `;
                    if (startDate) topQuery += ' AND t.TransDate >= @startDate';
                    if (endDate) topQuery += ' AND t.TransDate <= @endDate';
                    topQuery += ' GROUP BY p.ProductID, p.ProductName, p.DeviceType ORDER BY TotalQty DESC';

                    const topResult = await topRequest.query(topQuery);
                    data = topResult.recordset.map((row, idx) => ({
                        'อันดับ': idx + 1,
                        'รหัสสินค้า': row.ProductID,
                        'ชื่อสินค้า': row.ProductName,
                        'ประเภท': row.DeviceType || '-',
                        'จำนวนเบิก (รวม)': row.TotalQty,
                        'จำนวนครั้ง': row.TransactionCount,
                        'มูลค่าเบิก (฿)': row.TotalValue || 0
                    }));
                    break;
                }
                case 'topconsumers': {
                    sheetName = '👤 ผู้เบิกมากสุด';
                    const consRequest = pool.request();
                    if (startDate) consRequest.input('startDate', sql.DateTime, new Date(startDate));
                    if (endDate) consRequest.input('endDate', sql.DateTime, new Date(endDate));

                    let consQuery = `
                        SELECT t.UserID,
                               SUM(ABS(t.Qty)) as TotalQty,
                               COUNT(*) as TransactionCount,
                               COUNT(DISTINCT t.ProductID) as UniqueProducts
                        FROM dbo.Stock_Transactions t
                        WHERE t.TransType = 'OUT' AND t.UserID IS NOT NULL
                    `;
                    if (startDate) consQuery += ' AND t.TransDate >= @startDate';
                    if (endDate) consQuery += ' AND t.TransDate <= @endDate';
                    consQuery += ' GROUP BY t.UserID ORDER BY TotalQty DESC';

                    const consResult = await consRequest.query(consQuery);
                    data = consResult.recordset.map((row, idx) => ({
                        'อันดับ': idx + 1,
                        'ผู้เบิก': row.UserID,
                        'จำนวนเบิก (รวม)': row.TotalQty,
                        'จำนวนครั้ง': row.TransactionCount,
                        'สินค้าที่เบิก (ชนิด)': row.UniqueProducts
                    }));
                    break;
                }
                case 'bycategory': {
                    sheetName = '📂 เบิกตามประเภท';
                    const catRequest = pool.request();
                    if (startDate) catRequest.input('startDate', sql.DateTime, new Date(startDate));
                    if (endDate) catRequest.input('endDate', sql.DateTime, new Date(endDate));

                    let catQuery = `
                        SELECT p.DeviceType,
                               SUM(ABS(t.Qty)) as TotalQty,
                               COUNT(*) as TransactionCount,
                               COUNT(DISTINCT p.ProductID) as UniqueProducts,
                               SUM(ABS(t.Qty) * ISNULL(p.LastPrice, 0)) as TotalValue
                        FROM dbo.Stock_Transactions t
                        JOIN dbo.Stock_Products p ON t.ProductID = p.ProductID
                        WHERE t.TransType = 'OUT'
                    `;
                    if (startDate) catQuery += ' AND t.TransDate >= @startDate';
                    if (endDate) catQuery += ' AND t.TransDate <= @endDate';
                    catQuery += ' GROUP BY p.DeviceType ORDER BY TotalQty DESC';

                    const catResult = await catRequest.query(catQuery);
                    data = catResult.recordset.map((row, idx) => ({
                        'อันดับ': idx + 1,
                        'ประเภท': row.DeviceType || 'ไม่ระบุ',
                        'จำนวนเบิก (รวม)': row.TotalQty,
                        'จำนวนครั้ง': row.TransactionCount,
                        'สินค้าที่เบิก (ชนิด)': row.UniqueProducts,
                        'มูลค่าเบิก (฿)': row.TotalValue || 0
                    }));
                    break;
                }
            }

            if (data.length > 0) {
                // Create worksheet with proper column widths
                const ws = XLSX.utils.json_to_sheet(data);

                // Auto-fit column widths
                const colWidths = Object.keys(data[0]).map(key => ({
                    wch: Math.max(key.length, ...data.map(row => String(row[key] || '').length)) + 2
                }));
                ws['!cols'] = colWidths;

                XLSX.utils.book_append_sheet(workbook, ws, sheetName.substring(0, 31)); // Excel sheet name limit
            }
        }

        // Add summary sheet if multiple types exported
        if (dataTypes.length > 1) {
            const summaryData = [{
                'รายงาน': 'Export Report',
                'วันที่สร้าง': new Date().toLocaleString('th-TH'),
                'ช่วงวันที่': startDate && endDate ? `${startDate} - ${endDate}` : 'ทั้งหมด',
                'ประเภทที่ Export': dataTypes.join(', ')
            }];
            const summaryWs = XLSX.utils.json_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(workbook, summaryWs, '📝 สรุป');
        }

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=stock_report_${new Date().toISOString().split('T')[0]}.xlsx`);
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
            console.log('✅ Vendors verified/seeded');

        } catch (err) {
            console.warn('⚠️ Schema Check Warning:', err.message);
        }

        // --- AUDIT LOGS ---


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


