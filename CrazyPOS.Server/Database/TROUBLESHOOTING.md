# Troubleshooting Guide

## Common Issues and Solutions

### ? Error: "Invalid column name 'customer_name'"

**Cause:** Tables were created but the application is looking for wrong column name

**Solution:**
Verify the exact column names in SQL Server:
```sql
EXEC sp_columns 'hold_order'
```

Should show columns with underscores:
- customer_name
- order_date
- status
- total_amount

---

### ? Error: "There is already an object named 'hold_order'"

**Cause:** Table already exists from a previous attempt

**Solution (Option 1):**
Drop and recreate:
```sql
DROP TABLE hold_order_item;
DROP TABLE hold_order;
-- Then run the creation script again
```

**Solution (Option 2):**
Just use the script with `IF NOT EXISTS` checks (CreateHoldOrderTables.sql)

---

### ? Error: "Foreign key constraint fail"

**Cause:** The product table doesn't exist or productid is not a primary key

**Solution:**
Check if product table exists:
```sql
SELECT * FROM product LIMIT 5;
```

If it doesn't exist, you need to create it first.

---

### ? Error: "Cannot drop table 'hold_order_item' because it is being referenced"

**Cause:** Foreign key still exists

**Solution:**
Drop child table first:
```sql
DROP TABLE hold_order_item;
DROP TABLE hold_order;
```

---

### ? Application says "Table does not exist" after creation

**Cause:** Application hasn't refreshed the schema cache

**Solution:**
1. Stop the application
2. Restart Visual Studio
3. Run the application again

---

### ? "Login failed" or "Cannot connect to database"

**Cause:** Database connection string is wrong

**Solution:**
Check your `appsettings.json`:
```json
{
  "ConnectionStrings": {
    "Default": "Server=YOUR_SERVER;Database=crazypos_dev;Integrated Security=true;"
  }
}
```

Replace `YOUR_SERVER` with your actual server name (e.g., `localhost` or `(local)`)

---

### ? Error in Visual Studio: "The type initializer for 'Microsoft.Data.SqlClient.SqlConnection' threw an exception"

**Cause:** Usually a connection string issue

**Solution:**
1. Check connection string in `appsettings.json`
2. Make sure SQL Server is running
3. Verify database exists

Run this to check:
```sql
SELECT DB_NAME();
```

---

## Verification Checklist

? SQL Server is running
- Go to Windows Services (services.msc)
- Look for SQL Server (SQLEXPRESS) or similar
- It should be "Running"

? Database exists
```sql
SELECT name FROM sys.databases WHERE name = 'crazypos_dev';
```

? Tables exist
```sql
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'dbo' 
ORDER BY TABLE_NAME;
```
Should show: categories, hold_order, hold_order_item, product

? Foreign keys exist
```sql
SELECT * FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_NAME IN ('hold_order', 'hold_order_item');
```

---

## Still Having Issues?

### Try this complete fresh setup:

```sql
-- 1. Drop existing tables (if they exist)
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'hold_order_item')
    DROP TABLE hold_order_item;

IF EXISTS (SELECT * FROM sys.tables WHERE name = 'hold_order')
    DROP TABLE hold_order;

-- 2. Create fresh tables
CREATE TABLE hold_order (
    id BIGINT PRIMARY KEY IDENTITY(1,1),
    customer_name NVARCHAR(100) NOT NULL,
    order_date DATETIME NOT NULL DEFAULT GETUTCDATE(),
    status NVARCHAR(50) NOT NULL DEFAULT 'Active',
    total_amount DECIMAL(18, 2) NOT NULL DEFAULT 0
);

CREATE TABLE hold_order_item (
    id BIGINT PRIMARY KEY IDENTITY(1,1),
    hold_order_id BIGINT NOT NULL,
    productid BIGINT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(18, 2) NOT NULL,
    FOREIGN KEY (hold_order_id) REFERENCES hold_order(id) ON DELETE CASCADE,
    FOREIGN KEY (productid) REFERENCES product(productid) ON DELETE CASCADE
);

CREATE INDEX IX_hold_order_status ON hold_order(status);
CREATE INDEX IX_hold_order_item_hold_order_id ON hold_order_item(hold_order_id);

-- 3. Verify
SELECT 'Setup Complete!' AS Status;
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_NAME IN ('hold_order', 'hold_order_item');
```

---

## Contact Information

If you continue to have issues:
1. Check your SQL Server version (should be 2016 or later)
2. Verify .NET 8 is installed
3. Check that Entity Framework Core 8.0.8 is in your packages
4. Review the connection string spelling exactly
