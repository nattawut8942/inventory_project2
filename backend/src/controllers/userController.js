import { sql, getPool } from '../config/db.js';

// Get all admin users
export const getAdminUsers = async (req, res) => {
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
};

// Add new admin user
export const addAdminUser = async (req, res) => {
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
};

// Delete admin user
export const deleteAdminUser = async (req, res) => {
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
};
