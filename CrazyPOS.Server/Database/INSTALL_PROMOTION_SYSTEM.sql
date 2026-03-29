-- ========================================================================
-- CRAZYPOS PROMOTION ENGINE - DATABASE MIGRATION
-- ========================================================================
-- This script creates and updates database objects for FEAT-002.
-- It is idempotent and safe to run multiple times.
-- Execute this in SQL Server Management Studio against crazypos_dev.
-- ========================================================================

USE [crazypos_dev];
GO

-- ========================================================================
-- Create promotions table
-- ========================================================================
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[promotions]') AND type = N'U')
BEGIN
    PRINT 'Creating promotions table...';

    CREATE TABLE [dbo].[promotions]
    (
        [promotion_id] BIGINT IDENTITY(1,1) NOT NULL,
        [promotion_code] NVARCHAR(50) NULL,
        [name] NVARCHAR(150) NOT NULL,
        [description] NVARCHAR(MAX) NULL,
        [promotion_type] NVARCHAR(30) NOT NULL,
        [value_type] NVARCHAR(20) NOT NULL,
        [value_amount] DECIMAL(18,2) NOT NULL,
        [max_discount_amount] DECIMAL(18,2) NULL,
        [min_basket_amount] DECIMAL(18,2) NULL,
        [applies_to] NVARCHAR(20) NOT NULL,
        [target_category_id] BIGINT NULL,
        [target_product_id] BIGINT NULL,
        [stackable] BIT NOT NULL CONSTRAINT [DF_promotions_stackable] DEFAULT (0),
        [requires_approval] BIT NOT NULL CONSTRAINT [DF_promotions_requires_approval] DEFAULT (0),
        [starts_at] DATETIME2 NOT NULL,
        [ends_at] DATETIME2 NULL,
        [usage_limit] INT NULL,
        [usage_count] INT NOT NULL CONSTRAINT [DF_promotions_usage_count] DEFAULT (0),
        [is_active] BIT NOT NULL CONSTRAINT [DF_promotions_is_active] DEFAULT (1),
        [created_at] DATETIME2 NOT NULL CONSTRAINT [DF_promotions_created_at] DEFAULT (GETUTCDATE()),
        [created_by] BIGINT NOT NULL,
        [updated_at] DATETIME2 NULL,
        [updated_by] BIGINT NULL,
        CONSTRAINT [PK_promotions] PRIMARY KEY ([promotion_id])
    );

    PRINT 'Promotions table created.';
END
ELSE
BEGIN
    PRINT 'Promotions table already exists. Skipping create.';
END
GO

-- Indexes on promotions
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_promotions_code' AND object_id = OBJECT_ID(N'[dbo].[promotions]'))
BEGIN
    CREATE UNIQUE INDEX [IX_promotions_code] ON [dbo].[promotions]([promotion_code]);
    PRINT 'Created index IX_promotions_code.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_promotions_is_active' AND object_id = OBJECT_ID(N'[dbo].[promotions]'))
BEGIN
    CREATE INDEX [IX_promotions_is_active] ON [dbo].[promotions]([is_active]);
    PRINT 'Created index IX_promotions_is_active.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_promotions_starts_at' AND object_id = OBJECT_ID(N'[dbo].[promotions]'))
BEGIN
    CREATE INDEX [IX_promotions_starts_at] ON [dbo].[promotions]([starts_at]);
    PRINT 'Created index IX_promotions_starts_at.';
END
GO

-- Foreign keys on promotions
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_promotions_product')
BEGIN
    ALTER TABLE [dbo].[promotions]  WITH CHECK
    ADD CONSTRAINT [FK_promotions_product]
    FOREIGN KEY([target_product_id]) REFERENCES [dbo].[product]([productid]);
    PRINT 'Added FK_promotions_product.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_promotions_category')
BEGIN
    ALTER TABLE [dbo].[promotions]  WITH CHECK
    ADD CONSTRAINT [FK_promotions_category]
    FOREIGN KEY([target_category_id]) REFERENCES [dbo].[categories]([categoryid]);
    PRINT 'Added FK_promotions_category.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_promotions_created_by_users')
BEGIN
    ALTER TABLE [dbo].[promotions]  WITH CHECK
    ADD CONSTRAINT [FK_promotions_created_by_users]
    FOREIGN KEY([created_by]) REFERENCES [dbo].[users]([user_id]);
    PRINT 'Added FK_promotions_created_by_users.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_promotions_updated_by_users')
BEGIN
    ALTER TABLE [dbo].[promotions]  WITH CHECK
    ADD CONSTRAINT [FK_promotions_updated_by_users]
    FOREIGN KEY([updated_by]) REFERENCES [dbo].[users]([user_id]);
    PRINT 'Added FK_promotions_updated_by_users.';
END
GO

-- ========================================================================
-- Create promotion_qualifiers table
-- ========================================================================
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[promotion_qualifiers]') AND type = N'U')
BEGIN
    PRINT 'Creating promotion_qualifiers table...';

    CREATE TABLE [dbo].[promotion_qualifiers]
    (
        [qualifier_id] BIGINT IDENTITY(1,1) NOT NULL,
        [promotion_id] BIGINT NOT NULL,
        [qualifier_type] NVARCHAR(40) NOT NULL,
        [qualifier_operator] NVARCHAR(20) NOT NULL,
        [qualifier_value] NVARCHAR(200) NOT NULL,
        CONSTRAINT [PK_promotion_qualifiers] PRIMARY KEY ([qualifier_id])
    );

    PRINT 'Promotion qualifiers table created.';
END
ELSE
BEGIN
    PRINT 'Promotion qualifiers table already exists. Skipping create.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_promotion_qualifiers_promotion_id' AND object_id = OBJECT_ID(N'[dbo].[promotion_qualifiers]'))
BEGIN
    CREATE INDEX [IX_promotion_qualifiers_promotion_id] ON [dbo].[promotion_qualifiers]([promotion_id]);
    PRINT 'Created index IX_promotion_qualifiers_promotion_id.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_promotion_qualifiers_promotions')
BEGIN
    ALTER TABLE [dbo].[promotion_qualifiers]  WITH CHECK
    ADD CONSTRAINT [FK_promotion_qualifiers_promotions]
    FOREIGN KEY([promotion_id]) REFERENCES [dbo].[promotions]([promotion_id]);
    PRINT 'Added FK_promotion_qualifiers_promotions.';
END
GO

-- ========================================================================
-- Create transaction_promotions table
-- ========================================================================
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[transaction_promotions]') AND type = N'U')
BEGIN
    PRINT 'Creating transaction_promotions table...';

    CREATE TABLE [dbo].[transaction_promotions]
    (
        [transaction_promotion_id] BIGINT IDENTITY(1,1) NOT NULL,
        [transaction_id] BIGINT NOT NULL,
        [promotion_id] BIGINT NOT NULL,
        [approval_user_id] BIGINT NULL,
        [approval_note] NVARCHAR(500) NULL,
        [discount_amount] DECIMAL(18,2) NOT NULL,
        [applied_at] DATETIME2 NOT NULL CONSTRAINT [DF_transaction_promotions_applied_at] DEFAULT (GETUTCDATE()),
        CONSTRAINT [PK_transaction_promotions] PRIMARY KEY ([transaction_promotion_id])
    );

    PRINT 'Transaction promotions table created.';
END
ELSE
BEGIN
    PRINT 'Transaction promotions table already exists. Skipping create.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_transaction_promotions_transaction_id' AND object_id = OBJECT_ID(N'[dbo].[transaction_promotions]'))
BEGIN
    CREATE INDEX [IX_transaction_promotions_transaction_id] ON [dbo].[transaction_promotions]([transaction_id]);
    PRINT 'Created index IX_transaction_promotions_transaction_id.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_transaction_promotions_promotion_id' AND object_id = OBJECT_ID(N'[dbo].[transaction_promotions]'))
BEGIN
    CREATE INDEX [IX_transaction_promotions_promotion_id] ON [dbo].[transaction_promotions]([promotion_id]);
    PRINT 'Created index IX_transaction_promotions_promotion_id.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_transaction_promotions_sales_transactions')
BEGIN
    ALTER TABLE [dbo].[transaction_promotions]  WITH CHECK
    ADD CONSTRAINT [FK_transaction_promotions_sales_transactions]
    FOREIGN KEY([transaction_id]) REFERENCES [dbo].[sales_transactions]([transaction_id]);
    PRINT 'Added FK_transaction_promotions_sales_transactions.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_transaction_promotions_promotions')
BEGIN
    ALTER TABLE [dbo].[transaction_promotions]  WITH CHECK
    ADD CONSTRAINT [FK_transaction_promotions_promotions]
    FOREIGN KEY([promotion_id]) REFERENCES [dbo].[promotions]([promotion_id]);
    PRINT 'Added FK_transaction_promotions_promotions.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_transaction_promotions_users')
BEGIN
    ALTER TABLE [dbo].[transaction_promotions]  WITH CHECK
    ADD CONSTRAINT [FK_transaction_promotions_users]
    FOREIGN KEY([approval_user_id]) REFERENCES [dbo].[users]([user_id]);
    PRINT 'Added FK_transaction_promotions_users.';
END
GO

-- ========================================================================
-- Extend transaction_items table
-- ========================================================================
IF COL_LENGTH('dbo.transaction_items', 'promotion_id') IS NULL
BEGIN
    ALTER TABLE [dbo].[transaction_items] ADD [promotion_id] BIGINT NULL;
    PRINT 'Added transaction_items.promotion_id.';
END
ELSE
BEGIN
    PRINT 'Column transaction_items.promotion_id already exists.';
END
GO

IF COL_LENGTH('dbo.transaction_items', 'promotion_discount_amount') IS NULL
BEGIN
    ALTER TABLE [dbo].[transaction_items]
    ADD [promotion_discount_amount] DECIMAL(18,2) NOT NULL
        CONSTRAINT [DF_transaction_items_promotion_discount_amount] DEFAULT (0);
    PRINT 'Added transaction_items.promotion_discount_amount.';
END
ELSE
BEGIN
    PRINT 'Column transaction_items.promotion_discount_amount already exists.';
END
GO

IF COL_LENGTH('dbo.transaction_items', 'pricing_rule_snapshot') IS NULL
BEGIN
    ALTER TABLE [dbo].[transaction_items] ADD [pricing_rule_snapshot] NVARCHAR(MAX) NULL;
    PRINT 'Added transaction_items.pricing_rule_snapshot.';
END
ELSE
BEGIN
    PRINT 'Column transaction_items.pricing_rule_snapshot already exists.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_transaction_items_promotions')
BEGIN
    ALTER TABLE [dbo].[transaction_items]  WITH CHECK
    ADD CONSTRAINT [FK_transaction_items_promotions]
    FOREIGN KEY([promotion_id]) REFERENCES [dbo].[promotions]([promotion_id]);
    PRINT 'Added FK_transaction_items_promotions.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_transaction_items_promotion_id' AND object_id = OBJECT_ID(N'[dbo].[transaction_items]'))
BEGIN
    CREATE INDEX [IX_transaction_items_promotion_id] ON [dbo].[transaction_items]([promotion_id]);
    PRINT 'Created index IX_transaction_items_promotion_id.';
END
GO

-- ========================================================================
-- Verification
-- ========================================================================
PRINT '';
PRINT '========== FEAT-002 SCHEMA VERIFICATION ==========';
SELECT [name] AS [table_name]
FROM sys.tables
WHERE [name] IN ('promotions', 'promotion_qualifiers', 'transaction_promotions', 'transaction_items')
ORDER BY [name];
GO

PRINT '';
PRINT '========== MIGRATION COMPLETE ==========';
PRINT 'FEAT-002 promotion schema changes have been applied.';
GO
