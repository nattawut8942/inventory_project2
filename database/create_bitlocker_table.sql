-- =============================================
-- BitLocker Key Management Table
-- สำหรับจัดเก็บข้อมูล Recovery Key ของ BitLocker
-- =============================================

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Stock_BitlockerKeys')
BEGIN
    CREATE TABLE dbo.Stock_BitlockerKeys (
        RecordID            INT IDENTITY(1,1) PRIMARY KEY,
        EmployeeId          NVARCHAR(50)    NULL,       -- รหัสพนักงาน
        UserName            NVARCHAR(100)   NOT NULL,   -- ชื่อผู้ใช้งานเครื่อง
        Hostname            NVARCHAR(100)   NOT NULL,   -- ชื่อเครื่องคอมพิวเตอร์
        DiskC_RecoveryKey   NVARCHAR(500)   NULL,       -- Recovery Key ของ Disk C
        DiskD_RecoveryKey   NVARCHAR(500)   NULL,       -- Recovery Key ของ Disk D
        SystemPIN           NVARCHAR(50)    NULL,       -- PIN สำหรับเข้าระบบ
        Status              BIT             DEFAULT 1,  -- 1 = Active, 0 = Cancelled (ยกเลิก)
        RecordedBy          NVARCHAR(100)   NULL,       -- ผู้บันทึกข้อมูล (ดึงจาก Auth)
        Remark              NVARCHAR(500)   NULL,       -- หมายเหตุ
        CreatedAt           DATETIME        DEFAULT GETDATE(),
        UpdatedAt           DATETIME        DEFAULT GETDATE()
    );

    PRINT 'Table Stock_BitlockerKeys created successfully.';
END
ELSE
BEGIN
    -- ถ้าตารางมีอยู่แล้ว ให้เพิ่มคอลัมน์ Status (ถ้ายังไม่มี)
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Stock_BitlockerKeys' AND COLUMN_NAME = 'Status')
    BEGIN
        ALTER TABLE dbo.Stock_BitlockerKeys ADD Status BIT DEFAULT 1;
        PRINT 'Column Status added to Stock_BitlockerKeys.';
    END

    PRINT 'Table Stock_BitlockerKeys already exists.';
END
GO

-- Index สำหรับค้นหาเร็ว
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_BitlockerKeys_Hostname')
    CREATE NONCLUSTERED INDEX IX_BitlockerKeys_Hostname
        ON dbo.Stock_BitlockerKeys (Hostname);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_BitlockerKeys_EmployeeId')
    CREATE NONCLUSTERED INDEX IX_BitlockerKeys_EmployeeId
        ON dbo.Stock_BitlockerKeys (EmployeeId)
        WHERE EmployeeId IS NOT NULL;
GO

