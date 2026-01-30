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
('Monitor', 'Monitor'),
('Asset', 'General Asset'),
('Stock', 'Consumable Stock'),
('Network', 'Network Device');

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
    
    -- 5W Fields for PR Form
    Who_Text NVARCHAR(MAX),                   -- Who is requesting
    What_Text NVARCHAR(MAX),                  -- What is needed
    Where_Text NVARCHAR(MAX),                 -- Where it will be used
    When_Text NVARCHAR(MAX),                  -- When it is needed
    Why_Text NVARCHAR(MAX)                    -- Why it is needed
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
-- =====================================================
