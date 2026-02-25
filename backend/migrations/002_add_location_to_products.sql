IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[Stock_Products]') 
    AND name = 'Location'
)
BEGIN
    ALTER TABLE dbo.Stock_Products
    ADD Location NVARCHAR(255) NULL;
END
