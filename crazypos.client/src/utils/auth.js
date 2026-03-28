import { apiFetch, apiUrl } from './apiClient';

// Login does not require an auth token — use raw fetch so it works before any session exists.
export async function loginUser(username, password) {
    const response = await fetch(apiUrl('/api/Auth/Login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    const contentType = response.headers.get('content-type');
    const data = contentType?.includes('application/json')
        ? await response.json()
        : { message: await response.text() };
    if (!response.ok) throw new Error(data.message ?? `HTTP Error: ${response.status}`);
    return data;
}

export async function registerUser(userData) {
    return apiFetch('/api/Auth/Register', {
        method: 'POST',
        body: JSON.stringify(userData),
    });
}

export async function logoutUser(token) {
    const data = await apiFetch('/api/Auth/Logout', {
        method: 'POST',
        body: JSON.stringify({ token }),
    });
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('authExpiresAt');
    sessionStorage.removeItem('user');
    return data;
}

// ValidateToken is intentionally unauthenticated (used to verify stored token on startup).
export async function validateToken(token) {
    const response = await fetch(apiUrl(`/api/Auth/ValidateToken?token=${encodeURIComponent(token)}`), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    const data = response.headers.get('content-type')?.includes('application/json')
        ? await response.json()
        : { message: await response.text() };
    if (!response.ok) throw new Error(data.message ?? `HTTP Error: ${response.status}`);
    return data;
}

export async function changePassword(userId, currentPassword, newPassword) {
    return apiFetch('/api/Auth/ChangePassword', {
        method: 'POST',
        body: JSON.stringify({ userId, currentPassword, newPassword }),
    });
}

export async function getUsers() {
    return apiFetch('/api/Auth/GetUsers');
}

export async function deactivateUser(userId) {
    return apiFetch(`/api/Auth/DeactivateUser?userId=${userId}`, { method: 'POST' });
}

export async function reactivateUser(userId) {
    return apiFetch(`/api/Auth/ReactivateUser?userId=${userId}`, { method: 'POST' });
}

export async function createUser(userData) {
    return apiFetch('/api/Auth/CreateUser', {
        method: 'POST',
        body: JSON.stringify(userData),
    });
}

export async function updateUser(userId, userData) {
    return apiFetch(`/api/Auth/UpdateUser/UpdateUser/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
    });
}

export async function changeUserPassword(userId, currentPassword, newPassword) {
    return apiFetch(`/api/Auth/ChangeUserPassword/ChangeUserPassword/${userId}`, {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
    });
}

export function getStoredToken() {
    return sessionStorage.getItem('authToken');
}

export function getStoredUser() {
    const user = sessionStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

export function isUserAuthenticated() {
    return !!sessionStorage.getItem('authToken') && !!sessionStorage.getItem('user');
}
