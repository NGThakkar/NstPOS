import React, { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    BarChart3,
    Calendar,
    CircleDollarSign,
    Download,
    RefreshCw,
    TrendingUp,
    Users
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import {
    getReportingCashierPerformance,
    getReportingCategoryPerformance,
    getReportingDailySales,
    getReportingHourlySales,
    getReportingPaymentMethodPerformance,
    getReportingTopProducts
} from '../utils/sales';

const PAYMENT_COLORS = ['#2563eb', '#16a34a', '#d97706', '#db2777', '#6d28d9', '#0891b2'];

function toDateInputValue(date) {
    return date.toISOString().split('T')[0];
}

function money(value) {
    return `$${(value || 0).toFixed(2)}`;
}

function createSummarySheetRows({ startDate, endDate, exportLabel, rowCount }) {
    return [
        ['ANALYTICS EXPORT'],
        [''],
        ['Dataset', exportLabel],
        ['Start Date', startDate],
        ['End Date', endDate],
        ['Exported Rows', rowCount],
        ['Exported At', new Date().toLocaleString()]
    ];
}

function downloadWorkbook({ filename, sheetName, rows, summaryRows, columnWidths }) {
    const workbook = XLSX.utils.book_new();
    const dataRows = rows.length > 0 ? rows : [{ Message: 'No data available for the selected range.' }];
    const worksheet = XLSX.utils.json_to_sheet(dataRows);

    if (columnWidths?.length) {
        worksheet['!cols'] = columnWidths;
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summaryRows), 'Summary');
    XLSX.writeFile(workbook, filename);
}

export function AnalyticsReport() {
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 6);
        return toDateInputValue(d);
    });
    const [endDate, setEndDate] = useState(() => toDateInputValue(new Date()));

    const [dailySales, setDailySales] = useState([]);
    const [cashierPage, setCashierPage] = useState({ items: [], totalCount: 0, pageNumber: 1, pageSize: 5 });
    const [categories, setCategories] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [paymentMix, setPaymentMix] = useState([]);
    const [hourlySales, setHourlySales] = useState([]);
    const [trendView, setTrendView] = useState('daily');
    const [exportType, setExportType] = useState('summary');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const loadAnalytics = async () => {
        setIsLoading(true);
        setError('');
        try {
            const [daily, cashiers, categoryRows, productRows, paymentRows] = await Promise.all([
                getReportingDailySales(startDate, endDate),
                getReportingCashierPerformance(startDate, endDate, 1, 5),
                getReportingCategoryPerformance(startDate, endDate),
                getReportingTopProducts(startDate, endDate, 5),
                getReportingPaymentMethodPerformance(startDate, endDate)
            ]);

            const hourly = await getReportingHourlySales(endDate);

            setDailySales(Array.isArray(daily) ? daily : []);
            setCashierPage(cashiers || { items: [], totalCount: 0, pageNumber: 1, pageSize: 5 });
            setCategories(Array.isArray(categoryRows) ? categoryRows : []);
            setTopProducts(Array.isArray(productRows) ? productRows : []);
            setPaymentMix(Array.isArray(paymentRows) ? paymentRows : []);
            setHourlySales(Array.isArray(hourly) ? hourly : []);
        } catch (err) {
            setError(err?.message || 'Unable to load analytics');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadAnalytics();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate, endDate]);

    const summary = useMemo(() => {
        const totalSales = dailySales.reduce((sum, day) => sum + (day.totalSales || 0), 0);
        const transactions = dailySales.reduce((sum, day) => sum + (day.transactionCount || 0), 0);
        const itemsSold = dailySales.reduce((sum, day) => sum + (day.itemsSold || 0), 0);
        const avgTicket = transactions > 0 ? totalSales / transactions : 0;

        return { totalSales, transactions, itemsSold, avgTicket };
    }, [dailySales]);

    const formattedDaily = useMemo(() => {
        return dailySales.map((day) => ({
            ...day,
            label: new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        }));
    }, [dailySales]);

    const formattedHourly = useMemo(() => {
        return hourlySales.map((point) => ({
            ...point,
            label: `${String(point.hour).padStart(2, '0')}:00`
        }));
    }, [hourlySales]);

    const topCashier = cashierPage.items?.[0];
    const topCategory = categories?.[0];
    const showException = summary.transactions > 0 && summary.avgTicket < 20;

    const exportConfig = useMemo(() => {
        const configs = {
            summary: {
                label: 'Summary',
                sheetName: 'Summary Data',
                filename: `analytics-summary-${startDate}-to-${endDate}.xlsx`,
                rows: dailySales.map((day) => ({
                    Date: new Date(day.date).toLocaleDateString(),
                    'Total Sales': Number(day.totalSales || 0).toFixed(2),
                    Transactions: day.transactionCount || 0,
                    'Items Sold': day.itemsSold || 0,
                    'Average Transaction': Number(day.averageTransaction || 0).toFixed(2)
                })),
                columnWidths: [{ wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 20 }]
            },
            trend: {
                label: trendView === 'daily' ? 'Trend (Daily)' : 'Trend (Hourly)',
                sheetName: trendView === 'daily' ? 'Daily Trend' : 'Hourly Trend',
                filename: `analytics-${trendView}-trend-${endDate}.xlsx`,
                rows: (trendView === 'daily' ? formattedDaily : formattedHourly).map((point) => ({
                    Period: point.label,
                    'Total Sales': Number(point.totalSales || 0).toFixed(2),
                    Transactions: point.transactionCount || 0,
                    'Items Sold': point.itemsSold || 0
                })),
                columnWidths: [{ wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }]
            },
            cashier: {
                label: 'Cashier',
                sheetName: 'Cashier Performance',
                filename: `analytics-cashier-${startDate}-to-${endDate}.xlsx`,
                rows: (cashierPage.items || []).map((row) => ({
                    Cashier: row.cashierName,
                    Transactions: row.transactionCount || 0,
                    'Total Sales': Number(row.totalSales || 0).toFixed(2),
                    'Average Ticket': Number(row.averageTransaction || 0).toFixed(2)
                })),
                columnWidths: [{ wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 16 }]
            },
            category: {
                label: 'Category',
                sheetName: 'Category Performance',
                filename: `analytics-categories-${startDate}-to-${endDate}.xlsx`,
                rows: categories.map((row) => ({
                    Category: row.categoryName,
                    Quantity: row.quantitySold || 0,
                    Revenue: Number(row.totalRevenue || 0).toFixed(2)
                })),
                columnWidths: [{ wch: 24 }, { wch: 12 }, { wch: 14 }]
            },
            products: {
                label: 'Products',
                sheetName: 'Top Products',
                filename: `analytics-products-${startDate}-to-${endDate}.xlsx`,
                rows: topProducts.map((row) => ({
                    Product: row.productName,
                    Quantity: row.quantitySold || 0,
                    Revenue: Number(row.totalRevenue || 0).toFixed(2)
                })),
                columnWidths: [{ wch: 32 }, { wch: 12 }, { wch: 14 }]
            },
            payment: {
                label: 'Payment Mix',
                sheetName: 'Payment Mix',
                filename: `analytics-payment-mix-${startDate}-to-${endDate}.xlsx`,
                rows: paymentMix.map((row) => ({
                    'Payment Method': row.paymentMethod,
                    Transactions: row.transactionCount || 0,
                    'Total Amount': Number(row.totalAmount || 0).toFixed(2)
                })),
                columnWidths: [{ wch: 20 }, { wch: 14 }, { wch: 14 }]
            }
        };

        return configs[exportType];
    }, [categories, cashierPage.items, dailySales, endDate, exportType, formattedDaily, formattedHourly, paymentMix, startDate, topProducts, trendView]);

    const handleExport = () => {
        if (!exportConfig) {
            return;
        }

        downloadWorkbook({
            filename: exportConfig.filename,
            sheetName: exportConfig.sheetName,
            rows: exportConfig.rows,
            columnWidths: exportConfig.columnWidths,
            summaryRows: createSummarySheetRows({
                startDate,
                endDate,
                exportLabel: exportConfig.label,
                rowCount: exportConfig.rows.length
            })
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
                    <p className="text-gray-600">Advanced sales and performance reporting</p>
                </div>
                <div className="flex flex-col gap-2 md:flex-row md:items-end">
                    <label className="text-sm text-gray-700">
                        <span className="mb-1 block">Export</span>
                        <select
                            value={exportType}
                            onChange={(e) => setExportType(e.target.value)}
                            className="rounded-lg border border-gray-300 px-3 py-2"
                        >
                            <option value="summary">Summary</option>
                            <option value="trend">Trend</option>
                            <option value="cashier">Cashier</option>
                            <option value="category">Category</option>
                            <option value="products">Products</option>
                            <option value="payment">Payment Mix</option>
                        </select>
                    </label>
                    <button
                        onClick={handleExport}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
                    >
                        <Download className="h-4 w-4" /> Export XLSX
                    </button>
                    <label className="text-sm text-gray-700">
                        <span className="mb-1 block">Start Date</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="rounded-lg border border-gray-300 px-3 py-2"
                        />
                    </label>
                    <label className="text-sm text-gray-700">
                        <span className="mb-1 block">End Date</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="rounded-lg border border-gray-300 px-3 py-2"
                        />
                    </label>
                    <button
                        onClick={loadAnalytics}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                    >
                        <RefreshCw className="h-4 w-4" /> Refresh
                    </button>
                </div>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard icon={CircleDollarSign} title="Total Sales" value={money(summary.totalSales)} subtitle="Selected range" />
                <StatCard icon={Calendar} title="Transactions" value={summary.transactions.toString()} subtitle="Completed only" />
                <StatCard icon={TrendingUp} title="Avg Ticket" value={money(summary.avgTicket)} subtitle="Average transaction value" />
                <StatCard icon={Users} title="Items Sold" value={summary.itemsSold.toString()} subtitle="Across all completed sales" />
            </div>

            {showException && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
                    <AlertTriangle className="mt-0.5 h-5 w-5" />
                    <div>
                        <p className="font-semibold">Exception Alert</p>
                        <p className="text-sm">Average ticket is below $20 for this date range.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card title="Sales Trend">
                    <div className="mb-3 inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                        <button
                            onClick={() => setTrendView('daily')}
                            className={`rounded-md px-3 py-1 text-sm ${trendView === 'daily' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'}`}
                        >
                            Daily
                        </button>
                        <button
                            onClick={() => setTrendView('hourly')}
                            className={`rounded-md px-3 py-1 text-sm ${trendView === 'hourly' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600'}`}
                        >
                            Hourly
                        </button>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendView === 'daily' ? formattedDaily : formattedHourly}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="label" />
                                <YAxis />
                                <Tooltip formatter={(value) => money(value)} />
                                <Line type="monotone" dataKey="totalSales" stroke="#2563eb" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card title="Payment Method Distribution">
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={paymentMix} dataKey="totalAmount" nameKey="paymentMethod" outerRadius={110}>
                                    {paymentMix.map((entry, index) => (
                                        <Cell key={`${entry.paymentMethod}-${index}`} fill={PAYMENT_COLORS[index % PAYMENT_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => money(value)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card title="Top Categories by Revenue">
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categories.slice(0, 5)}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="categoryName" />
                                <YAxis />
                                <Tooltip formatter={(value) => money(value)} />
                                <Bar dataKey="totalRevenue" fill="#16a34a" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card title="Top Products by Revenue">
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topProducts}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="productName" />
                                <YAxis />
                                <Tooltip formatter={(value) => money(value)} />
                                <Bar dataKey="totalRevenue" fill="#d97706" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card title="Cashier Performance">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Cashier</th>
                                    <th className="px-3 py-2 text-right font-semibold text-gray-700">Transactions</th>
                                    <th className="px-3 py-2 text-right font-semibold text-gray-700">Sales</th>
                                    <th className="px-3 py-2 text-right font-semibold text-gray-700">Avg Ticket</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {(cashierPage.items || []).map((row) => (
                                    <tr key={row.userId}>
                                        <td className="px-3 py-2 text-gray-900">{row.cashierName}</td>
                                        <td className="px-3 py-2 text-right text-gray-700">{row.transactionCount}</td>
                                        <td className="px-3 py-2 text-right text-gray-700">{money(row.totalSales)}</td>
                                        <td className="px-3 py-2 text-right text-gray-700">{money(row.averageTransaction)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card title="Top Performer Snapshot">
                    <div className="space-y-3 text-sm">
                        <SnapshotRow label="Top Cashier" value={topCashier ? `${topCashier.cashierName} (${money(topCashier.totalSales)})` : 'N/A'} />
                        <SnapshotRow label="Top Category" value={topCategory ? `${topCategory.categoryName} (${money(topCategory.totalRevenue)})` : 'N/A'} />
                        <SnapshotRow label="Category Count" value={categories.length.toString()} />
                        <SnapshotRow label="Payment Methods" value={paymentMix.length.toString()} />
                    </div>
                </Card>
            </div>

            {isLoading && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-700">
                    Loading analytics...
                </div>
            )}
        </div>
    );
}

function Card({ title, children }) {
    return (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-base font-semibold text-gray-900">{title}</h3>
            {children}
        </div>
    );
}

function StatCard({ icon: Icon, title, value, subtitle }) {
    return (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">{title}</p>
                <Icon className="h-5 w-5 text-blue-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
            <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
        </div>
    );
}

function SnapshotRow({ label, value }) {
    return (
        <div className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-b-0 last:pb-0">
            <span className="text-gray-600">{label}</span>
            <span className="font-semibold text-gray-900">{value}</span>
        </div>
    );
}
