/**
 * Central API configuration.
 * All modules must import from here instead of hardcoding the base URL.
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5053';
