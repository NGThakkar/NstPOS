import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    History,
    Settings,
    Store,
    LogOut,
    Users,
    Tag
} from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { ProductCatalog } from './components/ProductCatalog';
import { Spinner } from './components/Spinner';
import { ShoppingCart as Cart } from './components/ShoppingCart';
import { PaymentModal } from './components/PaymentModal';
import { ProductList } from './components/ProductList';
import { CategoryList } from './components/CategoryList';
import { TransactionHistory } from './components/TransactionHistory';
import { Inventory } from './components/Inventory';
import { CustomerManagement } from './components/CustomerManagement';
import { Login } from './components/Login';
import { Sales } from './components/Sales';
import { UserManagement } from './components/UserManagement';
import { PromotionManagement } from './components/PromotionManagement';
import { sampleProducts } from './data/products';
import { loadTransactionsFromDatabase, saveTransaction, loadProducts, loadCategories } from './utils/storage';
import { getStoredToken, getStoredUser, logoutUser, validateToken } from './utils/auth';

function App() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [productMenuOpen, setProductMenuOpen] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [authToken, setAuthToken] = useState(null);
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [categoriesList, setCategoriesList] = useState([]);
    const [transactionFilters, setTransactionFilters] = useState(null);

    useEffect(() => {
        async function bootstrapAuth() {
            const token = getStoredToken();
            const user = getStoredUser();
            const expiresAt = sessionStorage.getItem('authExpiresAt');

            if (!token || !user) return;

            if (expiresAt && Date.now() >= new Date(expiresAt).getTime()) {
                sessionStorage.removeItem('authToken');
                sessionStorage.removeItem('authExpiresAt');
                sessionStorage.removeItem('user');
                return;
            }

            try {
                const validated = await validateToken(token);
                if (validated?.valid) {
                    setIsAuthenticated(true);
                    setCurrentUser(validated.user ?? user);
                    setAuthToken(token);
                    if (validated.expiresAt) {
                        sessionStorage.setItem('authExpiresAt', validated.expiresAt);
                    }
                } else {
                    sessionStorage.removeItem('authToken');
                    sessionStorage.removeItem('authExpiresAt');
                    sessionStorage.removeItem('user');
                }
            } catch {
                sessionStorage.removeItem('authToken');
                sessionStorage.removeItem('authExpiresAt');
                sessionStorage.removeItem('user');
            }
        }

        bootstrapAuth();
    }, []);

    useEffect(() => {
        const handleSessionExpired = () => {
            setIsAuthenticated(false);
            setCurrentUser(null);
            setAuthToken(null);
            setActiveTab('dashboard');
            sessionStorage.removeItem('authToken');
            sessionStorage.removeItem('authExpiresAt');
            sessionStorage.removeItem('user');
        };

        window.addEventListener('session:expired', handleSessionExpired);
        return () => window.removeEventListener('session:expired', handleSessionExpired);
    }, []);

    // Load data on mount
    useEffect(() => {
        async function loadData() {
            setIsLoading(true);
            try {
                // Load transactions from database instead of localStorage
                const dbTransactions = await loadTransactionsFromDatabase();
                setTransactions(dbTransactions);

                if (activeTab === 'sales') {
                    const productsData = await loadProducts();
                    const categoriesData = await loadCategories();
                    
                    
                    setProducts(productsData || []);
                    setCategoriesList(categoriesData || []);
                    
                } else if (activeTab === 'pos') {
                    const storedProducts = await fetchProducts();
                    if (storedProducts && storedProducts.length > 0) {
                        setProducts(storedProducts);
                    }
                    const categories = await loadCategories();
                    if (categories && categories.length > 0) {
                        setCategoriesList(categories);
                    }
                } else if (activeTab === 'addproduct' || activeTab === 'addcategory' || activeTab === 'categories') {
                    const categories = await loadCategories();
                    if (categories && categories.length > 0) {
                        setCategoriesList(categories);
                    }
                }
            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setIsLoading(false);
            }
        }

        loadData();
    }, [activeTab]);

    async function fetchProducts() {
        try {
            const apiProducts = await loadProducts();
            //console.log(apiProducts);
            setProducts(apiProducts);
            //saveProducts(apiProducts);
        } catch (error) {
            console.error("Failed to fetch products from API, using local data.", error);
            setProducts(sampleProducts);
            //saveProducts(sampleProducts);
        }
    }

    const handleAddToCart = (product) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.productid === product.productid);
            if (existingItem) {
                return prevCart.map(item =>
                    item.productid === product.productid
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prevCart, { ...product, quantity: 1 }];
        });
    };

    const handleRemoveFromCart = (product) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.productid === product.productid);
            if (existingItem) {
                return prevCart.map(item =>
                    item.productid === product.productid
                        ? { ...item, quantity: item.quantity - 1 }
                        : item
                );
            }
            return [...prevCart, { ...product, quantity: 1 }];
        });
    };

    const handleUpdateQuantity = (id, quantity) => {
        if (quantity === 0) {
            handleRemoveItem(id);
            return;
        }

        setCart(prevCart =>
            prevCart.map(item =>
                item.productid === id ? { ...item, quantity } : item
            )
        );
    };

    const handleRemoveItem = (id) => {
        setCart(prevCart => prevCart.filter(item => item.productid !== id));
    };

    const handlePaymentComplete = async (transaction) => {
        // Update inventory
        const updatedProducts = products.map(product => {
            const cartItem = cart.find(item => item.productid === product.productid);
            if (cartItem) {
                return { ...product, stock: Math.max(0, product.stock - cartItem.quantity) };
            }
            return product;
        });

        setProducts(updatedProducts);
        //saveProducts(updatedProducts);

        // Save transaction
        const updatedTransactions = [...transactions, transaction];
        setTransactions(updatedTransactions);
        const result = await saveTransaction(transaction);

        // Clear cart
        setCart([]);
        return result;
    };

    const handleLoginSuccess = (user, token) => {
        setIsAuthenticated(true);
        setCurrentUser(user);
        setAuthToken(token);
        if (user) {
            sessionStorage.setItem('user', JSON.stringify(user));
        }
    };

    const handleLogout = async () => {
        try {
            if (authToken) {
                await logoutUser(authToken);
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
        setIsAuthenticated(false);
        setCurrentUser(null);
        setAuthToken(null);
        setActiveTab('dashboard');
    };

    const toggleProductMenu = () => {
        setProductMenuOpen((prev) => !prev);
    };

    // Show login screen if not authenticated
    if (!isAuthenticated) {
        return <Login onLoginSuccess={handleLoginSuccess} />;
    }

    const navigation = [
        { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
        {
            id: 'product',
            name: 'Product',
            icon: Package,
            submenu: [
                { id: 'products', name: 'Products' },
                { id: 'categories', name: 'Categories' }
            ]
        },
        { id: 'sales', name: 'Sales', icon: ShoppingCart },
        { id: 'inventory', name: 'Inventory', icon: Package },
        { id: 'customers', name: 'Customers', icon: Users },
        { id: 'promotions', name: 'Promotions', icon: Tag },
        { id: 'users', name: 'Users', icon: Users },
        { id: 'transactions', name: 'Transactions', icon: History },
        { id: 'settings', name: 'Settings', icon: Settings }
    ];

    // Filter navigation based on user role
    const getFilteredNavigation = () => {
        const userRole = currentUser?.role || 'Cashier';
        
        // Define which menu items are available for each role
        const rolePermissions = {
            'Admin': ['dashboard', 'product', 'sales', 'inventory', 'customers', 'promotions', 'users', 'transactions', 'settings'],
            'Manager': ['dashboard', 'product', 'sales', 'inventory', 'customers', 'promotions', 'transactions'],
            'Cashier': ['dashboard', 'sales', 'customers', 'transactions']
        };

        const allowedItems = rolePermissions[userRole] || rolePermissions['Cashier'];

        return navigation.filter(item => {
            if (item.submenu) {
                // Filter submenu items - only show product submenu for managers/admins
                if (item.id === 'product') {
                    return userRole !== 'Cashier' && allowedItems.includes(item.id);
                }
                return allowedItems.includes(item.id);
            }
            return allowedItems.includes(item.id);
        });
    };

    const filteredNavigation = getFilteredNavigation();

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return (<> {isLoading ? (<>
                    <div className="flex items-center justify-center h-full">
                        <Spinner />
                    </div>
                </>
                ) : (<Dashboard transactions={transactions} setActiveTab={setActiveTab} setTransactionFilters={setTransactionFilters} currentUser={currentUser} />)}</>);
            case 'sales':
                return (
                    <>
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <Spinner />
                            </div>
                        ) : (
                            <Sales />
                        )}
                    </>
                );
            case 'pos':
                return (
                    <>
                        {
                            isLoading ? (
                                <>
                                    <div className="flex items-center justify-center h-full">
                                        <Spinner />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        <div className="lg:col-span-2">
                                            <ProductCatalog
                                                products={products}
                                                cart={cart}
                                                onAddToCart={handleAddToCart}
                                                categories={categoriesList}
                                                onRemoveFromCart={handleRemoveFromCart}
                                            />
                                        </div>
                                        <div className="lg:col-span-1">
                                            <Cart
                                                cart={cart}
                                                onUpdateQuantity={handleUpdateQuantity}
                                                onRemoveItem={handleRemoveItem}
                                                onCheckout={() => setShowPaymentModal(true)}
                                                onAddToCart={handleAddToCart}
                                            />
                                        </div>
                                    </div>
                                </>
                            )
                        }
                    </>
                );
            case 'transactions':
                return (<> {isLoading ? (<><Spinner /> </>) : (<TransactionHistory transactions={transactions} initialFilters={transactionFilters} /> )}</>);
            case 'customers':
                return (<>
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Spinner />
                        </div>
                    ) : (
                        <CustomerManagement />
                    )}
                </>
                );
            case 'users':
                return (<>
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Spinner />
                        </div>
                    ) : (
                        <UserManagement currentUser={currentUser} />
                    )}
                </>
                );
            case 'inventory':
                return (<>
                    {isLoading ? (<><Spinner /></>) : (<Inventory />)}
                </>
                );
            case 'promotions':
                return (
                    <>
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <Spinner />
                            </div>
                        ) : (
                            <PromotionManagement currentUser={currentUser} />
                        )}
                    </>
                );
            case 'settings':
                return (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Settings</h2>
                        <p className="text-gray-600">Settings panel coming soon...</p>
                    </div>
                );
            case 'products':
                return <ProductList />;
            case 'categories':
                return <CategoryList onCategoryAdded={activeTab === 'categories'} />;
            case 'addproduct':
                return <ProductList />;
            default:
                return <Dashboard transactions={transactions} />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-600 rounded-lg">
                                <Store className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">NstPOS</h1>
                                <p className="text-sm text-gray-600">Professional Point of Sale System</p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">{currentUser?.fullName || 'User'}</p>
                                <p className="text-xs text-gray-600">{currentUser?.role || 'Cashier'}</p>
                            </div>
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-medium text-sm">{(currentUser?.fullName || 'U').charAt(0).toUpperCase()}</span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="ml-4 p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Logout"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex">
                {/* Sidebar */}
                <nav className="w-64 bg-white shadow-sm border-r border-gray-200 min-h-[calc(100vh-80px)]">
                    <div className="p-4">
                        <ul className="space-y-2">
                            {filteredNavigation.map((item) => (
                                <li key={item.id}>
                                    {
                                        item.submenu ? (
                                            <>
                                                <button
                                                    onClick={toggleProductMenu}
                                                    className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                                                        /* Highlight if any submenu item is active or menu open */
                                                        (item.submenu.some(sub => sub.id === activeTab))
                                                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                            : 'text-gray-700 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    <item.icon className="w-5 h-5 mr-3" />
                                                    <span className="font-medium">{item.name}</span>
                                                </button>

                                                {/* Submenu */}
                                                {productMenuOpen && (
                                                    <ul className="ml-8 mt-1 space-y-1">
                                                        {item.submenu.map((sub) => (
                                                            <li key={sub.id}>
                                                                <button
                                                                    onClick={() => setActiveTab(sub.id)}
                                                                    className={`w-full block px-4 py-2 text-left rounded-lg transition-colors ${activeTab === sub.id
                                                                            ? 'bg-blue-100 text-blue-800'
                                                                            : 'text-gray-600 hover:bg-gray-50'
                                                                        }`}
                                                                >
                                                                    {sub.name}
                                                                </button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => setActiveTab(item.id)}
                                                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${activeTab === item.id
                                                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                        : 'text-gray-700 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <item.icon className="w-5 h-5 mr-3" />
                                                <span className="font-medium">{item.name}</span>
                                            </button>
                                        )
                                    }
                                </li>
                            ))}
                        </ul>
                    </div>
                </nav>

                {/* Main Content */}
                <main className="flex-1 p-6">
                    {renderContent()}
                </main>
            </div>

            {/* Payment Modal */}
            <PaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                cart={cart}
                onPaymentComplete={handlePaymentComplete}
            />
        </div>
    );
}

export default App;