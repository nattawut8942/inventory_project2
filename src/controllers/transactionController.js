import { sql, getPool } from '../config/db.js';

// Helper for Thai Date
const getThaiDate = () => new Date();

// Get Stock History for a Product
export const getStockHistory = async (req, res) => {
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
                    t.UserID,
                    (
                        SELECT TOP 1 po.BudgetNo 
                        FROM dbo.Stock_Invoices inv
                        JOIN dbo.Stock_PurchaseOrders po ON inv.PO_ID = po.PO_ID
                        WHERE t.RefInfo LIKE '%Invoice: ' + inv.InvoiceNo + '%'
                    ) AS BudgetNo
                FROM dbo.Stock_Transactions t
                WHERE t.ProductID = @ProductID
                ORDER BY t.TransDate DESC
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Get History Error:', err);
        res.status(500).json({ error: 'Database error' });
    }
};

// GET Transactions
export const getTransactions = async (req, res) => {
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
            request.input('TransType', sql.VarChar, filter);
            query += ` AND t.TransType = @TransType`;
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
};

// GET Invoices
export const getInvoices = async (req, res) => {
    try {
        const pool = getPool();
        const result = await pool.request().query(`
            SELECT i.InvoiceID, i.InvoiceNo, i.PO_ID, i.ReceiveDate, i.ReceivedBy, po.BudgetNo, po.VendorName, po.RequestedBy
            FROM dbo.Stock_Invoices i
            LEFT JOIN dbo.Stock_PurchaseOrders po ON i.PO_ID = po.PO_ID
            ORDER BY i.ReceiveDate DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Get Invoices Error:', err);
        res.status(500).json({ error: 'Database error' });
    }
};

// Receive Goods (Inbound from PO)
export const receiveGoods = async (req, res) => {
    const { PO_ID, InvoiceNo, ItemsReceived, UserID } = req.body;
    console.log('Receive Payload:', JSON.stringify(req.body, null, 2));

    try {
        const pool = getPool();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // 1. Create Invoice Record
            const now = getThaiDate();
            const newInvoices = await new sql.Request(transaction)
                .input('InvoiceNo', sql.NVarChar, InvoiceNo)
                .input('PO_ID', sql.NVarChar, PO_ID)
                .input('ReceiveDate', sql.DateTime, now)
                .input('ReceivedBy', sql.NVarChar, UserID)
                .query(`
                    INSERT INTO dbo.Stock_Invoices (InvoiceNo, PO_ID, ReceiveDate, ReceivedBy)
                    VALUES (@InvoiceNo, @PO_ID, @ReceiveDate, @ReceivedBy);
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
                    const detRes = await new sql.Request(transaction)
                        .input('DetailID', sql.Int, item.DetailID)
                        .query('SELECT ItemName, UnitCost, ProductID FROM dbo.Stock_PODetails WHERE DetailID = @DetailID');

                    const detail = detRes.recordset[0];

                    if (detail) {
                        if (detail.ProductID) {
                            finalProductID = detail.ProductID;
                        }
                        else if (!finalProductID && detail.ItemName) {
                            // Try find by name in Products table
                            const prodRes = await new sql.Request(transaction)
                                .input('ProductName', sql.NVarChar, detail.ItemName.trim())
                                .query('SELECT ProductID FROM dbo.Stock_Products WHERE ProductName = @ProductName');

                            if (prodRes.recordset.length > 0) {
                                finalProductID = prodRes.recordset[0].ProductID;
                            } else {
                                // Create New Product
                                await new sql.Request(transaction).query(`
                                        IF NOT EXISTS (SELECT 1 FROM dbo.Stock_DeviceTypes WHERE TypeId = 'Consumable')
                                        BEGIN
                                            INSERT INTO dbo.Stock_DeviceTypes (TypeId, Label) VALUES ('Consumable', 'Consumable Stock')
                                        END
                                    `);

                                const createRes = await new sql.Request(transaction)
                                    .input('ProductName', sql.NVarChar, detail.ItemName.trim())
                                    .input('Qty', sql.Int, qty)
                                    .input('UnitCost', sql.Decimal(18, 2), detail?.UnitCost || 0)
                                    .query(`
                                        INSERT INTO dbo.Stock_Products (ProductName, DeviceType, CurrentStock, LastPrice, MinStock, IsActive)
                                        VALUES (@ProductName, 'Consumable', 0, @UnitCost, 0, 1);
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

                // 3. Update Stock Level
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
                    await new sql.Request(transaction)
                        .input('PO_ID', sql.NVarChar, PO_ID)
                        .input('ProductID', sql.Int, item.ProductID)
                        .input('Qty', sql.Int, qty)
                        .query('UPDATE dbo.Stock_PODetails SET QtyReceived = QtyReceived + @Qty WHERE PO_ID = @PO_ID AND ProductID = @ProductID');
                }

                // 5. Log Transaction
                if (finalProductID) {
                    const now = getThaiDate();
                    await new sql.Request(transaction)
                        .input('ProductID', sql.Int, finalProductID)
                        .input('TransType', sql.VarChar, 'IN')
                        .input('Qty', sql.Int, qty)
                        .input('RefInfo', sql.NVarChar, `Invoice: ${InvoiceNo} (PO: ${PO_ID})`)
                        .input('UserID', sql.NVarChar, UserID)
                        .input('TransDate', sql.DateTime, now)
                        .query(`
                        INSERT INTO dbo.Stock_Transactions (ProductID, TransType, Qty, RefInfo, UserID, TransDate)
                        VALUES (@ProductID, @TransType, @Qty, @RefInfo, @UserID, @TransDate)
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
};
