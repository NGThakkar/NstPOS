# How to Create HoldOrder Tables in SQL Server

Since your project doesn't use Entity Framework Migrations, you need to manually create the tables in SQL Server.

## Method 1: Using SQL Server Management Studio (SSMS) - **RECOMMENDED**

### Steps:
1. **Open SQL Server Management Studio**
2. **Connect to your database** (crazypos_dev)
3. **Open a New Query Window**
   - Right-click on your database ? New Query
4. **Copy and paste the SQL script** from `CreateHoldOrderTables.sql`
5. **Execute the script** (Press F5 or click Execute)
6. **Verify the tables were created:**
   - In Object Explorer, expand your database
   - Go to Tables
   - You should see:
     - `hold_order`
     - `hold_order_item`

## Method 2: Using Command Line (PowerShell/CMD)

If you have `sqlcmd` installed:

```powershell
sqlcmd -S YOUR_SERVER_NAME -d crazypos_dev -U YOUR_USERNAME -P YOUR_PASSWORD -i "CrazyPOS.Server\Database\CreateHoldOrderTables.sql"
```

Replace:
- `YOUR_SERVER_NAME` - Your SQL Server instance (e.g., localhost, DESKTOP-ABC123)
- `YOUR_USERNAME` - Your SQL Server username
- `YOUR_PASSWORD` - Your SQL Server password

## Table Structure

### hold_order table:
```
- id (BIGINT, Primary Key, Auto Increment)
- customer_name (NVARCHAR(100), Required)
- order_date (DATETIME, Required, Default: Current Date/Time)
- status (NVARCHAR(50), Required, Default: 'Active')
- total_amount (DECIMAL(18,2), Required, Default: 0)
```

### hold_order_item table:
```
- id (BIGINT, Primary Key, Auto Increment)
- hold_order_id (BIGINT, Required, Foreign Key ? hold_order.id)
- productid (BIGINT, Required, Foreign Key ? product.productid)
- quantity (INT, Required)
- price (DECIMAL(18,2), Required)
```

## Verification

After running the script, verify with these SQL commands:

### Check if tables exist:
```sql
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_NAME IN ('hold_order', 'hold_order_item')
```

### Check table structure:
```sql
-- For hold_order
EXEC sp_columns 'hold_order'

-- For hold_order_item
EXEC sp_columns 'hold_order_item'
```

### Check foreign keys:
```sql
SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
WHERE TABLE_NAME IN ('hold_order', 'hold_order_item') AND CONSTRAINT_TYPE = 'FOREIGN KEY'
```

## Troubleshooting

### Error: "There is already an object named 'hold_order'"
- The table already exists, which is fine. The script includes a check to prevent this.

### Error: "Invalid object name 'product'"
- Make sure the `product` table exists first. Run your existing database setup before this script.

### Error: "Foreign key constraint fail"
- Ensure the `product` table exists and has productid as primary key
- Check that categoryid foreign key exists in product table

## Next Steps

1. ? Run the SQL script in SQL Server
2. ? Verify tables were created
3. ? Test the application
4. ? The application should now be able to:
   - Create hold orders
   - Store items in hold orders
   - Retrieve hold orders
   - Delete hold orders

## Additional Notes

- The script is **idempotent** - it can be run multiple times safely
- Foreign keys are set to `ON DELETE CASCADE` - deleting a hold order will automatically delete its items
- Indexes are created for performance optimization on frequently queried columns
- The `order_date` column uses `GETUTCDATE()` for UTC timestamps

---

**For questions or issues, check that:**
1. Database connection string in `appsettings.json` is correct
2. The `product` table exists
3. You have proper permissions to create tables
