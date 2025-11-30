import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, AlertCircle, CheckCircle, Plus, X } from 'lucide-react';
import { loadCategories, updateCategory, deleteCategory, addCategory } from '../utils/storage';

export const CategoryList = ({ onCategoryAdded }) => {
    const [categories, setCategories] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    useEffect(() => {
        fetchCategories();
    }, [onCategoryAdded]);

    const fetchCategories = async () => {
        setIsLoading(true);
        try {
            const data = await loadCategories();
            setCategories(data || []);
            setMessage({ type: '', text: '' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to load categories' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (category) => {
        setEditingId(category.categoryid);
        setEditingName(category.name);
    };

    const handleSaveEdit = async (categoryId) => {
        if (!editingName.trim()) {
            setMessage({ type: 'error', text: 'Category name cannot be empty' });
            return;
        }

        try {
            await updateCategory(categoryId, editingName);
            setEditingId(null);
            setEditingName('');
            setMessage({ type: 'success', text: 'Category updated successfully!' });
            await fetchCategories();
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'Failed to update category' });
        }
    };

    const handleAddCategory = async (e) => {
        e.preventDefault();
        
        if (!newCategoryName.trim()) {
            setMessage({ type: 'error', text: 'Category name cannot be empty' });
            return;
        }

        try {
            await addCategory(newCategoryName);
            setMessage({ type: 'success', text: 'Category added successfully!' });
            setNewCategoryName('');
            setShowAddForm(false);
            await fetchCategories();
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'Failed to add category' });
        }
    };

    const handleDelete = async (categoryId) => {
        try {
            await deleteCategory(categoryId);
            setDeleteConfirm(null);
            setMessage({ type: 'success', text: 'Category deleted successfully!' });
            await fetchCategories();
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'Failed to delete category' });
            setDeleteConfirm(null);
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditingName('');
    };

    const resetAddForm = () => {
        setShowAddForm(false);
        setNewCategoryName('');
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Categories</h2>
                    <p className="mt-1 text-gray-600">Manage product categories</p>
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Category
                </button>
            </div>

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

            {/* Add Category Form */}
            {showAddForm && (
                <div className="bg-white rounded-lg shadow-md border border-gray-300 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Add New Category</h3>
                        <button
                            onClick={resetAddForm}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleAddCategory} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Category Name *
                            </label>
                            <input
                                type="text"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                required
                                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter category name"
                                autoFocus
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={resetAddForm}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                Add Category
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : categories.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500 text-lg">No categories found</p>
                        <p className="text-gray-400">Click on "Add Category" to create one</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Category ID
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Category Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {categories.map(category => (
                                    <tr key={category.categoryid} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            #{category.categoryid}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            {editingId === category.categoryid ? (
                                                <input
                                                    type="text"
                                                    value={editingName}
                                                    onChange={(e) => setEditingName(e.target.value)}
                                                    className="w-full px-2 py-1 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    autoFocus
                                                />
                                            ) : (
                                                <span className="text-gray-900">{category.name}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {editingId === category.categoryid ? (
                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        onClick={() => handleSaveEdit(category.categoryid)}
                                                        className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-xs font-medium"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={handleCancel}
                                                        className="px-3 py-1 bg-gray-400 text-white rounded-md hover:bg-gray-500 transition-colors text-xs font-medium"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        onClick={() => handleEdit(category)}
                                                        className="text-blue-600 hover:text-blue-800 transition-colors"
                                                        title="Edit category"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirm(category.categoryid)}
                                                        className="text-red-600 hover:text-red-800 transition-colors"
                                                        title="Delete category"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {deleteConfirm && (
                <div className="fixed inset-0 bg-gray-500/60 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg max-w-sm w-full mx-4">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Category</h3>
                            <p className="text-gray-600 mb-6">
                                Are you sure you want to delete this category? This action cannot be undone.
                            </p>

                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDelete(deleteConfirm)}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
