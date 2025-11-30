import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, TrendingDown, Package, BarChart3, RefreshCw, Edit2, Trash2, Plus, ChevronDown } from 'lucide-react';
import { getInventorySummary, getInventoryMovementHistory, recordInventoryMovement, adjustInventory, getLowStockItems, getInventoryStats, loadProducts } from '../utils/storage';
import { Spinner } from './Spinner';

export const Inventory = () => {
    const [activeTab, setActiveTab] = useState('summary');
    const [inventoryData, setInventoryData] = useState([]);
    const [movementHistory, setMovementHistory] = useState([]);
    const [inventoryStats, setInventoryStats] = useState(null);
    const [lowStockItems, setLowStockItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [showMovementModal, setShowMovementModal] = useState(false);
    const [products, setProducts] = useState([]);
    const [adjustmentForm, setAdjustmentForm] = useState({
        productId: '',
        newQuantity: '',
        reason: ''
    });
    const [movementForm, setMovementForm] = useState({
        productid: '',
        quantityChange: '',
        movementType: 'Purchase',
        reference: '',
        notes: ''
    });

    const movementTypes = ['Purchase', 'Sale', 'Adjustment', 'Return'];

    useEffect(() => {
        loadInventoryData();
        loadProductsData();
    }, []);

    const loadInventoryData = async () => {
        setIsLoading(true);
        try {
            const [summary, stats, lowStock] = await Promise.all([
                getInventorySummary(),
                getInventoryStats(),
                getLowStockItems(5)
            ]);
            setInventoryData(summary || []);
            setInventoryStats(stats);
            setLowStockItems(lowStock || []);
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to load inventory data' });
        } finally {
            setIsLoading(false);
        }
    };

    const loadProductsData = async () => {
        try {
            const data = await loadProducts();
            setProducts(data || []);
        } catch (_error) {
            console.error('Error loading products:', _error);
        }
    };

    const handleViewHistory = async (productId) => {
        try {
            setIsLoading(true);
            const history = await getInventoryMovementHistory(productId);
            setMovementHistory(history || []);
            setActiveTab('history');
        } catch (_error) {
            setMessage({ type: 'error', text: 'Failed to load movement history' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdjustSubmit = async () => {
        if (!adjustmentForm.productId || adjustmentForm.newQuantity === '' || !adjustmentForm.reason) {
            setMessage({ type: 'error', text: 'Please fill in all fields' });
            return;
        }

        try {
            setIsLoading(true);
            await adjustInventory(
                parseInt(adjustmentForm.productId),
                parseInt(adjustmentForm.newQuantity),
                adjustmentForm.reason
            );
            setMessage({ type: 'success', text: 'Inventory adjusted successfully' });
            setShowAdjustModal(false);
            setAdjustmentForm({ productId: '', newQuantity: '', reason: '' });
            await loadInventoryData();
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'Failed to adjust inventory' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleMovementSubmit = async () => {
        if (!movementForm.productid || movementForm.quantityChange === '') {
            setMessage({ type: 'error', text: 'Please fill in required fields' });
            return;
        }

        try {
            setIsLoading(true);
            await recordInventoryMovement({
                productid: parseInt(movementForm.productid),
                quantityChange: parseInt(movementForm.quantityChange),
                movementType: movementForm.movementType,
                reference: movementForm.reference,
                notes: movementForm.notes
            });
            setMessage({ type: 'success', text: 'Inventory movement recorded' });
            setShowMovementModal(false);
            setMovementForm({
                productid: '',
                quantityChange: '',
                movementType: 'Purchase',
                reference: '',
                notes: ''
            });
            await loadInventoryData();
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'Failed to record movement' });
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && inventoryData.length === 0) {
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
                    <h2 className="text-2xl font-bold text-gray-900">Inventory Management</h2>
                    <p className="mt-1 text-gray-600">Monitor and manage product stock levels</p>
                </div>
                <button
                    onClick={loadInventoryData}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Refresh
                </button>
            </div>

            {/* Messages */}
            {message.text && (
                <div className={`p-4 rounded-lg flex items-center gap-3 ${
                    message.type === 'success' 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-red-50 border border-red-200'
                }`}>
                    {message.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    )}
                    <span className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                        {message.text}
                    </span>
                </div>
            )}

            {/* Stats Cards */}
            {inventoryStats && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Total Products</p>
                                <p className="text-2xl font-bold text-gray-900">{inventoryStats.totalProducts}</p>
                            </div>
                            <Package className="w-8 h-8 text-blue-600" />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Stock Value</p>
                                <p className="text-2xl font-bold text-gray-900">${(inventoryStats.totalStockValue / 1000).toFixed(1)}k</p>
                            </div>
                            <BarChart3 className="w-8 h-8 text-green-600" />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Out of Stock</p>
                                <p className="text-2xl font-bold text-red-600">{inventoryStats.outOfStockCount}</p>
                            </div>
                            <AlertCircle className="w-8 h-8 text-red-600" />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Low Stock</p>
                                <p className="text-2xl font-bold text-yellow-600">{inventoryStats.lowStockCount}</p>
                            </div>
                            <TrendingDown className="w-8 h-8 text-yellow-600" />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Avg Stock</p>
                                <p className="text-2xl font-bold text-gray-900">{Math.round(inventoryStats.averageStockLevel)}</p>
                            </div>
                            <BarChart3 className="w-8 h-8 text-gray-600" />
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-4 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('summary')}
                    className={`px-4 py-2 font-medium ${activeTab === 'summary' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
                >
                    Inventory Summary
                </button>
                <button
                    onClick={() => setActiveTab('lowStock')}
                    className={`px-4 py-2 font-medium ${activeTab === 'lowStock' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
                >
                    Low Stock Items
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 font-medium ${activeTab === 'history' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
                >
                    Movement History
                </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
                <button
                    onClick={() => setShowMovementModal(true)}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Record Movement
                </button>
                <button
                    onClick={() => setShowAdjustModal(true)}
                    className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                >
                    <Edit2 className="w-5 h-5 mr-2" />
                    Adjust Stock
                </button>
            </div>

            {/* Content */}
            {activeTab === 'summary' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Stock</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {inventoryData.map((item) => (
                                    <tr key={item.productid} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.productName}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{item.currentStock}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900">${item.unitPrice?.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900">${item.totalValue?.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                item.status === 'In Stock' ? 'bg-green-100 text-green-800'
                                                : item.status === 'Low Stock' ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-red-100 text-red-800'
                                            }`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <button
                                                onClick={() => handleViewHistory(item.productid)}
                                                className="text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                History
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'lowStock' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Stock</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {lowStockItems.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-4 text-center text-gray-500">No low stock items</td>
                                    </tr>
                                ) : (
                                    lowStockItems.map((item) => (
                                        <tr key={item.productid} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.productName}</td>
                                            <td className="px-6 py-4 text-sm text-red-600 font-semibold">{item.currentStock}</td>
                                            <td className="px-6 py-4 text-sm text-gray-900">${item.unitPrice?.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                    item.status === 'Out of Stock' ? 'bg-red-100 text-red-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'history' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {movementHistory.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-4 text-center text-gray-500">No movements recorded</td>
                                    </tr>
                                ) : (
                                    movementHistory.map((movement, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm text-gray-600">{new Date(movement.createdAt).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                                                    {movement.movementType}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-semibold text-gray-900">{movement.quantity}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{movement.reference || '-'}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{movement.notes || '-'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Adjust Inventory Modal */}
            {showAdjustModal && (
                <div className="fixed inset-0 bg-gray-500/60 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg max-w-md w-full mx-4">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Adjust Inventory</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
                                <select
                                    value={adjustmentForm.productId}
                                    onChange={(e) => setAdjustmentForm({...adjustmentForm, productId: e.target.value})}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select a product</option>
                                    {products.map(p => (
                                        <option key={p.productid} value={p.productid}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">New Quantity</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={adjustmentForm.newQuantity}
                                    onChange={(e) => setAdjustmentForm({...adjustmentForm, newQuantity: e.target.value})}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter new quantity"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                                <textarea
                                    value={adjustmentForm.reason}
                                    onChange={(e) => setAdjustmentForm({...adjustmentForm, reason: e.target.value})}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter adjustment reason"
                                    rows="3"
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                            <button
                                onClick={() => setShowAdjustModal(false)}
                                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAdjustSubmit}
                                disabled={isLoading}
                                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50"
                            >
                                {isLoading ? 'Adjusting...' : 'Adjust'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Record Movement Modal */}
            {showMovementModal && (
                <div className="fixed inset-0 bg-gray-500/60 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg max-w-md w-full mx-4">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Record Inventory Movement</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
                                <select
                                    value={movementForm.productid}
                                    onChange={(e) => setMovementForm({...movementForm, productid: e.target.value})}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select a product</option>
                                    {products.map(p => (
                                        <option key={p.productid} value={p.productid}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Movement Type</label>
                                <select
                                    value={movementForm.movementType}
                                    onChange={(e) => setMovementForm({...movementForm, movementType: e.target.value})}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {movementTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity Change</label>
                                <input
                                    type="number"
                                    value={movementForm.quantityChange}
                                    onChange={(e) => setMovementForm({...movementForm, quantityChange: e.target.value})}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Positive for increase, negative for decrease"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Reference</label>
                                <input
                                    type="text"
                                    value={movementForm.reference}
                                    onChange={(e) => setMovementForm({...movementForm, reference: e.target.value})}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="PO#, Transaction ID, etc."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                                <textarea
                                    value={movementForm.notes}
                                    onChange={(e) => setMovementForm({...movementForm, notes: e.target.value})}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Additional notes"
                                    rows="2"
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                            <button
                                onClick={() => setShowMovementModal(false)}
                                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleMovementSubmit}
                                disabled={isLoading}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                            >
                                {isLoading ? 'Recording...' : 'Record'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
