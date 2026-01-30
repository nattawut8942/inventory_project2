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
        const result = await sql.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Stock_Products' AND COLUMN_NAME = 'ImageURL'");
        console.log(result.recordset);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
