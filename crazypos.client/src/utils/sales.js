const API_BASE_URL = "http://localhost:5053/api/Sales";

export async function searchByBarcode(barcode) {
    try {
        const response = await fetch(`${API_BASE_URL}/SearchByBarcode?barcode=${barcode}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Search failed');
        }

        return data;
    } catch (error) {
        console.error('Barcode search error:', error);
        throw error;
    }
}

export async function createTransaction(transactionData) {
    try {
        const response = await fetch(`${API_BASE_URL}/CreateTransaction`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(transactionData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Transaction creation failed');
        }

        return data;
    } catch (error) {
        console.error('Create transaction error:', error);
        throw error;
    }
}

export async function getTransaction(transactionId) {
    try {
        const response = await fetch(`${API_BASE_URL}/GetTransaction?transactionId=${transactionId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch transaction');
        }

        return data;
    } catch (error) {
        console.error('Get transaction error:', error);
        throw error;
    }
}

export async function getDailySalesReport(date = null) {
    try {
        const queryDate = date ? `&date=${date}` : '';
        const response = await fetch(`${API_BASE_URL}/GetDailySalesReport?${queryDate}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch sales report');
        }

        return data;
    } catch (error) {
        console.error('Get daily sales report error:', error);
        throw error;
    }
}

export async function getTransactionsByDateRange(startDate, endDate) {
    try {
        const response = await fetch(
            `${API_BASE_URL}/GetTransactionsByDateRange?startDate=${startDate}&endDate=${endDate}`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch transactions');
        }

        return data;
    } catch (error) {
        console.error('Get transactions by date range error:', error);
        throw error;
    }
}

export async function getPaymentMethods() {
    try {
        const response = await fetch(`${API_BASE_URL}/GetPaymentMethods`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch payment methods');
        }

        return data;
    } catch (error) {
        console.error('Get payment methods error:', error);
        throw error;
    }
}

export async function cancelTransaction(transactionId, reason) {
    try {
        const response = await fetch(`${API_BASE_URL}/CancelTransaction?transactionId=${transactionId}&reason=${reason}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to cancel transaction');
        }

        return data;
    } catch (error) {
        console.error('Cancel transaction error:', error);
        throw error;
    }
}
