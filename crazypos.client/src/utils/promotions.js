import { apiFetch } from './apiClient';

export async function getPromotions() {
    return apiFetch('/api/Promotion/GetPromotions');
}

export async function createPromotion(payload) {
    return apiFetch('/api/Promotion/CreatePromotion', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export async function updatePromotion(payload) {
    return apiFetch('/api/Promotion/UpdatePromotion', {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

export async function setPromotionStatus(payload) {
    return apiFetch('/api/Promotion/SetPromotionStatus', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}
