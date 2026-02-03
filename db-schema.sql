-- =====================================================
-- IT Stock Pro - Database Schema
-- Last Updated: 2026-01-30
-- =====================================================

-- 1. Device Types Table (Lookup Table)
CREATE TABLE dbo.Stock_DeviceTypes (
    TypeId VARCHAR(50) PRIMARY KEY,           -- Monitor, Asset, Stock, Network
    Label NVARCHAR(100)                       -- Display label
);

-- Insert Default Device Types
INSERT INTO dbo.Stock_DeviceTypes (TypeId, Label) VALUES
('Asset', 'General Asset'),
('Consumable', 'Consumable Stock'),
('Monitor', 'Monitor'),
('Network', 'Network Device'),
('Peripheral', 'Peripheral Devices'),
('Storage', 'Storage Stock');

-- =====================================================
-- 2. Products / Inventory Master Table
-- =====================================================
CREATE TABLE dbo.Stock_Products (
    ProductID INT IDENTITY(1,1) PRIMARY KEY,
    ProductName NVARCHAR(255) NOT NULL,
    DeviceType VARCHAR(50) FOREIGN KEY REFERENCES dbo.Stock_DeviceTypes(TypeId),
    MinStock INT DEFAULT 0,                   -- Minimum stock threshold (alert level)
    MaxStock INT DEFAULT 0,                   -- Maximum stock (for reorder calculation)
    CurrentStock INT DEFAULT 0,               -- Current available quantity
    LastPrice DECIMAL(18, 2) DEFAULT 0.00,    -- Last purchase price per unit
    UnitOfMeasure NVARCHAR(50) DEFAULT 'Pcs', -- Unit (Pcs, Box, Set, etc.)
    IsActive BIT DEFAULT 1,                   -- Soft delete flag
    ImageURL NVARCHAR(MAX)                    -- Product image path (/uploads/...)
);

-- Add MaxStock column if table already exists
-- ALTER TABLE dbo.Stock_Products ADD MaxStock INT DEFAULT 0;

-- =====================================================
-- 3. Purchase Orders Table (PO Header)
-- =====================================================
CREATE TABLE dbo.Stock_PurchaseOrders (
    PO_ID NVARCHAR(50) PRIMARY KEY,           -- PO-YYYYMM-XXX
    PR_No NVARCHAR(50),                       -- Purchase Request reference
    VendorName NVARCHAR(255),                 -- Supplier name
    RequestDate DATETIME DEFAULT GETDATE(),   -- Date created
    DueDate DATETIME,                         -- Expected delivery date
    RequestedBy NVARCHAR(100),                -- AD Username who created
    Section NVARCHAR(100),                    -- Department/Section
    Tel NVARCHAR(50),                         -- Contact phone
    Remark NVARCHAR(MAX),                     -- General notes
    Status NVARCHAR(50) DEFAULT 'Open',       -- Open, Partial, Completed, Cancelled
    

);

-- =====================================================
-- 4. PO Details Table (PO Line Items)
-- =====================================================
CREATE TABLE dbo.Stock_PODetails (
    DetailID INT IDENTITY(1,1) PRIMARY KEY,
    PO_ID NVARCHAR(50) FOREIGN KEY REFERENCES dbo.Stock_PurchaseOrders(PO_ID),
    ItemName NVARCHAR(255),                   -- Item description (for manual entry)
    ProductID INT FOREIGN KEY REFERENCES dbo.Stock_Products(ProductID), -- NULL for manual items
    QtyOrdered INT NOT NULL,                  -- Quantity ordered
    QtyReceived INT DEFAULT 0,                -- Quantity already received
    UnitCost DECIMAL(18, 2),                  -- Price per unit
    BG_No NVARCHAR(100),                      -- Budget number
    ProgressBit CHAR(1),                      -- Y/N progress flag
    AssetPlace NVARCHAR(255),                 -- Asset location
    ItemRemark NVARCHAR(MAX)                  -- Item-specific notes
);

-- =====================================================
-- 5. Invoices Table (Receiving Records)
-- =====================================================
CREATE TABLE dbo.Stock_Invoices (
    InvoiceID INT IDENTITY(1,1) PRIMARY KEY,
    InvoiceNo NVARCHAR(100) NOT NULL,         -- Invoice number from vendor
    PO_ID NVARCHAR(50) FOREIGN KEY REFERENCES dbo.Stock_PurchaseOrders(PO_ID),
    ReceiveDate DATETIME DEFAULT GETDATE(),   -- Date received
    ReceivedBy NVARCHAR(100)                  -- AD Username who received
);



-- =====================================================
-- 6. Stock Transactions Table (Movement Log)
-- =====================================================
CREATE TABLE dbo.Stock_Transactions (
    TransID INT IDENTITY(1,1) PRIMARY KEY,
    ProductID INT FOREIGN KEY REFERENCES dbo.Stock_Products(ProductID),
    TransType VARCHAR(10) NOT NULL,           -- IN (inbound) / OUT (outbound)
    Qty INT NOT NULL,                         -- Quantity moved
    RefInfo NVARCHAR(255),                    -- Reference (Invoice No / Reason)
    UserID NVARCHAR(100),                     -- AD Username
    TransDate DATETIME DEFAULT GETDATE()      -- Transaction datetime
);

-- =====================================================
-- INDEXES for Performance
-- =====================================================
CREATE INDEX IX_Products_DeviceType ON dbo.Stock_Products(DeviceType);
CREATE INDEX IX_Products_IsActive ON dbo.Stock_Products(IsActive);
CREATE INDEX IX_PODetails_PO_ID ON dbo.Stock_PODetails(PO_ID);
CREATE INDEX IX_Transactions_ProductID ON dbo.Stock_Transactions(ProductID);
CREATE INDEX IX_Transactions_TransDate ON dbo.Stock_Transactions(TransDate);
CREATE INDEX IX_Invoices_PO_ID ON dbo.Stock_Invoices(PO_ID);

-- =====================================================
-- 7. User Roles (Admin/Staff Permissions)
-- =====================================================
CREATE TABLE dbo.Stock_UserRole (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    Username NVARCHAR(50) NOT NULL UNIQUE,
    CreatedBy NVARCHAR(100),
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- =====================================================
-- 8. Vendor Master (Suppliers)
-- =====================================================
CREATE TABLE dbo.Stock_Vendors (
    VendorID INT IDENTITY(1,1) PRIMARY KEY,
    VendorName NVARCHAR(200) NOT NULL UNIQUE,
    ContactInfo NVARCHAR(500),
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- Insert Default Vendors
INSERT INTO dbo.Stock_Vendors (VendorName) VALUES
('SAMAPHAN TECHNOLOGIES'),
('NITHIKASEM TELECOM');

-- =====================================================
-- SUMMARY OF TABLES
-- =====================================================
-- Table Name               | Description
-- -------------------------|-----------------------------------------
-- Stock_DeviceTypes        | Lookup: Product categories
-- Stock_Products           | Master: Product/inventory items
-- Stock_PurchaseOrders     | Header: Purchase order records
-- Stock_PODetails          | Detail: PO line items
-- Stock_Invoices           | Receiving: Invoice/delivery records
-- Stock_Transactions       | Log: All stock movements (IN/OUT)
-- Stock_UserRole           | Access: List of Admin/Staff users
-- Stock_Vendors            | Master: Vendor/Supplier list
-- =====================================================
