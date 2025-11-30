import React, { useState } from 'react';
import { ShoppingCart as ShoppingCartIcon, Plus, Minus, X, CreditCard, Trash2, Clock, List, ChevronDown, User, AlertCircle, CheckCircle } from 'lucide-react';
import { createHoldOrder, getHoldOrders, deleteHoldOrder, getHoldOrderDetails, loadProducts } from '../utils/storage';

export const ShoppingCart = ({
    cart,
    onUpdateQuantity,
    onRemoveItem,
    onCheckout,
    onAddToCart
}) => {
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState('walk-in');
    const [showCustomerMenu, setShowCustomerMenu] = useState(false);
    const [showHoldListModal, setShowHoldListModal] = useState(false);
    const [holdOrders, setHoldOrders] = useState([]);
    const [isLoadingHold, setIsLoadingHold] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxRate = 0.0875; // 8.75% tax
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    console.log('Rendering ShoppingCart with cart items:', cart);

    const customerOptions = [
        { id: 'walk-in', name: 'Walk in Customer' },
        { id: 'customer-1', name: 'John Smith' },
        { id: 'customer-2', name: 'Sarah Johnson' },
        { id: 'customer-3', name: 'Michael Brown' }
    ];

    const currentCustomer = customerOptions.find(c => c.id === selectedCustomer);

    const handleClearCart = () => {
        // Remove all items from cart
        cart.forEach(item => {
            onRemoveItem(item.productid);
        });
        setShowClearConfirm(false);
    };

    const handleOnHold = async () => {
        if (cart.length === 0) {
            setMessage({ type: 'error', text: 'Please add items before placing on hold' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
            return;
        }

        setIsLoadingHold(true);
        try {
            const holdOrderData = {
                customerName: currentCustomer.name,
                totalAmount: total,
                items: cart.map(item => ({
                    productid: item.productid,
                    productName: item.name,
                    quantity: item.quantity,
                    price: item.price,
                    total: item.price * item.quantity
                }))
            };

            await createHoldOrder(holdOrderData);
            setMessage({ type: 'success', text: 'Order placed on hold successfully!' });
            
            // Clear cart after placing on hold
            cart.forEach(item => {
                onRemoveItem(item.productid);
            });

            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'Failed to place order on hold' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } finally {
            setIsLoadingHold(false);
        }
    };

    const handleHoldList = async () => {
        setIsLoadingHold(true);
        setShowHoldListModal(true);  // Open modal immediately
        try {
            console.log('Fetching hold orders...');
            const orders = await getHoldOrders();
            console.log('Hold orders fetched:', orders);
            setHoldOrders(orders);
            
            if (!orders || orders.length === 0) {
                console.log('No hold orders found');
                setMessage({ type: 'info', text: 'No orders on hold' });
            }
        } catch (error) {
            console.error('Error fetching hold orders:', error);
            setMessage({ type: 'error', text: `Failed to load hold orders: ${error.message}` });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } finally {
            setIsLoadingHold(false);
        }
    };

    const handleDeleteHoldOrder = async (holdOrderId) => {
        try {
            await deleteHoldOrder(holdOrderId);
            setMessage({ type: 'success', text: 'Hold order deleted' });
            // Refresh the list
            const orders = await getHoldOrders();
            setHoldOrders(orders);
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.log(error);
            setMessage({ type: 'error', text: 'Failed to delete hold order' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        }
    };

    const handleLoadHoldOrder = async (holdOrderId) => {
        try {
            setIsLoadingHold(true);
            const holdOrderData = await getHoldOrderDetails(holdOrderId);
            
            // Get full product details to ensure all image data is available
            const allProducts = await loadProducts();
            const productMap = new Map(allProducts.map(p => [p.productid, p]));
            
            // Load items into cart with full product details
            if (holdOrderData.items && holdOrderData.items.length > 0) {
                holdOrderData.items.forEach(item => {
                    const fullProduct = productMap.get(item.productid);
                    if (fullProduct) {
                        // Add to cart multiple times based on quantity
                        for (let i = 0; i < item.quantity; i++) {
                            onAddToCart(fullProduct);
                        }
                    }
                });

                // Update customer selection to the held order's customer
                const matchingCustomer = customerOptions.find(c => c.name === holdOrderData.customerName);
                if (matchingCustomer) {
                    setSelectedCustomer(matchingCustomer.id);
                }
                
                setMessage({ type: 'success', text: `Loaded order for ${holdOrderData.customerName}` });
            } else {
                setMessage({ type: 'error', text: 'No items found in this hold order' });
            }
            
            // Close modal after a brief delay to ensure cart updates
            setTimeout(() => {
                setShowHoldListModal(false);
            }, 500);
            
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error('Error loading hold order:', error);
            setMessage({ type: 'error', text: error.message || 'Failed to load hold order' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } finally {
            setIsLoadingHold(false);
        }
    };

    if (cart.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col h-full">
                {/* Customer Selection */}
                <div className="mb-4 pb-4 border-b border-gray-200">
                    <label className="block text-xs font-medium text-gray-700 mb-2">Customer</label>
                    <div className="relative">
                        <button
                            onClick={() => setShowCustomerMenu(!showCustomerMenu)}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors text-sm"
                        >
                            <span className="flex items-center text-gray-900">
                                <User className="w-4 h-4 mr-2" />
                                {currentCustomer?.name}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${showCustomerMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {showCustomerMenu && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                                {customerOptions.map(option => (
                                    <button
                                        key={option.id}
                                        onClick={() => {
                                            setSelectedCustomer(option.id);
                                            setShowCustomerMenu(false);
                                        }}
                                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                                            selectedCustomer === option.id
                                                ? 'bg-blue-50 text-blue-700 font-medium'
                                                : 'hover:bg-gray-50 text-gray-900'
                                        }`}
                                    >
                                        <span className="flex items-center">
                                            <User className="w-3 h-3 mr-2" />
                                            {option.name}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-center py-8 flex-1 flex flex-col items-center justify-center">
                    <ShoppingCartIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Parts / Products Selected</h3>
                    <p className="text-gray-600 text-sm">Please select parts, service or products. Or you can scan the bar code of the parts or products to add.</p>
                </div>

                {/* Empty State Footer Buttons */}
                <div className="grid grid-cols-3 gap-2 mt-auto pt-4 border-t border-gray-200">
                    <button
                        disabled
                        className="flex items-center justify-center px-3 py-2 rounded-lg bg-orange-50 text-orange-600 font-medium text-sm opacity-50 cursor-not-allowed"
                    >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Discard
                    </button>
                    <button
                        disabled
                        className="flex items-center justify-center px-3 py-2 rounded-lg bg-green-50 text-green-600 font-medium text-sm opacity-50 cursor-not-allowed"
                    >
                        <Clock className="w-4 h-4 mr-1" />
                        On Hold
                    </button>
                    <button
                        onClick={handleHoldList}
                        disabled={isLoadingHold}
                        className="flex items-center justify-center px-3 py-2 rounded-lg bg-teal-50 text-teal-600 font-medium text-sm hover:bg-teal-100 transition-colors disabled:opacity-50"
                        title="View hold list"
                    >
                        <List className="w-4 h-4 mr-1" />
                        Hold List
                    </button>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 text-right">
                    <div className="text-2xl font-bold text-gray-900">$0.00</div>
                    <div className="text-sm text-gray-600">Pay Balance</div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full">
            {/* Customer Selection */}
            <div className="p-4 border-b border-gray-200">
                <label className="block text-xs font-medium text-gray-700 mb-2">Customer</label>
                <div className="relative mb-3">
                    <button
                        onClick={() => setShowCustomerMenu(!showCustomerMenu)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors text-sm"
                    >
                        <span className="flex items-center text-gray-900">
                            <User className="w-4 h-4 mr-2" />
                            {currentCustomer?.name}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${showCustomerMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {showCustomerMenu && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                            {customerOptions.map(option => (
                                <button
                                    key={option.id}
                                    onClick={() => {
                                        setSelectedCustomer(option.id);
                                        setShowCustomerMenu(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                                        selectedCustomer === option.id
                                            ? 'bg-blue-50 text-blue-700 font-medium'
                                            : 'hover:bg-gray-50 text-gray-900'
                                    }`}
                                >
                                    <span className="flex items-center">
                                        <User className="w-3 h-3 mr-2" />
                                        {option.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                    <ShoppingCartIcon className="w-4 h-4 mr-2" />
                    Shopping Cart ({cart.length} {cart.length === 1 ? 'item' : 'items'})
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto">
                {cart.map(item => (
                    <div key={item.productid} className="p-4 border-b border-gray-100 last:border-b-0">
                        <div className="flex items-start space-x-3">
                            <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                                {item.image ? (
                                    <img
                                        src={`data:image/${item.imgextension};base64,${item.image}`}
                                        alt={item.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <ShoppingCartIcon className="w-6 h-6 text-gray-400" />
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900 text-sm">{item.name}</h4>
                                <p className="text-xs text-gray-600">${item.price.toFixed(2)} each</p>

                                <div className="flex items-center justify-between mt-3">
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => onUpdateQuantity(item.productid, Math.max(0, item.quantity - 1))}
                                            className="p-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                                        >
                                            <Minus className="w-3 h-3" />
                                        </button>
                                        <span className="px-2 py-1 bg-gray-100 rounded font-medium min-w-[2.5rem] text-center text-sm">
                                            {item.quantity}
                                        </span>
                                        <button
                                            onClick={() => onUpdateQuantity(item.productid, item.quantity + 1)}
                                            className="p-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                                        >
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    </div>

                                    <div className="flex items-center space-x-3">
                                        <span className="font-semibold text-gray-900 text-sm">
                                            ${(item.price * item.quantity).toFixed(2)}
                                        </span>
                                        <button
                                            onClick={() => onRemoveItem(item.productid)}
                                            className="p-1 rounded-full text-red-600 hover:bg-red-50 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Summary Section */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax (8.75%)</span>
                    <span className="text-gray-900">${tax.toFixed(2)}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between text-lg font-semibold">
                    <span className="text-gray-900">Total</span>
                    <span className="text-gray-900">${total.toFixed(2)}</span>
                </div>

                <button
                    onClick={onCheckout}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium mt-3 flex items-center justify-center text-sm"
                >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Proceed to Payment
                </button>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-2 p-3 border-t border-gray-200 bg-white">
                <button
                    onClick={() => setShowClearConfirm(true)}
                    className="flex flex-col items-center justify-center px-2 py-2 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600 font-medium text-xs transition-colors"
                    title="Discard cart"
                >
                    <Trash2 className="w-5 h-5 mb-1" />
                    Discard
                </button>
                <button
                    onClick={handleOnHold}
                    disabled={isLoadingHold}
                    className="flex flex-col items-center justify-center px-2 py-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 font-medium text-xs transition-colors disabled:opacity-50"
                    title="Put order on hold"
                >
                    <Clock className="w-5 h-5 mb-1" />
                    On Hold
                </button>
                <button
                    onClick={handleHoldList}
                    disabled={isLoadingHold}
                    className="flex flex-col items-center justify-center px-2 py-2 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-600 font-medium text-xs transition-colors disabled:opacity-50"
                    title="View hold list"
                >
                    <List className="w-5 h-5 mb-1" />
                    Hold List
                </button>
            </div>

            {/* Pay Balance Section */}
            <div className="p-3 border-t border-gray-200 bg-gray-50 text-right space-y-1">
                <div className="text-2xl font-bold text-gray-900">${total.toFixed(2)}</div>
                <div className="text-xs text-gray-600">Pay Balance</div>
            </div>

            {/* Clear Cart Confirmation Modal */}
            {showClearConfirm && (
                <div className="fixed inset-0 bg-gray-500/60 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg max-w-sm w-full mx-4">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Discard Cart</h3>
                            <p className="text-gray-600 mb-6">
                                Are you sure you want to discard all items in the cart? This action cannot be undone.
                            </p>

                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setShowClearConfirm(false)}
                                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleClearCart}
                                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                                >
                                    Discard
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Customer Menu Close on Outside Click */}
            {showCustomerMenu && (
                <div
                    className="fixed inset-0 z-0"
                    onClick={() => setShowCustomerMenu(false)}
                />
            )}

            {/* Message Notification */}
            {message.text && (
                <div className={`fixed bottom-4 right-4 p-4 rounded-lg flex items-center gap-3 z-40 ${
                    message.type === 'success' 
                        ? 'bg-green-50 border border-green-200' 
                        : message.type === 'info'
                        ? 'bg-blue-50 border border-blue-200'
                        : 'bg-red-50 border border-red-200'
                }`}>
                    {message.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : message.type === 'info' ? (
                        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    )}
                    <span className={message.type === 'success' 
                        ? 'text-green-800' 
                        : message.type === 'info'
                        ? 'text-blue-800'
                        : 'text-red-800'}>
                        {message.text}
                    </span>
                </div>
            )}

            {/* Hold List Modal */}
            {showHoldListModal && (
                <div className="fixed inset-0 bg-gray-500/60 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white p-6 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">Hold List</h3>
                            <button
                                onClick={() => setShowHoldListModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {isLoadingHold ? (
                            <div className="p-6 text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                <p className="text-gray-500">Loading hold orders...</p>
                            </div>
                        ) : holdOrders.length === 0 ? (
                            <div className="p-6 text-center">
                                <p className="text-gray-500">No orders on hold</p>
                            </div>
                        ) : (
                            <div className="p-6 space-y-4">
                                {holdOrders.map((order) => (
                                    <div key={order.holdorderid} className="border border-gray-200 rounded-lg p-4">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <p className="font-medium text-gray-900">{order.customerName}</p>
                                                <p className="text-xs text-gray-600">
                                                    {new Date(order.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold text-gray-900">${order.totalAmount.toFixed(2)}</p>
                                                <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded mt-1">
                                                    {order.status}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 rounded p-2 mb-3 max-h-24 overflow-y-auto">
                                            {order.items && order.items.length > 0 ? (
                                                order.items.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between text-xs text-gray-700 py-1">
                                                        <span>{item.productName} x{item.quantity}</span>
                                                        <span>${item.total.toFixed(2)}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-xs text-gray-500">No items in this order</p>
                                            )}
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleLoadHoldOrder(order.holdorderid)}
                                                disabled={isLoadingHold}
                                                className="flex-1 px-3 py-2 text-sm font-medium text-green-600 border border-green-300 rounded hover:bg-green-50 transition-colors disabled:opacity-50"
                                            >
                                                Load & Checkout
                                            </button>
                                            <button
                                                onClick={() => handleDeleteHoldOrder(order.holdorderid)}
                                                disabled={isLoadingHold}
                                                className="flex-1 px-3 py-2 text-sm font-medium text-red-600 border border-red-300 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6">
                            <button
                                onClick={() => setShowHoldListModal(false)}
                                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};