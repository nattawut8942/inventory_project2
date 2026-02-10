const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'Password1234',
    server: 'localhost',
    database: 'dbITMS',
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function checkVendors() {
    try {
        await sql.connect(config);
        const result = await sql.query('SELECT VendorID, VendorName, ContactInfo FROM dbo.Stock_Vendors');
        console.table(result.recordset);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkVendors();
