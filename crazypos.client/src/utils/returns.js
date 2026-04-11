import { apiFetch } from './apiClient';

/**
 * Preview a partial return before finalizing it.
 * Calculates return totals (subtotal reversal, tax reversal, discount reversal, refund total)
 * without persisting the return to the database.
 *
 * @param {Object} payload
 * @param {number} payload.originalTransactionId - ID of the sales transaction being returned
 * @param {Array<Object>} payload.items - Array of items to return, each with:
 *   - transactionItemId: number (ID of the line item to return)
 *   - quantity: number (quantity of that item to return)
 * @returns {Promise<Object>} Return preview response with calculated totals and per-line details
 */
export async function previewReturn(payload) {
    return apiFetch('/api/Return/PreviewReturn', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

/**
 * Finalize and persist a return operation.
 * Creates SalesReturn, ReturnItem, and RefundSettlement records.
 * Updates inventory based on disposition (restock, damaged, discard).
 * Updates the original transaction's refunded amount and return status.
 *
 * @param {Object} payload
 * @param {number} payload.originalTransactionId - ID of the original sales transaction
 * @param {Array<Object>} payload.items - Items being returned, each with:
 *   - transactionItemId: number
 *   - quantity: number
 *   - inventoryDisposition: string ('restock', 'damaged', 'discard')
 *   - dispositionNotes: string (optional, explanatory notes)
 * @param {string} payload.reasonCode - Reason for return (e.g., 'customer_request', 'defective', 'wrong_item')
 * @param {string} payload.refundMethod - How to refund: 'cash' (immediate), 'card' (pending), 'store_credit' (pending)
 * @returns {Promise<Object>} Newly created return with returnId, returnCode, refundStatus, and totals
 */
export async function createReturn(payload) {
    return apiFetch('/api/Return/CreateReturn', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

/**
 * Retrieve the full details of a specific return operation.
 * Includes original transaction reference, all line items, and settlement tracking.
 *
 * @param {number} returnId - Internal return record ID
 * @returns {Promise<Object>} Return detail with items, settlement status, and audit info
 */
export async function getReturn(returnId) {
    return apiFetch(`/api/Return/GetReturn?returnId=${returnId}`);
}

/**
 * List all returns within a date range.
 * Typically used for cashier or supervisor return history views.
 * Results capped at 500 records per query.
 *
 * @param {string} startDate - ISO date string (e.g., '2026-04-01')
 * @param {string} endDate - ISO date string (e.g., '2026-04-04')
 * @returns {Promise<Array<Object>>} Array of return summaries with returnCode, refund total, and status
 */
export async function getReturnsByDateRange(startDate, endDate) {
    return apiFetch(`/api/Return/GetReturnsByDateRange?startDate=${startDate}&endDate=${endDate}`);
}

/**
 * Record or update a refund settlement after the initial return was created.
 * Used to finalize non-cash refunds (e.g., card or store credit) that were created
 * with a 'pending' settlement status.
 *
 * @param {Object} payload
 * @param {number} payload.returnId - ID of the return to settle
 * @param {string} payload.refundMethod - Refund method ('cash', 'card', 'store_credit', 'manual')
 * @param {number} payload.amount - Refund amount in dollars
 * @param {string} payload.settlementStatus - Status update ('pending', 'settled', 'failed')
 * @param {string} payload.paymentReference - Optional reference (card txn ID, store credit code, etc.)
 * @returns {Promise<Object>} Updated refund settlement record with processed_by and processed_at timestamps
 */
export async function updateRefundSettlement(payload) {
    return apiFetch('/api/Return/UpdateRefundSettlement', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

/**
 * Retrieve the return receipt details for printing or emailing.
 * Includes return summary, refunded amounts, and original transaction context.
 *
 * @param {number} returnId - ID of the return
 * @returns {Promise<Object>} Return receipt details with line items and settlement summary
 */
export async function getReturnReceiptDetails(returnId) {
    return apiFetch(`/api/Receipt/GetReturnReceiptDetails?returnId=${returnId}`);
}

/**
 * Helper function to calculate the total refundable amount for selected items.
 * Useful for preview display before calling previewReturn or createReturn.
 *
 * @param {Array<Object>} selectedItems - Items with { transactionItemId, quantity, unitPrice, lineTotal }
 * @returns {Object} Totals breakdown
 */
export function calculateReturnTotals(selectedItems) {
    const subtotal = selectedItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0);
    const tax = selectedItems.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
    const discount = selectedItems.reduce((sum, item) => sum + (item.discountAmount || 0), 0);

    return {
        subtotalReversal: parseFloat(subtotal.toFixed(2)),
        taxReversal: parseFloat(tax.toFixed(2)),
        discountReversal: parseFloat(discount.toFixed(2)),
        refundTotal: parseFloat((subtotal - discount + tax).toFixed(2)),
    };
}

/**
 * Helper function: format a return status for UI display.
 * @param {string} status - Status value ('none', 'partial', 'full')
 * @returns {string} Human-readable label
 */
export function formatReturnStatus(status) {
    const statusMap = {
        none: 'No Returns',
        partial: 'Partial Return',
        full: 'Full Return',
    };
    return statusMap[status] || status;
}

/**
 * Helper function: format a refund settlement status for UI display.
 * @param {string} settlementStatus - Status value ('pending', 'settled', 'failed')
 * @returns {string} Human-readable label
 */
export function formatSettlementStatus(settlementStatus) {
    const statusMap = {
        pending: 'Pending Settlement',
        settled: 'Settled',
        failed: 'Settlement Failed',
    };
    return statusMap[settlementStatus] || settlementStatus;
}

/**
 * Helper function: format an inventory disposition for UI display.
 * @param {string} disposition - Disposition value ('restock', 'damaged', 'discard')
 * @returns {string} Human-readable label
 */
export function formatInventoryDisposition(disposition) {
    const dispositionMap = {
        restock: 'Restock',
        damaged: 'Damaged',
        discard: 'Discard',
    };
    return dispositionMap[disposition] || disposition;
}

/**
 * Helper function: get the CSS class for a return status badge.
 * @param {string} status - Status value
 * @returns {string} CSS class name for styling
 */
export function getReturnStatusBadgeClass(status) {
    const classMap = {
        none: 'badge-secondary',
        partial: 'badge-warning',
        full: 'badge-danger',
    };
    return classMap[status] || 'badge-secondary';
}

/**
 * Helper function: get the CSS class for a settlement status badge.
 * @param {string} settlementStatus - Settlement status value
 * @returns {string} CSS class name for styling
 */
export function getSettlementStatusBadgeClass(settlementStatus) {
    const classMap = {
        pending: 'badge-warning',
        settled: 'badge-success',
        failed: 'badge-danger',
    };
    return classMap[settlementStatus] || 'badge-secondary';
}
