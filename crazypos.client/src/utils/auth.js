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

        const contentType = response.headers.get("content-type");
        let data;
        
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            data = { message: await response.text() || 'Unknown error' };
        }
        
        if (!response.ok) {
            throw new Error(data.message || `HTTP Error: ${response.status}`);
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

        const contentType = response.headers.get("content-type");
        let data;
        
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            data = { message: await response.text() || 'Unknown error' };
        }

        if (!response.ok) {
            throw new Error(data.message || `HTTP Error: ${response.status}`);
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

        const contentType = response.headers.get("content-type");
        let data;
        
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            data = { message: await response.text() || 'Unknown error' };
        }

        if (!response.ok) {
            throw new Error(data.message || `HTTP Error: ${response.status}`);
        }

        // Clear storage
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('user');

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

        const contentType = response.headers.get("content-type");
        let data;
        
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            data = { message: await response.text() || 'Unknown error' };
        }

        if (!response.ok) {
            throw new Error(data.message || `HTTP Error: ${response.status}`);
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

        const contentType = response.headers.get("content-type");
        let data;
        
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            data = { message: await response.text() || 'Unknown error' };
        }

        if (!response.ok) {
            throw new Error(data.message || `HTTP Error: ${response.status}`);
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

        const contentType = response.headers.get("content-type");
        let data;
        
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            data = { message: await response.text() || 'Unknown error' };
        }

        if (!response.ok) {
            throw new Error(data.message || `HTTP Error: ${response.status}`);
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

        const contentType = response.headers.get("content-type");
        let data;
        
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            data = { message: await response.text() || 'Unknown error' };
        }

        if (!response.ok) {
            throw new Error(data.message || `HTTP Error: ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('Deactivate user error:', error);
        throw error;
    }
}

export async function reactivateUser(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/ReactivateUser?userId=${userId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const contentType = response.headers.get("content-type");
        let data;
        
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            data = { message: await response.text() || 'Unknown error' };
        }

        if (!response.ok) {
            throw new Error(data.message || `HTTP Error: ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('Reactivate user error:', error);
        throw error;
    }
}

export async function createUser(userData) {
    try {
        const response = await fetch(API_BASE_URL + "/CreateUser", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(userData)
        });

        const contentType = response.headers.get("content-type");
        let data;
        
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            data = { message: await response.text() || 'Unknown error' };
        }

        if (!response.ok) {
            throw new Error(data.message || `HTTP Error: ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('Create user error:', error);
        throw error;
    }
}

export async function updateUser(userId, userData) {
    try {
        const response = await fetch(`${API_BASE_URL}/UpdateUser/UpdateUser/${userId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(userData)
        });

        const contentType = response.headers.get("content-type");
        let data;
        
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            data = { message: await response.text() || 'Unknown error' };
        }

        if (!response.ok) {
            throw new Error(data.message || `HTTP Error: ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('Update user error:', error);
        throw error;
    }
}

export async function changeUserPassword(userId, currentPassword, newPassword) {
    try {
        const response = await fetch(`${API_BASE_URL}/ChangeUserPassword/ChangeUserPassword/${userId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        const contentType = response.headers.get("content-type");
        let data;
        
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            data = { message: await response.text() || 'Unknown error' };
        }

        if (!response.ok) {
            throw new Error(data.message || `HTTP Error: ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('Change user password error:', error);
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
