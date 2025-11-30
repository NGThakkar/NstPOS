-- ============================================================================
-- SQL Script to Create Inventory Tables
-- Database: crazypos_dev
-- ============================================================================

-- Create inventory table
CREATE TABLE inventory (
    id BIGINT PRIMARY KEY IDENTITY(1,1),
    productid BIGINT NOT NULL,
    quantity INT NOT NULL,
    movement_type NVARCHAR(50),
    reference NVARCHAR(100),
    created_at DATETIME DEFAULT GETUTCDATE(),
    created_by NVARCHAR(100),
    notes NVARCHAR(500),
    FOREIGN KEY (productid) REFERENCES product(productid) ON DELETE CASCADE
);

-- Create inventory_audit table
CREATE TABLE inventory_audit (
    id BIGINT PRIMARY KEY IDENTITY(1,1),
    inventoryid BIGINT NOT NULL,
    change_amount INT NOT NULL,
    change_date DATETIME DEFAULT GETUTCDATE(),
    FOREIGN KEY (inventoryid) REFERENCES inventory(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IX_inventory_productid ON inventory(productid);
CREATE INDEX IX_inventory_created_at ON inventory(created_at);
CREATE INDEX IX_inventory_movement_type ON inventory(movement_type);
CREATE INDEX IX_inventory_audit_inventoryid ON inventory_audit(inventoryid);

-- Verify tables were created
SELECT 'Tables created successfully!' AS Status;
