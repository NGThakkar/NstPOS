import React, { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import {
    previewReturn,
    createReturn,
    formatInventoryDisposition,
    formatReturnStatus,
    getReturnStatusBadgeClass
} from '../utils/returns';
import { getStoredUser } from '../utils/auth';

const REASON_CODES = [
    { value: 'customer_request', label: 'Customer Request' },
    { value: 'defective', label: 'Defective / Damaged' },
    { value: 'wrong_item', label: 'Wrong Item Received' },
    { value: 'expired', label: 'Expired Product' },
    { value: 'not_as_described', label: 'Not as Described' },
    { value: 'changed_mind', label: 'Changed Mind' },
    { value: 'other', label: 'Other' },
];

const DISPOSITION_OPTIONS = [
    { value: 'restock', label: 'Restock (Sellable)', color: 'bg-green-50 border-green-200' },
    { value: 'damaged', label: 'Damaged (Not Sellable)', color: 'bg-yellow-50 border-yellow-200' },
    { value: 'discard', label: 'Discard', color: 'bg-red-50 border-red-200' },
];

const REFUND_METHODS = [
    { value: 'cash', label: 'Cash (Immediate)', settlement: 'settled' },
    { value: 'card', label: 'Credit Card (Pending)', settlement: 'pending' },
    { value: 'store_credit', label: 'Store Credit (Pending)', settlement: 'pending' },
];

export const ReturnModal = ({ isOpen, onClose, transaction, onReturnComplete }) => {
    const currentUser = getStoredUser();
    const canCreateReturn = currentUser?.role === 'Admin' || 
                            currentUser?.role === 'Manager' || 
                            currentUser?.role === 'Cashier';

    // Form state
    const [selectedItems, setSelectedItems] = useState({});
    const [itemQuantities, setItemQuantities] = useState({});
    const [dispositions, setDispositions] = useState({});
    const [dispositionNotes, setDispositionNotes] = useState({});
    const [reasonCode, setReasonCode] = useState('customer_request');
    const [refundMethod, setRefundMethod] = useState('cash');
    const [previewData, setPreviewData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [previewing, setPreviewing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [step, setStep] = useState('select'); // 'select' or 'confirm'

    // Initialize dispositions
    useEffect(() => {
        if (transaction?.items) {
            const initialDispositions = {};
            transaction.items.forEach((item, idx) => {
                initialDispositions[idx] = 'restock';
            });
            setDispositions(initialDispositions);
        }
    }, [transaction?.items]);

    if (!isOpen || !transaction) {
        return null;
    }

    // Check which items can be returned
    const getMaxReturnableQty = (item, itemIndex) => {
        const originalQty = item.quantity || 1;
        const alreadyReturned = item.returnedQuantity || 0;
        return originalQty - alreadyReturned;
    };

    // Handle item selection
    const handleSelectItem = (itemIndex, checked) => {
        const newSelected = { ...selectedItems };
        if (checked) {
            newSelected[itemIndex] = true;
            setItemQuantities({
                ...itemQuantities,
                [itemIndex]: 1
            });
        } else {
            delete newSelected[itemIndex];
            const newQtys = { ...itemQuantities };
            delete newQtys[itemIndex];
            setItemQuantities(newQtys);
        }
        setSelectedItems(newSelected);
        setError('');
    };

    // Handle quantity change
    const handleQuantityChange = (itemIndex, qty) => {
        const item = transaction.items[itemIndex];
        const maxReturnable = getMaxReturnableQty(item, itemIndex);
        const value = Math.min(Math.max(1, parseInt(qty) || 0), maxReturnable);
        
        setItemQuantities({
            ...itemQuantities,
            [itemIndex]: value
        });
        setError('');
    };

    // Handle disposition change
    const handleDispositionChange = (itemIndex, disposition) => {
        setDispositions({
            ...dispositions,
            [itemIndex]: disposition
        });
    };

    // Build return items for API call
    const buildReturnItems = () => {
        return Object.keys(selectedItems)
            .filter((idx) => selectedItems[idx])
            .map((idx) => {
                const item = transaction.items[Number(idx)];
                const originalTransactionItemId =
                    item?.itemId ?? item?.transactionItemId ?? item?.originalTransactionItemId;

                return {
                    originalTransactionItemId,
                    quantity: itemQuantities[idx],
                    inventoryDisposition: dispositions[idx],
                    dispositionNotes: dispositionNotes[idx] || ''
                };
            });
    };

    // Handle preview
    const handlePreview = async () => {
        setError('');
        const selectedCount = Object.values(selectedItems).filter(v => v).length;
        
        if (selectedCount === 0) {
            setError('Please select at least one item to return');
            return;
        }

        const returnItems = buildReturnItems();
        if (returnItems.some((item) => !item.originalTransactionItemId)) {
            setError('Unable to process return: missing transaction item ID(s). Please reopen the transaction and try again.');
            return;
        }

        setPreviewing(true);
        try {
            const preview = await previewReturn({
                originalTransactionId: transaction.transactionId,
                items: returnItems
            });

            setPreviewData(preview);
            setStep('confirm');
        } catch (err) {
            setError(err.message || 'Failed to preview return');
        } finally {
            setPreviewing(false);
        }
    };

    // Handle finalize return
    const handleFinalizeReturn = async () => {
        setError('');
        setLoading(true);

        const returnItems = buildReturnItems();
        if (returnItems.some((item) => !item.originalTransactionItemId)) {
            setError('Unable to process return: missing transaction item ID(s). Please reopen the transaction and try again.');
            setLoading(false);
            return;
        }

        try {
            const result = await createReturn({
                originalTransactionId: transaction.transactionId,
                items: returnItems,
                reasonCode,
                refundMethod
            });

            setSuccess(`Return ${result.returnCode} created successfully!`);
            setTimeout(() => {
                if (onReturnComplete) {
                    onReturnComplete(result);
                }
                handleClose();
            }, 1500);
        } catch (err) {
            setError(err.message || 'Failed to create return');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setSelectedItems({});
        setItemQuantities({});
        setDispositions({});
        setDispositionNotes({});
        setReasonCode('customer_request');
        setRefundMethod('cash');
        setPreviewData(null);
        setError('');
        setSuccess('');
        setStep('select');
        onClose();
    };

    if (!canCreateReturn) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
                    <div className="flex items-center gap-3 text-red-600 mb-4">
                        <AlertCircle className="w-6 h-6" />
                        <h3 className="text-lg font-semibold">Permission Denied</h3>
                    </div>
                    <p className="text-gray-600 mb-6">
                        You do not have permission to process returns. Only managers, administrators, and authorized cashiers can create returns.
                    </p>
                    <button
                        onClick={handleClose}
                        className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center border-b border-blue-800">
                    <div>
                        <h2 className="text-2xl font-bold">Process Return</h2>
                        <p className="text-blue-100 text-sm mt-1">
                            Transaction #{transaction.transactionCode || transaction.id?.slice(-8) || 'N/A'}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-white hover:bg-blue-500 p-2 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Success Message */}
                {success && (
                    <div className="bg-green-50 border-l-4 border-green-600 p-4 m-6 flex items-center gap-3 text-green-800">
                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                        <p>{success}</p>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-600 p-4 m-6 flex items-center gap-3 text-red-800">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                <div className="p-6">
                    {step === 'select' ? (
                        <>
                            {/* Step 1: Item Selection */}
                            <div className="space-y-6">
                                {/* Items to Return */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                        Select Items to Return
                                    </h3>
                                    <div className="space-y-3 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
                                        {transaction.items ? (
                                            transaction.items.map((item, idx) => {
                                                const maxReturnable = getMaxReturnableQty(item, idx);
                                                const isFullyReturned = maxReturnable === 0;

                                                return (
                                                    <div
                                                        key={`item-${idx}`}
                                                        className={`p-4 border rounded-lg ${
                                                            isFullyReturned
                                                                ? 'bg-gray-100 border-gray-300 opacity-60'
                                                                : 'bg-white border-gray-200 hover:border-blue-400'
                                                        }`}
                                                    >
                                                        <div className="flex items-start gap-4">
                                                            <input
                                                                type="checkbox"
                                                                disabled={isFullyReturned}
                                                                checked={!!selectedItems[idx]}
                                                                onChange={(e) => handleSelectItem(idx, e.target.checked)}
                                                                className="mt-1 w-4 h-4 text-blue-600 rounded cursor-pointer disabled:cursor-not-allowed"
                                                            />
                                                            <div className="flex-1">
                                                                <p className="font-medium text-gray-900">
                                                                    {item.productName || item.name}
                                                                </p>
                                                                <p className="text-sm text-gray-600 mt-1">
                                                                    Sold: {item.quantity} x ${(item.unitPrice || item.price || 0).toFixed(2)}
                                                                </p>
                                                                {item.returnedQuantity > 0 && (
                                                                    <p className="text-sm text-orange-600 mt-1">
                                                                        Already Returned: {item.returnedQuantity}
                                                                    </p>
                                                                )}
                                                                {isFullyReturned && (
                                                                    <p className="text-sm text-red-600 font-medium mt-1">
                                                                        Fully Returned
                                                                    </p>
                                                                )}
                                                            </div>

                                                            {/* Quantity Input */}
                                                            {selectedItems[idx] && !isFullyReturned && (
                                                                <div className="flex items-center gap-2">
                                                                    <label className="text-sm font-medium text-gray-700">
                                                                        Qty:
                                                                    </label>
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        max={maxReturnable}
                                                                        value={itemQuantities[idx] || 1}
                                                                        onChange={(e) => handleQuantityChange(idx, e.target.value)}
                                                                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500"
                                                                    />
                                                                    <span className="text-sm text-gray-500">
                                                                        / {maxReturnable}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Disposition and Notes */}
                                                        {selectedItems[idx] && !isFullyReturned && (
                                                            <div className="mt-4 ml-8 pt-4 border-t border-gray-200 space-y-3">
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                        Item Disposition
                                                                    </label>
                                                                    <div className="space-y-2">
                                                                        {DISPOSITION_OPTIONS.map(option => (
                                                                            <label
                                                                                key={option.value}
                                                                                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                                                                                    dispositions[idx] === option.value
                                                                                        ? `${option.color} border-current`
                                                                                        : 'bg-white border-gray-200 hover:border-gray-300'
                                                                                }`}
                                                                            >
                                                                                <input
                                                                                    type="radio"
                                                                                    name={`disposition-${idx}`}
                                                                                    value={option.value}
                                                                                    checked={dispositions[idx] === option.value}
                                                                                    onChange={() => handleDispositionChange(idx, option.value)}
                                                                                    className="w-4 h-4 text-blue-600"
                                                                                />
                                                                                <span className="text-sm font-medium text-gray-900">
                                                                                    {option.label}
                                                                                </span>
                                                                            </label>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {dispositions[idx] !== 'restock' && (
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                            Notes ({dispositions[idx] === 'damaged' ? 'Damage' : 'Reason'})
                                                                        </label>
                                                                        <textarea
                                                                            value={dispositionNotes[idx] || ''}
                                                                            onChange={(e) => setDispositionNotes({
                                                                                ...dispositionNotes,
                                                                                [idx]: e.target.value
                                                                            })}
                                                                            placeholder={
                                                                                dispositions[idx] === 'damaged'
                                                                                    ? 'Describe the damage...'
                                                                                    : 'Reason for discard...'
                                                                            }
                                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                                                            rows="2"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <p className="text-gray-500 text-center py-4">No items available</p>
                                        )}
                                    </div>
                                </div>

                                {/* Return Reason */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Reason for Return
                                    </label>
                                    <select
                                        value={reasonCode}
                                        onChange={(e) => setReasonCode(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        {REASON_CODES.map(reason => (
                                            <option key={reason.value} value={reason.value}>
                                                {reason.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Refund Method */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-3">
                                        Refund Method
                                    </label>
                                    <div className="space-y-2">
                                        {REFUND_METHODS.map(method => (
                                            <label
                                                key={method.value}
                                                className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                                                    refundMethod === method.value
                                                        ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200'
                                                        : 'bg-white border-gray-200 hover:border-gray-300'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="refund-method"
                                                    value={method.value}
                                                    checked={refundMethod === method.value}
                                                    onChange={(e) => setRefundMethod(e.target.value)}
                                                    className="w-4 h-4 text-blue-600"
                                                />
                                                <div>
                                                    <p className="font-medium text-gray-900">{method.label}</p>
                                                    <p className="text-xs text-gray-500">
                                                        Settlement: {method.settlement === 'settled' ? 'Immediate' : 'Pending Manual Processing'}
                                                    </p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-4 mt-8 pt-6 border-t border-gray-200">
                                <button
                                    onClick={handleClose}
                                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handlePreview}
                                    disabled={previewing || Object.values(selectedItems).every(v => !v)}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {previewing && <Loader className="w-4 h-4 animate-spin" />}
                                    Preview Return
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Step 2: Confirm & Review */}
                            <div className="space-y-6">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <h3 className="font-semibold text-gray-900 mb-4">Return Summary</h3>

                                    {previewData && (
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-sm text-gray-600">Subtotal Reversal</p>
                                                    <p className="text-lg font-semibold text-gray-900">
                                                        ${previewData.subtotalReversal?.toFixed(2) || '0.00'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">Tax Reversal</p>
                                                    <p className="text-lg font-semibold text-gray-900">
                                                        ${previewData.taxReversal?.toFixed(2) || '0.00'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">Discount Reversal</p>
                                                    <p className="text-lg font-semibold text-green-600">
                                                        ${previewData.discountReversal?.toFixed(2) || '0.00'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">Total Refund</p>
                                                    <p className="text-lg font-semibold text-blue-600">
                                                        ${previewData.refundTotal?.toFixed(2) || '0.00'}
                                                    </p>
                                                </div>
                                            </div>

                                            {previewData.items && previewData.items.length > 0 && (
                                                <div className="mt-4 pt-4 border-t border-blue-200">
                                                    <p className="text-sm font-medium text-gray-700 mb-3">Items Being Returned:</p>
                                                    <div className="space-y-2">
                                                        {previewData.items.map((item, idx) => (
                                                            <div key={idx} className="flex justify-between text-sm">
                                                                <span className="text-gray-600">
                                                                    {item.quantity}x {transaction.items[idx]?.productName || '(Item)'} ({formatInventoryDisposition(item.inventoryDisposition)})
                                                                </span>
                                                                <span className="font-medium text-gray-900">
                                                                    ${item.refundLineTotal?.toFixed(2) || '0.00'}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Confirmation Details */}
                                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                    <div>
                                        <p className="text-sm text-gray-600">Reason</p>
                                        <p className="font-medium text-gray-900">
                                            {REASON_CODES.find(r => r.value === reasonCode)?.label || reasonCode}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Refund Method</p>
                                        <p className="font-medium text-gray-900">
                                            {REFUND_METHODS.find(m => m.value === refundMethod)?.label || refundMethod}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Processed By</p>
                                        <p className="font-medium text-gray-900">
                                            {currentUser?.fullName || currentUser?.username || 'Current User'}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <p className="text-sm text-yellow-800">
                                        <strong>Note:</strong> Once finalized, this return cannot be modified. Please verify all details above are correct before proceeding.
                                    </p>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-4 mt-8 pt-6 border-t border-gray-200">
                                <button
                                    onClick={() => setStep('select')}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleFinalizeReturn}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading && <Loader className="w-4 h-4 animate-spin" />}
                                    Finalize Return
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
