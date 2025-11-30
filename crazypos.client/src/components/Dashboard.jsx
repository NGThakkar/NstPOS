import React from 'react';
import { DollarSign, ShoppingCart, Users, TrendingUp,Dot } from 'lucide-react';

export const Dashboard = ({ transactions, setActiveTab  }) => {
    const today = new Date().toDateString();
    const todayTransactions = transactions.filter(t =>
        new Date(t.timestamp).toDateString() === today
    );

    const todaySales = todayTransactions.reduce((sum, t) => sum + t.total, 0);
    const todayOrders = todayTransactions.length;
    const avgOrderValue = todayOrders > 0 ? todaySales / todayOrders : 0;

    const thisWeek = transactions.filter(t => {
        const transactionDate = new Date(t.timestamp);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return transactionDate >= weekAgo;
    });

    const weekSales = thisWeek.reduce((sum, t) => sum + t.total, 0);

    const stats = [
        {
            title: "Today's Sales",
            value: `$${todaySales.toFixed(2)}`,
            icon: DollarSign,
            change: '+12.5%',
            positive: true
        },
        {
            title: 'Orders Today',
            value: todayOrders.toString(),
            icon: ShoppingCart,
            change: '+8.2%',
            positive: true
        },
        {
            title: 'Average Order',
            value: `$${avgOrderValue.toFixed(2)}`,
            icon: Users,
            change: '+5.4%',
            positive: true
        },
        {
            title: 'Week Sales',
            value: `$${weekSales.toFixed(2)}`,
            icon: TrendingUp,
            change: '+23.1%',
            positive: true
        }
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600">Welcome to NstPOS - Your business overview</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                    <div key={index} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                                <p className={`text-xs mt-1 ${stat.positive ? 'text-green-600' : 'text-red-600'}`}>
                                    {stat.change} from yesterday
                                </p>
                            </div>
                            <div className={`p-3 rounded-full ${stat.positive ? 'bg-green-100' : 'bg-red-100'}`}>
                                <stat.icon className={`w-6 h-6 ${stat.positive ? 'text-green-600' : 'text-red-600'}`} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
                    <div className="space-y-3">
                        {transactions.slice(-5).reverse().map((transaction) => (
                            <div key={transaction.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                                <div>
                                    <p className="font-medium text-gray-900">Transaction #{transaction.id.slice(-6)}</p>
                                    <p className="text-sm text-gray-600 flex">
                                        {new Date(transaction.timestamp).toLocaleTimeString()} <span className="flex align-middle"><Dot /></span>  {transaction.items.length} items
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-gray-900">${transaction.total.toFixed(2)}</p>
                                    <p className="text-sm text-gray-600">{transaction.paymentMethod}</p>
                                </div>
                            </div>
                        ))}
                        {transactions.length === 0 && (
                            <p className="text-gray-500 text-center py-4">No transactions yet</p>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                        <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                            New Sale
                        </button>
                        <button onClick={() => { setActiveTab('addproduct')} } className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium">
                            Add Product
                        </button>
                        <button onClick={() => { setActiveTab('inventory') }} className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg hover:bg-orange-700 transition-colors font-medium">
                            View Inventory
                        </button>
                        <button className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors font-medium">
                            Generate Report
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};