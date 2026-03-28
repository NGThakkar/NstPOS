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

export async function getTransaction(transactionId) {
    return apiFetch(`/api/Sales/GetTransaction?transactionId=${transactionId}`);
}

export async function getDailySalesReport(date = null) {
    try {
        const queryDate = date ? `&date=${date}` : '';
        return await apiFetch(`/api/Sales/GetDailySalesReport?${queryDate}`);

        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch sales report');
        }

    } catch (error) {
        console.error('Get daily sales report error:', error);
        throw error;
    }
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
