import React, { useState } from 'react';
import { Search, Plus, Minus, Package } from 'lucide-react';

export const ProductCatalog = ({
    products,
    cart,
    onAddToCart,
    categories,
    onRemoveFromCart
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('0');
    const [imageLoaded, setImageLoaded] = useState(false);

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.barcode?.includes(searchTerm);
        const matchesCategory = selectedCategory === '0' || product.categoryid === parseInt(selectedCategory);
        return matchesSearch && matchesCategory;
    });

    const getCartQuantity = (productId) => {
        const cartItem = cart.find(item => item.productid === productId);
        return cartItem ? cartItem.quantity : 0;
    };

    console.log('Rendering ProductCatalog with products:', products);
    console.log('categories :: ', categories);
   
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Point of Sale</h2>

                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search products or scan barcode..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <select
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                        <option key={'0'} value={'0'}>All</option>
                        {categories.map(category => (
                            <option key={category.categoryid} value={category.categoryid}>{category.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map(product => {
                    const cartQuantity = getCartQuantity(product.productid);
                    const isOutOfStock = product.stock === 0;

                    return (
                        <div
                            key={product.productid}
                            className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow ${isOutOfStock ? 'opacity-60' : ''}`}
                        >
                            <div className="aspect-w-16 aspect-h-12 bg-gray-100">                                
                                {product.imgextension && product.image && (
                                    <img
                                        src={`data:image/${product.imgextension};base64,${product.image }`}
                                        alt={product.name}
                                        className="w-full h-32 object-cover"
                                        onLoad={() => setImageLoaded(true)}
                                        style={{ display: imageLoaded ? "block" : "none" }}
                                    />
                                )}
                            </div>

                            <div className="p-4">
                                <h3 className="font-medium text-gray-900 mb-1">{product.name}</h3>
                                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{product.description}</p>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-lg font-bold text-gray-900">${product.price.toFixed(2)}</span>
                                    <span className={`text-sm ${product.stock <= 10 ? 'text-red-600' : 'text-gray-600'}`}>
                                        Stock: {product.stock}
                                    </span>
                                </div>

                                {cartQuantity > 0 ? (
                                    <div className="flex items-center justify-between">
                                        <button
                                            onClick={() => onRemoveFromCart(product)}
                                            className="p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                                            {cartQuantity} in cart
                                        </span>
                                        <button
                                            onClick={() => onAddToCart(product)}
                                            disabled={isOutOfStock}
                                            className="p-1 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors disabled:opacity-50"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => onAddToCart(product)}
                                        disabled={isOutOfStock}
                                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                                    >
                                        {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredProducts.length === 0 && (
                <div className="text-center py-12">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No products found</p>
                    <p className="text-gray-400">Try adjusting your search or filter criteria</p>
                </div>
            )}
        </div>
    );
};