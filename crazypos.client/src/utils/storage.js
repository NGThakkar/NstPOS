const API_BASE_URL_POS = "http://localhost:5053/api/POS";
const API_BASE_URL_SALES = "http://localhost:5053/api/Sales";

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
    const transactions = loadTransactions();
    transactions.push(transaction);
    localStorage.setItem('craypos-transactions', JSON.stringify(transactions));
    
    // Also save to backend database
    try {
        const result = await saveSaleTransaction(transaction);
        console.log('Transaction saved to backend:', result);
    } catch (error) {
        console.error('Error saving transaction to backend:', error);
        // Transaction is saved locally even if backend fails
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

        console.log('Sending transaction to:', `${API_BASE_URL_SALES}/CreateTransaction`);
        console.log('Transaction data:', saleTransactionData);
        console.log('Auth token:', token ? 'Present' : 'Missing');

        const response = await fetch(`${API_BASE_URL_SALES}/CreateTransaction`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(saleTransactionData)
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Backend error response:', errorText);
            throw new Error(`Error saving transaction: ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();
        console.log('Transaction saved successfully:', result);
        return result;
    } catch (error) {
        console.error('saveSaleTransaction Error:', error);
        throw error;
    }
}

export async function loadProducts () {
    try {
        const response = await fetch(API_BASE_URL_POS + "/GetProductDetails");
        if (!response.ok) {
            throw new Error(`Error fetching products: ${response.statusText}`);
        }    
        return await response.json();
    } catch (error) {
        console.error(error);
        throw error;
    }
};

export async function loadCategories() {
    try {
        const response = await fetch(API_BASE_URL_POS + "/GetCategories");
        if (!response.ok) {
            throw new Error(`Error fetching categories: ${response.statusText}`);
        }
        return await response.json();
    }
    catch (error) {
        console.error(error);
        throw error;
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