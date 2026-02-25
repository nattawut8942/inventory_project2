import { sql, getPool } from '../config/db.js';

export const getLocations = async (req, res) => {
    try {
        const pool = getPool();
        const result = await pool.request().query('SELECT * FROM dbo.Stock_Locations ORDER BY Name ASC');
        res.json(result.recordset);
    } catch (err) {
        console.error('Get Locations Error:', err);
        res.status(500).json({ error: 'Database error' });
    }
};

export const addLocation = async (req, res) => {
    const { Name } = req.body;
    try {
        const pool = getPool();
        await pool.request()
            .input('Name', sql.NVarChar, Name.trim())
            .query('INSERT INTO dbo.Stock_Locations (Name) VALUES (@Name)');
        res.json({ success: true, message: 'Location added' });
    } catch (err) {
        console.error('Add Location Error:', err);
        res.status(500).json({ error: 'Failed to add location' });
    }
};

export const updateLocation = async (req, res) => {
    const { id } = req.params;
    const { Name } = req.body;
    try {
        const pool = getPool();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // 1. Get old name
            const oldLoc = await transaction.request()
                .input('LocationID', sql.Int, id)
                .query('SELECT Name FROM dbo.Stock_Locations WHERE LocationID = @LocationID');

            const oldName = oldLoc.recordset[0]?.Name;

            // 2. Update Location Master
            await transaction.request()
                .input('LocationID', sql.Int, id)
                .input('Name', sql.NVarChar, Name.trim())
                .query('UPDATE dbo.Stock_Locations SET Name = @Name WHERE LocationID = @LocationID');

            // 3. Update Products if name changed
            if (oldName && oldName !== Name.trim()) {
                await transaction.request()
                    .input('OldName', sql.NVarChar, oldName)
                    .input('NewName', sql.NVarChar, Name.trim())
                    .query('UPDATE dbo.Stock_Products SET Location = @NewName WHERE Location = @OldName');
            }

            await transaction.commit();
            res.json({ success: true, message: 'Location updated' });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error('Update Location Error:', err);
        res.status(500).json({ error: 'Failed to update location' });
    }
};

export const deleteLocation = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = getPool();
        // Check usage before delete
        const check = await pool.request()
            .input('LocationID', sql.Int, id)
            .query(`
                SELECT TOP 1 1 FROM dbo.Stock_Locations L
                JOIN dbo.Stock_Products P ON P.Location = L.Name 
                WHERE L.LocationID = @LocationID
            `);

        if (check.recordset.length > 0) {
            return res.status(400).json({ error: 'Cannot delete: Location is in use by products.' });
        }

        await pool.request()
            .input('LocationID', sql.Int, id)
            .query('DELETE FROM dbo.Stock_Locations WHERE LocationID = @LocationID');
        res.json({ success: true, message: 'Location deleted' });
    } catch (err) {
        console.error('Delete Location Error:', err);
        res.status(500).json({ error: 'Failed to delete location' });
    }
};
