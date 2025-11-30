const API_BASE_URL = "http://localhost:5053/api/POS";

export const loadTransactions = () => {
    const stored = localStorage.getItem('craypos-transactions');
    return stored ? JSON.parse(stored) : [];
};

export const saveTransaction = (transaction) => {
    const transactions = loadTransactions();
    transactions.push(transaction);
    localStorage.setItem('craypos-transactions', JSON.stringify(transactions));
};

export async function loadProducts () {
    //const stored = localStorage.getItem('craypos-products');
    //return stored ? JSON.parse(stored) : [];

    try {
        const response = await fetch(API_BASE_URL + "/GetProductDetails");
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
        const response = await fetch(API_BASE_URL + "/GetCategories");
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

        const response = await fetch(API_BASE_URL + "/AddProduct", {
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
        const response = await fetch(API_BASE_URL + "/AddCategory", {
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
        const response = await fetch(API_BASE_URL + "/UpdateCategory", {
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
        const response = await fetch(`${API_BASE_URL}/DeleteCategory?categoryId=${categoryId}`, {
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

        const response = await fetch(API_BASE_URL + "/UpdateProduct", {
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
        const response = await fetch(`${API_BASE_URL}/DeleteProduct?productId=${productId}`, {
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
        const response = await fetch(API_BASE_URL + "/CreateHoldOrder", {
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
        const response = await fetch(API_BASE_URL + "/GetHoldOrders", {
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
        const response = await fetch(`${API_BASE_URL}/DeleteHoldOrder?holdOrderId=${holdOrderId}`, {
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
        const response = await fetch(`${API_BASE_URL}/GetHoldOrderDetails?holdOrderId=${holdOrderId}`, {
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
        const response = await fetch(API_BASE_URL + "/GetInventorySummary", {
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
            ? `${API_BASE_URL}/GetInventoryMovementHistory?productId=${productId}`
            : `${API_BASE_URL}/GetInventoryMovementHistory`;
        
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
        const response = await fetch(API_BASE_URL + "/RecordInventoryMovement", {
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
            `${API_BASE_URL}/AdjustInventory?productId=${productId}&newQuantity=${newQuantity}&reason=${encodeURIComponent(reason)}`,
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
        const response = await fetch(`${API_BASE_URL}/GetLowStockItems?threshold=${threshold}`, {
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
        const response = await fetch(API_BASE_URL + "/GetInventoryStats", {
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