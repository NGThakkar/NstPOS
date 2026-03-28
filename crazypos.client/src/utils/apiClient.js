import { API_BASE_URL } from './apiConfig';

/**
 * Builds the full URL for a given API path.
 * @param {string} path  e.g. "/api/Auth/Login"
 */
export function apiUrl(path) {
    return `${API_BASE_URL}${path}`;
}

/**
 * Authenticated fetch wrapper.
 * - Attaches the stored session token automatically.
 * - Parses JSON responses.
 * - Dispatches a 'session:expired' event on 401 so App.jsx can redirect to login.
 * - Throws an error with a structured message on non-2xx responses.
 *
 * @param {string} path   API path, e.g. "/api/Sales/CreateTransaction"
 * @param {RequestInit} options  fetch options (method, body, etc.)
 * @returns {Promise<any>}  parsed JSON body
 */
export async function apiFetch(path, options = {}) {
    const token = sessionStorage.getItem('authToken');

    const isFormData = options.body instanceof FormData;
    const headers = {
        // Don't set Content-Type for FormData — the browser adds it with the correct boundary
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers ?? {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['X-Auth-Token'] = token;
    }

    const response = await fetch(apiUrl(path), { ...options, headers });

    if (response.status === 401) {
        window.dispatchEvent(new CustomEvent('session:expired'));
        throw new ApiError(401, 'Unauthorized', 'Your session has expired. Please log in again.');
    }

    if (response.status === 403) {
        throw new ApiError(403, 'Forbidden', 'You do not have permission to perform this action.');
    }

    const contentType = response.headers.get('content-type');
    const data = contentType?.includes('application/json')
        ? await response.json()
        : { message: await response.text() };

    if (!response.ok) {
        throw new ApiError(response.status, response.statusText, data?.message ?? `HTTP Error ${response.status}`);
    }

    return data;
}

export class ApiError extends Error {
    /**
     * @param {number} status
     * @param {string} statusText
     * @param {string} message
     */
    constructor(status, statusText, message) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.statusText = statusText;
    }
}
