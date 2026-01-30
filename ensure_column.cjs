const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT),
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function ensureColumn() {
    try {
        console.log('Connecting to database...');
        await sql.connect(config);
        console.log('Connected!');

        const tableName = 'Stock_Products';
        const columnName = 'ImageURL';

        console.log(`Checking for column [${columnName}] in table [${tableName}]...`);

        const checkResult = await sql.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = '${tableName}' AND COLUMN_NAME = '${columnName}'
        `);

        if (checkResult.recordset.length > 0) {
            console.log(`✅ Column [${columnName}] already exists.`);
        } else {
            console.log(`⚠️ Column [${columnName}] NOT found. Adding it now...`);
            await sql.query(`ALTER TABLE dbo.${tableName} ADD ${columnName} NVARCHAR(MAX)`);
            console.log(`✅ Column [${columnName}] added successfully!`);
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

ensureColumn();
