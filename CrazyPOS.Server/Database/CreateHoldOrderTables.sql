-- Create hold_order table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'hold_order')
BEGIN
    CREATE TABLE hold_order (
        id BIGINT PRIMARY KEY IDENTITY(1,1),
        customer_name NVARCHAR(100) NOT NULL,
        order_date DATETIME NOT NULL DEFAULT GETUTCDATE(),
        status NVARCHAR(50) NOT NULL DEFAULT 'Active',
        total_amount DECIMAL(18, 2) NOT NULL DEFAULT 0
    );
    
    PRINT 'Table hold_order created successfully';
END
ELSE
BEGIN
    PRINT 'Table hold_order already exists';
END

-- Create hold_order_item table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'hold_order_item')
BEGIN
    CREATE TABLE hold_order_item (
        id BIGINT PRIMARY KEY IDENTITY(1,1),
        hold_order_id BIGINT NOT NULL,
        productid BIGINT NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(18, 2) NOT NULL,
        CONSTRAINT FK_hold_order_item_hold_order FOREIGN KEY (hold_order_id) 
            REFERENCES hold_order(id) ON DELETE CASCADE,
        CONSTRAINT FK_hold_order_item_product FOREIGN KEY (productid) 
            REFERENCES product(productid) ON DELETE CASCADE
    );
    
    PRINT 'Table hold_order_item created successfully';
END
ELSE
BEGIN
    PRINT 'Table hold_order_item already exists';
END

-- Create indexes for better query performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_hold_order_status' AND object_id = OBJECT_ID('hold_order'))
BEGIN
    CREATE INDEX IX_hold_order_status ON hold_order(status);
    PRINT 'Index IX_hold_order_status created successfully';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_hold_order_item_hold_order_id' AND object_id = OBJECT_ID('hold_order_item'))
BEGIN
    CREATE INDEX IX_hold_order_item_hold_order_id ON hold_order_item(hold_order_id);
    PRINT 'Index IX_hold_order_item_hold_order_id created successfully';
END

-- Verify tables were created
SELECT 'Tables created successfully. Run this script in SQL Server Management Studio.' AS Result;
