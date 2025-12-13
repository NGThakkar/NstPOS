import React, { useState } from 'react';
import { Search, Calendar, Eye, Receipt, Download } from 'lucide-react';
import { getTransactionDetails } from '../utils/storage';

export const TransactionHistory = ({ transactions }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    const filteredTransactions = transactions.filter(transaction => {
        // Handle both database and localStorage formats
        const transId = transaction.transactionCode || transaction.id || '';
        const transDate = transaction.transactionDate || transaction.timestamp;
        const cashier = transaction.cashier || '';
        
        const matchesSearch = transId.includes(searchTerm) ||
            cashier.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDate = !selectedDate ||
            new Date(transDate).toDateString() === new Date(selectedDate).toDateString();
        return matchesSearch && matchesDate;
    }).sort((a, b) => {
        const dateA = new Date(a.transactionDate || a.timestamp);
        const dateB = new Date(b.transactionDate || b.timestamp);
        return dateB.getTime() - dateA.getTime();
    });

    const totalSales = filteredTransactions.reduce((sum, t) => sum + (t.totalAmount || t.total || 0), 0);
    const totalTax = filteredTransactions.reduce((sum, t) => sum + (t.taxAmount || t.tax || 0), 0);

    // Handle viewing transaction details
    const handleViewDetails = async (transaction) => {
        // If it's a database transaction, fetch full details from API
        if (transaction.transactionId) {
            setLoadingDetails(true);
            try {
                const fullDetails = await getTransactionDetails(transaction.transactionId);
                setSelectedTransaction(fullDetails);
            } catch (error) {
                console.error('Error loading transaction details:', error);
                // Fallback to the basic transaction data
                setSelectedTransaction(transaction);
            } finally {
                setLoadingDetails(false);
            }
        } else {
            // For localStorage transactions, use as-is
            setSelectedTransaction(transaction);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-gray-900">Transaction History</h2>
                <p className="text-gray-600">View and manage all sales transactions</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search by transaction ID or cashier..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="date"
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>

                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </button>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-600">Total Transactions</p>
                        <p className="text-xl font-semibold text-gray-900">{filteredTransactions.length}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-600">Total Sales</p>
                        <p className="text-xl font-semibold text-gray-900">${totalSales.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-600">Total Tax</p>
                        <p className="text-xl font-semibold text-gray-900">${totalTax.toFixed(2)}</p>
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Transaction ID
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date & Time
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Items
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Payment Method
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Total
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredTransactions.map(transaction => {
                                // Handle both database and localStorage formats
                                const transId = transaction.transactionId || transaction.id || 'N/A';
                                const transCode = transaction.transactionCode || (transaction.id && transaction.id.slice(-8)) || 'Unknown';
                                const transDate = transaction.transactionDate || transaction.timestamp;
                                const itemCount = transaction.itemCount || (transaction.items ? transaction.items.length : 0);
                                const paymentMethod = transaction.paymentMethod || 'Unknown';
                                const totalAmount = transaction.totalAmount || transaction.total || 0;

                                return (
                                    <tr key={transId} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            #{transCode}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(transDate).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {itemCount} item{itemCount !== 1 ? 's' : ''}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {paymentMethod}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                            ${totalAmount.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => handleViewDetails(transaction)}
                                                    disabled={loadingDetails}
                                                    className="text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button className="text-green-600 hover:text-green-800 transition-colors">
                                                    <Receipt className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {filteredTransactions.length === 0 && (
                    <div className="text-center py-12">
                        <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">No transactions found</p>
                        <p className="text-gray-400">Try adjusting your search criteria</p>
                    </div>
                )}
            </div>

            {/* Transaction Detail Modal */}
            {selectedTransaction && (
                <div className="fixed inset-0 bg-gray-500/60 flex flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Transaction Details
                            </h3>
                            <button
                                onClick={() => setSelectedTransaction(null)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                X
                            </button>
                        </div>

                        {loadingDetails ? (
                            <div className="p-6 text-center">
                                <p className="text-gray-500">Loading transaction details...</p>
                            </div>
                        ) : (
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-600">Transaction ID</p>
                                        <p className="font-medium">#{selectedTransaction.transactionCode || (selectedTransaction.id && selectedTransaction.id.slice(-8)) || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">Date & Time</p>
                                        <p className="font-medium">{new Date(selectedTransaction.transactionDate || selectedTransaction.timestamp).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">Payment Method</p>
                                        <p className="font-medium">{selectedTransaction.paymentMethod || 'Unknown'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">Cashier</p>
                                        <p className="font-medium">{selectedTransaction.cashier || 'N/A'}</p>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-medium text-gray-900 mb-3">Items Purchased</h4>
                                    <div className="space-y-2">
                                        {selectedTransaction.items && selectedTransaction.items.length > 0 ? (
                                            selectedTransaction.items.map((item, idx) => (
                                                <div key={item.productId || item.id || idx} className="flex justify-between items-center py-2 border-b border-gray-100">
                                                    <div>
                                                        <p className="font-medium text-gray-900">{item.productName || item.name}</p>
                                                        <p className="text-sm text-gray-600">${(item.unitPrice || item.price || 0).toFixed(2)} x {item.quantity}</p>
                                                    </div>
                                                    <span className="font-medium">${((item.unitPrice || item.price || 0) * item.quantity).toFixed(2)}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-gray-500">No items data available</p>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Subtotal</span>
                                        <span>${(selectedTransaction.subTotal || selectedTransaction.subtotal || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span>Tax</span>
                                        <span>${(selectedTransaction.taxAmount || selectedTransaction.tax || 0).toFixed(2)}</span>
                                    </div>
                                    {(selectedTransaction.discountAmount || selectedTransaction.discount || 0) > 0 && (
                                        <div className="flex justify-between text-sm text-green-600">
                                            <span>Discount</span>
                                            <span>-${(selectedTransaction.discountAmount || selectedTransaction.discount || 0).toFixed(2)}</span>
                                        </div>
                                    )}
                                    <hr />
                                    <div className="flex justify-between text-lg font-semibold">
                                        <span>Total</span>
                                        <span>${(selectedTransaction.totalAmount || selectedTransaction.total || 0).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};