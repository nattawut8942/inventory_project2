const sql = require('mssql');
require('dotenv').config();

(async () => {
    try {
        await sql.connect({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            server: process.env.DB_SERVER,
            database: process.env.DB_DATABASE,
            port: parseInt(process.env.DB_PORT),
            options: {
                encrypt: false,
                trustServerCertificate: true
            }
        });

        // Check if Stock_UserRole table exists
        const tableExists = await sql.query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = 'Stock_UserRole'
        `);
        console.log('Table exists:', tableExists.recordset.length > 0);

        if (tableExists.recordset.length === 0) {
            console.log('Creating Stock_UserRole table...');
            await sql.query(`
                CREATE TABLE dbo.Stock_UserRole (
                    ID INT IDENTITY(1,1) PRIMARY KEY,
                    Username NVARCHAR(100) NOT NULL UNIQUE,
                    CreatedAt DATETIME DEFAULT GETDATE(),
                    CreatedBy NVARCHAR(100)
                )
            `);
            console.log('Table created!');

            // Insert default admin
            await sql.query(`
                INSERT INTO dbo.Stock_UserRole (Username, CreatedBy) VALUES
                ('natthawut.y', 'SYSTEM')
            `);
            console.log('Default admin inserted!');
        } else {
            console.log('Fetching existing admin users...');
            const users = await sql.query('SELECT * FROM dbo.Stock_UserRole');
            console.log('Admin users:', users.recordset);
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
