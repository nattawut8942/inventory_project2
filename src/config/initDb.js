import { sql, getPool } from './db.js';

export const initializeDatabase = async () => {
    try {
        const pool = getPool();

        // 1. Ensure ImageURL column exists
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Stock_Products' AND COLUMN_NAME = 'ImageURL')
            BEGIN
                ALTER TABLE dbo.Stock_Products ADD ImageURL NVARCHAR(MAX);
            END
        `);

        // 2. Ensure MaxStock column exists
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Stock_Products' AND COLUMN_NAME = 'MaxStock')
            BEGIN
                ALTER TABLE dbo.Stock_Products ADD MaxStock INT DEFAULT 0;
            END
        `);

        // 3. Ensure BudgetNo column in POs
        await pool.request().query(`
             IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Stock_PurchaseOrders' AND COLUMN_NAME = 'BudgetNo')
             BEGIN
                 ALTER TABLE dbo.Stock_PurchaseOrders ADD BudgetNo NVARCHAR(50);
             END
         `);

        // 4. Ensure Stock_Vendors table exists
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Stock_Vendors' AND xtype='U')
            CREATE TABLE dbo.Stock_Vendors (
                VendorID INT IDENTITY(1,1) PRIMARY KEY,
                VendorName NVARCHAR(255) NOT NULL,
                ContactInfo NVARCHAR(MAX),
                IsActive BIT DEFAULT 1
            )
        `);

        // 5. Seed Device Types
        const typesToSeed = [
            { id: 'Consumable', label: 'Consumable Stock' },
            { id: 'Mouse', label: 'Mouse' },
            { id: 'Keyboard', label: 'Keyboard' },
            { id: 'Headset', label: 'Headset' },
            { id: 'Monitor', label: 'Monitor' },
            { id: 'Bag', label: 'Bag' },
            { id: 'Adapter', label: 'Adapter' },
            { id: 'Docking', label: 'Docking' },
            { id: 'Cable', label: 'Cable' },
            { id: 'Ram', label: 'Ram' },
            { id: 'Hdd', label: 'Hdd/Ssd' },
            { id: 'Flashdrive', label: 'Flashdrive' },
            { id: 'Ups', label: 'Ups' },
            { id: 'Printer', label: 'Printer' },
            { id: 'Scanner', label: 'Scanner' },
            { id: 'Projector', label: 'Projector' },
            { id: 'Other', label: 'Other' }
        ];

        for (const t of typesToSeed) {
            await pool.request().query(`
                IF NOT EXISTS (SELECT 1 FROM dbo.Stock_DeviceTypes WHERE TypeId = '${t.id}')
                INSERT INTO dbo.Stock_DeviceTypes (TypeId, Label) VALUES ('${t.id}', '${t.label}')
            `);
        }

        console.log('✅ Database initialized (Schema checks & Seeding completed)');

    } catch (err) {
        console.error('❌ Database initialization failed:', err);
    }
};
