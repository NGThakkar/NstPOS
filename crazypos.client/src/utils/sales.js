import { apiFetch } from './apiClient';

export async function searchByBarcode(barcode) {
    return apiFetch(`/api/Sales/SearchByBarcode?barcode=${encodeURIComponent(barcode)}`);
}

export async function createTransaction(transactionData) {
    return apiFetch('/api/Sales/CreateTransaction', {
        method: 'POST',
        body: JSON.stringify(transactionData),
    });
}

export async function previewPricing(payload) {
    return apiFetch('/api/Sales/PreviewPricing', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export async function approveDiscount(payload) {
    return apiFetch('/api/Sales/ApproveDiscount', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export async function getTransaction(transactionId) {
    return apiFetch(`/api/Sales/GetTransaction?transactionId=${transactionId}`);
}

export async function getDailySalesReport(date = null) {
    const queryDate = date ? `date=${date}` : '';
    return apiFetch(`/api/Sales/GetDailySalesReport${queryDate ? `?${queryDate}` : ''}`);
}

export async function getTransactionsByDateRange(startDate, endDate) {
    return apiFetch(`/api/Sales/GetTransactionsByDateRange?startDate=${startDate}&endDate=${endDate}`);
}

export async function getPaymentMethods() {
    return apiFetch('/api/Sales/GetPaymentMethods');
}

export async function cancelTransaction(transactionId, reason) {
    return apiFetch(`/api/Sales/CancelTransaction?transactionId=${transactionId}&reason=${encodeURIComponent(reason)}`, {
        method: 'POST',
    });
}
