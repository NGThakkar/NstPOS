import React, { useState } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

export const AddCategory = ({ onAdd }) => {
    const [categoryName, setCategoryName] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!categoryName.trim()) {
            setMessage({ type: 'error', text: 'Category name is required' });
            return;
        }

        setIsLoading(true);
        setMessage({ type: '', text: '' });

        try {
            await onAdd(categoryName);
            setMessage({ type: 'success', text: 'Category added successfully!' });
            setCategoryName('');
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'Failed to add category' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Add Category</h2>
                <p className="mt-1 text-gray-600">Create a new product category</p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-md border border-gray-300 max-w-md mx-auto">
                {message.text && (
                    <div className={`mb-4 p-4 rounded-lg flex items-center gap-3 ${
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

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700 mb-1">
                            Category Name
                        </label>
                        <input
                            id="categoryName"
                            type="text"
                            value={categoryName}
                            onChange={(e) => setCategoryName(e.target.value)}
                            required
                            disabled={isLoading}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                            placeholder="Enter category name"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-indigo-600 text-white font-semibold py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? 'Adding...' : 'Add Category'}
                    </button>
                </form>
            </div>
        </div>
    );
};
