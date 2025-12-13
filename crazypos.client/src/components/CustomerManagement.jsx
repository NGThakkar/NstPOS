import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Eye, Phone, Mail, MapPin, Zap } from 'lucide-react';
import { getAllCustomers, searchCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer, getCustomerTransactions } from '../utils/storage';
import { Spinner } from './Spinner';

export const CustomerManagement = () => {
    const [activeTab, setActiveTab] = useState('list');
    const [customers, setCustomers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [showModal, setShowModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [customerTransactions, setCustomerTransactions] = useState([]);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
        dateOfBirth: '',
        gender: 'Other',
        notes: ''
    });

    useEffect(() => {
        loadCustomers();
    }, []);

    const loadCustomers = async () => {
        setIsLoading(true);
        try {
            const data = await getAllCustomers();
            setCustomers(data || []);
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to load customers' });
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = async (e) => {
        const term = e.target.value;
        setSearchTerm(term);

        if (term.trim() === '') {
            loadCustomers();
            return;
        }

        setIsLoading(true);
        try {
            const results = await searchCustomers(term);
            setCustomers(results || []);
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to search customers' });
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const resetForm = () => {
        setFormData({
            firstName: '',
            lastName: '',
            email: '',
            phoneNumber: '',
            address: '',
            city: '',
            state: '',
            zipCode: '',
            country: '',
            dateOfBirth: '',
            gender: 'Other',
            notes: ''
        });
        setSelectedCustomer(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.firstName || !formData.lastName) {
            setMessage({ type: 'error', text: 'First name and last name are required' });
            return;
        }

        setIsLoading(true);
        try {
            if (selectedCustomer) {
                // Update existing customer - only send non-empty fields
                const updateData = {
                    customerId: selectedCustomer.customerId,
                    firstName: formData.firstName || undefined,
                    lastName: formData.lastName || undefined,
                    email: formData.email || undefined,
                    phoneNumber: formData.phoneNumber || undefined,
                    address: formData.address || undefined,
                    city: formData.city || undefined,
                    state: formData.state || undefined,
                    zipCode: formData.zipCode || undefined,
                    country: formData.country || undefined,
                    dateOfBirth: formData.dateOfBirth || undefined,
                    gender: formData.gender || undefined,
                    notes: formData.notes || undefined
                };
                
                // Remove undefined values
                Object.keys(updateData).forEach(key => 
                    updateData[key] === undefined && delete updateData[key]
                );
                
                await updateCustomer(updateData);
                setMessage({ type: 'success', text: 'Customer updated successfully' });
            } else {
                // Create new customer
                await createCustomer(formData);
                setMessage({ type: 'success', text: 'Customer created successfully' });
            }
            resetForm();
            setShowModal(false);
            await loadCustomers();
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'Failed to save customer' });
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = async (customer) => {
        setSelectedCustomer(customer);
        try {
            const fullCustomer = await getCustomer(customer.customerId);
            customer = fullCustomer;
        } catch (error) {
            console.error('Error fetching full customer data for edit:', error);
        }
        setFormData({
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email || '',
            phoneNumber: customer.phoneNumber || '',
            address: customer.address || '',
            city: customer.city || '',
            state: customer.state || '',
            zipCode: customer.zipCode || '',
            country: customer.country || '',
            dateOfBirth: customer.dateOfBirth ? customer.dateOfBirth.split('T')[0] : '',
            gender: customer.gender || 'Other',
            notes: customer.notes || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (customerId) => {
        if (window.confirm('Are you sure you want to delete this customer?')) {
            setIsLoading(true);
            try {
                await deleteCustomer(customerId);
                setMessage({ type: 'success', text: 'Customer deleted successfully' });
                await loadCustomers();
            } catch (error) {
                setMessage({ type: 'error', text: 'Failed to delete customer' });
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleViewDetails = async (customer) => {
        setIsLoading(true);
        try {
            // Fetch full customer details from API (not just the list view data)
            const fullCustomer = await getCustomer(customer.customerId);
            setSelectedCustomer(fullCustomer);           
            
            // Fetch transactions
            const transactions = await getCustomerTransactions(customer.customerId);
            setCustomerTransactions(transactions || []);
        } catch (error) {
            console.error('Error loading customer details:', error);
            // Fallback to customer from list
            setSelectedCustomer(customer);
            setCustomerTransactions([]);
        } finally {
            setIsLoading(false);
        }
        setShowDetailsModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        resetForm();
    };

    if (isLoading && customers.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Customer Management</h2>
                    <p className="mt-1 text-gray-600">Manage customer information and loyalty rewards</p>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setShowModal(true);
                    }}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Customer
                </button>
            </div>

            {/* Messages */}
            {message.text && (
                <div className={`p-4 rounded-lg flex items-center gap-3 ${
                    message.type === 'success' 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-red-50 border border-red-200'
                }`}>
                    <span className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                        {message.text}
                    </span>
                </div>
            )}

            {/* Search */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or phone..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                </div>
            </div>

            {/* Customers Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Purchases</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loyalty Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {customers.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                                        No customers found
                                    </td>
                                </tr>
                            ) : (
                                customers.map(customer => (
                                    <tr key={customer.customerId} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                            {customer.fullName}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {customer.email || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {customer.phoneNumber || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                            ${customer.totalPurchases.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                customer.loyaltyStatus === 'Gold' ? 'bg-yellow-100 text-yellow-800'
                                                : customer.loyaltyStatus === 'Silver' ? 'bg-gray-100 text-gray-800'
                                                : customer.loyaltyStatus === 'Platinum' ? 'bg-purple-100 text-purple-800'
                                                : 'bg-blue-100 text-blue-800'
                                            }`}>
                                                {customer.loyaltyStatus}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => handleViewDetails(customer)}
                                                    className="text-blue-600 hover:text-blue-800 transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(customer)}
                                                    className="text-green-600 hover:text-green-800 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(customer.customerId)}
                                                    className="text-red-600 hover:text-red-800 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Customer Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-gray-500/60 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {selectedCustomer ? 'Edit Customer' : 'Add New Customer'}
                            </h3>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleInputChange}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                                    <input
                                        type="tel"
                                        name="phoneNumber"
                                        value={formData.phoneNumber}
                                        onChange={handleInputChange}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleInputChange}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                                    <input
                                        type="text"
                                        name="state"
                                        value={formData.state}
                                        onChange={handleInputChange}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Zip Code</label>
                                    <input
                                        type="text"
                                        name="zipCode"
                                        value={formData.zipCode}
                                        onChange={handleInputChange}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                                    <input
                                        type="text"
                                        name="country"
                                        value={formData.country}
                                        onChange={handleInputChange}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                                    <input
                                        type="date"
                                        name="dateOfBirth"
                                        value={formData.dateOfBirth}
                                        onChange={handleInputChange}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                                    <select
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleInputChange}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleInputChange}
                                    rows="3"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </form>

                        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                            <button
                                onClick={closeModal}
                                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isLoading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                            >
                                {isLoading ? 'Saving...' : 'Save Customer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Customer Details Modal */}
            {showDetailsModal && selectedCustomer && (
                <div className="fixed inset-0 bg-gray-500/60 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Customer Details - {selectedCustomer.fullName}
                            </h3>
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                X
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Contact Info */}
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-3">Contact Information</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-start gap-3">
                                        <Mail className="w-5 h-5 text-gray-400 mt-1" />
                                        <div>
                                            <p className="text-sm text-gray-600">Email</p>
                                            <p className="font-medium text-gray-900">{selectedCustomer.email || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Phone className="w-5 h-5 text-gray-400 mt-1" />
                                        <div>
                                            <p className="text-sm text-gray-600">Phone</p>
                                            <p className="font-medium text-gray-900">{selectedCustomer.phoneNumber || '-'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Address */}
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-3">Address</h4>
                                <div className="flex items-start gap-3">
                                    <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {selectedCustomer.address && selectedCustomer.address.trim() ? selectedCustomer.address : 'Not provided'}
                                        </p>
                                        {selectedCustomer.city || selectedCustomer.state || selectedCustomer.zipCode ? (
                                            <>
                                                <p className="text-sm text-gray-600">
                                                    {[selectedCustomer.city, selectedCustomer.state, selectedCustomer.zipCode].filter(Boolean).join(', ')}
                                                </p>
                                                <p className="text-sm text-gray-600">{selectedCustomer.country || 'Not provided'}</p>
                                            </>
                                        ) : (
                                            <p className="text-sm text-gray-600">Address details not provided</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Loyalty */}
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-yellow-500" />
                                    Loyalty Information
                                </h4>
                                <div className="bg-blue-50 rounded-lg p-4">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-600">Status</p>
                                            <p className="font-semibold text-gray-900">{selectedCustomer.loyaltyStatus}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Points</p>
                                            <p className="font-semibold text-gray-900">{selectedCustomer.loyaltyPoints}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Total Purchases</p>
                                            <p className="font-semibold text-gray-900">${selectedCustomer.totalPurchases.toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Transactions */}
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-3">Recent Transactions</h4>
                                {isLoading ? (
                                    <p className="text-gray-500">Loading...</p>
                                ) : customerTransactions.length === 0 ? (
                                    <p className="text-gray-500">No transactions found</p>
                                ) : (
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {customerTransactions.map((trans, idx) => (
                                            <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100">
                                                <div>
                                                    <p className="font-medium text-gray-900">{trans.transactionCode}</p>
                                                    <p className="text-sm text-gray-600">
                                                        {new Date(trans.transactionDate).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <p className="font-semibold text-gray-900">${trans.totalAmount.toFixed(2)}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-200 flex justify-end">
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
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
