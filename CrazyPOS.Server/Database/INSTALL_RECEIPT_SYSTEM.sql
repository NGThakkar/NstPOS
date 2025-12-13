-- ========================================================================
-- CRAZYPOS RECEIPT MANAGEMENT SYSTEM - DATABASE MIGRATION
-- ========================================================================
-- This script creates the database schema for the receipt management system
-- Execute this in SQL Server Management Studio against your crazypos_dev database
-- ========================================================================

USE [crazypos_dev];
GO

-- Check if table exists and create if it doesn't
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[receipts]') AND type in (N'U'))
BEGIN
    PRINT 'Creating receipts table...';
    
    CREATE TABLE [dbo].[receipts]
    (
        [receipt_id] BIGINT PRIMARY KEY IDENTITY(1,1) NOT NULL,
        [transaction_id] BIGINT NOT NULL,
        [receipt_number] NVARCHAR(50) NOT NULL UNIQUE,
        [recipient_email] NVARCHAR(100),
        [recipient_phone] NVARCHAR(20),
        [delivery_method] INT NOT NULL DEFAULT 0,
        -- 0=Print, 1=Email, 2=SMS, 3=WhatsApp
        [created_at] DATETIME DEFAULT GETUTCDATE() NOT NULL,
        [sent_at] DATETIME,
        [status] NVARCHAR(20) DEFAULT 'Pending' NOT NULL,
        -- Pending, Sent, Failed
        [notes] NVARCHAR(MAX),
        CONSTRAINT [FK_receipts_sales_transactions] FOREIGN KEY ([transaction_id]) 
            REFERENCES [dbo].[sales_transactions]([transaction_id])
            ON DELETE CASCADE
    );
    
    PRINT 'Receipts table created successfully.';
END
ELSE
BEGIN
    PRINT 'Receipts table already exists. Skipping creation.';
END
GO

-- Create indexes for better query performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_receipts_transaction' AND object_id = OBJECT_ID('dbo.receipts'))
BEGIN
    PRINT 'Creating index: IX_receipts_transaction...';
    CREATE INDEX [IX_receipts_transaction] ON [dbo].[receipts]([transaction_id]);
    PRINT 'Index created successfully.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_receipts_status' AND object_id = OBJECT_ID('dbo.receipts'))
BEGIN
    PRINT 'Creating index: IX_receipts_status...';
    CREATE INDEX [IX_receipts_status] ON [dbo].[receipts]([status]);
    PRINT 'Index created successfully.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_receipts_created_at' AND object_id = OBJECT_ID('dbo.receipts'))
BEGIN
    PRINT 'Creating index: IX_receipts_created_at...';
    CREATE INDEX [IX_receipts_created_at] ON [dbo].[receipts]([created_at]);
    PRINT 'Index created successfully.';
END
GO

-- Verify table structure
PRINT '';
PRINT '========== TABLE STRUCTURE ==========';
EXEC sp_help 'receipts';
GO

-- Verify indexes
PRINT '';
PRINT '========== TABLE INDEXES ==========';
SELECT 
    name AS IndexName,
    type_desc AS IndexType,
    is_unique AS IsUnique
FROM sys.indexes
WHERE object_id = OBJECT_ID('dbo.receipts')
AND name IS NOT NULL
ORDER BY name;
GO

-- Show record count
PRINT '';
PRINT '========== CURRENT RECORD COUNT ==========';
SELECT COUNT(*) AS ReceiptCount FROM [dbo].[receipts];
GO

PRINT '';
PRINT '========== MIGRATION COMPLETE ==========';
PRINT 'The receipt management system database schema has been successfully created!';
GO
