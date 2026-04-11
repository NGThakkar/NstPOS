-- ============================================================================
-- FEAT-003: Refunds and Returns Management
-- Permissions and Role Configuration Script
-- ============================================================================

-- Step 1: Add new permissions for return operations
-- These permissions control access to return creation, approval, and settlement

IF NOT EXISTS (SELECT * FROM [dbo].[Permissions] WHERE [PermissionCode] = 'SALES_RETURN_CREATE')
BEGIN
    INSERT INTO [dbo].[Permissions] ([PermissionCode], [PermissionName], [Description], [Module], [IsActive])
    VALUES ('SALES_RETURN_CREATE', 'Create Return', 'Can initiate post-sale returns', 'Sales', 1);
    PRINT 'Added SALES_RETURN_CREATE permission';
END

IF NOT EXISTS (SELECT * FROM [dbo].[Permissions] WHERE [PermissionCode] = 'SALES_RETURN_APPROVE')
BEGIN
    INSERT INTO [dbo].[Permissions] ([PermissionCode], [PermissionName], [Description], [Module], [IsActive])
    VALUES ('SALES_RETURN_APPROVE', 'Approve Return', 'Can approve high-value or aged returns', 'Sales', 1);
    PRINT 'Added SALES_RETURN_APPROVE permission';
END

IF NOT EXISTS (SELECT * FROM [dbo].[Permissions] WHERE [PermissionCode] = 'SALES_REFUND_SETTLE')
BEGIN
    INSERT INTO [dbo].[Permissions] ([PermissionCode], [PermissionName], [Description], [Module], [IsActive])
    VALUES ('SALES_REFUND_SETTLE', 'Settle Refund', 'Can record and settle refund payments', 'Sales', 1);
    PRINT 'Added SALES_REFUND_SETTLE permission';
END

-- Step 2: Assign return/refund permissions to Admin role (has all permissions)
-- Admin role already has all permissions, so no changes needed; just log it
PRINT 'Admin role has full access to return/refund operations (all permissions assigned)';

-- Step 3: Assign return/refund permissions to Manager role
-- Managers should be able to create, approve, and settle returns
DECLARE @ManagerRoleId BIGINT;
SELECT @ManagerRoleId = [RoleId] FROM [dbo].[Roles] WHERE [RoleName] = 'Manager';

IF @ManagerRoleId IS NOT NULL
BEGIN
    DECLARE @PermissionIds TABLE (PermissionId BIGINT);
    
    INSERT INTO @PermissionIds
    SELECT [PermissionId] FROM [dbo].[Permissions]
    WHERE [PermissionCode] IN ('SALES_RETURN_CREATE', 'SALES_RETURN_APPROVE', 'SALES_REFUND_SETTLE');
    
    INSERT INTO [dbo].[RolePermissions] ([RoleId], [PermissionId], [CreatedAt])
    SELECT @ManagerRoleId, p.[PermissionId], GETUTCDATE()
    FROM @PermissionIds p
    WHERE NOT EXISTS (
        SELECT 1
        FROM [dbo].[RolePermissions] rp
        WHERE rp.[RoleId] = @ManagerRoleId
          AND rp.[PermissionId] = p.[PermissionId]
    );
    
    PRINT 'Assigned return/refund permissions to Manager role';
END

-- Step 4: Assign limited return permissions to Cashier role
-- Cashiers can create returns but cannot approve high-value returns or directly settle refunds
DECLARE @CashierRoleId BIGINT;
SELECT @CashierRoleId = [RoleId] FROM [dbo].[Roles] WHERE [RoleName] = 'Cashier';

IF @CashierRoleId IS NOT NULL
BEGIN
    DECLARE @CashierPermissionIds TABLE (PermissionId BIGINT);
    
    INSERT INTO @CashierPermissionIds
    SELECT [PermissionId] FROM [dbo].[Permissions]
    WHERE [PermissionCode] = 'SALES_RETURN_CREATE';
    
    INSERT INTO [dbo].[RolePermissions] ([RoleId], [PermissionId], [CreatedAt])
    SELECT @CashierRoleId, p.[PermissionId], GETUTCDATE()
    FROM @CashierPermissionIds p
    WHERE NOT EXISTS (
        SELECT 1
        FROM [dbo].[RolePermissions] rp
        WHERE rp.[RoleId] = @CashierRoleId
          AND rp.[PermissionId] = p.[PermissionId]
    );
    
    PRINT 'Assigned return creation permission to Cashier role (limited access)';
END

-- Step 5: Update SALES_REFUND permission description to distinguish from SALES_REFUND_SETTLE
-- The old SALES_REFUND permission may refer to simple refunds,
-- while SALES_REFUND_SETTLE is specifically for tracking settlement state
IF EXISTS (SELECT * FROM [dbo].[Permissions] WHERE [PermissionCode] = 'SALES_REFUND')
BEGIN
    UPDATE [dbo].[Permissions]
    SET [Description] = 'Process legacy refunds (deprecated; use SALES_RETURN_CREATE for post-sale returns)'
    WHERE [PermissionCode] = 'SALES_REFUND';
    
    PRINT 'Updated SALES_REFUND permission description';
END

-- Final validation and summary
SELECT 'FEAT-003 Permissions configured successfully!' AS Message;

PRINT '';
PRINT '=== Return/Refund Permissions Summary ===';
PRINT 'New permissions created:';
PRINT '  - SALES_RETURN_CREATE: Can initiate post-sale returns (Cashier+, Manager, Admin)';
PRINT '  - SALES_RETURN_APPROVE: Can approve high-value returns (Manager, Admin only)';
PRINT '  - SALES_REFUND_SETTLE: Can record and settle refund payments (Manager, Admin only)';
PRINT '';
PRINT 'Role assignments:';
SELECT 
    r.[RoleName] AS [Role],
    STUFF((
        SELECT ', ' + p2.[PermissionCode]
        FROM [dbo].[RolePermissions] rp2
        JOIN [dbo].[Permissions] p2 ON rp2.[PermissionId] = p2.[PermissionId]
        WHERE rp2.[RoleId] = r.[RoleId]
          AND p2.[PermissionCode] IN ('SALES_RETURN_CREATE', 'SALES_RETURN_APPROVE', 'SALES_REFUND_SETTLE')
        ORDER BY p2.[PermissionCode]
        FOR XML PATH(''), TYPE
    ).value('.', 'NVARCHAR(MAX)'), 1, 2, '') AS [ReturnPermissions]
FROM [dbo].[Roles] r
WHERE EXISTS (
    SELECT 1
    FROM [dbo].[RolePermissions] rp
    JOIN [dbo].[Permissions] p ON rp.[PermissionId] = p.[PermissionId]
    WHERE rp.[RoleId] = r.[RoleId]
      AND p.[PermissionCode] IN ('SALES_RETURN_CREATE', 'SALES_RETURN_APPROVE', 'SALES_REFUND_SETTLE')
)
ORDER BY r.[RoleName];

PRINT '=== Permissions Configuration Complete ===';
