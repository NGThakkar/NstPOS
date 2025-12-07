const API_BASE_URL = "http://localhost:5053/api/Auth";

export async function loginUser(username, password) {
    try {
        const response = await fetch(API_BASE_URL + "/Login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }

        return data;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

export async function registerUser(userData) {
    try {
        const response = await fetch(API_BASE_URL + "/Register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Registration failed');
        }

        return data;
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}

export async function logoutUser(token) {
    try {
        const response = await fetch(API_BASE_URL + "/Logout", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ token })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Logout failed');
        }

        // Clear local storage
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');

        return data;
    } catch (error) {
        console.error('Logout error:', error);
        throw error;
    }
}

export async function validateToken(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/ValidateToken?token=${token}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Token validation failed');
        }

        return data;
    } catch (error) {
        console.error('Token validation error:', error);
        throw error;
    }
}

export async function changePassword(userId, currentPassword, newPassword) {
    try {
        const response = await fetch(API_BASE_URL + "/ChangePassword", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ userId, currentPassword, newPassword })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Password change failed');
        }

        return data;
    } catch (error) {
        console.error('Password change error:', error);
        throw error;
    }
}

export async function getUsers() {
    try {
        const response = await fetch(API_BASE_URL + "/GetUsers", {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch users');
        }

        return data;
    } catch (error) {
        console.error('Get users error:', error);
        throw error;
    }
}

export async function deactivateUser(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/DeactivateUser?userId=${userId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to deactivate user');
        }

        return data;
    } catch (error) {
        console.error('Deactivate user error:', error);
        throw error;
    }
}

export function getStoredToken() {
    //return localStorage.getItem('authToken');
    return sessionStorage.getItem('authToken');
}

export function getStoredUser() {
    //const user = localStorage.getItem('user');
    const user = sessionStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

export function isUserAuthenticated() {
    //return !!localStorage.getItem('authToken') && !!localStorage.getItem('user');
    return !!sessionStorage.getItem('authToken') && !!sessionStorage.getItem('user');
}
