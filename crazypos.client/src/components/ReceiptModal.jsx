import React, { useState, useEffect } from 'react';
import { X, Printer, Mail, MessageSquare, Copy, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { getReceiptDetails, generateTextReceipt, generateHtmlReceipt, sendEmailReceipt, sendSmsReceipt } from '../utils/storage';

export const ReceiptModal = ({ isOpen, transactionId, onClose }) => {
    const [receiptData, setReceiptData] = useState(null);
    const [receiptText, setReceiptText] = useState('');
    const [receiptHtml, setReceiptHtml] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [activeTab, setActiveTab] = useState('options'); // options, preview
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [showSmsForm, setShowSmsForm] = useState(false);
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');

    useEffect(() => {
        if (isOpen && transactionId) {
            loadReceiptData();
        }
    }, [isOpen, transactionId]);

    const loadReceiptData = async () => {
        setIsLoading(true);
        try {
            console.log('ReceiptModal: Loading receipt data for transaction:', transactionId);
            
            // Validate transactionId
            if (!transactionId || transactionId <= 0) {
                console.warn('ReceiptModal: Invalid transaction ID:', transactionId);
                throw new Error('Invalid transaction ID');
            }

            const data = await getReceiptDetails(transactionId);
            console.log('ReceiptModal: Receipt data loaded:', data);
            setReceiptData(data);
            setEmail(data.customerEmail || '');
            setPhone(data.customerPhone || '');
        } catch (err) {
            console.error('ReceiptModal: Failed to load receipt data:', err);
            // Create default receipt data if API fails
            const defaultReceiptData = {
                receiptNumber: `RCP-${transactionId || 'N/A'}`,
                transactionDate: new Date().toISOString(),
                transactionCode: `TXN-${transactionId || 'N/A'}`,
                businessName: 'CrazyPOS Store',
                businessPhone: '+1 (555) 123-4567',
                businessEmail: 'info@crazypos.com',
                businessAddress: '123 Business Street, City, State 12345',
                customerName: 'Customer',
                customerEmail: '',
                customerPhone: '',
                items: [],
                subtotal: 0,
                taxAmount: 0,
                discountAmount: 0,
                totalAmount: 0,
                amountTendered: 0,
                changeAmount: 0
            };
            setReceiptData(defaultReceiptData);
            
            // Show more specific error message
            const errorMessage = err.message.includes('Not found') 
                ? 'Transaction not found in database - using default format'
                : 'Backend unavailable - using default receipt format';
            
            setMessage({ type: 'warning', text: errorMessage });
            setTimeout(() => setMessage({ type: '', text: '' }), 4000);
        } finally {
            setIsLoading(false);
        }
    };

    // Generate printable HTML directly without backend call
    const generatePrintableHtml = (data) => {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Receipt ${data.receiptNumber}</title>
                <style>
                    body {
                        font-family: 'Courier New', monospace;
                        margin: 0;
                        padding: 20px;
                        width: 80mm;
                    }
                    .receipt {
                        width: 100%;
                        text-align: center;
                    }
                    .header {
                        margin-bottom: 20px;
                        border-bottom: 1px dashed #000;
                        padding-bottom: 10px;
                    }
                    .business-name {
                        font-weight: bold;
                        font-size: 16px;
                        margin-bottom: 5px;
                    }
                    .business-info {
                        font-size: 11px;
                        line-height: 1.4;
                    }
                    .receipt-meta {
                        font-size: 11px;
                        margin: 10px 0;
                        border-bottom: 1px dashed #000;
                        padding-bottom: 10px;
                    }
                    .items {
                        margin: 15px 0;
                        text-align: left;
                    }
                    .item-header {
                        font-weight: bold;
                        font-size: 11px;
                        border-bottom: 1px solid #000;
                        padding-bottom: 5px;
                        margin-bottom: 5px;
                    }
                    .item-row {
                        font-size: 11px;
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 3px;
                    }
                    .item-name {
                        flex: 1;
                    }
                    .item-qty {
                        width: 30px;
                        text-align: center;
                    }
                    .item-price {
                        width: 50px;
                        text-align: right;
                    }
                    .totals {
                        margin: 15px 0;
                        font-size: 11px;
                        text-align: right;
                        border-top: 1px solid #000;
                        padding-top: 10px;
                    }
                    .total-row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 3px;
                    }
                    .final-total {
                        font-weight: bold;
                        font-size: 13px;
                        margin-top: 5px;
                        border-bottom: 1px dashed #000;
                        padding-bottom: 5px;
                    }
                    .footer {
                        margin-top: 15px;
                        font-size: 11px;
                        text-align: center;
                    }
                    .thank-you {
                        margin-top: 10px;
                        font-weight: bold;
                    }
                    @media print {
                        body {
                            margin: 0;
                            padding: 0;
                        }
                        .receipt {
                            width: auto;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="receipt">
                    <div class="header">
                        <div class="business-name">${data.businessName || 'CrazyPOS Store'}</div>
                        <div class="business-info">
                            <div>${data.businessAddress || ''}</div>
                            <div>Ph: ${data.businessPhone || ''}</div>
                            <div>Email: ${data.businessEmail || ''}</div>
                        </div>
                    </div>

                    <div class="receipt-meta">
                        <div><strong>Receipt #:</strong> ${data.receiptNumber || 'N/A'}</div>
                        <div><strong>Date/Time:</strong> ${new Date(data.transactionDate).toLocaleString()}</div>
                        <div><strong>Transaction:</strong> ${data.transactionCode || 'N/A'}</div>
                        <div><strong>Cashier:</strong> ${data.cashierName || 'System'}</div>
                    </div>

                    ${data.customerName && data.customerName !== 'Walk-in Customer' ? `
                        <div style="font-size: 11px; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px;">
                            <strong>Customer:</strong> ${data.customerName}
                            ${data.customerPhone ? `<div>Phone: ${data.customerPhone}</div>` : ''}
                            ${data.customerEmail ? `<div>Email: ${data.customerEmail}</div>` : ''}
                        </div>
                    ` : ''}

                    <div class="items">
                        <div class="item-header">
                            <span class="item-name">Item</span>
                            <span class="item-qty">Qty</span>
                            <span class="item-price">Total</span>
                        </div>
                        ${data.items && data.items.length > 0 
                            ? data.items.map(item => `
                                <div class="item-row">
                                    <span class="item-name">${item.productName || 'Unknown'}</span>
                                    <span class="item-qty">${item.quantity}</span>
                                    <span class="item-price">$${(item.lineTotal || 0).toFixed(2)}</span>
                                </div>
                                <div style="font-size: 10px; color: #666; margin-left: 10px;">@ $${(item.unitPrice || 0).toFixed(2)}</div>
                            `).join('')
                            : '<div style="text-align: center; font-size: 11px; color: #999;">No items</div>'
                        }
                    </div>

                    <div class="totals">
                        <div class="total-row">
                            <span>Subtotal:</span>
                            <span>$${(data.subtotal || 0).toFixed(2)}</span>
                        </div>
                        ${data.discountAmount && data.discountAmount > 0 ? `
                            <div class="total-row">
                                <span>Discount:</span>
                                <span>-$${(data.discountAmount).toFixed(2)}</span>
                            </div>
                        ` : ''}
                        <div class="total-row">
                            <span>Tax:</span>
                            <span>$${(data.taxAmount || 0).toFixed(2)}</span>
                        </div>
                        <div class="final-total">
                            <div class="total-row">
                                <span>TOTAL:</span>
                                <span>$${(data.totalAmount || 0).toFixed(2)}</span>
                            </div>
                        </div>
                        <div class="total-row" style="margin-top: 10px;">
                            <span>Amount Tendered:</span>
                            <span>$${(data.amountTendered || 0).toFixed(2)}</span>
                        </div>
                        ${data.changeAmount && data.changeAmount > 0 ? `
                            <div class="total-row">
                                <span><strong>Change:</strong></span>
                                <span><strong>$${(data.changeAmount).toFixed(2)}</strong></span>
                            </div>
                        ` : ''}
                    </div>

                    <div class="footer">
                        <div><strong>Payment Method:</strong> ${data.paymentMethod || 'Unknown'}</div>
                        <div class="thank-you">Thank You for Your Purchase!</div>
                        <div style="margin-top: 10px; font-size: 10px;">Powered by CrazyPOS</div>
                    </div>
                </div>
            </body>
            </html>
        `;
    };

    const handlePrint = async () => {
        setIsLoading(true);
        try {
            console.log('handlePrint: Generating printable HTML');
            if (!receiptHtml) {
                const html = generatePrintableHtml(receiptData);
                setReceiptHtml(html);
                
                // Open print window
                const printWindow = window.open('', '', 'height=800,width=600');
                printWindow.document.write(html);
                printWindow.document.close();
                
                // Trigger print after content is loaded
                setTimeout(() => {
                    printWindow.print();
                }, 500);
            } else {
                // If HTML is already generated, just print it
                const printWindow = window.open('', '', 'height=800,width=600');
                printWindow.document.write(receiptHtml);
                printWindow.document.close();
                setTimeout(() => printWindow.print(), 500);
            }
            
            setMessage({ type: 'success', text: 'Receipt opened for printing' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error('handlePrint error:', error);
            setMessage({ type: 'error', text: 'Failed to prepare receipt for printing: ' + error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadPDF = () => {
        try {
            console.log('handleDownloadPDF: Generating PDF');
            if (!receiptData) {
                setMessage({ type: 'error', text: 'No receipt data available' });
                return;
            }

            const html = generatePrintableHtml(receiptData);
            
            // Create a blob and download
            const element = document.createElement('a');
            const file = new Blob([html], { type: 'text/html' });
            element.href = URL.createObjectURL(file);
            element.download = `Receipt_${receiptData.receiptNumber}_${Date.now()}.html`;
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);

            setMessage({ type: 'success', text: 'Receipt downloaded successfully' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error('handleDownloadPDF error:', error);
            setMessage({ type: 'error', text: 'Failed to download receipt: ' + error.message });
        }
    };

    const handleEmail = async () => {
        if (!email) {
            setMessage({ type: 'error', text: 'Please enter an email address' });
            return;
        }

        setIsLoading(true);
        try {
            console.log('handleEmail: Sending email to', email);
            await sendEmailReceipt({
                transactionId,
                recipientEmail: email,
                deliveryMethod: 1
            });
            setMessage({ type: 'success', text: `Receipt sent to ${email}` });
            setShowEmailForm(false);
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error('handleEmail error:', error);
            setMessage({ type: 'error', text: 'Failed to send email receipt' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSms = async () => {
        if (!phone) {
            setMessage({ type: 'error', text: 'Please enter a phone number' });
            return;
        }

        setIsLoading(true);
        try {
            console.log('handleSms: Sending SMS to', phone);
            await sendSmsReceipt({
                transactionId,
                recipientPhone: phone,
                deliveryMethod: 2
            });
            setMessage({ type: 'success', text: `Receipt sent via SMS to ${phone}` });
            setShowSmsForm(false);
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error('handleSms error:', error);
            setMessage({ type: 'error', text: 'Failed to send SMS receipt' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyToClipboard = async () => {
        try {
            console.log('handleCopyToClipboard: Generating receipt text');
            if (!receiptText) {
                const result = await generateTextReceipt(receiptData);
                console.log('handleCopyToClipboard: Generated result:', result);
                setReceiptText(result.receipt);
                await navigator.clipboard.writeText(result.receipt);
            } else {
                await navigator.clipboard.writeText(receiptText);
            }
            setMessage({ type: 'success', text: 'Receipt copied to clipboard' });
            setTimeout(() => setMessage({ type: '', text: '' }), 2000);
        } catch (error) {
            console.error('handleCopyToClipboard error:', error);
            setMessage({ type: 'error', text: 'Failed to copy receipt' });
        }
    };

    const handlePreview = async () => {
        setIsLoading(true);
        try {
            console.log('handlePreview: Generating receipt text for preview');
            if (!receiptText) {
                console.log('handlePreview: Calling generateTextReceipt with data:', receiptData);
                const result = await generateTextReceipt(receiptData);
                console.log('handlePreview: Generated result:', result);
                setReceiptText(result.receipt);
            }
            setActiveTab('preview');
        } catch (error) {
            console.error('handlePreview error:', error);
            setMessage({ type: 'error', text: 'Failed to generate receipt preview' });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-500/60 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white p-6 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Receipt #{receiptData?.receiptNumber || 'Loading...'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Message */}
                {message.text && (
                    <div className={`mx-6 mt-4 p-4 rounded-lg flex items-center gap-3 ${
                        message.type === 'success' 
                            ? 'bg-green-50 border border-green-200' 
                            : message.type === 'warning'
                            ? 'bg-yellow-50 border border-yellow-200'
                            : 'bg-red-50 border border-red-200'
                    }`}>
                        {message.type === 'success' ? (
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        ) : message.type === 'warning' ? (
                            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                        ) : (
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        )}
                        <span className={
                            message.type === 'success' 
                                ? 'text-green-800' 
                                : message.type === 'warning'
                                ? 'text-yellow-800'
                                : 'text-red-800'
                        }>
                            {message.text}
                        </span>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-4 px-6 pt-4 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('options')}
                        className={`pb-2 px-4 font-medium text-sm ${
                            activeTab === 'options'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        Delivery Options
                    </button>
                    <button
                        onClick={handlePreview}
                        className={`pb-2 px-4 font-medium text-sm ${
                            activeTab === 'preview'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        Preview
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {isLoading && !receiptData ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : activeTab === 'options' ? (
                        <div className="space-y-4">
                            {/* Print Option */}
                            <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Printer className="w-6 h-6 text-blue-600" />
                                        <div>
                                            <h4 className="font-medium text-gray-900">Print Receipt</h4>
                                            <p className="text-sm text-gray-600">Print receipt directly to your printer</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handlePrint}
                                        disabled={isLoading || !receiptData}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                                    >
                                        Print
                                    </button>
                                </div>
                            </div>

                            {/* Download Option */}
                            <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Download className="w-6 h-6 text-indigo-600" />
                                        <div>
                                            <h4 className="font-medium text-gray-900">Download Receipt</h4>
                                            <p className="text-sm text-gray-600">Download receipt as HTML file</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleDownloadPDF}
                                        disabled={isLoading || !receiptData}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 font-medium"
                                    >
                                        Download
                                    </button>
                                </div>
                            </div>

                            {/* Email Option */}
                            <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <Mail className="w-6 h-6 text-green-600" />
                                        <div>
                                            <h4 className="font-medium text-gray-900">Email Receipt</h4>
                                            <p className="text-sm text-gray-600">Send receipt via email</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowEmailForm(!showEmailForm)}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                                    >
                                        {showEmailForm ? 'Cancel' : 'Send'}
                                    </button>
                                </div>
                                {showEmailForm && (
                                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                                        <input
                                            type="email"
                                            placeholder="Enter email address"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                                        />
                                        <button
                                            onClick={handleEmail}
                                            disabled={isLoading}
                                            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
                                        >
                                            {isLoading ? 'Sending...' : 'Send Email'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* SMS Option */}
                            <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <MessageSquare className="w-6 h-6 text-purple-600" />
                                        <div>
                                            <h4 className="font-medium text-gray-900">SMS Receipt</h4>
                                            <p className="text-sm text-gray-600">Send receipt via SMS text message</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowSmsForm(!showSmsForm)}
                                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                                    >
                                        {showSmsForm ? 'Cancel' : 'Send'}
                                    </button>
                                </div>
                                {showSmsForm && (
                                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                                        <input
                                            type="tel"
                                            placeholder="Enter phone number"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                        <button
                                            onClick={handleSms}
                                            disabled={isLoading}
                                            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 font-medium"
                                        >
                                            {isLoading ? 'Sending...' : 'Send SMS'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Copy Option */}
                            <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Copy className="w-6 h-6 text-orange-600" />
                                        <div>
                                            <h4 className="font-medium text-gray-900">Copy to Clipboard</h4>
                                            <p className="text-sm text-gray-600">Copy receipt text for pasting elsewhere</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleCopyToClipboard}
                                        disabled={isLoading || !receiptData}
                                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 font-medium"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm text-gray-900 overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap break-words border border-gray-200">
                            {receiptText || 'Loading receipt...'}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
