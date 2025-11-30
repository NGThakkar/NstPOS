-- ============================================================================
-- SQL Script to Create HoldOrder Tables
-- Database: crazypos_dev
-- ============================================================================

-- Create hold_order table
CREATE TABLE hold_order (
    id BIGINT PRIMARY KEY IDENTITY(1,1),
    customer_name NVARCHAR(100) NOT NULL,
    order_date DATETIME NOT NULL DEFAULT GETUTCDATE(),
    status NVARCHAR(50) NOT NULL DEFAULT 'Active',
    total_amount DECIMAL(18, 2) NOT NULL DEFAULT 0
);

-- Create hold_order_item table with foreign keys
CREATE TABLE hold_order_item (
    id BIGINT PRIMARY KEY IDENTITY(1,1),
    hold_order_id BIGINT NOT NULL,
    productid BIGINT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(18, 2) NOT NULL,
    FOREIGN KEY (hold_order_id) REFERENCES hold_order(id) ON DELETE CASCADE,
    FOREIGN KEY (productid) REFERENCES product(productid) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IX_hold_order_status ON hold_order(status);
CREATE INDEX IX_hold_order_item_hold_order_id ON hold_order_item(hold_order_id);

-- Verify tables were created
SELECT 'Tables created successfully!' AS Status;
