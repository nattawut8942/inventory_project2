-- 1. Device Types Table
CREATE TABLE dbo.Stock_DeviceTypes (
    TypeId VARCHAR(50) PRIMARY KEY, -- Monitor, Asset, Stock, Network
    Label NVARCHAR(100)
);

-- 2. Products / Inventory Master Table
CREATE TABLE dbo.Stock_Products (
    ProductID INT IDENTITY(1,1) PRIMARY KEY,
    ProductName NVARCHAR(255) NOT NULL,
    DeviceType VARCHAR(50) FOREIGN KEY REFERENCES dbo.Stock_DeviceTypes(TypeId),
    MinStock INT DEFAULT 0,
    CurrentStock INT DEFAULT 0,
    LastPrice DECIMAL(18, 2) DEFAULT 0.00,
    UnitOfMeasure NVARCHAR(50) DEFAULT 'Pcs',
    IsActive BIT DEFAULT 1
);

-- 3. Purchase Orders Table (PO)
CREATE TABLE dbo.Stock_PurchaseOrders (
    PO_ID NVARCHAR(50) PRIMARY KEY, -- PO-2024-001
    VendorName NVARCHAR(255),
    RequestDate DATETIME DEFAULT GETDATE(),
    DueDate DATETIME,
    RequestedBy NVARCHAR(100),
    Section NVARCHAR(100),
    Tel NVARCHAR(50),
    Remark NVARCHAR(MAX),
    Status NVARCHAR(50) DEFAULT 'Open', -- Open, Partial, Completed
    
    -- Additional fields for Forms
    Who_Text NVARCHAR(MAX),
    What_Text NVARCHAR(MAX),
    Where_Text NVARCHAR(MAX),
    When_Text NVARCHAR(MAX),
    Why_Text NVARCHAR(MAX)
);

-- 4. PO Details Table
CREATE TABLE dbo.Stock_PODetails (
    DetailID INT IDENTITY(1,1) PRIMARY KEY,
    PO_ID NVARCHAR(50) FOREIGN KEY REFERENCES dbo.Stock_PurchaseOrders(PO_ID),
    ItemName NVARCHAR(255), -- Added for manual entry support
    ProductID INT FOREIGN KEY REFERENCES dbo.Stock_Products(ProductID), -- Nullable for manual items
    QtyOrdered INT NOT NULL,
    QtyReceived INT DEFAULT 0,
    UnitCost DECIMAL(18, 2),
    BG_No NVARCHAR(100),
    ProgressBit CHAR(1), -- Y/N
    AssetPlace NVARCHAR(255),
    ItemRemark NVARCHAR(MAX)
);

-- 5. Invoices Table
CREATE TABLE dbo.Stock_Invoices (
    InvoiceID INT IDENTITY(1,1) PRIMARY KEY,
    InvoiceNo NVARCHAR(100) NOT NULL,
    PO_ID NVARCHAR(50) FOREIGN KEY REFERENCES dbo.Stock_PurchaseOrders(PO_ID),
    ReceiveDate DATETIME DEFAULT GETDATE(),
    ReceivedBy NVARCHAR(100)
);

-- 6. Transactions / Helper Log Table
CREATE TABLE dbo.Stock_Transactions (
    TransID INT IDENTITY(1,1) PRIMARY KEY,
    ProductID INT FOREIGN KEY REFERENCES dbo.Stock_Products(ProductID),
    TransType VARCHAR(10) NOT NULL, -- IN / OUT
    Qty INT NOT NULL,
    RefInfo NVARCHAR(255), -- Invoice No / Reason
    UserID NVARCHAR(100), -- AD Username
    TransDate DATETIME DEFAULT GETDATE()
);

-- Insert Default Device Types
INSERT INTO dbo.Stock_DeviceTypes (TypeId, Label) VALUES
('Monitor', 'Monitor'),
('Asset', 'General Asset'),
('Stock', 'Consumable Stock'),
('Network', 'Network Device');
