import React, { useState } from 'react';
import { X, CreditCard, DollarSign, Smartphone, Check, Receipt } from 'lucide-react';
import { ReceiptModal } from './ReceiptModal';

export const PaymentModal = ({
    isOpen,
    onClose,
    cart,
    onPaymentComplete
}) => {
    const [paymentMethod, setPaymentMethod] = useState('card');
    const [cashReceived, setCashReceived] = useState('');
    const [processing, setProcessing] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [transactionId, setTransactionId] = useState(null);
    const [showReceiptModal, setShowReceiptModal] = useState(false);

    if (!isOpen) return null;

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxRate = 0.0875;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    const discount = 0; // Could be dynamic based on promotions

    const cashReceivedAmount = parseFloat(cashReceived) || 0;
    const change = paymentMethod === 'cash' ? Math.max(0, cashReceivedAmount - total) : 0;

    const handlePayment = async () => {
        if (paymentMethod === 'cash' && cashReceivedAmount < total) {
            alert('Insufficient cash received');
            return;
        }

        setProcessing(true);

        try {
            // Create transaction with proper data
            const transaction = {
                id: 'TXN-' + Date.now().toString(),
                items: cart,
                subtotal,
                tax,
                discount,
                total,
                paymentMethod: paymentMethod === 'card' ? 'Credit Card' :
                    paymentMethod === 'mobile' ? 'Mobile Pay' : 'Cash',
                amountTendered: paymentMethod === 'cash' ? cashReceivedAmount : total,
                change: change,
                timestamp: new Date(),
                cashier: 'Current User'
            };

            console.log('PaymentModal: Calling onPaymentComplete with transaction:', transaction);
            
            // Call payment completion which will save transaction and return result
            const result = await onPaymentComplete(transaction);
            
            console.log('PaymentModal: onPaymentComplete returned result:', result);
            
            setProcessing(false);
            setCompleted(true);
            
            // Use the backend transaction ID from response
            // The backend returns { success, message, transactionId, transactionCode, totalAmount }
            const backendTransactionId = result?.transactionId;
            console.log('PaymentModal: Using backend transaction ID:', backendTransactionId);
            setTransactionId(backendTransactionId);

            setTimeout(() => {
                // Don't auto-close, let user choose receipt options
            }, 500);
        } catch (error) {
            console.error('Payment error:', error);
            alert('Error processing payment: ' + error.message);
            setProcessing(false);
        }
    };

    const handleCloseAndReset = () => {
        setCompleted(false);
        onClose();
        setCashReceived('');
        setTransactionId(null);
    };

    const paymentMethods = [
        { id: 'card', name: 'Credit/Debit Card', icon: CreditCard },
        { id: 'cash', name: 'Cash', icon: DollarSign },
        { id: 'mobile', name: 'Mobile Pay', icon: Smartphone }
    ];

    if (completed && showReceiptModal && transactionId) {
        return <ReceiptModal isOpen={true} transactionId={transactionId} onClose={handleCloseAndReset} />;
    }

    if (completed) {
        return (
            <div className="fixed inset-0 bg-gray-500/60 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Payment Successful!</h3>
                    <p className="text-gray-600">Transaction completed successfully</p>
                    {paymentMethod === 'cash' && change > 0 && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                            <p className="text-lg font-semibold text-blue-800">
                                Change Due: ${change.toFixed(2)}
                            </p>
                        </div>
                    )}

                    <div className="mt-6 space-y-3">
                        <button
                            onClick={() => setShowReceiptModal(true)}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center"
                        >
                            <Receipt className="w-4 h-4 mr-2" />
                            Send/Print Receipt
                        </button>
                        <button
                            onClick={handleCloseAndReset}
                            className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-gray-500/60 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Process Payment</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Order Summary */}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Subtotal ({cart.length} items)</span>
                            <span>${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Tax</span>
                            <span>${tax.toFixed(2)}</span>
                        </div>
                        {discount > 0 && (
                            <div className="flex justify-between text-sm text-green-600">
                                <span>Discount</span>
                                <span>-${discount.toFixed(2)}</span>
                            </div>
                        )}
                        <hr className="my-2" />
                        <div className="flex justify-between text-lg font-semibold">
                            <span>Total</span>
                            <span>${total.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Payment Methods */}
                    <div>
                        <h4 className="font-medium text-gray-900 mb-3">Select Payment Method</h4>
                        <div className="space-y-2">
                            {paymentMethods.map(method => (
                                <button
                                    key={method.id}
                                    onClick={() => setPaymentMethod(method.id)}
                                    className={`w-full flex items-center p-3 rounded-lg border transition-colors ${paymentMethod === method.id
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <method.icon className="w-5 h-5 mr-3" />
                                    <span className="font-medium">{method.name}</span>
                                    {paymentMethod === method.id && (
                                        <div className="ml-auto w-2 h-2 bg-blue-600 rounded-full"></div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Cash Payment */}
                    {paymentMethod === 'cash' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Cash Received
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={cashReceived}
                                onChange={(e) => setCashReceived(e.target.value)}
                                placeholder="0.00"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            {cashReceivedAmount >= total && (
                                <div className="mt-2 p-3 bg-green-50 rounded-lg">
                                    <p className="text-sm text-green-700">
                                        Change: <span className="font-semibold">${change.toFixed(2)}</span>
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Process Button */}
                    <button
                        onClick={handlePayment}
                        disabled={processing || (paymentMethod === 'cash' && cashReceivedAmount < total)}
                        className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {processing ? (
                            <>
                                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                                Processing...
                            </>
                        ) : (
                            `Process Payment - $${total.toFixed(2)}`
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};