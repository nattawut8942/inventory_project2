-- Migration: Create Stock_Locations table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Stock_Locations' AND type = 'U')
BEGIN
    CREATE TABLE dbo.Stock_Locations (
        LocationID INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(255) NOT NULL UNIQUE
    );
    PRINT 'Table Stock_Locations created.';
END

-- Seed initial data if empty
IF NOT EXISTS (SELECT 1 FROM dbo.Stock_Locations)
BEGIN
    INSERT INTO dbo.Stock_Locations (Name) VALUES 
    ('Server Room ODM'),
    ('Stock Office 2'),
   
    PRINT 'Seeded initial locations.';
END
