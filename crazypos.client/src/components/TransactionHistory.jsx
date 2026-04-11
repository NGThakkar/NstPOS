import React, { useState } from 'react';
import { Search, Calendar, Eye, Receipt, Download, Filter, X, RefreshCw } from 'lucide-react';
import { getTransactionDetails } from '../utils/storage';
import { getReturnStatusBadgeClass, formatReturnStatus } from '../utils/returns';
import { ReturnModal } from './ReturnModal';
import * as XLSX from 'xlsx';

export const TransactionHistory = ({ transactions, initialFilters = null }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [fromDate, setFromDate] = useState(initialFilters?.fromDate || '');
    const [toDate, setToDate] = useState(initialFilters?.toDate || '');
    const [selectedCustomer, setSelectedCustomer] = useState(initialFilters?.selectedCustomer || '');
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [showFilters, setShowFilters] = useState(initialFilters ? true : false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [transactionForReturn, setTransactionForReturn] = useState(null);
    const [isExporting, setIsExporting] = useState(false);

    const getUniqueCustomers = () => {
        const customers = new Set();
        transactions.forEach((transaction) => {
            const customerName = transaction.customerName || transaction.customer || 'Walk-in Customer';
            customers.add(customerName);
        });
        return Array.from(customers).sort();
    };

    const filteredTransactions = transactions
        .filter((transaction) => {
            const transId = transaction.transactionCode || transaction.id || '';
            const transDate = transaction.transactionDate || transaction.timestamp;
            const cashier = transaction.cashier || transaction.cashierName || '';
            const customerName = transaction.customerName || transaction.customer || 'Walk-in Customer';

            const matchesSearch = transId.includes(searchTerm) ||
                cashier.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesFromDate = !fromDate ||
                new Date(transDate) >= new Date(fromDate);

            const matchesToDate = !toDate ||
                new Date(transDate) <= new Date(new Date(toDate).getTime() + 24 * 60 * 60 * 1000);

            const matchesCustomer = !selectedCustomer ||
                customerName === selectedCustomer;

            return matchesSearch && matchesFromDate && matchesToDate && matchesCustomer;
        })
        .sort((a, b) => {
            const dateA = new Date(a.transactionDate || a.timestamp);
            const dateB = new Date(b.transactionDate || b.timestamp);
            return dateB.getTime() - dateA.getTime();
        });

    const totalSales = filteredTransactions.reduce((sum, t) => sum + (t.totalAmount || t.total || 0), 0);
    const totalTax = filteredTransactions.reduce((sum, t) => sum + (t.taxAmount || t.tax || 0), 0);

    const handleViewDetails = async (transaction) => {
        if (transaction.transactionId) {
            setLoadingDetails(true);
            try {
                const fullDetails = await getTransactionDetails(transaction.transactionId);
                setSelectedTransaction(fullDetails);
            } catch (error) {
                console.error('Error loading transaction details:', error);
                setSelectedTransaction(transaction);
            } finally {
                setLoadingDetails(false);
            }
        } else {
            setSelectedTransaction(transaction);
        }
    };

    const handleProcessReturn = async (transaction) => {
        if (transaction.transactionId) {
            setLoadingDetails(true);
            try {
                const fullDetails = await getTransactionDetails(transaction.transactionId);
                setTransactionForReturn(fullDetails);
            } catch (error) {
                console.error('Error loading transaction for return:', error);
                setTransactionForReturn(transaction);
            } finally {
                setLoadingDetails(false);
            }
        } else {
            setTransactionForReturn(transaction);
        }

        setShowReturnModal(true);
    };

    const resetFilters = () => {
        setSearchTerm('');
        setFromDate('');
        setToDate('');
        setSelectedCustomer('');
    };

    const hasActiveFilters = searchTerm || fromDate || toDate || selectedCustomer;

    const handleExportToExcel = () => {
        try {
            setIsExporting(true);

            const excelData = filteredTransactions.map((transaction) => {
                const transCode = transaction.transactionCode || (transaction.id && transaction.id.slice(-8)) || 'Unknown';
                const transDate = transaction.transactionDate || transaction.timestamp;
                const itemCount = transaction.itemCount || (transaction.items ? transaction.items.length : 0);
                const paymentMethod = transaction.paymentMethod || 'Unknown';
                const totalAmount = transaction.totalAmount || transaction.total || 0;
                const customerName = transaction.customerName || transaction.customer || 'Walk-in Customer';

                let cashier = transaction.cashier || transaction.cashierName || transaction.user?.fullName || 'Unknown';
                if (cashier && cashier.toLowerCase().startsWith('cashier:')) {
                    cashier = cashier.replace(/^cashier:\s*/i, '').trim();
                }

                const taxAmount = transaction.taxAmount || transaction.tax || 0;
                const discountAmount = transaction.discountAmount || transaction.discount || 0;

                return {
                    'Transaction ID': `#${transCode}`,
                    'Date & Time': new Date(transDate).toLocaleString(),
                    'Customer': customerName,
                    'Cashier': cashier,
                    'Items': itemCount,
                    'Subtotal': (totalAmount - taxAmount + discountAmount).toFixed(2),
                    'Tax': taxAmount.toFixed(2),
                    'Discount': discountAmount.toFixed(2),
                    'Total': totalAmount.toFixed(2),
                    'Payment Method': paymentMethod,
                };
            });

            const ws = XLSX.utils.json_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

            const summaryData = [
                ['TRANSACTION SUMMARY'],
                [''],
                ['Total Transactions:', filteredTransactions.length],
                ['Total Sales:', `$${totalSales.toFixed(2)}`],
                ['Total Tax:', `$${totalTax.toFixed(2)}`],
                ['Average Transaction:', `$${(totalSales / filteredTransactions.length || 0).toFixed(2)}`],
                [''],
                ['Filter Information:'],
                ['Search Term:', searchTerm || 'None'],
                ['From Date:', fromDate || 'No filter'],
                ['To Date:', toDate || 'No filter'],
                ['Customer:', selectedCustomer || 'All customers'],
            ];

            const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

            ws['!cols'] = [
                { wch: 18 },
                { wch: 25 },
                { wch: 20 },
                { wch: 15 },
                { wch: 8 },
                { wch: 12 },
                { wch: 12 },
                { wch: 12 },
                { wch: 12 },
                { wch: 15 },
            ];

            let filename = 'Transactions';
            if (fromDate && toDate) {
                filename += `_${fromDate}_to_${toDate}`;
            } else if (fromDate) {
                filename += `_from_${fromDate}`;
            } else if (toDate) {
                filename += `_to_${toDate}`;
            }
            filename += `_${new Date().toISOString().split('T')[0]}.xlsx`;

            XLSX.writeFile(wb, filename);
            alert(`Successfully exported ${filteredTransactions.length} transactions to ${filename}`);
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            alert(`Failed to export: ${error.message}`);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-gray-900">Transaction History</h2>
                <p className="text-gray-600">View and manage all sales transactions</p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-end">
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

                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium whitespace-nowrap"
                    >
                        <Filter className="w-4 h-4 mr-2" />
                        Advanced Filters
                        {hasActiveFilters && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {(searchTerm ? 1 : 0) + (fromDate ? 1 : 0) + (toDate ? 1 : 0) + (selectedCustomer ? 1 : 0)}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={handleExportToExcel}
                        disabled={isExporting || filteredTransactions.length === 0}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                        title={filteredTransactions.length === 0 ? 'No transactions to export' : 'Export filtered transactions to Excel'}
                    >
                        <Download className="w-4 h-4 mr-2" />
                        {isExporting ? 'Exporting...' : 'Export'}
                    </button>
                </div>

                {showFilters && (
                    <div className="pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                                <input
                                    type="date"
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                                <input
                                    type="date"
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={selectedCustomer}
                                onChange={(e) => setSelectedCustomer(e.target.value)}
                            >
                                <option value="">All Customers</option>
                                {getUniqueCustomers().map((customer) => (
                                    <option key={customer} value={customer}>
                                        {customer}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={resetFilters}
                                disabled={!hasActiveFilters}
                                className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <X className="w-4 h-4" />
                                Reset
                            </button>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
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

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredTransactions.map((transaction) => {
                                const transId = transaction.transactionId || transaction.id || 'N/A';
                                const transCode = transaction.transactionCode || (transaction.id && transaction.id.slice(-8)) || 'Unknown';
                                const transDate = transaction.transactionDate || transaction.timestamp;
                                const itemCount = transaction.itemCount || (transaction.items ? transaction.items.length : 0);
                                const paymentMethod = transaction.paymentMethod || 'Unknown';
                                const totalAmount = transaction.totalAmount || transaction.total || 0;
                                const customerName = transaction.customerName || transaction.customer || 'Walk-in Customer';
                                const returnStatus = transaction.returnStatus || 'none';

                                let cashier = transaction.cashier || transaction.cashierName || transaction.user?.fullName || 'Unknown';
                                if (cashier && cashier.toLowerCase().startsWith('cashier:')) {
                                    cashier = cashier.replace(/^cashier:\s*/i, '').trim();
                                }

                                return (
                                    <tr key={transId} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{transCode}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(transDate).toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customerName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{itemCount} item{itemCount !== 1 ? 's' : ''}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{paymentMethod}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">${totalAmount.toFixed(2)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white badge ${getReturnStatusBadgeClass(returnStatus)}`}>
                                                {formatReturnStatus(returnStatus)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => handleViewDetails(transaction)}
                                                    disabled={loadingDetails}
                                                    className="text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
                                                    title={`View details - Cashier: ${cashier}`}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleProcessReturn(transaction)}
                                                    disabled={loadingDetails}
                                                    className="text-purple-600 hover:text-purple-800 transition-colors disabled:opacity-50"
                                                    title="Process return"
                                                >
                                                    <RefreshCw className="w-4 h-4" />
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

            {selectedTransaction && (
                <div className="fixed inset-0 bg-gray-500/60 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Transaction Details</h3>
                            <button
                                onClick={() => setSelectedTransaction(null)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
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
                                        <p className="text-gray-600">Customer</p>
                                        <p className="font-medium">{selectedTransaction.customerName || selectedTransaction.customer || 'Walk-in'}</p>
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

            <ReturnModal
                isOpen={showReturnModal}
                onClose={() => {
                    setShowReturnModal(false);
                    setTransactionForReturn(null);
                }}
                transaction={transactionForReturn}
                onReturnComplete={(result) => {
                    console.log('Return completed:', result);
                }}
            />
        </div>
    );
};