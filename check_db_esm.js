import { connectDB, sql } from './db.js';

(async () => {
    try {
        await connectDB();
        const result = await sql.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Stock_Products' AND COLUMN_NAME = 'ImageURL'");
        if (result.recordset.length > 0) {
            console.log('✅ ImageURL column exists.');
        } else {
            console.log('❌ ImageURL column DOES NOT exist.');
        }
        process.exit(0);
    } catch (err) {
        console.error('Check failed:', err);
        process.exit(1);
    }
})();
