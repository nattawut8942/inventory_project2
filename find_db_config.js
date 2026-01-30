import sql from 'mssql';

const configs = [
    { name: 'Localhost Default', server: 'localhost', port: 1433, user: 'sa', password: '', options: { encrypt: false, trustServerCertificate: true } },
    { name: 'Localhost Default (Pass: sa)', server: 'localhost', port: 1433, user: 'sa', password: 'sa', options: { encrypt: false, trustServerCertificate: true } },
    { name: 'Localhost SQLEXPRESS', server: 'localhost\\SQLEXPRESS', port: 1433, user: 'sa', password: '', options: { encrypt: false, trustServerCertificate: true } },
    { name: 'Localhost SQLEXPRESS (Dynamic)', server: 'localhost\\SQLEXPRESS', options: { encrypt: false, trustServerCertificate: true } }, // No fixed port, uses browser service
    { name: 'LocalDB', server: '(localdb)\\mssqllocaldb', options: { encrypt: false, trustServerCertificate: true, trustedConnection: true } },
    { name: 'Windows Auth Localhost', server: 'localhost', options: { encrypt: false, trustServerCertificate: true, trustedConnection: true } }
];

async function testConnection(config) {
    console.log(`Testing: ${config.name} (${config.server})...`);
    try {
        const pool = await sql.connect(config);
        console.log(`✅ SUCCESS: Connected to ${config.name}`);
        console.log(`::CONFIG::${JSON.stringify(config)}`);
        await pool.close();
        return true;
    } catch (err) {
        console.log(`❌ FAILED: ${config.name} - ${err.message.split('\n')[0]}`);
        return false;
    }
}

(async () => {
    console.log('Starting DB Connection Discovery...');
    for (const config of configs) {
        const success = await testConnection(config);
        if (success) process.exit(0);
    }
    console.log('All attempts failed.');
    process.exit(1);
})();
