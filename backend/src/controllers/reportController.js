import { sql, getPool } from '../config/db.js';
import * as XLSX from 'xlsx';
import { sendDailyReport } from '../services/emailService.js';

// EXPORT REPORT
export const exportReport = async (req, res) => {
    const { types, startDate, endDate } = req.query;

    try {
        const pool = getPool();
        const dataTypes = types ? types.split(',') : ['products'];
        const workbook = XLSX.utils.book_new();

        for (const dataType of dataTypes) {
            let data = [];
            let sheetName = dataType;

            // ... (Logic from server.js lines 1112-1382) -> Copied below
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
                               po.VendorName, po.RequestedBy, po.BudgetNo
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
                        'Budget No.': row.BudgetNo || '-',
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
                               po.RequestedBy, po.Section, po.Status, po.Remark, po.BudgetNo,
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
                        'เลขที่ PO': row.PO_ID,
                        'เลขที่ PR': row.PR_No || '-',
                        'Budget No.': row.BudgetNo || '-',
                        'Vendor': row.VendorName || '-',
                        'วันที่สั่ง': row.RequestDate ? new Date(row.RequestDate).toLocaleDateString('th-TH') : '-',
                        'กำหนดส่ง': row.DueDate ? new Date(row.DueDate).toLocaleDateString('th-TH') : '-',
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
                const ws = XLSX.utils.json_to_sheet(data);
                const colWidths = Object.keys(data[0]).map(key => ({
                    wch: Math.max(key.length, ...data.map(row => String(row[key] || '').length)) + 2
                }));
                ws['!cols'] = colWidths;
                XLSX.utils.book_append_sheet(workbook, ws, sheetName.substring(0, 31));
            }
        }

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
};

// TEST EMAIL
export const testEmail = async (req, res) => {
    try {
        const result = await sendDailyReport();
        if (result.success) {
            res.json({ success: true, message: 'Email sent successfully', messageId: result.messageId });
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
