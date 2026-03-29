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
    const sessionToken = sessionStorage.getItem('authToken');

    const isFormData = options.body instanceof FormData;
    const headers = {
        // Don't set Content-Type for FormData — the browser adds it with the correct boundary
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers ?? {}),
    };

    if (sessionToken) {
        // Acquire a fresh single-use request token before attaching credentials.
        const requestToken = await acquireRequestToken(sessionToken);
        headers['Authorization'] = `Bearer ${sessionToken}`;
        headers['X-Auth-Token'] = sessionToken;
        headers['X-Request-Token'] = requestToken;
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

/**
 * Fetches a fresh single-use request token from the server.
 * Called automatically by apiFetch before every authenticated request.
 * Uses raw fetch (not apiFetch) to avoid a recursive call.
 *
 * Each call to apiFetch gets its own independent token, so parallel calls
 * are safe — they each acquire a distinct token.
 *
 * @param {string} sessionToken  The current session bearer token.
 * @returns {Promise<string>}    Plaintext single-use token to send as X-Request-Token.
 */
async function acquireRequestToken(sessionToken) {
    const response = await fetch(apiUrl('/api/Auth/IssueRequestToken'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`,
            'X-Auth-Token': sessionToken,
        },
    });

    if (response.status === 401) {
        window.dispatchEvent(new CustomEvent('session:expired'));
        throw new ApiError(401, 'Unauthorized', 'Your session has expired. Please log in again.');
    }

    if (!response.ok) {
        throw new ApiError(response.status, response.statusText,
            'Failed to acquire a request token. Please try again.');
    }

    const data = await response.json();
    return data.token;
}
