-- Migration: Add ItemName column to Stock_PODetails table
-- This allows storing manual item descriptions without requiring ProductID reference

-- Add ItemName column if not exists
IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'Stock_PODetails' AND COLUMN_NAME = 'ItemName'
)
BEGIN
    ALTER TABLE dbo.Stock_PODetails 
    ADD ItemName NVARCHAR(200) NULL;
END
GO

-- Make ProductID nullable (for manual entries)
ALTER TABLE dbo.Stock_PODetails 
ALTER COLUMN ProductID INT NULL;
GO
