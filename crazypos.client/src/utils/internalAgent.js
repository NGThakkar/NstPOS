import { apiFetch } from './apiClient';

export async function parseInternalAgentCommand(command) {
    return apiFetch('/api/InternalAgent/ParseCommand', {
        method: 'POST',
        body: JSON.stringify({ command }),
    });
}

export async function getInternalAgentHealth() {
    return apiFetch('/api/InternalAgent/Health', {
        method: 'GET',
    });
}
