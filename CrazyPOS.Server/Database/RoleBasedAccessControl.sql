-- Role-Based Access Control Database Schema
-- This script adds role definitions and permissions to support Cashier and Admin roles

-- ============================================================================
-- Create Role Definitions Table
-- ============================================================================
CREATE TABLE [dbo].[Roles] (
    [RoleId] BIGINT PRIMARY KEY IDENTITY(1,1),
    [RoleName] NVARCHAR(50) NOT NULL UNIQUE,
    [Description] NVARCHAR(255),
    [IsActive] BIT NOT NULL DEFAULT 1,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NULL
);

-- ============================================================================
-- Create Permissions Table
-- ============================================================================
CREATE TABLE [dbo].[Permissions] (
    [PermissionId] BIGINT PRIMARY KEY IDENTITY(1,1),
    [PermissionCode] NVARCHAR(100) NOT NULL UNIQUE,
    [PermissionName] NVARCHAR(150) NOT NULL,
    [Description] NVARCHAR(255),
    [Module] NVARCHAR(50) NOT NULL, -- Sales, Inventory, Reports, Users, Settings
    [IsActive] BIT NOT NULL DEFAULT 1,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- ============================================================================
-- Create Role-Permission Mapping Table
-- ============================================================================
CREATE TABLE [dbo].[RolePermissions] (
    [RolePermissionId] BIGINT PRIMARY KEY IDENTITY(1,1),
    [RoleId] BIGINT NOT NULL,
    [PermissionId] BIGINT NOT NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [FK_RolePermissions_Roles] FOREIGN KEY ([RoleId]) REFERENCES [dbo].[Roles]([RoleId]),
    CONSTRAINT [FK_RolePermissions_Permissions] FOREIGN KEY ([PermissionId]) REFERENCES [dbo].[Permissions]([PermissionId]),
    CONSTRAINT [UQ_RolePermissions] UNIQUE ([RoleId], [PermissionId])
);

-- ============================================================================
-- Create Audit Log Table for tracking user actions
-- ============================================================================
CREATE TABLE [dbo].[AuditLogs] (
    [AuditLogId] BIGINT PRIMARY KEY IDENTITY(1,1),
    [UserId] BIGINT NOT NULL,
    [Action] NVARCHAR(100) NOT NULL,
    [Module] NVARCHAR(50) NOT NULL,
    [EntityType] NVARCHAR(100),
    [EntityId] BIGINT,
    [OldValue] NVARCHAR(MAX),
    [NewValue] NVARCHAR(MAX),
    [Status] NVARCHAR(20), -- Success, Failed
    [IPAddress] NVARCHAR(45),
    [UserAgent] NVARCHAR(500),
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [FK_AuditLogs_Users] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users]([user_id])
);

-- ============================================================================
-- Insert Default Roles
-- ============================================================================
INSERT INTO [dbo].[Roles] ([RoleName], [Description], [IsActive])
VALUES 
    ('Admin', 'Administrator - Full access to all features', 1),
    ('Manager', 'Manager - Access to sales and reports', 1),
    ('Cashier', 'Cashier - Limited to POS operations', 1)
--ON CONFLICT DO NOTHING;

-- ============================================================================
-- Insert Permissions
-- ============================================================================

-- Sales Module Permissions
INSERT INTO [dbo].[Permissions] ([PermissionCode], [PermissionName], [Description], [Module], [IsActive])
VALUES 
    ('SALES_CREATE', 'Create Sale', 'Can create new sales transactions', 'Sales', 1),
    ('SALES_VIEW', 'View Sales', 'Can view sales transactions', 'Sales', 1),
    ('SALES_EDIT', 'Edit Sale', 'Can edit existing sales', 'Sales', 1),
    ('SALES_DELETE', 'Delete Sale', 'Can delete sales transactions', 'Sales', 1),
    ('SALES_VOID', 'Void Sale', 'Can void completed transactions', 'Sales', 1),
    ('SALES_REFUND', 'Process Refund', 'Can process refunds', 'Sales', 1),
    ('SALES_HOLD', 'Hold Sale', 'Can hold orders for later', 'Sales', 1),
    ('SALES_DISCOUNT', 'Apply Discount', 'Can apply discounts to sales', 'Sales', 1)
--ON CONFLICT DO NOTHING;

-- Inventory Module Permissions
INSERT INTO [dbo].[Permissions] ([PermissionCode], [PermissionName], [Description], [Module], [IsActive])
VALUES 
    ('INVENTORY_VIEW', 'View Inventory', 'Can view inventory levels', 'Inventory', 1),
    ('INVENTORY_ADJUST', 'Adjust Inventory', 'Can adjust stock levels', 'Inventory', 1),
    ('INVENTORY_ADD', 'Add Products', 'Can add new products', 'Inventory', 1),
    ('INVENTORY_EDIT', 'Edit Products', 'Can edit product details', 'Inventory', 1),
    ('INVENTORY_DELETE', 'Delete Products', 'Can delete products', 'Inventory', 1)
--ON CONFLICT DO NOTHING;

-- Reports Module Permissions
INSERT INTO [dbo].[Permissions] ([PermissionCode], [PermissionName], [Description], [Module], [IsActive])
VALUES 
    ('REPORTS_VIEW', 'View Reports', 'Can view reports', 'Reports', 1),
    ('REPORTS_EXPORT', 'Export Reports', 'Can export reports', 'Reports', 1),
    ('REPORTS_DAILY', 'Daily Reports', 'Can view daily sales reports', 'Reports', 1),
    ('REPORTS_DETAILED', 'Detailed Reports', 'Can view detailed transaction reports', 'Reports', 1)
--ON CONFLICT DO NOTHING;

-- Users Module Permissions
INSERT INTO [dbo].[Permissions] ([PermissionCode], [PermissionName], [Description], [Module], [IsActive])
VALUES 
    ('USERS_VIEW', 'View Users', 'Can view user list', 'Users', 1),
    ('USERS_CREATE', 'Create Users', 'Can create new users', 'Users', 1),
    ('USERS_EDIT', 'Edit Users', 'Can edit user details', 'Users', 1),
    ('USERS_DELETE', 'Delete Users', 'Can delete users', 'Users', 1),
    ('USERS_DEACTIVATE', 'Deactivate Users', 'Can deactivate user accounts', 'Users', 1)
--ON CONFLICT DO NOTHING;

-- Settings Module Permissions
INSERT INTO [dbo].[Permissions] ([PermissionCode], [PermissionName], [Description], [Module], [IsActive])
VALUES 
    ('SETTINGS_VIEW', 'View Settings', 'Can view system settings', 'Settings', 1),
    ('SETTINGS_EDIT', 'Edit Settings', 'Can modify system settings', 'Settings', 1),
    ('SETTINGS_BACKUP', 'Backup System', 'Can backup system data', 'Settings', 1),
    ('SETTINGS_AUDIT', 'View Audit Logs', 'Can view audit logs', 'Settings', 1)
--ON CONFLICT DO NOTHING;

-- ============================================================================
-- Assign Permissions to ADMIN Role
-- ============================================================================
INSERT INTO [dbo].[RolePermissions] ([RoleId], [PermissionId])
SELECT r.[RoleId], p.[PermissionId]
FROM [dbo].[Roles] r
CROSS JOIN [dbo].[Permissions] p
WHERE r.[RoleName] = 'Admin'
--ON CONFLICT DO NOTHING;

-- ============================================================================
-- Assign Permissions to MANAGER Role
-- ============================================================================
INSERT INTO [dbo].[RolePermissions] ([RoleId], [PermissionId])
SELECT r.[RoleId], p.[PermissionId]
FROM [dbo].[Roles] r
CROSS JOIN [dbo].[Permissions] p
WHERE r.[RoleName] = 'Manager'
AND p.[PermissionCode] IN (
    'SALES_CREATE', 'SALES_VIEW', 'SALES_EDIT', 'SALES_DISCOUNT', 'SALES_REFUND',
    'INVENTORY_VIEW',
    'REPORTS_VIEW', 'REPORTS_EXPORT', 'REPORTS_DAILY', 'REPORTS_DETAILED',
    'USERS_VIEW'
)
--ON CONFLICT DO NOTHING;

-- ============================================================================
-- Assign Permissions to CASHIER Role
-- ============================================================================
INSERT INTO [dbo].[RolePermissions] ([RoleId], [PermissionId])
SELECT r.[RoleId], p.[PermissionId]
FROM [dbo].[Roles] r
CROSS JOIN [dbo].[Permissions] p
WHERE r.[RoleName] = 'Cashier'
AND p.[PermissionCode] IN (
    'SALES_CREATE', 'SALES_VIEW', 'SALES_HOLD', 'SALES_DISCOUNT',
    'INVENTORY_VIEW'
)
--ON CONFLICT DO NOTHING;

-- ============================================================================
-- Create Index for better performance
-- ============================================================================
CREATE INDEX [IX_RolePermissions_RoleId] ON [dbo].[RolePermissions]([RoleId]);
CREATE INDEX [IX_AuditLogs_UserId] ON [dbo].[AuditLogs]([UserId]);
CREATE INDEX [IX_AuditLogs_CreatedAt] ON [dbo].[AuditLogs]([CreatedAt]);
CREATE INDEX [IX_Permissions_Module] ON [dbo].[Permissions]([Module]);

PRINT 'Role-Based Access Control schema created successfully!';
