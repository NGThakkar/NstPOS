-- FEAT-004: Advanced Reporting and Analytics
-- Initial reporting summary tables for fast dashboard and analytics queries.

IF OBJECT_ID(N'dbo.hourly_sales_summary', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.hourly_sales_summary
    (
        summary_id BIGINT IDENTITY(1,1) PRIMARY KEY,
        summary_hour DATETIME NOT NULL,
        total_sales DECIMAL(18,2) NOT NULL DEFAULT 0,
        transaction_count INT NOT NULL DEFAULT 0,
        items_sold INT NOT NULL DEFAULT 0,
        avg_transaction DECIMAL(18,2) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT GETUTCDATE(),
        updated_at DATETIME NULL
    );

    CREATE UNIQUE INDEX UX_hourly_sales_summary_hour ON dbo.hourly_sales_summary(summary_hour);
END;
GO

IF OBJECT_ID(N'dbo.cashier_sales_summary', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.cashier_sales_summary
    (
        summary_id BIGINT IDENTITY(1,1) PRIMARY KEY,
        summary_date DATE NOT NULL,
        user_id BIGINT NOT NULL,
        transaction_count INT NOT NULL DEFAULT 0,
        total_sales DECIMAL(18,2) NOT NULL DEFAULT 0,
        total_discount DECIMAL(18,2) NOT NULL DEFAULT 0,
        items_sold INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT GETUTCDATE(),
        updated_at DATETIME NULL,
        CONSTRAINT FK_cashier_sales_summary_user FOREIGN KEY (user_id) REFERENCES dbo.users(user_id)
    );

    CREATE UNIQUE INDEX UX_cashier_sales_summary_date_user ON dbo.cashier_sales_summary(summary_date, user_id);
    CREATE INDEX IX_cashier_sales_summary_user ON dbo.cashier_sales_summary(user_id);
END;
GO

IF OBJECT_ID(N'dbo.category_sales_summary', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.category_sales_summary
    (
        summary_id BIGINT IDENTITY(1,1) PRIMARY KEY,
        summary_date DATE NOT NULL,
        category_id BIGINT NOT NULL,
        quantity_sold INT NOT NULL DEFAULT 0,
        total_revenue DECIMAL(18,2) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT GETUTCDATE(),
        updated_at DATETIME NULL,
        CONSTRAINT FK_category_sales_summary_category FOREIGN KEY (category_id) REFERENCES dbo.categories(categoryid)
    );

    CREATE UNIQUE INDEX UX_category_sales_summary_date_category ON dbo.category_sales_summary(summary_date, category_id);
    CREATE INDEX IX_category_sales_summary_category ON dbo.category_sales_summary(category_id);
END;
GO

IF OBJECT_ID(N'dbo.product_sales_summary', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.product_sales_summary
    (
        summary_id BIGINT IDENTITY(1,1) PRIMARY KEY,
        summary_date DATE NOT NULL,
        product_id BIGINT NOT NULL,
        quantity_sold INT NOT NULL DEFAULT 0,
        total_revenue DECIMAL(18,2) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT GETUTCDATE(),
        updated_at DATETIME NULL,
        CONSTRAINT FK_product_sales_summary_product FOREIGN KEY (product_id) REFERENCES dbo.product(productid)
    );

    CREATE UNIQUE INDEX UX_product_sales_summary_date_product ON dbo.product_sales_summary(summary_date, product_id);
    CREATE INDEX IX_product_sales_summary_product ON dbo.product_sales_summary(product_id);
END;
GO

IF OBJECT_ID(N'dbo.payment_method_summary', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.payment_method_summary
    (
        summary_id BIGINT IDENTITY(1,1) PRIMARY KEY,
        summary_date DATE NOT NULL,
        payment_method NVARCHAR(50) NOT NULL,
        transaction_count INT NOT NULL DEFAULT 0,
        total_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT GETUTCDATE(),
        updated_at DATETIME NULL
    );

    CREATE UNIQUE INDEX UX_payment_method_summary_date_method ON dbo.payment_method_summary(summary_date, payment_method);
END;
GO
