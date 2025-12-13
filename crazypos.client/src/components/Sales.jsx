import React, { useState, useEffect } from 'react';
import { loadProducts, loadCategories, saveTransaction, getAllCustomers } from '../utils/storage';
import { Spinner } from './Spinner';
import { ProductCatalog } from './ProductCatalog';
import { ShoppingCart } from './ShoppingCart';
import { PaymentModal } from './PaymentModal';

export const Sales = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [cart, setCart] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [customers, setCustomers] = useState([]);

    // Load products and categories on mount
    useEffect(() => {
        async function loadData() {
            setIsLoading(true);
            try {
                const productsData = await loadProducts();
                const categoriesData = await loadCategories();
                const customersData = await getAllCustomers();
                
                setProducts(productsData || []);
                setCategories(categoriesData || []);
                setCustomers(customersData || []);
            } catch (error) {
                console.error('Failed to load products or categories:', error);
                setProducts([]);
                setCategories([]);
                setCustomers([]);
            } finally {
                setIsLoading(false);
            }
        }

        loadData();
    }, []);

    const handleAddToCart = (product) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.productid === product.productid);
            if (existingItem) {
                return prevCart.map(item =>
                    item.productid === product.productid
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prevCart, { ...product, quantity: 1 }];
        });
    };

    const handleRemoveFromCart = (product) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.productid === product.productid);
            if (existingItem && existingItem.quantity > 1) {
                return prevCart.map(item =>
                    item.productid === product.productid
                        ? { ...item, quantity: item.quantity - 1 }
                        : item
                );
            }
            return prevCart.filter(item => item.productid !== product.productid);
        });
    };

    const handleUpdateQuantity = (id, quantity) => {
        if (quantity === 0) {
            handleRemoveItem(id);
            return;
        }

        setCart(prevCart =>
            prevCart.map(item =>
                item.productid === id ? { ...item, quantity } : item
            )
        );
    };

    const handleRemoveItem = (id) => {
        setCart(prevCart => prevCart.filter(item => item.productid !== id));
    };

    const handlePaymentComplete = (transaction) => {
        // Update inventory
        const updatedProducts = products.map(product => {
            const cartItem = cart.find(item => item.productid === product.productid);
            if (cartItem) {
                return { ...product, stock: Math.max(0, product.stock - cartItem.quantity) };
            }
            return product;
        });

        setProducts(updatedProducts);
        //saveProducts(updatedProducts);

        // Save transaction
        //const updatedTransactions = [...transactions, transaction];
        //setTransactions(updatedTransactions);
        saveTransaction(transaction);

        // Clear cart
        setCart([]);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Spinner />
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <ProductCatalog
                        products={products}
                        cart={cart}
                        onAddToCart={handleAddToCart}
                        categories={categories}
                        onRemoveFromCart={handleRemoveFromCart}
                    />
                </div>
                <div className="lg:col-span-1">
                    <ShoppingCart
                        cart={cart}
                        onUpdateQuantity={handleUpdateQuantity}
                        onRemoveItem={handleRemoveItem}
                        onCheckout={() => setShowPaymentModal(true)}
                        onAddToCart={handleAddToCart}
                        customers={customers}
                    />
                </div>
            </div>

            {/* Payment Modal */}
            <PaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                cart={cart}
                onPaymentComplete={handlePaymentComplete}
            />
        </>
    );
};
