const API_BASE_URL = "http://localhost:5053/api/Role";

/**
 * Get all roles with their permissions
 */
export async function getRoles() {
    try {
        const response = await fetch(`${API_BASE_URL}/GetRoles`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch roles');
        }

        return data;
    } catch (error) {
        console.error('Get roles error:', error);
        throw error;
    }
}

/**
 * Get specific role
 */
export async function getRole(roleId) {
    try {
        const response = await fetch(`${API_BASE_URL}/GetRole?roleId=${roleId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch role');
        }

        return data;
    } catch (error) {
        console.error('Get role error:', error);
        throw error;
    }
}

/**
 * Get all permissions
 */
export async function getPermissions() {
    try {
        const response = await fetch(`${API_BASE_URL}/GetPermissions`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch permissions');
        }

        return data;
    } catch (error) {
        console.error('Get permissions error:', error);
        throw error;
    }
}

/**
 * Get user with role and permissions
 */
export async function getUserWithRole(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/GetUserWithRole?userId=${userId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch user');
        }

        return data;
    } catch (error) {
        console.error('Get user with role error:', error);
        throw error;
    }
}

/**
 * Check if user has specific permission
 */
export async function hasPermission(userId, permissionCode) {
    try {
        const response = await fetch(`${API_BASE_URL}/HasPermission?userId=${userId}&permissionCode=${permissionCode}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to check permission');
        }

        return data.hasPermission;
    } catch (error) {
        console.error('Check permission error:', error);
        return false;
    }
}

/**
 * Update user role (Admin only)
 */
export async function updateUserRole(userId, newRole) {
    try {
        const response = await fetch(`${API_BASE_URL}/UpdateUserRole`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                userId,
                role: newRole
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to update user role');
        }

        return data;
    } catch (error) {
        console.error('Update user role error:', error);
        throw error;
    }
}

/**
 * Get audit logs
 */
export async function getAuditLogs(pageNumber = 1, pageSize = 50) {
    try {
        const response = await fetch(`${API_BASE_URL}/GetAuditLogs?pageNumber=${pageNumber}&pageSize=${pageSize}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch audit logs');
        }

        return data;
    } catch (error) {
        console.error('Get audit logs error:', error);
        throw error;
    }
}

/**
 * Log user action
 */
export async function logAction(userId, action, module, entityType, entityId, status = 'Success') {
    try {
        const response = await fetch(`${API_BASE_URL}/LogAction`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                userId,
                action,
                module,
                entityType,
                entityId,
                status
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to log action');
        }

        return data;
    } catch (error) {
        console.error('Log action error:', error);
        // Don't throw - audit logging shouldn't block operations
        return { success: false };
    }
}

/**
 * Check if current user has permission
 * Uses cached permissions from session storage if available
 */
export function canPerform(permissionCode) {
    const cachedPermissions = JSON.parse(sessionStorage.getItem('userPermissions') || '[]');
    
    return cachedPermissions.includes(permissionCode);
}

/**
 * Get user role from session
 */
export function getUserRole() {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    return user.role || 'Cashier';
}

/**
 * Cache user permissions in session storage
 */
export function cacheUserPermissions(permissions) {
    sessionStorage.setItem('userPermissions', JSON.stringify(permissions));
}

/**
 * Check if user is admin
 */
export function isAdmin() {
    return getUserRole() === 'Admin';
}

/**
 * Check if user is manager or admin
 */
export function isManagerOrAdmin() {
    const role = getUserRole();
    return role === 'Admin' || role === 'Manager';
}

/**
 * Check if user is cashier
 */
export function isCashier() {
    return getUserRole() === 'Cashier';
}
