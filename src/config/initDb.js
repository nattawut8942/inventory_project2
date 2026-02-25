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

        // 2.1 Ensure Location column exists
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Stock_Products' AND COLUMN_NAME = 'Location')
            BEGIN
                ALTER TABLE dbo.Stock_Products ADD Location NVARCHAR(255);
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

        // 4.1 Ensure Stock_Locations table exists (Migration 003)
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Stock_Locations' AND xtype='U')
            BEGIN
                CREATE TABLE dbo.Stock_Locations (
                    LocationID INT IDENTITY(1,1) PRIMARY KEY,
                    Name NVARCHAR(255) NOT NULL UNIQUE
                );
                INSERT INTO dbo.Stock_Locations (Name) VALUES 
                ('Server Room'), ('Stock Room A'), ('Stock Room B'), ('Cabinet 1'), ('Cabinet 2'), ('Front Desk');
            END
        `);

        // 5. Ensure DeliveryTo column in POs (PR Opener)
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Stock_PurchaseOrders' AND COLUMN_NAME = 'DeliveryTo')
            BEGIN
                ALTER TABLE dbo.Stock_PurchaseOrders ADD DeliveryTo NVARCHAR(100);
            END
        `);


        // 5. Seed Device Types


        /* Seeding Disabled per user request
        for (const t of typesToSeed) {
            await pool.request().query(`
                IF NOT EXISTS (SELECT 1 FROM dbo.Stock_DeviceTypes WHERE TypeId = '${t.id}')
                INSERT INTO dbo.Stock_DeviceTypes (TypeId, Label) VALUES ('${t.id}', '${t.label}')
            `);
        }
        */

        console.log('✅ Database initialized (Schema checks & Seeding completed)');

    } catch (err) {
        console.error('❌ Database initialization failed:', err);
    }
};
