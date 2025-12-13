using CrazyPOS.Server.Dto;
using System;
using System.Text;

namespace CrazyPOS.Server.Services
{
    public interface IReceiptService
    {
        string GenerateReceiptText(ReceiptDetailDto receipt);
        string GenerateReceiptHtml(ReceiptDetailDto receipt);
    }

    public class ReceiptService : IReceiptService
    {
        public string GenerateReceiptText(ReceiptDetailDto receipt)
        {
            var sb = new StringBuilder();

            sb.AppendLine("??????????????????????????????????????????");
            sb.AppendLine("?              SALES RECEIPT             ?");
            sb.AppendLine("??????????????????????????????????????????");
            sb.AppendLine();

            // Business Information
            sb.AppendLine(CenterText(receipt.BusinessName, 40));
            sb.AppendLine(CenterText(receipt.BusinessPhone, 40));
            sb.AppendLine(CenterText(receipt.BusinessEmail, 40));
            sb.AppendLine(CenterText(receipt.BusinessAddress, 40));
            sb.AppendLine();

            // Receipt Info
            sb.AppendLine($"Receipt #: {receipt.ReceiptNumber}");
            sb.AppendLine($"Date/Time: {receipt.TransactionDate:g}");
            sb.AppendLine($"Transaction: {receipt.TransactionCode}");
            sb.AppendLine();

            // Customer Info
            if (!string.IsNullOrEmpty(receipt.CustomerName))
            {
                sb.AppendLine($"Customer: {receipt.CustomerName}");
                if (!string.IsNullOrEmpty(receipt.CustomerPhone))
                    sb.AppendLine($"Phone: {receipt.CustomerPhone}");
                sb.AppendLine();
            }

            // Items Header
            sb.AppendLine("????????????????????????????????????????");
            sb.AppendLine($"{"Item",-25} {"Qty",4} {"Price",8} {"Total",8}");
            sb.AppendLine("????????????????????????????????????????");

            // Items
            foreach (var item in receipt.Items)
            {
                string itemName = item.ProductName.Length > 25 ? item.ProductName.Substring(0, 22) + "..." : item.ProductName;
                sb.AppendLine($"{itemName,-25} {item.Quantity,4} ${item.UnitPrice,7:F2} ${item.LineTotal,7:F2}");
            }

            sb.AppendLine("????????????????????????????????????????");

            // Totals
            sb.AppendLine($"Subtotal:            ${receipt.SubTotal,14:F2}");
            if (receipt.DiscountAmount > 0)
                sb.AppendLine($"Discount:            ${receipt.DiscountAmount,14:F2}");
            sb.AppendLine($"Tax (8.75%):         ${receipt.TaxAmount,14:F2}");
            sb.AppendLine("????????????????????????????????????????");
            sb.AppendLine($"TOTAL:               ${receipt.TotalAmount,14:F2}");
            sb.AppendLine();
            sb.AppendLine($"Payment Method:      {receipt.PaymentMethod}");
            sb.AppendLine($"Amount Tendered:     ${receipt.AmountTendered,14:F2}");
            sb.AppendLine($"Change:              ${receipt.ChangeAmount,14:F2}");
            sb.AppendLine();

            if (!string.IsNullOrEmpty(receipt.CashierName))
                sb.AppendLine($"Cashier: {receipt.CashierName}");

            sb.AppendLine();
            sb.AppendLine(CenterText("Thank you for your purchase!", 40));
            sb.AppendLine();
            sb.AppendLine(CenterText("Please visit us again!", 40));

            return sb.ToString();
        }

        public string GenerateReceiptHtml(ReceiptDetailDto receipt)
        {
            var sb = new StringBuilder();

            sb.AppendLine("<!DOCTYPE html>");
            sb.AppendLine("<html>");
            sb.AppendLine("<head>");
            sb.AppendLine("  <meta charset='UTF-8'>");
            sb.AppendLine("  <title>Receipt #" + receipt.ReceiptNumber + "</title>");
            sb.AppendLine("  <style>");
            sb.AppendLine("    body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }");
            sb.AppendLine("    .receipt { border: 1px solid #ddd; padding: 20px; background-color: #f9f9f9; border-radius: 5px; }");
            sb.AppendLine("    .header { text-align: center; margin-bottom: 20px; }");
            sb.AppendLine("    .header h1 { margin: 0; font-size: 24px; }");
            sb.AppendLine("    .header p { margin: 5px 0; color: #666; }");
            sb.AppendLine("    .receipt-info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; font-size: 14px; }");
            sb.AppendLine("    .receipt-info div { padding: 5px; }");
            sb.AppendLine("    .receipt-info label { font-weight: bold; }");
            sb.AppendLine("    .customer-info { background-color: #f0f0f0; padding: 10px; border-radius: 3px; margin-bottom: 20px; }");
            sb.AppendLine("    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }");
            sb.AppendLine("    table th { background-color: #f0f0f0; padding: 10px; text-align: left; border-bottom: 2px solid #333; }");
            sb.AppendLine("    table td { padding: 8px; border-bottom: 1px solid #ddd; }");
            sb.AppendLine("    table tr:last-child td { border-bottom: 2px solid #333; }");
            sb.AppendLine("    .text-right { text-align: right; }");
            sb.AppendLine("    .totals { margin-bottom: 20px; }");
            sb.AppendLine("    .totals-row { display: grid; grid-template-columns: 1fr auto; padding: 5px 0; }");
            sb.AppendLine("    .totals-row.total { font-weight: bold; font-size: 16px; border-top: 2px solid #333; padding-top: 10px; }");
            sb.AppendLine("    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }");
            sb.AppendLine("    .payment-info { background-color: #f0f0f0; padding: 10px; border-radius: 3px; margin-bottom: 20px; }");
            sb.AppendLine("    @media print { body { margin: 0; padding: 0; } .receipt { border: none; box-shadow: none; } }");
            sb.AppendLine("  </style>");
            sb.AppendLine("</head>");
            sb.AppendLine("<body>");
            sb.AppendLine("  <div class='receipt'>");

            // Header
            sb.AppendLine("    <div class='header'>");
            sb.AppendLine($"      <h1>{receipt.BusinessName}</h1>");
            sb.AppendLine($"      <p>{receipt.BusinessPhone}</p>");
            sb.AppendLine($"      <p>{receipt.BusinessEmail}</p>");
            sb.AppendLine($"      <p>{receipt.BusinessAddress}</p>");
            sb.AppendLine("    </div>");

            // Receipt Info
            sb.AppendLine("    <div class='receipt-info'>");
            sb.AppendLine($"      <div><label>Receipt #:</label> {receipt.ReceiptNumber}</div>");
            sb.AppendLine($"      <div><label>Date/Time:</label> {receipt.TransactionDate:g}</div>");
            sb.AppendLine($"      <div><label>Transaction:</label> {receipt.TransactionCode}</div>");
            sb.AppendLine($"      <div><label>Payment:</label> {receipt.PaymentMethod}</div>");
            sb.AppendLine("    </div>");

            // Customer Info
            if (!string.IsNullOrEmpty(receipt.CustomerName))
            {
                sb.AppendLine("    <div class='customer-info'>");
                sb.AppendLine($"      <strong>{receipt.CustomerName}</strong><br/>");
                if (!string.IsNullOrEmpty(receipt.CustomerPhone))
                    sb.AppendLine($"      Phone: {receipt.CustomerPhone}<br/>");
                if (!string.IsNullOrEmpty(receipt.CustomerEmail))
                    sb.AppendLine($"      Email: {receipt.CustomerEmail}<br/>");
                sb.AppendLine("    </div>");
            }

            // Items Table
            sb.AppendLine("    <table>");
            sb.AppendLine("      <thead>");
            sb.AppendLine("        <tr>");
            sb.AppendLine("          <th>Item</th>");
            sb.AppendLine("          <th class='text-right'>Qty</th>");
            sb.AppendLine("          <th class='text-right'>Price</th>");
            sb.AppendLine("          <th class='text-right'>Total</th>");
            sb.AppendLine("        </tr>");
            sb.AppendLine("      </thead>");
            sb.AppendLine("      <tbody>");

            foreach (var item in receipt.Items)
            {
                sb.AppendLine("        <tr>");
                sb.AppendLine($"          <td>{item.ProductName}</td>");
                sb.AppendLine($"          <td class='text-right'>{item.Quantity}</td>");
                sb.AppendLine($"          <td class='text-right'>${item.UnitPrice:F2}</td>");
                sb.AppendLine($"          <td class='text-right'>${item.LineTotal:F2}</td>");
                sb.AppendLine("        </tr>");
            }

            sb.AppendLine("      </tbody>");
            sb.AppendLine("    </table>");

            // Totals
            sb.AppendLine("    <div class='totals'>");
            sb.AppendLine($"      <div class='totals-row'><span>Subtotal:</span> <span>${receipt.SubTotal:F2}</span></div>");
            if (receipt.DiscountAmount > 0)
                sb.AppendLine($"      <div class='totals-row'><span>Discount:</span> <span>-${receipt.DiscountAmount:F2}</span></div>");
            sb.AppendLine($"      <div class='totals-row'><span>Tax (8.75%):</span> <span>${receipt.TaxAmount:F2}</span></div>");
            sb.AppendLine($"      <div class='totals-row total'><span>TOTAL:</span> <span>${receipt.TotalAmount:F2}</span></div>");
            sb.AppendLine("    </div>");

            // Payment Info
            sb.AppendLine("    <div class='payment-info'>");
            sb.AppendLine($"      <div>Amount Tendered: ${receipt.AmountTendered:F2}</div>");
            sb.AppendLine($"      <div>Change: ${receipt.ChangeAmount:F2}</div>");
            sb.AppendLine("    </div>");

            // Footer
            sb.AppendLine("    <div class='footer'>");
            if (!string.IsNullOrEmpty(receipt.CashierName))
                sb.AppendLine($"      <p>Cashier: {receipt.CashierName}</p>");
            sb.AppendLine("      <p>Thank you for your purchase!</p>");
            sb.AppendLine("      <p>Please visit us again!</p>");
            sb.AppendLine("    </div>");

            sb.AppendLine("  </div>");
            sb.AppendLine("</body>");
            sb.AppendLine("</html>");

            return sb.ToString();
        }

        private string CenterText(string text, int width)
        {
            if (text.Length >= width)
                return text.Substring(0, width);

            int totalPadding = width - text.Length;
            int leftPadding = totalPadding / 2;
            int rightPadding = totalPadding - leftPadding;

            return new string(' ', leftPadding) + text + new string(' ', rightPadding);
        }
    }
}
