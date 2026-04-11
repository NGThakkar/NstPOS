-- ============================================================================
-- FEAT-003: Refunds and Returns Management
-- Migration Script: Add return, return item, and refund settlement tables
-- Database: crazypos_dev
-- ============================================================================

-- Step 1: Add new columns to existing sales_transactions table
-- These columns track the cumulative refunded amount and return status
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[sales_transactions]') AND name = 'refunded_amount')
BEGIN
    ALTER TABLE [dbo].[sales_transactions]
    ADD [refunded_amount] DECIMAL(18, 2) DEFAULT 0 NOT NULL;
    
    PRINT 'Added refunded_amount column to sales_transactions';
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[sales_transactions]') AND name = 'return_status')
BEGIN
    ALTER TABLE [dbo].[sales_transactions]
    ADD [return_status] NVARCHAR(20) DEFAULT 'none' NOT NULL;
    
    PRINT 'Added return_status column to sales_transactions';
END

-- Step 2: Add new column to transaction_items table
-- This tracks how many units of each line item have been returned
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[transaction_items]') AND name = 'returned_quantity')
BEGIN
    ALTER TABLE [dbo].[transaction_items]
    ADD [returned_quantity] INT DEFAULT 0 NOT NULL;
    
    PRINT 'Added returned_quantity column to transaction_items';
END

-- Step 3: Create sales_returns table
-- Tracks each post-sale return operation linked to the original transaction
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sales_returns]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[sales_returns]
    (
        [return_id] BIGINT PRIMARY KEY IDENTITY(1,1) NOT NULL,
        [return_code] NVARCHAR(40) NOT NULL UNIQUE,
        [original_transaction_id] BIGINT NOT NULL,
        [customer_id] BIGINT NULL,
        [processed_by_user_id] BIGINT NOT NULL,
        [approved_by_user_id] BIGINT NULL,
        [return_date] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [status] NVARCHAR(30) NOT NULL DEFAULT 'completed',
        [refund_status] NVARCHAR(30) NOT NULL DEFAULT 'pending',
        [reason_code] NVARCHAR(40) NOT NULL DEFAULT 'unspecified',
        [reason_notes] NVARCHAR(500) NULL,
        [subtotal_reversal] DECIMAL(18, 2) NOT NULL,
        [tax_reversal] DECIMAL(18, 2) NOT NULL,
        [discount_reversal] DECIMAL(18, 2) NOT NULL,
        [refund_total] DECIMAL(18, 2) NOT NULL,
        [notes] NVARCHAR(500) NULL,
        [created_at] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [updated_at] DATETIME2 NULL,
        CONSTRAINT FK_sales_returns_sales_transactions FOREIGN KEY ([original_transaction_id])
            REFERENCES [dbo].[sales_transactions]([transaction_id]),
        CONSTRAINT FK_sales_returns_customers FOREIGN KEY ([customer_id])
            REFERENCES [dbo].[customers]([customer_id]),
        CONSTRAINT FK_sales_returns_processed_by_users FOREIGN KEY ([processed_by_user_id])
            REFERENCES [dbo].[users]([user_id]),
        CONSTRAINT FK_sales_returns_approved_by_users FOREIGN KEY ([approved_by_user_id])
            REFERENCES [dbo].[users]([user_id])
    );

    -- Create indexes for sales_returns
    CREATE INDEX [IX_sales_returns_return_code] ON [dbo].[sales_returns]([return_code]);
    CREATE INDEX [IX_sales_returns_original_transaction_id] ON [dbo].[sales_returns]([original_transaction_id]);
    CREATE INDEX [IX_sales_returns_status] ON [dbo].[sales_returns]([status]);
    CREATE INDEX [IX_sales_returns_refund_status] ON [dbo].[sales_returns]([refund_status]);
    CREATE INDEX [IX_sales_returns_created_at] ON [dbo].[sales_returns]([created_at]);

    PRINT 'Created sales_returns table';
END

-- Step 4: Create return_items table
-- Tracks individual line items within a return operation
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[return_items]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[return_items]
    (
        [return_item_id] BIGINT PRIMARY KEY IDENTITY(1,1) NOT NULL,
        [return_id] BIGINT NOT NULL,
        [original_transaction_item_id] BIGINT NOT NULL,
        [product_id] BIGINT NOT NULL,
        [quantity] INT NOT NULL,
        [unit_price] DECIMAL(18, 2) NOT NULL,
        [discount_reversal] DECIMAL(18, 2) NOT NULL,
        [tax_reversal] DECIMAL(18, 2) NOT NULL,
        [refund_line_total] DECIMAL(18, 2) NOT NULL,
        [inventory_disposition] NVARCHAR(20) NOT NULL DEFAULT 'restock',
        [disposition_notes] NVARCHAR(300) NULL,
        [created_at] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_return_items_sales_returns FOREIGN KEY ([return_id])
            REFERENCES [dbo].[sales_returns]([return_id]),
        CONSTRAINT FK_return_items_transaction_items FOREIGN KEY ([original_transaction_item_id])
            REFERENCES [dbo].[transaction_items]([item_id]),
        CONSTRAINT FK_return_items_products FOREIGN KEY ([product_id])
            REFERENCES [dbo].[product]([productid])
    );

    -- Create indexes for return_items
    CREATE INDEX [IX_return_items_return_id] ON [dbo].[return_items]([return_id]);
    CREATE INDEX [IX_return_items_original_transaction_item_id] ON [dbo].[return_items]([original_transaction_item_id]);
    CREATE INDEX [IX_return_items_inventory_disposition] ON [dbo].[return_items]([inventory_disposition]);

    PRINT 'Created return_items table';
END

-- Step 5: Create refund_settlements table
-- Tracks the settlement of refunds (cash, pending, card, etc.)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[refund_settlements]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[refund_settlements]
    (
        [refund_settlement_id] BIGINT PRIMARY KEY IDENTITY(1,1) NOT NULL,
        [return_id] BIGINT NOT NULL,
        [refund_method] NVARCHAR(30) NOT NULL DEFAULT 'cash',
        [amount] DECIMAL(18, 2) NOT NULL,
        [settlement_status] NVARCHAR(30) NOT NULL DEFAULT 'pending',
        [payment_reference] NVARCHAR(120) NULL,
        [processed_by_user_id] BIGINT NULL,
        [processed_at] DATETIME2 NULL,
        [notes] NVARCHAR(500) NULL,
        [created_at] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_refund_settlements_sales_returns FOREIGN KEY ([return_id])
            REFERENCES [dbo].[sales_returns]([return_id]),
        CONSTRAINT FK_refund_settlements_users FOREIGN KEY ([processed_by_user_id])
            REFERENCES [dbo].[users]([user_id])
    );

    -- Create indexes for refund_settlements
    CREATE INDEX [IX_refund_settlements_return_id] ON [dbo].[refund_settlements]([return_id]);
    CREATE INDEX [IX_refund_settlements_settlement_status] ON [dbo].[refund_settlements]([settlement_status]);
    CREATE INDEX [IX_refund_settlements_created_at] ON [dbo].[refund_settlements]([created_at]);

    PRINT 'Created refund_settlements table';
END

-- Step 6: Create indexes on new columns in existing tables
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_sales_transactions_return_status')
BEGIN
    CREATE INDEX [IX_sales_transactions_return_status] ON [dbo].[sales_transactions]([return_status]);
    PRINT 'Created index on return_status column';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_transaction_items_returned_quantity')
BEGIN
    CREATE INDEX [IX_transaction_items_returned_quantity] ON [dbo].[transaction_items]([returned_quantity]);
    PRINT 'Created index on returned_quantity column';
END

-- Final validation
SELECT 'FEAT-003 Migration: Refunds and Returns Management completed successfully!' AS Message;

-- Print summary
PRINT '';
PRINT '=== Migration Summary ===';
PRINT 'New tables created: sales_returns, return_items, refund_settlements';
PRINT 'Columns added to sales_transactions: refunded_amount, return_status';
PRINT 'Columns added to transaction_items: returned_quantity';
PRINT 'All indexes created for optimal query performance';
PRINT '=== Migration Complete ===';
