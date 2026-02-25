import { sql, getPool } from '../config/db.js';

// GET Vendors
export const getVendors = async (req, res) => {
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
};

// CREATE Vendor
export const createVendor = async (req, res) => {
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
};

// UPDATE Vendor
export const updateVendor = async (req, res) => {
    const { id } = req.params;
    const { VendorName, ContactInfo } = req.body;
    try {
        const pool = getPool();
        await pool.request()
            .input('VendorID', sql.Int, id)
            .input('VendorName', sql.NVarChar, VendorName)
            .input('ContactInfo', sql.NVarChar, ContactInfo)
            .query(`
                UPDATE dbo.Stock_Vendors 
                SET VendorName = @VendorName, ContactInfo = @ContactInfo 
                WHERE VendorID = @VendorID
            `);
        res.json({ success: true });
    } catch (err) {
        console.error('Update Vendor Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// DELETE Vendor (Soft Delete)
export const deleteVendor = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = getPool();
        await pool.request()
            .input('VendorID', sql.Int, id)
            .query('UPDATE dbo.Stock_Vendors SET IsActive = 0 WHERE VendorID = @VendorID');
        res.json({ success: true });
    } catch (err) {
        console.error('Delete Vendor Error:', err);
        res.status(500).json({ error: err.message });
    }
};
