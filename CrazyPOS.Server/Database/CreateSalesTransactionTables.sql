-- ============================================================================
-- SQL Script to Create Sales/Transaction System Tables
-- Database: crazypos_dev
-- ============================================================================

-- Create sales_transactions table
CREATE TABLE sales_transactions (
    transaction_id BIGINT PRIMARY KEY IDENTITY(1,1),
    transaction_code NVARCHAR(50) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL,
    transaction_date DATETIME DEFAULT GETUTCDATE(),
    subtotal DECIMAL(18, 2) NOT NULL,
    tax_amount DECIMAL(18, 2) NOT NULL,
    total_amount DECIMAL(18, 2) NOT NULL,
    payment_method NVARCHAR(50) NOT NULL,  -- Cash, Card, Mobile, Check
    amount_tendered DECIMAL(18, 2),
    change_amount DECIMAL(18, 2),
    discount_amount DECIMAL(18, 2) DEFAULT 0,
    notes NVARCHAR(MAX),
    status NVARCHAR(20) DEFAULT 'completed',  -- completed, pending, cancelled
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETUTCDATE(),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Create transaction_items table
CREATE TABLE transaction_items (
    item_id BIGINT PRIMARY KEY IDENTITY(1,1),
    transaction_id BIGINT NOT NULL,
    productid BIGINT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(18, 2) NOT NULL,
    discount_percent DECIMAL(5, 2) DEFAULT 0,
    discount_amount DECIMAL(18, 2) DEFAULT 0,
    line_total DECIMAL(18, 2) NOT NULL,
    created_at DATETIME DEFAULT GETUTCDATE(),
    FOREIGN KEY (transaction_id) REFERENCES sales_transactions(transaction_id) ON DELETE CASCADE,
    FOREIGN KEY (productid) REFERENCES product(productid)
);

-- Create payment_methods table
CREATE TABLE payment_methods (
    payment_method_id BIGINT PRIMARY KEY IDENTITY(1,1),
    method_name NVARCHAR(50) NOT NULL UNIQUE,
    description NVARCHAR(MAX),
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETUTCDATE()
);

-- Create barcode_mapping table (for barcode lookups)
CREATE TABLE barcode_mapping (
    barcode_id BIGINT PRIMARY KEY IDENTITY(1,1),
    barcode NVARCHAR(100) NOT NULL UNIQUE,
    productid BIGINT NOT NULL,
    barcode_type NVARCHAR(50),  -- EAN-13, UPC-A, Code128, QR, etc.
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETUTCDATE(),
    FOREIGN KEY (productid) REFERENCES product(productid)
);

-- Create daily_sales_summary table
CREATE TABLE daily_sales_summary (
    summary_id BIGINT PRIMARY KEY IDENTITY(1,1),
    summary_date DATE NOT NULL UNIQUE,
    total_sales DECIMAL(18, 2),
    total_tax DECIMAL(18, 2),
    total_discount DECIMAL(18, 2),
    transaction_count INT,
    items_sold INT,
    created_at DATETIME DEFAULT GETUTCDATE()
);

-- Create payment_tender_log table
CREATE TABLE payment_tender_log (
    tender_id BIGINT PRIMARY KEY IDENTITY(1,1),
    transaction_id BIGINT NOT NULL,
    payment_method NVARCHAR(50) NOT NULL,
    amount_received DECIMAL(18, 2) NOT NULL,
    change_returned DECIMAL(18, 2),
    payment_status NVARCHAR(20),  -- approved, declined, pending
    payment_reference NVARCHAR(100),
    notes NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETUTCDATE(),
    FOREIGN KEY (transaction_id) REFERENCES sales_transactions(transaction_id)
);

-- Create indexes for better performance
CREATE INDEX IX_sales_transactions_date ON sales_transactions(transaction_date);
CREATE INDEX IX_sales_transactions_user ON sales_transactions(user_id);
CREATE INDEX IX_sales_transactions_status ON sales_transactions(status);
CREATE INDEX IX_sales_transactions_code ON sales_transactions(transaction_code);
CREATE INDEX IX_transaction_items_transaction ON transaction_items(transaction_id);
CREATE INDEX IX_transaction_items_product ON transaction_items(productid);
CREATE INDEX IX_barcode_mapping_barcode ON barcode_mapping(barcode);
CREATE INDEX IX_barcode_mapping_product ON barcode_mapping(productid);
CREATE INDEX IX_daily_sales_summary_date ON daily_sales_summary(summary_date);
CREATE INDEX IX_payment_tender_log_transaction ON payment_tender_log(transaction_id);

-- Insert default payment methods
INSERT INTO payment_methods (method_name, description, is_active)
VALUES
    ('Cash', 'Cash payment', 1),
    ('Credit Card', 'Credit card payment', 1),
    ('Debit Card', 'Debit card payment', 1),
    ('Mobile Payment', 'Mobile wallet or payment app', 1),
    ('Check', 'Check payment', 1),
    ('Gift Card', 'Gift card payment', 1);

-- Add barcode column to product table if it doesn't already have it
-- (This should already exist, but adding this for completeness)
-- ALTER TABLE product ADD barcode NVARCHAR(100);

-- Verify tables were created
SELECT 'Sales transaction tables created successfully!' AS Status;
SELECT COUNT(*) as PaymentMethodCount FROM payment_methods;

-- Print table structure
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('sales_transactions', 'transaction_items', 'payment_methods', 'barcode_mapping')
ORDER BY table_name, ordinal_position;
