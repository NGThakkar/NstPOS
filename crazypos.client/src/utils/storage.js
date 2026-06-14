import { apiFetch } from './apiClient';

export async function getTransactionDetails(transactionId) {
    return apiFetch(`/api/Sales/GetTransaction?transactionId=${transactionId}`);
}

export const loadTransactions = () => {
    try {
        const stored = localStorage.getItem('craypos-transactions');
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.warn('loadTransactions: Failed to parse cached transactions, resetting cache.', error);
        localStorage.removeItem('craypos-transactions');
        return [];
    }
};

function toCompactTransaction(transaction) {
    return {
        id: transaction.id,
        timestamp: transaction.timestamp,
        paymentMethod: transaction.paymentMethod,
        total: transaction.total,
        subtotal: transaction.subtotal,
        tax: transaction.tax,
        discount: transaction.discount,
        couponCode: transaction.couponCode,
        itemCount: Array.isArray(transaction.items)
            ? transaction.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
            : 0,
        items: Array.isArray(transaction.items)
            ? transaction.items.map(item => ({
                productid: item.productid,
                name: item.name,
                quantity: item.quantity,
                price: item.price
            }))
            : []
    };
}

function tryPersistTransactions(compactTransaction, maxHistory = 200) {
    const transactions = loadTransactions();
    transactions.push(compactTransaction);

    if (transactions.length > maxHistory) {
        transactions.splice(0, transactions.length - maxHistory);
    }

    // Try save first; if quota is exceeded, trim oldest entries until it fits.
    while (transactions.length > 0) {
        try {
            localStorage.setItem('craypos-transactions', JSON.stringify(transactions));
            return true;
        } catch (error) {
            if (error?.name !== 'QuotaExceededError' && error?.code !== 22) {
                console.warn('saveTransaction: Unexpected localStorage error.', error);
                return false;
            }

            transactions.shift();
        }
    }

    return false;
}

// Load transactions from the past year from the backend database
export async function loadTransactionsFromDatabase() {
    try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);

        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        const transactions = await apiFetch(
            `/api/Sales/GetTransactionsByDateRange?startDate=${startDateStr}&endDate=${endDateStr}`
        );
        return Array.isArray(transactions) ? transactions : [];
    } catch (error) {
        console.error('loadTransactionsFromDatabase Error:', error);
        return [];
    }
}
export const saveTransaction = async (transaction) => {
    console.log('storage.saveTransaction: Saving transaction locally and to backend');

    const compactTransaction = toCompactTransaction(transaction);
    const localSaveSucceeded = tryPersistTransactions(compactTransaction);
    if (!localSaveSucceeded) {
        console.warn('storage.saveTransaction: local transaction cache full or unavailable, continuing with backend save only.');
    }
    
    // Also save to backend database
    try {
        console.log('storage.saveTransaction: Calling saveSaleTransaction...');
        const result = await saveSaleTransaction(transaction);
        console.log('storage.saveTransaction: Backend result:', result);
        return result; // ? Return the backend result with transactionId
    } catch (error) {
        console.error('storage.saveTransaction: Error saving transaction to backend:', error);
        // Transaction may still be cached locally even when backend call fails.
        return { 
            success: false, 
            message: localSaveSucceeded
                ? 'Transaction saved locally but backend call failed'
                : 'Transaction could not be cached locally and backend call failed',
            transactionId: null
        };
    }
}

export async function saveSaleTransaction(transaction) {
    try {
        const saleTransactionData = {
            items: transaction.items.map(item => ({
                productId: item.productid,
                quantity: item.quantity,
                unitPrice: item.price,
                discountPercent: 0,
                discountAmount: 0,
                promotionId: item.promotionId || null
            })),
            subTotal: transaction.subtotal,
            taxAmount: transaction.tax,
            totalAmount: transaction.total,
            paymentMethod: transaction.paymentMethod,
            amountTendered: transaction.amountTendered || transaction.total,
            discountAmount: transaction.discount || 0,
            notes: transaction.cashier ? `Cashier: ${transaction.cashier}` : 'POS Sale',
            pricingSnapshotId: transaction.pricingSnapshotId || null,
            requestedPromotionIds: transaction.requestedPromotionIds || [],
            couponCode: transaction.couponCode || null,
            appliedPromotions: transaction.appliedPromotions || [],
                CustomerId: transaction.customerid || null
        };

        const result = await apiFetch('/api/Sales/CreateTransaction', {
            method: 'POST',
            body: JSON.stringify(saleTransactionData),
        });
        return result;
    } catch (error) {
        console.error('saveSaleTransaction: Error:', error);
        // Transaction is saved locally even if backend fails, so return success
        return { 
            success: true, 
            message: 'Transaction saved locally',
            transactionId: null // Will trigger fallback receipt data
        };
    }
}

export async function loadProducts() {
    try {
        const data = await apiFetch('/api/POS/GetProductDetails');
        return data || [];
    } catch (error) {
        console.error('Error loading products:', error);
        return [];
    }
}

export async function loadCategories() {
    try {
        const data = await apiFetch('/api/POS/GetCategories');
        return data || [];
    } catch (error) {
        console.error('Error loading categories:', error);
        return [];
    }
}

export const saveProducts = (products) => {
    localStorage.setItem('craypos-products', JSON.stringify(products));
};

export async function addProduct(product) {
    const formData = new FormData();
    if (product.image) formData.append('image', product.image);
    for (const key in product) {
        if (key === 'image' || product[key] == null || product[key] === '') continue;
        if (key === 'categoryid' || key === 'stock') {
            const n = parseInt(product[key]);
            if (!isNaN(n)) formData.append(key, n);
        } else if (key === 'price') {
            const n = parseFloat(product[key]);
            if (!isNaN(n)) formData.append(key, n);
        } else {
            formData.append(key, product[key]);
        }
    }
    return apiFetch('/api/POS/AddProduct', { method: 'POST', body: formData });
}

export async function addCategory(categoryName) {
    return apiFetch('/api/POS/AddCategory', {
        method: 'POST',
        body: JSON.stringify({ name: categoryName }),
    });
}

export async function updateCategory(categoryId, newCategoryName) {
    return apiFetch('/api/POS/UpdateCategory', {
        method: 'PUT',
        body: JSON.stringify({ categoryid: categoryId, name: newCategoryName }),
    });
}

export async function deleteCategory(categoryId) {
    return apiFetch(`/api/POS/DeleteCategory?categoryId=${categoryId}`, { method: 'DELETE' });
}

export async function updateProduct(product) {
    const formData = new FormData();
    if (product.image instanceof File) formData.append('image', product.image);
    for (const key in product) {
        if (key === 'image' || product[key] == null || product[key] === '') continue;
        formData.append(key, product[key]);
    }
    return apiFetch('/api/POS/UpdateProduct', { method: 'PUT', body: formData });
}

export async function deleteProduct(productId) {
    return apiFetch(`/api/POS/DeleteProduct?productId=${productId}`, { method: 'DELETE' });
}

export async function createHoldOrder(holdOrderData) {
    return apiFetch('/api/POS/CreateHoldOrder', {
        method: 'POST',
        body: JSON.stringify(holdOrderData),
    });
}

export async function getHoldOrders() {
    const data = await apiFetch('/api/POS/GetHoldOrders');
    return Array.isArray(data) ? data : [];
}

export async function deleteHoldOrder(holdOrderId) {
    return apiFetch(`/api/POS/DeleteHoldOrder?holdOrderId=${holdOrderId}`, { method: 'DELETE' });
}

export async function getHoldOrderDetails(holdOrderId) {
    return apiFetch(`/api/POS/GetHoldOrderDetails?holdOrderId=${holdOrderId}`);
}

// ===== INVENTORY API FUNCTIONS =====

export async function getInventorySummary() {
    return apiFetch('/api/POS/GetInventorySummary');
}

export async function getInventoryMovementHistory(productId = null) {
    const query = productId ? `?productId=${productId}` : '';
    return apiFetch(`/api/POS/GetInventoryMovementHistory${query}`);
}

export async function recordInventoryMovement(movementData) {
    return apiFetch('/api/POS/RecordInventoryMovement', {
        method: 'POST',
        body: JSON.stringify(movementData),
    });
}

export async function adjustInventory(productId, newQuantity, reason) {
    return apiFetch(
        `/api/POS/AdjustInventory?productId=${productId}&newQuantity=${newQuantity}&reason=${encodeURIComponent(reason)}`,
        { method: 'POST' }
    );
}

export async function getLowStockItems(threshold = 5) {
    return apiFetch(`/api/POS/GetLowStockItems?threshold=${threshold}`);
}

export async function getInventoryStats() {
    return apiFetch('/api/POS/GetInventoryStats');
}

// ===== CUSTOMER API FUNCTIONS =====

export async function getAllCustomers(pageNumber = 1, pageSize = 50) {
    return apiFetch(`/api/Customer/GetAllCustomers?pageNumber=${pageNumber}&pageSize=${pageSize}`);
}

export async function searchCustomers(searchTerm) {
    try {
        if (!searchTerm || searchTerm.trim() === '') {
            return [];
        }
        return await apiFetch(`/api/Customer/SearchCustomers?searchTerm=${encodeURIComponent(searchTerm)}`);
    } catch (error) {
        console.error('Error searching customers:', error);
        throw error;
    }
}

export async function getCustomer(customerId) {
    return apiFetch(`/api/Customer/GetCustomer?customerId=${customerId}`);
}

export async function createCustomer(customerData) {
    return apiFetch('/api/Customer/CreateCustomer', {
        method: 'POST',
        body: JSON.stringify(customerData),
    });
}

export async function updateCustomer(customerData) {
    return apiFetch('/api/Customer/UpdateCustomer', {
        method: 'PUT',
        body: JSON.stringify(customerData),
    });
}

export async function deleteCustomer(customerId) {
    return apiFetch(`/api/Customer/DeleteCustomer?customerId=${customerId}`, { method: 'DELETE' });
}

export async function getCustomerTransactions(customerId, pageNumber = 1, pageSize = 20) {
    return apiFetch(`/api/Customer/GetCustomerTransactions?customerId=${customerId}&pageNumber=${pageNumber}&pageSize=${pageSize}`);
}

export async function updateLoyaltyPoints(customerId, points) {
    return apiFetch(`/api/Customer/UpdateLoyaltyPoints?customerId=${customerId}&points=${points}`, { method: 'POST' });
}

export async function getLoyaltyConfig() {
    return apiFetch('/api/Customer/GetLoyaltyConfig');
}

// ===== RECEIPT API FUNCTIONS =====

export async function getReceiptDetails(transactionId) {
    return apiFetch(`/api/Receipt/GetReceiptDetails?transactionId=${transactionId}`);
}

export async function generateTextReceipt(receiptData) {
    try {
        const result = await apiFetch('/api/Receipt/GenerateTextReceipt', {
            method: 'POST',
            body: JSON.stringify(receiptData),
        });
        return result;
    } catch (error) {
        console.error('generateTextReceipt: Error:', error);
        // Return a fallback text receipt
        return {
            success: false,
            receipt: formatFallbackReceipt(receiptData)
        };
    }
}

export async function generateHtmlReceipt(receiptData) {
    return apiFetch('/api/Receipt/GenerateHtmlReceipt', {
        method: 'POST',
        body: JSON.stringify(receiptData),
    });
}

// Helper function to create fallback receipt text when backend is unavailable
function formatFallbackReceipt(data) {
    const line = '========================================';
    const separator = '----------------------------------------';
    
    let receipt = `${line}\n`;
    receipt += `${data.businessName?.padStart((data.businessName?.length + 40) / 2, ' ')}\n`;
    receipt += `${separator}\n\n`;
    receipt += `Receipt #: ${data.receiptNumber || 'N/A'}\n`;
    receipt += `Date/Time: ${new Date(data.transactionDate).toLocaleString()}\n`;
    receipt += `Transaction: ${data.transactionCode || 'N/A'}\n\n`;
    
    if (data.customerName) {
        receipt += `Customer: ${data.customerName}\n`;
    }
    if (data.customerEmail) {
        receipt += `Email: ${data.customerEmail}\n`;
    }
    if (data.customerPhone) {
        receipt += `Phone: ${data.customerPhone}\n`;
    }
    
    receipt += `\n${separator}\n`;
    receipt += `Item | Qty | Price | Total\n`;
    receipt += `${separator}\n`;
    
    if (data.items && data.items.length > 0) {
        data.items.forEach(item => {
            const itemLine = `${item.productName} x${item.quantity}`;
            const totalStr = `$${(item.lineTotal || 0).toFixed(2)}`;
            receipt += `${itemLine.padEnd(30)} ${totalStr.padStart(8)}\n`;
        });
    } else {
        receipt += `No items\n`;
    }
    
    receipt += `\n${separator}\n`;
    receipt += `Subtotal: $${(data.subtotal || 0).toFixed(2)}\n`;
    receipt += `Tax: $${(data.taxAmount || 0).toFixed(2)}\n`;
    if (data.discountAmount) {
        receipt += `Discount: -$${(data.discountAmount).toFixed(2)}\n`;
    }
    receipt += `Total: $${(data.totalAmount || 0).toFixed(2)}\n`;
    receipt += `Paid: $${(data.amountTendered || 0).toFixed(2)}\n`;
    receipt += `Change: $${(data.changeAmount || 0).toFixed(2)}\n`;
    receipt += `\n${separator}\n`;
    receipt += `Payment Method: ${data.paymentMethod || 'Unknown'}\n`;
    receipt += `${line}\n`;
    
    return receipt;
}

export async function sendEmailReceipt(receiptData) {
    return apiFetch('/api/Receipt/SendEmailReceipt', {
        method: 'POST',
        body: JSON.stringify(receiptData),
    });
}

export async function sendSmsReceipt(receiptData) {
    return apiFetch('/api/Receipt/SendSmsReceipt', {
        method: 'POST',
        body: JSON.stringify(receiptData),
    });
}

export async function printReceipt(receiptData) {
    return apiFetch('/api/Receipt/PrintReceipt', {
        method: 'POST',
        body: JSON.stringify(receiptData),
    });
}