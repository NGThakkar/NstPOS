-- Create Customers table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[customers]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[customers]
    (
        [customer_id] BIGINT PRIMARY KEY IDENTITY(1,1) NOT NULL,
        [customer_code] NVARCHAR(50) NOT NULL UNIQUE,
        [first_name] NVARCHAR(100) NOT NULL,
        [last_name] NVARCHAR(100) NOT NULL,
        [email] NVARCHAR(100),
        [phone_number] NVARCHAR(20),
        [address] NVARCHAR(255),
        [city] NVARCHAR(100),
        [state] NVARCHAR(100),
        [zip_code] NVARCHAR(20),
        [country] NVARCHAR(100),
        [total_purchases] DECIMAL(18, 2) DEFAULT 0,
        [total_outstanding] DECIMAL(18, 2) DEFAULT 0,
        [date_of_birth] DATE,
        [gender] NVARCHAR(10),
        [loyalty_status] NVARCHAR(50) DEFAULT 'Regular',
        [loyalty_points] INT DEFAULT 0,
        [notes] NVARCHAR(MAX),
        [is_active] BIT DEFAULT 1,
        [created_at] DATETIME DEFAULT GETUTCDATE(),
        [last_updated] DATETIME
    );

    -- Create indexes
    CREATE INDEX [IX_customers_code] ON [dbo].[customers]([customer_code]);
    CREATE INDEX [IX_customers_email] ON [dbo].[customers]([email]);
    CREATE INDEX [IX_customers_phone] ON [dbo].[customers]([phone_number]);
    CREATE INDEX [IX_customers_loyalty_status] ON [dbo].[customers]([loyalty_status]);
    CREATE INDEX [IX_customers_is_active] ON [dbo].[customers]([is_active]);
END

-- Alter sales_transactions table to add customer_id
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[sales_transactions]') AND name = 'customer_id')
BEGIN
    ALTER TABLE [dbo].[sales_transactions]
    ADD [customer_id] BIGINT NULL;

    -- Add foreign key constraint
    IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_sales_transactions_customers')
    BEGIN
        ALTER TABLE [dbo].[sales_transactions]
        ADD CONSTRAINT [FK_sales_transactions_customers]
        FOREIGN KEY ([customer_id]) REFERENCES [dbo].[customers]([customer_id]);
    END

    -- Create index
    CREATE INDEX [IX_sales_transactions_customer] ON [dbo].[sales_transactions]([customer_id]);
END

-- Verify tables
SELECT 'Customers table created successfully' AS Message;
SELECT 'Customer ID foreign key added to sales_transactions' AS Message;
