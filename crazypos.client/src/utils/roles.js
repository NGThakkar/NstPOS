import { apiFetch } from './apiClient';

export async function getRoles() {
    return apiFetch('/api/Role/GetRoles');
}

export async function getRole(roleId) {
    return apiFetch(`/api/Role/GetRole?roleId=${roleId}`);
}

export async function getPermissions() {
    return apiFetch('/api/Role/GetPermissions');
}

export async function getUserWithRole(userId) {
    return apiFetch(`/api/Role/GetUserWithRole?userId=${userId}`);
}

export async function hasPermission(userId, permissionCode) {
    try {
        const data = await apiFetch(`/api/Role/HasPermission?userId=${userId}&permissionCode=${encodeURIComponent(permissionCode)}`);
        return data.hasPermission ?? false;
    } catch {
        return false;
    }
}

export async function updateUserRole(userId, newRole) {
    return apiFetch('/api/Role/UpdateUserRole', {
        method: 'POST',
        body: JSON.stringify({ userId, role: newRole }),
    });
}

export async function getAuditLogs(pageNumber = 1, pageSize = 50) {
    return apiFetch(`/api/Role/GetAuditLogs?pageNumber=${pageNumber}&pageSize=${pageSize}`);
}

export async function logAction(userId, action, module, entityType, entityId, status = 'Success') {
    try {
        return await apiFetch('/api/Role/LogAction', {
            method: 'POST',
            body: JSON.stringify({ userId, action, module, entityType, entityId, status }),
        });
    } catch {
        // Audit logging must not block business operations
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
