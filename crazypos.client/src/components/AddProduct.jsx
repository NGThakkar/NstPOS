import React, { useState } from 'react';

export const AddProduct = ({ onAdd, categoriesList }) => {
    const [product, setProduct] = useState({
        name: '',
        price: 0.00,
        description: '',
        categoryid: 0,
        barcode: '8798778',
        stock: 0,
        image: null,
    });    

    //const handleFileChange = (e) => {
    //    const file = e.target.files[0];
    //    if (!file) {
    //        setProduct((prev) => ({ ...prev, image: null }));            
    //    }

    //    const reader = new FileReader();
    //    reader.onload = (event) => {
    //        const arrayBuffer = event.target.result;
    //        const bytes = new Uint8Array(arrayBuffer);
    //        setProduct((prev) => ({
    //            ...prev,
    //            image: bytes,                
    //        }));
    //    };

    //    reader.readAsArrayBuffer(file);
    //};

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'image') {
            setProduct((prev) => ({
                ...prev,
                image: e.target.files[0] || null,
            }));
        } else 
        {
            setProduct((prev) => ({
                ...prev,
                [name]: name == "price" ? parseFloat(value) : (name == "stock" || name == "categoryid") ? parseInt(value) : value,
            }));
        }        
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!product.name || !product.price || !product.stock) return;
        onAdd && onAdd(product);
        setProduct({ name: '', price: 0, stock: 0 });
    };

    return (
        <div className="space-y-6 ">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Add Product</h2>
                {/* <p className="mt-1 text-gray-600">View and manage all sales transactions</p> */}
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md border max-w-md mx-auto border-gray-300">
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                            Product Name
                        </label>
                        <input
                            id="name"
                            type="text"
                            name="name"
                            value={product.name}
                            onChange={handleChange}
                            required
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Enter product name"
                        />
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <input
                            id="description"
                            type="text"
                            name="description"
                            value={product.description}
                            onChange={handleChange}
                            required
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Enter product description"
                        />
                    </div>
                    <div>
                        <label htmlFor="categoryid" className="block text-sm font-medium text-gray-700 mb-1">
                            Category
                        </label>
                        <select
                            id="categoryid"
                            name="categoryid"
                            value={product.categoryid}
                            onChange={handleChange}
                            required
                            className="w-full rounded-md border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option key={'0'} value={'0'}>--Select--</option>
                            {categoriesList.map((cat) => (
                                <option key={cat.categoryid} value={cat.categoryid}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                            Price
                        </label>
                        <div className="flex items-center rounded-md bg-white pl-3 outline-1 -outline-offset-1 outline-gray-300 has-[input:focus-within]:outline-2 has-[input:focus-within]:-outline-offset-2 has-[input:focus-within]:outline-indigo-600">
                            <div className="shrink-0 text-base text-gray-500 select-none sm:text-sm/6">$</div>
                            <input
                                id="price"
                                type="number"
                                name="price"
                                value={product.price}
                                onChange={handleChange}
                                required
                                min="0"
                                step="0.01"
                                className="block min-w-0 w-full grow py-2 px-3 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
                                placeholder="Enter price"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity
                        </label>
                        <input
                            id="stock"
                            type="number"
                            name="stock"
                            value={product.stock}
                            onChange={handleChange}
                            required
                            min="1"
                            step="1"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Enter quantity"
                        />
                    </div>

                    <div>
                        <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">
                            Product Image
                        </label>
                        <input
                            id="image"
                            type="file"
                            name="image"
                            accept="image/*"
                            onChange={handleChange}
                            className="w-full text-gray-700"
                        />
                        {/*{product.image && (*/}
                        {/*    <p className="mt-1 text-sm text-gray-500">Selected file: {product.image.name}</p>*/}
                        {/*)}*/}
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-indigo-600 text-white font-semibold py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        Add Product
                    </button>
                </form>
            </div>
        </div>

    );
};