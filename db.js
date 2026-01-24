const sql = require('mssql');

// Database Configuration from Environment Variables
const config = {
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_DATABASE || 'ITStockDB',
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        encrypt: false, // Set to true for Azure
        trustServerCertificate: true, // Allow self-signed certs
        enableArithAbort: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

// Add authentication based on config
if (process.env.DB_TRUSTED_CONNECTION === 'true') {
    // Windows Authentication
    config.options.trustedConnection = true;
} else {
    // SQL Authentication
    config.user = process.env.DB_USER || 'sa';
    config.password = process.env.DB_PASSWORD || '';
}

let pool = null;

// Connect to Database
const connectDB = async () => {
    try {
        if (pool) {
            return pool;
        }
        pool = await sql.connect(config);
        console.log('✅ Connected to MS SQL Server');
        return pool;
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
        throw err;
    }
};

// Get connection pool
const getPool = () => {
    if (!pool) {
        throw new Error('Database not connected. Call connectDB() first.');
    }
    return pool;
};

// Close connection
const closeDB = async () => {
    if (pool) {
        await pool.close();
        pool = null;
        console.log('Database connection closed');
    }
};

module.exports = {
    sql,
    connectDB,
    getPool,
    closeDB
};
