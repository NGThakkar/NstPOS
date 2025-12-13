const API_BASE_URL_POS = "http://localhost:5053/api/POS";
const API_BASE_URL_SALES = "http://localhost:5053/api/Sales";
const API_BASE_URL_CUSTOMER = "http://localhost:5053/api/Customer";

// NEW: Get full transaction details from backend
export async function getTransactionDetails(transactionId) {
    try {
        const token = sessionStorage.getItem('authToken');
        
        const headers = {
            'Content-Type': 'application/json'
        };

        // Add Authorization header if token exists
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            headers['X-Auth-Token'] = token;
        }

        console.log('Fetching transaction details for ID:', transactionId);
        
        const response = await fetch(`${API_BASE_URL_SALES}/GetTransaction?transactionId=${transactionId}`, {
            method: 'GET',
            headers: headers
        });

        console.log('Transaction details response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error fetching transaction details:', errorText);
            throw new Error(`Error fetching transaction details: ${response.statusText}`);
        }

        const transactionDetails = await response.json();
        console.log('Transaction details fetched:', transactionDetails);

        return transactionDetails;
    } catch (error) {
        console.error('getTransactionDetails Error:', error);
        throw error;
    }
}

export const loadTransactions = () => {
    const stored = localStorage.getItem('craypos-transactions');
    return stored ? JSON.parse(stored) : [];
};

// NEW: Load transactions from backend database
export async function loadTransactionsFromDatabase() {
    try {
        const token = sessionStorage.getItem('authToken');
        
        const headers = {
            'Content-Type': 'application/json'
        };

        // Add Authorization header if token exists
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            headers['X-Auth-Token'] = token;
        }

        // Get all transactions from the past year
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);

        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        console.log('Fetching transactions from database...');
        console.log(`Date range: ${startDateStr} to ${endDateStr}`);
        
        const response = await fetch(`${API_BASE_URL_SALES}/GetTransactionsByDateRange?startDate=${startDateStr}&endDate=${endDateStr}`, {
            method: 'GET',
            headers: headers
        });

        console.log('Transactions response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error fetching transactions:', errorText);
            throw new Error(`Error fetching transactions: ${response.statusText}`);
        }

        const transactions = await response.json();
        console.log('Transactions fetched from database:', transactions);

        // Return transactions in the format expected by the app
        return Array.isArray(transactions) ? transactions : [];
    } catch (error) {
        console.error('loadTransactionsFromDatabase Error:', error);
        // Return empty array if database fetch fails
        return [];
    }
}

export const saveTransaction = async (transaction) => {
    console.log('storage.saveTransaction: Saving transaction locally and to backend');
    
    const transactions = loadTransactions();
    transactions.push(transaction);
    localStorage.setItem('craypos-transactions', JSON.stringify(transactions));
    
    // Also save to backend database
    try {
        console.log('storage.saveTransaction: Calling saveSaleTransaction...');
        const result = await saveSaleTransaction(transaction);
        console.log('storage.saveTransaction: Backend result:', result);
        return result; // ? Return the backend result with transactionId
    } catch (error) {
        console.error('storage.saveTransaction: Error saving transaction to backend:', error);
        // Transaction is saved locally even if backend fails
        return { 
            success: false, 
            message: 'Transaction saved locally but backend call failed',
            transactionId: null
        };
    }
}

export async function saveSaleTransaction(transaction) {
    try {
        // Get the auth token from sessionStorage
        const token = sessionStorage.getItem('authToken');

        const saleTransactionData = {
            items: transaction.items.map(item => ({
                productId: item.productid,
                quantity: item.quantity,
                unitPrice: item.price,
                discountPercent: 0,
                discountAmount: 0
            })),
            subTotal: transaction.subtotal,
            taxAmount: transaction.tax,
            totalAmount: transaction.total,
            paymentMethod: transaction.paymentMethod,
            amountTendered: transaction.amountTendered || transaction.total,
            discountAmount: transaction.discount || 0,
            notes: transaction.cashier ? `Cashier: ${transaction.cashier}` : 'POS Sale'
        };

        const headers = {
            'Content-Type': 'application/json'
        };

        // Add Authorization header if token exists
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            // Also add as custom header for fallback
            headers['X-Auth-Token'] = token;
        }

        console.log('saveSaleTransaction: Sending transaction to:', `${API_BASE_URL_SALES}/CreateTransaction`);
        console.log('saveSaleTransaction: Transaction data:', saleTransactionData);
        console.log('saveSaleTransaction: Auth token:', token ? 'Present' : 'Missing');

        const response = await fetch(`${API_BASE_URL_SALES}/CreateTransaction`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(saleTransactionData)
        });

        console.log('saveSaleTransaction: Response status:', response.status);
        console.log('saveSaleTransaction: Response ok:', response.ok);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('saveSaleTransaction: Backend error response:', errorText);
            throw new Error(`Error saving transaction: ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();
        console.log('saveSaleTransaction: Transaction saved successfully with ID:', result.transactionId);
        console.log('saveSaleTransaction: Full response:', result);
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

export async function loadProducts () {
    try {
        console.log('Fetching products from:', API_BASE_URL_POS + "/GetProductDetails");
        const response = await fetch(API_BASE_URL_POS + "/GetProductDetails", {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });
        
        if (!response.ok) {
            console.warn(`Product fetch returned status ${response.status}, returning empty array`);
            return [];
        }
        
        const data = await response.json();
        console.log('Products loaded successfully:', data);
        return data || [];
    } catch (error) {
        console.error('Error loading products:', error);
        console.warn('Returning empty products array as fallback');
        return [];
    }
};

export async function loadCategories() {
    try {
        console.log('Fetching categories from:', API_BASE_URL_POS + "/GetCategories");
        const response = await fetch(API_BASE_URL_POS + "/GetCategories", {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });
        
        if (!response.ok) {
            console.warn(`Categories fetch returned status ${response.status}, returning empty array`);
            return [];
        }
        
        const data = await response.json();
        console.log('Categories loaded successfully:', data);
        return data || [];
    } catch (error) {
        console.error('Error loading categories:', error);
        console.warn('Returning empty categories array as fallback');
        return [];
    }
}

export const saveProducts = (products) => {
    localStorage.setItem('craypos-products', JSON.stringify(products));
};

export async function addProduct(product) {
    try {
        console.log('Adding product:', product);
        const formData = new FormData();
        
        // Append the image file as "image" if provided
        if (product.image) {
            formData.append("image", product.image);
        }

        // Append other product fields (excluding image and empty strings)
        for (const key in product) {
            if (key !== "image" && product[key] !== null && product[key] !== undefined && product[key] !== '') {
                // Convert categoryid and stock to proper number types
                if (key === 'categoryid' || key === 'stock') {
                    const numValue = parseInt(product[key]);
                    if (!isNaN(numValue)) {
                        formData.append(key, numValue);
                    }
                } else if (key === 'price') {
                    const numValue = parseFloat(product[key]);
                    if (!isNaN(numValue)) {
                        formData.append(key, numValue);
                    }
                } else {
                    formData.append(key, product[key]);
                }
            }
        }

        console.log('Sending FormData with keys:', Array.from(formData.keys()));

        const response = await fetch(API_BASE_URL_POS + "/AddProduct", {
            method: "POST",            
            body: formData
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Backend error response:', errorText);
            throw new Error(`Error adding product: ${response.statusText} - ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function addCategory(categoryName) {
    try {
        const response = await fetch(API_BASE_URL_POS + "/AddCategory", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name: categoryName })
        });
        if (!response.ok) {
            throw new Error(`Error adding category: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function updateCategory(categoryId, newCategoryName) {
    try {
        const response = await fetch(API_BASE_URL_POS + "/UpdateCategory", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ categoryid: categoryId, name: newCategoryName })
        });
        if (!response.ok) {
            throw new Error(`Error updating category: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function deleteCategory(categoryId) {
    try {
        const response = await fetch(`${API_BASE_URL_POS}/DeleteCategory?categoryId=${categoryId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json"
            }
        });
        if (!response.ok) {
            throw new Error(`Error deleting category: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function updateProduct(product) {
    try {
        const formData = new FormData();
        
        // Append the image file as "image" if provided
        if (product.image && product.image instanceof File) {
            formData.append("image", product.image);
        }

        // Append other product fields (excluding image and empty strings)
        for (const key in product) {
            if (key !== "image" && product[key] !== null && product[key] !== undefined && product[key] !== '') {
                formData.append(key, product[key]);
            }
        }

        console.log('Sending FormData with keys:', Array.from(formData.keys()));

        const response = await fetch(API_BASE_URL_POS + "/UpdateProduct", {
            method: "PUT",
            body: formData
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error updating product: ${response.statusText} - ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function deleteProduct(productId) {
    try {
        const response = await fetch(`${API_BASE_URL_POS}/DeleteProduct?productId=${productId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json"
            }
        });
        if (!response.ok) {
            throw new Error(`Error deleting product: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function createHoldOrder(holdOrderData) {
    try {
        const response = await fetch(API_BASE_URL_POS + "/CreateHoldOrder", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(holdOrderData)
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error creating hold order: ${response.statusText} - ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getHoldOrders() {
    try {
        console.log('API Call: GET /api/POS/GetHoldOrders');
        const response = await fetch(API_BASE_URL_POS + "/GetHoldOrders", {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });
        
        console.log('Response Status:', response.status);
        console.log('Response OK:', response.ok);
        
        const data = await response.json();
        console.log('Response Data:', data);
        
        if (!response.ok) {
            throw new Error(`Error fetching hold orders: ${response.statusText} - ${data}`);
        }
        
        // Ensure we return an array
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('getHoldOrders Error:', error);
        throw error;
    }
}

export async function deleteHoldOrder(holdOrderId) {
    try {
        const response = await fetch(`${API_BASE_URL_POS}/DeleteHoldOrder?holdOrderId=${holdOrderId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json"
            }
        });
        if (!response.ok) {
            throw new Error(`Error deleting hold order: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
}
export async function getHoldOrderDetails(holdOrderId) {
    try {
        const response = await fetch(`${API_BASE_URL_POS}/GetHoldOrderDetails?holdOrderId=${holdOrderId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });
        if (!response.ok) {
            throw new Error(`Error fetching hold order details: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
}

// ===== INVENTORY API FUNCTIONS =====

export async function getInventorySummary() {
    try {
        const response = await fetch(API_BASE_URL_POS + "/GetInventorySummary", {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });
        if (!response.ok) {
            throw new Error(`Error fetching inventory summary: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getInventoryMovementHistory(productId = null) {
    try {
        const url = productId 
            ? `${API_BASE_URL_POS}/GetInventoryMovementHistory?productId=${productId}`
            : `${API_BASE_URL_POS}/GetInventoryMovementHistory`;
        
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });
        if (!response.ok) {
            throw new Error(`Error fetching inventory history: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function recordInventoryMovement(movementData) {
    try {
        const response = await fetch(API_BASE_URL_POS + "/RecordInventoryMovement", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(movementData)
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error recording movement: ${response.statusText} - ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function adjustInventory(productId, newQuantity, reason) {
    try {
        const response = await fetch(
            `${API_BASE_URL_POS}/AdjustInventory?productId=${productId}&newQuantity=${newQuantity}&reason=${encodeURIComponent(reason)}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
        if (!response.ok) {
            throw new Error(`Error adjusting inventory: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getLowStockItems(threshold = 5) {
    try {
        const response = await fetch(`${API_BASE_URL_POS}/GetLowStockItems?threshold=${threshold}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });
        if (!response.ok) {
            throw new Error(`Error fetching low stock items: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function getInventoryStats() {
    try {
        const response = await fetch(API_BASE_URL_POS + "/GetInventoryStats", {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });
        if (!response.ok) {
            throw new Error(`Error fetching inventory stats: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
}

// ===== CUSTOMER API FUNCTIONS =====

export async function getAllCustomers(pageNumber = 1, pageSize = 50) {
    try {
        const response = await fetch(`${API_BASE_URL_CUSTOMER}/GetAllCustomers?pageNumber=${pageNumber}&pageSize=${pageSize}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });
        if (!response.ok) {
            throw new Error(`Error fetching customers: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching customers:', error);
        throw error;
    }
}

export async function searchCustomers(searchTerm) {
    try {
        if (!searchTerm || searchTerm.trim() === '') {
            return [];
        }
        const response = await fetch(`${API_BASE_URL_CUSTOMER}/SearchCustomers?searchTerm=${encodeURIComponent(searchTerm)}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });
        if (!response.ok) {
            throw new Error(`Error searching customers: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error searching customers:', error);
        throw error;
    }
}

export async function getCustomer(customerId) {
    try {
        const response = await fetch(`${API_BASE_URL_CUSTOMER}/GetCustomer?customerId=${customerId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });
        if (!response.ok) {
            throw new Error(`Error fetching customer: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching customer:', error);
        throw error;
    }
}

export async function createCustomer(customerData) {
    try {
        const response = await fetch(`${API_BASE_URL_CUSTOMER}/CreateCustomer`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(customerData)
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error creating customer: ${response.statusText} - ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error creating customer:', error);
        throw error;
    }
}

export async function updateCustomer(customerData) {
    try {
        const response = await fetch(`${API_BASE_URL_CUSTOMER}/UpdateCustomer`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(customerData)
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error updating customer: ${response.statusText} - ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error updating customer:', error);
        throw error;
    }
}

export async function deleteCustomer(customerId) {
    try {
        const response = await fetch(`${API_BASE_URL_CUSTOMER}/DeleteCustomer?customerId=${customerId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json"
            }
        });
        if (!response.ok) {
            throw new Error(`Error deleting customer: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error deleting customer:', error);
        throw error;
    }
}

export async function getCustomerTransactions(customerId, pageNumber = 1, pageSize = 20) {
    try {
        const response = await fetch(`${API_BASE_URL_CUSTOMER}/GetCustomerTransactions?customerId=${customerId}&pageNumber=${pageNumber}&pageSize=${pageSize}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });
        if (!response.ok) {
            throw new Error(`Error fetching customer transactions: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching customer transactions:', error);
        throw error;
    }
}

export async function updateLoyaltyPoints(customerId, points) {
    try {
        const response = await fetch(`${API_BASE_URL_CUSTOMER}/UpdateLoyaltyPoints?customerId=${customerId}&points=${points}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        });
        if (!response.ok) {
            throw new Error(`Error updating loyalty points: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error updating loyalty points:', error);
        throw error;
    }
}

export async function getLoyaltyConfig() {
    try {
        const response = await fetch(`${API_BASE_URL_CUSTOMER}/GetLoyaltyConfig`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });
        if (!response.ok) {
            throw new Error(`Error fetching loyalty config: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching loyalty config:', error);
        throw error;
    }
}

// ===== RECEIPT API FUNCTIONS =====

const API_BASE_URL_RECEIPT = "http://localhost:5053/api/Receipt";

export async function getReceiptDetails(transactionId) {
    try {
        console.log('getReceiptDetails: Fetching receipt details for transaction:', transactionId);
        const response = await fetch(`${API_BASE_URL_RECEIPT}/GetReceiptDetails?transactionId=${transactionId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });
        
        if (!response.ok) {
            console.warn(`getReceiptDetails: API returned status ${response.status}`);
            throw new Error(`Error fetching receipt details: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('getReceiptDetails: Receipt data fetched successfully:', data);
        return data;
    } catch (error) {
        console.error('getReceiptDetails: Error fetching receipt details:', error);
        throw error;
    }
}

export async function generateTextReceipt(receiptData) {
    try {
        console.log('generateTextReceipt: Generating text receipt with data:', receiptData);
        const response = await fetch(`${API_BASE_URL_RECEIPT}/GenerateTextReceipt`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(receiptData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('generateTextReceipt: Backend error response:', errorText);
            throw new Error(`Error generating receipt: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('generateTextReceipt: Successfully generated, receipt length:', result.receipt?.length);
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
    try {
        console.log('generateHtmlReceipt: Generating HTML receipt');
        const response = await fetch(`${API_BASE_URL_RECEIPT}/GenerateHtmlReceipt`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(receiptData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('generateHtmlReceipt: Backend error response:', errorText);
            throw new Error(`Error generating receipt: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('generateHtmlReceipt: Successfully generated');
        return result;
    } catch (error) {
        console.error('generateHtmlReceipt: Error:', error);
        throw error;
    }
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
    try {
        console.log('sendEmailReceipt: Sending email to:', receiptData.recipientEmail);
        const response = await fetch(`${API_BASE_URL_RECEIPT}/SendEmailReceipt`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(receiptData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('sendEmailReceipt: Backend error response:', errorText);
            throw new Error(`Error sending receipt: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('sendEmailReceipt: Email sent successfully');
        return result;
    } catch (error) {
        console.error('sendEmailReceipt: Error:', error);
        throw error;
    }
}

export async function sendSmsReceipt(receiptData) {
    try {
        console.log('sendSmsReceipt: Sending SMS to:', receiptData.recipientPhone);
        const response = await fetch(`${API_BASE_URL_RECEIPT}/SendSmsReceipt`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(receiptData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('sendSmsReceipt: Backend error response:', errorText);
            throw new Error(`Error sending receipt: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('sendSmsReceipt: SMS sent successfully');
        return result;
    } catch (error) {
        console.error('sendSmsReceipt: Error:', error);
        throw error;
    }
}

export async function printReceipt(receiptData) {
    try {
        console.log('printReceipt: Preparing receipt for printing');
        const response = await fetch(`${API_BASE_URL_RECEIPT}/PrintReceipt`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(receiptData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('printReceipt: Backend error response:', errorText);
            throw new Error(`Error preparing receipt for print: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('printReceipt: Receipt prepared successfully');
        return result;
    } catch (error) {
        console.error('printReceipt: Error:', error);
        throw error;
    }
}