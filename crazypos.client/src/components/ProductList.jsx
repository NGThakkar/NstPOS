import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, AlertCircle, CheckCircle, Plus, X, Search, Filter } from 'lucide-react';
import { loadProducts, loadCategories, addProduct, updateProduct, deleteProduct } from '../utils/storage';

export const ProductList = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    
    // Filter state
    const [filters, setFilters] = useState({
        searchTerm: '',
        categoryId: '',
        stockStatus: '', // 'all', 'inStock', 'lowStock', 'outOfStock'
        minPrice: '',
        maxPrice: '',
        showFilters: false
    });

    const [formData, setFormData] = useState({
        productid: '',
        name: '',
        price: '',
        description: '',
        categoryid: '',
        barcode: '',
        stock: '',
        image: null,
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [productsData, categoriesData] = await Promise.all([
                loadProducts(),
                loadCategories()
            ]);
            setProducts(productsData || []);
            setCategories(categoriesData || []);
            setMessage({ type: '', text: '' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to load data' });
        } finally {
            setIsLoading(false);
        }
    };

    // Filter products based on all active filters
    const filteredProducts = products.filter(product => {
        // Search filter (name or barcode)
        if (filters.searchTerm) {
            const searchLower = filters.searchTerm.toLowerCase();
            const matchesSearch = 
                product.name.toLowerCase().includes(searchLower) ||
                (product.barcode && product.barcode.includes(searchLower));
            if (!matchesSearch) return false;
        }

        // Category filter
        if (filters.categoryId && product.categoryid !== parseInt(filters.categoryId)) {
            return false;
        }

        // Stock status filter
        if (filters.stockStatus) {
            if (filters.stockStatus === 'inStock' && product.stock <= 0) return false;
            if (filters.stockStatus === 'lowStock' && (product.stock <= 0 || product.stock > 10)) return false;
            if (filters.stockStatus === 'outOfStock' && product.stock > 0) return false;
        }

        // Price range filter
        if (filters.minPrice && product.price < parseFloat(filters.minPrice)) {
            return false;
        }
        if (filters.maxPrice && product.price > parseFloat(filters.maxPrice)) {
            return false;
        }

        return true;
    });

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const resetFilters = () => {
        setFilters({
            searchTerm: '',
            categoryId: '',
            stockStatus: '',
            minPrice: '',
            maxPrice: '',
            showFilters: false
        });
    };

    const handleEdit = (product) => {
        setEditingId(product.productid);
        setFormData({
            productid: product.productid,
            name: product.name,
            price: product.price,
            description: product.description,
            categoryid: product.categoryid,
            barcode: product.barcode,
            stock: product.stock,
            image: null,
        });
        if (product.image) {
            setImagePreview(`data:image/${product.imgextension};base64,${product.image}`);
        }
        setShowForm(true);
    };

    const handleInputChange = (e) => {
        const { name, value, type, files } = e.target;
        
        if (type === 'file') {
            setFormData(prev => ({ ...prev, image: files[0] || null }));
            if (files[0]) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    setImagePreview(event.target.result);
                };
                reader.readAsDataURL(files[0]);
            }
        } else if (name === 'price') {
            const price = value === '' ? '' : parseFloat(value);
            setFormData(prev => ({ ...prev, [name]: price }));
        } else if (name === 'stock') {
            const stock = value === '' ? '' : parseInt(value);
            setFormData(prev => ({ ...prev, [name]: stock }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.price || !formData.stock || !formData.categoryid) {
            setMessage({ type: 'error', text: 'Please fill in all required fields' });
            setIsLoading(false);
            return;
        }

        try {
            if (editingId) {
                await updateProduct(formData);
                setMessage({ type: 'success', text: 'Product updated successfully!' });
            } else {
                await addProduct(formData);
                setMessage({ type: 'success', text: 'Product added successfully!' });
            }
            
            resetForm();
            await fetchData();
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'Failed to save product' });
        }
        setIsLoading(false);
    };

    const handleDelete = async (productId) => {
        setIsLoading(true);
        try {
            await deleteProduct(productId);
            setDeleteConfirm(null);
            setMessage({ type: 'success', text: 'Product deleted successfully!' });
            await fetchData();
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'Failed to delete product' });
            setDeleteConfirm(null);
        }
        setIsLoading(false);
    };

    const resetForm = () => {
        setFormData({
            productid: '',
            name: '',
            price: '',
            description: '',
            categoryid: '',
            barcode: '',
            stock: '',
            image: null,
        });
        setImagePreview(null);
        setEditingId(null);
        setShowForm(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Products</h2>
                    <p className="mt-1 text-gray-600">Manage your product inventory</p>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setShowForm(true);
                    }}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Product
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

            {/* Add/Edit Product Form */}
            {showForm && (
                <div className="bg-white rounded-lg shadow-md border border-gray-300 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                            {editingId ? 'Edit Product' : 'Add New Product'}
                        </h3>
                        <button
                            onClick={resetForm}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Product Name *
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter product name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Category *
                            </label>
                            <select
                                name="categoryid"
                                value={formData.categoryid}
                                onChange={handleInputChange}
                                required
                                className="w-full rounded-md border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select a category</option>
                                {categories.map(cat => (
                                    <option key={cat.categoryid} value={cat.categoryid}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Price *
                            </label>
                            <div className="flex items-center rounded-md bg-white pl-3 outline-1 outline-gray-300 has-[input:focus-within]:outline-2 has-[input:focus-within]:outline-blue-600">
                                <span className="text-gray-500">$</span>
                                <input
                                    type="number"
                                    name="price"
                                    value={formData.price}
                                    onChange={handleInputChange}
                                    required
                                    min="0"
                                    step="0.01"
                                    className="flex-1 px-3 py-2 focus:outline-none"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Stock Quantity *
                            </label>
                            <input
                                type="number"
                                name="stock"
                                value={formData.stock}
                                onChange={handleInputChange}
                                required
                                min="0"
                                step="1"
                                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter stock quantity"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Barcode
                            </label>
                            <input
                                type="text"
                                name="barcode"
                                value={formData.barcode}
                                onChange={handleInputChange}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter barcode"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Product Image
                            </label>
                            <input
                                type="file"
                                name="image"
                                accept="image/*"
                                onChange={handleInputChange}
                                className="w-full text-gray-700"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter product description"
                                rows="3"
                            />
                        </div>

                        {imagePreview && (
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Image Preview
                                </label>
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    className="h-32 w-32 object-cover rounded-md"
                                />
                            </div>
                        )}

                        <div className="md:col-span-2 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                {editingId ? 'Update Product' : 'Add Product'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Filters Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <button
                    onClick={() => setFilters(prev => ({ ...prev, showFilters: !prev.showFilters }))}
                    className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium mb-4"
                >
                    <Filter className="w-5 h-5" />
                    Filters
                    <span className="text-sm text-gray-500">
                        {filteredProducts.length} results
                    </span>
                </button>

                {filters.showFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {/* Search Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Search
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    name="searchTerm"
                                    placeholder="Name or barcode..."
                                    value={filters.searchTerm}
                                    onChange={handleFilterChange}
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Category Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Category
                            </label>
                            <select
                                name="categoryId"
                                value={filters.categoryId}
                                onChange={handleFilterChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Categories</option>
                                {categories.map(cat => (
                                    <option key={cat.categoryid} value={cat.categoryid}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Stock Status Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Stock Status
                            </label>
                            <select
                                name="stockStatus"
                                value={filters.stockStatus}
                                onChange={handleFilterChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Stock Status</option>
                                <option value="inStock">In Stock (&gt;10)</option>
                                <option value="lowStock">Low Stock (1-10)</option>
                                <option value="outOfStock">Out of Stock</option>
                            </select>
                        </div>

                        {/* Min Price Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Min Price
                            </label>
                            <input
                                type="number"
                                name="minPrice"
                                placeholder="$0.00"
                                value={filters.minPrice}
                                onChange={handleFilterChange}
                                min="0"
                                step="0.01"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Max Price Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Max Price
                            </label>
                            <input
                                type="number"
                                name="maxPrice"
                                placeholder="$9999.99"
                                value={filters.maxPrice}
                                onChange={handleFilterChange}
                                min="0"
                                step="0.01"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Reset Filters Button */}
                        <div className="flex items-end">
                            <button
                                onClick={resetFilters}
                                className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                            >
                                Reset Filters
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500 text-lg">No products found</p>
                        {Object.values(filters).some(v => v && v !== false) ? (
                            <p className="text-gray-400">Try adjusting your filters</p>
                        ) : (
                            <p className="text-gray-400">Click on "Add Product" to create one</p>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Image
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Category
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Price
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Stock
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Barcode
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredProducts.map(product => (
                                    <tr key={product.productid} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {product.image ? (
                                                <img
                                                    src={`data:image/${product.imgextension};base64,${product.image}`}
                                                    alt={product.name}
                                                    className="h-10 w-10 object-cover rounded"
                                                />
                                            ) : (
                                                <div className="h-10 w-10 bg-gray-200 rounded flex items-center justify-center">
                                                    <span className="text-xs text-gray-500">No image</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                            <div className="text-xs text-gray-500">{product.description}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {product.categoryName}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                            ${product.price.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                product.stock > 10 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : product.stock > 0 
                                                    ? 'bg-yellow-100 text-yellow-800' 
                                                    : 'bg-red-100 text-red-800'
                                            }`}>
                                                {product.stock}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {product.barcode || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => handleEdit(product)}
                                                    className="text-blue-600 hover:text-blue-800 transition-colors"
                                                    title="Edit product"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(product.productid)}
                                                    className="text-red-600 hover:text-red-800 transition-colors"
                                                    title="Delete product"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-gray-500/60 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg max-w-sm w-full mx-4">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Product</h3>
                            <p className="text-gray-600 mb-6">
                                Are you sure you want to delete this product? This action cannot be undone.
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
