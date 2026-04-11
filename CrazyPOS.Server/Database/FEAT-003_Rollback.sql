-- ============================================================================
-- FEAT-003: Refunds and Returns Management
-- ROLLBACK Script - Removes all FEAT-003 database changes
-- WARNING: This script removes tables and reverts columns. Data loss will occur!
-- ============================================================================

-- This rollback script should only be used if FEAT-003 deployment fails
-- and a full revert is necessary. Use with extreme caution in production.

PRINT '========== WARNING: FEAT-003 ROLLBACK IN PROGRESS ==========';
PRINT 'This will remove all return/refund related tables and columns.';
PRINT 'Make sure you have a recent backup before proceeding.';
PRINT '';

-- Step 1: Remove foreign key constraints from refund_settlements
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_refund_settlements_sales_returns')
BEGIN
    ALTER TABLE [dbo].[refund_settlements] DROP CONSTRAINT [FK_refund_settlements_sales_returns];
    PRINT 'Dropped FK_refund_settlements_sales_returns constraint';
END

IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_refund_settlements_users')
BEGIN
    ALTER TABLE [dbo].[refund_settlements] DROP CONSTRAINT [FK_refund_settlements_users];
    PRINT 'Dropped FK_refund_settlements_users constraint';
END

-- Step 2: Remove foreign key constraints from return_items
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_return_items_sales_returns')
BEGIN
    ALTER TABLE [dbo].[return_items] DROP CONSTRAINT [FK_return_items_sales_returns];
    PRINT 'Dropped FK_return_items_sales_returns constraint';
END

IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_return_items_transaction_items')
BEGIN
    ALTER TABLE [dbo].[return_items] DROP CONSTRAINT [FK_return_items_transaction_items];
    PRINT 'Dropped FK_return_items_transaction_items constraint';
END

IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_return_items_products')
BEGIN
    ALTER TABLE [dbo].[return_items] DROP CONSTRAINT [FK_return_items_products];
    PRINT 'Dropped FK_return_items_products constraint';
END

-- Step 3: Remove foreign key constraints from sales_returns
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_sales_returns_sales_transactions')
BEGIN
    ALTER TABLE [dbo].[sales_returns] DROP CONSTRAINT [FK_sales_returns_sales_transactions];
    PRINT 'Dropped FK_sales_returns_sales_transactions constraint';
END

IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_sales_returns_customers')
BEGIN
    ALTER TABLE [dbo].[sales_returns] DROP CONSTRAINT [FK_sales_returns_customers];
    PRINT 'Dropped FK_sales_returns_customers constraint';
END

IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_sales_returns_processed_by_users')
BEGIN
    ALTER TABLE [dbo].[sales_returns] DROP CONSTRAINT [FK_sales_returns_processed_by_users];
    PRINT 'Dropped FK_sales_returns_processed_by_users constraint';
END

IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_sales_returns_approved_by_users')
BEGIN
    ALTER TABLE [dbo].[sales_returns] DROP CONSTRAINT [FK_sales_returns_approved_by_users];
    PRINT 'Dropped FK_sales_returns_approved_by_users constraint';
END

-- Step 4: Drop the new FEAT-003 tables in reverse dependency order
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[refund_settlements]') AND type in (N'U'))
BEGIN
    DROP TABLE [dbo].[refund_settlements];
    PRINT 'Dropped refund_settlements table';
END

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[return_items]') AND type in (N'U'))
BEGIN
    DROP TABLE [dbo].[return_items];
    PRINT 'Dropped return_items table';
END

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sales_returns]') AND type in (N'U'))
BEGIN
    DROP TABLE [dbo].[sales_returns];
    PRINT 'Dropped sales_returns table';
END

-- Step 5: Remove new columns from sales_transactions
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[sales_transactions]') AND name = 'refunded_amount')
BEGIN
    ALTER TABLE [dbo].[sales_transactions] DROP COLUMN [refunded_amount];
    PRINT 'Removed refunded_amount column from sales_transactions';
END

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[sales_transactions]') AND name = 'return_status')
BEGIN
    ALTER TABLE [dbo].[sales_transactions] DROP COLUMN [return_status];
    PRINT 'Removed return_status column from sales_transactions';
END

-- Step 6: Remove new column from transaction_items
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[transaction_items]') AND name = 'returned_quantity')
BEGIN
    ALTER TABLE [dbo].[transaction_items] DROP COLUMN [returned_quantity];
    PRINT 'Removed returned_quantity column from transaction_items';
END

-- Step 7: Remove indexes that were created for new columns
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_sales_transactions_return_status')
BEGIN
    DROP INDEX [IX_sales_transactions_return_status] ON [dbo].[sales_transactions];
    PRINT 'Dropped IX_sales_transactions_return_status index';
END

IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_transaction_items_returned_quantity')
BEGIN
    DROP INDEX [IX_transaction_items_returned_quantity] ON [dbo].[transaction_items];
    PRINT 'Dropped IX_transaction_items_returned_quantity index';
END

-- Step 8: Remove return-related permissions from database
-- Note: This preserves permission definitions but removes role assignments
DELETE FROM [dbo].[RolePermissions]
WHERE [PermissionId] IN (
    SELECT [PermissionId] FROM [dbo].[Permissions]
    WHERE [PermissionCode] IN ('SALES_RETURN_CREATE', 'SALES_RETURN_APPROVE', 'SALES_REFUND_SETTLE')
);

PRINT 'Removed return/refund permission assignments from roles';

-- Optionally uncomment to remove permission definitions entirely
-- DELETE FROM [dbo].[Permissions]
-- WHERE [PermissionCode] IN ('SALES_RETURN_CREATE', 'SALES_RETURN_APPROVE', 'SALES_REFUND_SETTLE');
-- PRINT 'Removed return/refund permission definitions';

PRINT '';
PRINT '========== FEAT-003 ROLLBACK COMPLETE ==========';
PRINT 'All return and refund management components have been removed.';
PRINT 'Verify that your application is functioning correctly after this rollback.';
