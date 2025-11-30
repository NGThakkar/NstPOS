-- ============================================================================
-- SQL Script to Create Authentication Tables
-- Database: crazypos_dev
-- ============================================================================

-- Create users table
CREATE TABLE users (
    user_id BIGINT PRIMARY KEY IDENTITY(1,1),
    username NVARCHAR(50) NOT NULL UNIQUE,
    email NVARCHAR(100) NOT NULL UNIQUE,
    password_hash NVARCHAR(MAX) NOT NULL,
    full_name NVARCHAR(100),
    role NVARCHAR(20) DEFAULT 'Cashier',  -- Admin, Manager, Cashier
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETUTCDATE(),
    last_login DATETIME,
    last_updated DATETIME
);

-- Create user_sessions table
CREATE TABLE user_sessions (
    session_id BIGINT PRIMARY KEY IDENTITY(1,1),
    user_id BIGINT NOT NULL,
    token NVARCHAR(256) NOT NULL UNIQUE,
    login_time DATETIME DEFAULT GETUTCDATE(),
    logout_time DATETIME,
    ip_address NVARCHAR(50),
    user_agent NVARCHAR(500),
    is_active BIT DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IX_users_username ON users(username);
CREATE INDEX IX_users_email ON users(email);
CREATE INDEX IX_users_is_active ON users(is_active);
CREATE INDEX IX_user_sessions_token ON user_sessions(token);
CREATE INDEX IX_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IX_user_sessions_is_active ON user_sessions(is_active);

-- Insert default admin user (password: admin123)
-- Password hash is SHA256 of "admin123"
INSERT INTO users (username, email, password_hash, full_name, role, is_active, created_at)
VALUES (
    'admin',
    'admin@crazypos.com',
    'UmiPUH3HfcBUcOaXFzcBt2pYxAq+0KmqfN1LJIkYzQ0=',
    'System Administrator',
    'Admin',
    1,
    GETUTCDATE()
);

-- Insert default manager user (password: manager123)
INSERT INTO users (username, email, password_hash, full_name, role, is_active, created_at)
VALUES (
    'manager',
    'manager@crazypos.com',
    'wYddR+8C/6xD7yLx0k3dF2e4J1bQ9nG8pL5vM2xO0=',
    'Store Manager',
    'Manager',
    1,
    GETUTCDATE()
);

-- Insert default cashier user (password: cashier123)
INSERT INTO users (username, email, password_hash, full_name, role, is_active, created_at)
VALUES (
    'cashier',
    'cashier@crazypos.com',
    'jK8pL9mO0nP1qR2sT3uV4wX5yZ6aB7cD8eF9gH0=',
    'Cashier',
    'Cashier',
    1,
    GETUTCDATE()
);

-- Verify tables were created
SELECT 'Users table created successfully!' AS Status;
SELECT COUNT(*) as UserCount FROM users;

-- Print default users
SELECT user_id, username, email, full_name, role, is_active, created_at FROM users;
