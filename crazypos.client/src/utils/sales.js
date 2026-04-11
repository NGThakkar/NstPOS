import { apiFetch } from './apiClient';

function toDateParam(value) {
    if (!value) {
        return '';
    }

    if (typeof value === 'string') {
        return value;
    }

    return value.toISOString().split('T')[0];
}

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

export async function getReportingDailySales(startDate, endDate) {
    return apiFetch(`/api/Reporting/GetDailySales?startDate=${toDateParam(startDate)}&endDate=${toDateParam(endDate)}`);
}

export async function getReportingHourlySales(date) {
    return apiFetch(`/api/Reporting/GetHourlySales?date=${toDateParam(date)}`);
}

export async function getReportingCashierPerformance(startDate, endDate, pageNumber = 1, pageSize = 20) {
    return apiFetch(
        `/api/Reporting/GetCashierPerformance?startDate=${toDateParam(startDate)}&endDate=${toDateParam(endDate)}&pageNumber=${pageNumber}&pageSize=${pageSize}`
    );
}

export async function getReportingCategoryPerformance(startDate, endDate) {
    return apiFetch(`/api/Reporting/GetCategoryPerformance?startDate=${toDateParam(startDate)}&endDate=${toDateParam(endDate)}`);
}

export async function getReportingTopProducts(startDate, endDate, limit = 10) {
    return apiFetch(`/api/Reporting/GetTopProducts?startDate=${toDateParam(startDate)}&endDate=${toDateParam(endDate)}&limit=${limit}`);
}

export async function getReportingPaymentMethodPerformance(startDate, endDate) {
    return apiFetch(`/api/Reporting/GetPaymentMethodPerformance?startDate=${toDateParam(startDate)}&endDate=${toDateParam(endDate)}`);
}

export async function getReportingTopPerformers(startDate, endDate, limit = 10) {
    return apiFetch(`/api/Reporting/GetTopPerformers?startDate=${toDateParam(startDate)}&endDate=${toDateParam(endDate)}&limit=${limit}`);
}
