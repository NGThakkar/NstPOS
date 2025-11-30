import React, { useState } from 'react';
import { Search, Calendar, Eye, Receipt, Download } from 'lucide-react';

export const TransactionHistory = ({ transactions }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTransaction, setSelectedTransaction] = useState(null);

    const filteredTransactions = transactions.filter(transaction => {
        const matchesSearch = transaction.id.includes(searchTerm) ||
            transaction.cashier?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDate = !selectedDate ||
            new Date(transaction.timestamp).toDateString() === new Date(selectedDate).toDateString();
        return matchesSearch && matchesDate;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const totalSales = filteredTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalTax = filteredTransactions.reduce((sum, t) => sum + t.tax, 0);

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
                            {filteredTransactions.map(transaction => (
                                <tr key={transaction.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        #{transaction.id.slice(-8)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(transaction.timestamp).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {transaction.items.length} item{transaction.items.length !== 1 ? 's' : ''}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {transaction.paymentMethod}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                        ${transaction.total.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => setSelectedTransaction(transaction)}
                                                className="text-blue-600 hover:text-blue-800 transition-colors"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button className="text-green-600 hover:text-green-800 transition-colors">
                                                <Receipt className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
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

                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-600">Transaction ID</p>
                                    <p className="font-medium">#{selectedTransaction.id.slice(-8)}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600">Date & Time</p>
                                    <p className="font-medium">{new Date(selectedTransaction.timestamp).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600">Payment Method</p>
                                    <p className="font-medium">{selectedTransaction.paymentMethod}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600">Cashier</p>
                                    <p className="font-medium">{selectedTransaction.cashier || 'N/A'}</p>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-medium text-gray-900 mb-3">Items Purchased</h4>
                                <div className="space-y-2">
                                    {selectedTransaction.items.map(item => (
                                        <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                                            <div>
                                                <p className="font-medium text-gray-900">{item.name}</p>
                                                <p className="text-sm text-gray-600">${item.price.toFixed(2)} x {item.quantity}</p>
                                            </div>
                                            <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Subtotal</span>
                                    <span>${selectedTransaction.subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Tax</span>
                                    <span>${selectedTransaction.tax.toFixed(2)}</span>
                                </div>
                                {selectedTransaction.discount > 0 && (
                                    <div className="flex justify-between text-sm text-green-600">
                                        <span>Discount</span>
                                        <span>-${selectedTransaction.discount.toFixed(2)}</span>
                                    </div>
                                )}
                                <hr />
                                <div className="flex justify-between text-lg font-semibold">
                                    <span>Total</span>
                                    <span>${selectedTransaction.total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};