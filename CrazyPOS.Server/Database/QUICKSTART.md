# Quick Start: Create HoldOrder Tables

## ? Fastest Way (2 minutes)

### 1. Open SQL Server Management Studio
- Search for "SQL Server Management Studio" on your computer
- Open it

### 2. Connect to Your Database
- In the "Connect to Server" dialog:
  - **Server name:** (Usually `localhost` or your server name)
  - **Authentication:** Windows Authentication (or SQL Server Authentication)
  - Click **Connect**

### 3. Create the Tables
- In Object Explorer, expand your server and find **crazypos_dev** database
- Right-click on **crazypos_dev** ? **New Query**
- Copy the SQL below and paste it:

```sql
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
```

### 4. Execute
- Press **F5** or click **Execute** button
- You should see: "Command(s) completed successfully"

## ? Verify It Worked

### Option A: Using SSMS
In Object Explorer:
1. Expand **crazypos_dev** ? **Tables**
2. You should see:
   - `dbo.hold_order` ?
   - `dbo.hold_order_item` ?

### Option B: Using SQL Query
Run this query to verify:
```sql
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_NAME IN ('hold_order', 'hold_order_item');
```

Should return:
- hold_order
- hold_order_item

## ?? That's It!

Your tables are now created and the application should work!

---

## Files Reference
- Full script with checks: `CreateHoldOrderTables.sql`
- Simple script: `CreateTables_Simple.sql`
- Detailed guide: `README.md`
