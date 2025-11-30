# Visual Guide: Creating HoldOrder Tables

## ??? Step-by-Step Screenshots Guide

### Step 1: Open SQL Server Management Studio
```
Start Menu ? Search "SQL Server Management Studio" ? Click to open
```

### Step 2: Connect to Your Database
```
???????????????????????????????????????
?  Connect to Server Dialog           ?
???????????????????????????????????????
?  Server name: localhost             ?
?  Authentication: [Windows Auth ?]   ?
?  Database: (leave empty)            ?
?  Username: (auto-filled)            ?
?  Password: (not needed)             ?
?                                      ?
?          [Connect]  [Cancel]        ?
???????????????????????????????????????
```

### Step 3: Locate Your Database
```
Object Explorer (Left Panel):
??? ?? Databases
    ??? master
    ??? model
    ??? crazypos_dev  ? Click here!
    ??? tempdb
```

### Step 4: Create New Query
```
Right-click on "crazypos_dev" ? New Query
```

### Step 5: Copy SQL Script
**Copy this entire script:**
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

### Step 6: Paste Into Query Window
```
???????????????????????????????????????????????????
? SSMS Query Window                               ?
???????????????????????????????????????????????????
?  CREATE TABLE hold_order (                      ?
?      id BIGINT PRIMARY KEY IDENTITY(1,1),       ?
?      customer_name NVARCHAR(100) NOT NULL,      ?
?      ...                                         ?
?                                                  ?
?          [Execute - F5]                         ?
???????????????????????????????????????????????????
```

### Step 7: Execute the Script
```
Press: F5
  or click: "Execute" button (or Ctrl+Shift+E)
```

### Step 8: Verify Success
You should see:
```
????????????????????????????????????????
Messages
????????????????????????????????????????
Command(s) completed successfully.

(0 rows affected)
```

### Step 9: Verify Tables Exist
```
In Object Explorer:
crazypos_dev
??? ?? Tables
    ??? categories
    ??? dbo.hold_order ? NEW!
    ??? dbo.hold_order_item ? NEW!
    ??? product
```

Or run this verification query:
```sql
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_NAME IN ('hold_order', 'hold_order_item');
```

Result should show:
```
TABLE_NAME
hold_order
hold_order_item
```

---

## ?? If Something Goes Wrong

### ? "Table already exists"
```
This is fine! The table was created in a previous attempt.
Just proceed to verify it exists.
```

### ? "Invalid object name 'product'"
```
The 'product' table doesn't exist.
Create it first, or it may have a different name.
Check existing tables in Object Explorer.
```

### ? "Login failed"
```
- Check your server name
- Try: (local) or localhost
- Verify SQL Server is running
```

### ? "Command(s) failed"
```
- Copy the error message
- Check TROUBLESHOOTING.md
- Run one command at a time to find the issue
```

---

## ? Verification Queries

Run these after execution to double-check:

### Check if tables exist:
```sql
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_NAME IN ('hold_order', 'hold_order_item');
```

### Check table structure:
```sql
EXEC sp_columns 'hold_order';
EXEC sp_columns 'hold_order_item';
```

### Check foreign keys:
```sql
SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
WHERE TABLE_NAME IN ('hold_order', 'hold_order_item') 
AND CONSTRAINT_TYPE = 'FOREIGN KEY';
```

### Count rows (should be 0):
```sql
SELECT COUNT(*) FROM hold_order;
SELECT COUNT(*) FROM hold_order_item;
```

---

## ?? Success!

If you see the tables in Object Explorer, you're done!

Now:
1. Close SSMS
2. Restart your application
3. Test the "On Hold" feature
4. Watch orders get saved to the database

---

## ?? Reference

| Object | Description |
|--------|-------------|
| hold_order | Stores hold orders (like a header) |
| hold_order_item | Stores items in each order (like line items) |
| id | Unique identifier for each record |
| IDENTITY(1,1) | Auto-increment starting from 1 |
| BIGINT | Large number type |
| NVARCHAR | Text field |
| DECIMAL(18,2) | Currency/price field |
| DEFAULT | Automatic value if not provided |
| FOREIGN KEY | Link to another table |
| ON DELETE CASCADE | Delete items when order is deleted |

---

## ?? You're All Set!

The database is ready, the application is compiled, and you're ready to use the On Hold feature!
