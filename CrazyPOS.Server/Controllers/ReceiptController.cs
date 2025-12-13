using CrazyPOS.Server.Dto;
using CrazyPOS.Server.Models;
using CrazyPOS.Server.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace CrazyPOS.Server.Controllers
{
    [Route("api/[controller]/[action]")]
    [ApiController]
    public class ReceiptController : ControllerBase
    {
        private readonly IDbContextFactory<crazypos_devContext> _dbFactory;
        private readonly IReceiptService _receiptService;

        public ReceiptController(IDbContextFactory<crazypos_devContext> dbFactory, IReceiptService receiptService)
        {
            _dbFactory = dbFactory;
            _receiptService = receiptService;
        }

        /// <summary>
        /// Get receipt details by transaction ID
        /// </summary>
        [HttpGet]
        [ActionName("GetReceiptDetails")]
        public IActionResult GetReceiptDetails(long transactionId)
        {
            try
            {
                Console.WriteLine($"GetReceiptDetails: Attempting to fetch transaction ID: {transactionId}");

                if (transactionId <= 0)
                {
                    return BadRequest(new { success = false, message = "Invalid transaction ID" });
                }

                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var transaction = dbContext.SalesTransactions
                        .Include(t => t.TransactionItems)
                        .ThenInclude(ti => ti.Product)
                        .Include(t => t.User)
                        .Include(t => t.Customer)
                        .FirstOrDefault(t => t.TransactionId == transactionId);

                    if (transaction == null)
                    {
                        Console.WriteLine($"GetReceiptDetails: Transaction {transactionId} not found in database");
                        return NotFound(new { success = false, message = "Transaction not found" });
                    }

                    Console.WriteLine($"GetReceiptDetails: Transaction found, generating receipt...");

                    var receiptDetail = new ReceiptDetailDto
                    {
                        // Business Information (hardcoded for now - can be moved to settings)
                        BusinessName = "CrazyPOS Store",
                        BusinessPhone = "+1 (555) 123-4567",
                        BusinessEmail = "info@crazypos.com",
                        BusinessAddress = "123 Business Street, City, State 12345",

                        ReceiptNumber = $"RCP-{transaction.TransactionId:000000}",
                        TransactionDate = transaction.TransactionDate,
                        TransactionCode = transaction.TransactionCode,

                        CustomerName = (transaction.Customer != null) 
                            ? $"{transaction.Customer.FirstName} {transaction.Customer.LastName}".Trim()
                            : "Walk-in Customer",
                        CustomerPhone = transaction.Customer?.PhoneNumber,
                        CustomerEmail = transaction.Customer?.Email,

                        CashierName = transaction.User?.FullName ?? "System",
                        PaymentMethod = transaction.PaymentMethod ?? "Unknown",

                        SubTotal = transaction.SubTotal,
                        TaxAmount = transaction.TaxAmount,
                        DiscountAmount = transaction.DiscountAmount,
                        TotalAmount = transaction.TotalAmount,
                        AmountTendered = transaction.AmountTendered ?? transaction.TotalAmount,
                        ChangeAmount = transaction.ChangeAmount ?? 0
                    };

                    // Add items
                    if (transaction.TransactionItems != null && transaction.TransactionItems.Count > 0)
                    {
                        foreach (var item in transaction.TransactionItems)
                        {
                            receiptDetail.Items.Add(new ReceiptItemDto
                            {
                                ProductName = item.Product?.Name ?? "Unknown Item",
                                Quantity = item.Quantity,
                                UnitPrice = item.UnitPrice,
                                LineTotal = item.LineTotal > 0 ? item.LineTotal : (item.UnitPrice * item.Quantity)
                            });
                        }
                    }

                    Console.WriteLine($"GetReceiptDetails: Receipt generated successfully with {receiptDetail.Items.Count} items");
                    return Ok(receiptDetail);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"GetReceiptDetails: Exception occurred: {ex.Message}");
                Console.WriteLine($"GetReceiptDetails: Stack trace: {ex.StackTrace}");
                return BadRequest(new { success = false, message = $"Error retrieving receipt details: {ex.Message}" });
            }
        }

        /// <summary>
        /// Generate receipt as text (for printing/SMS)
        /// </summary>
        [HttpPost]
        [ActionName("GenerateTextReceipt")]
        public IActionResult GenerateTextReceipt([FromBody] ReceiptDetailDto receipt)
        {
            try
            {
                string receiptText = _receiptService.GenerateReceiptText(receipt);
                return Ok(new { success = true, receipt = receiptText });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error generating receipt: {ex.Message}" });
            }
        }

        /// <summary>
        /// Generate receipt as HTML (for email/web)
        /// </summary>
        [HttpPost]
        [ActionName("GenerateHtmlReceipt")]
        public IActionResult GenerateHtmlReceipt([FromBody] ReceiptDetailDto receipt)
        {
            try
            {
                string receiptHtml = _receiptService.GenerateReceiptHtml(receipt);
                return Ok(new { success = true, receipt = receiptHtml });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error generating receipt: {ex.Message}" });
            }
        }

        /// <summary>
        /// Send receipt via email (placeholder)
        /// </summary>
        [HttpPost]
        [ActionName("SendEmailReceipt")]
        public async Task<IActionResult> SendEmailReceipt([FromBody] CreateReceiptDto receiptDto)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(receiptDto.RecipientEmail))
                {
                    return BadRequest(new { success = false, message = "Email address is required" });
                }

                // TODO: Implement actual email sending using SMTP
                // For now, this is a placeholder that logs the request
                Console.WriteLine($"Email receipt would be sent to: {receiptDto.RecipientEmail}");

                return Ok(new
                {
                    success = true,
                    message = $"Receipt will be sent to {receiptDto.RecipientEmail}",
                    status = "pending"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error sending receipt: {ex.Message}" });
            }
        }

        /// <summary>
        /// Send receipt via SMS (placeholder)
        /// </summary>
        [HttpPost]
        [ActionName("SendSmsReceipt")]
        public async Task<IActionResult> SendSmsReceipt([FromBody] CreateReceiptDto receiptDto)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(receiptDto.RecipientPhone))
                {
                    return BadRequest(new { success = false, message = "Phone number is required" });
                }

                // TODO: Implement actual SMS sending using Twilio or similar service
                // For now, this is a placeholder that logs the request
                Console.WriteLine($"SMS receipt would be sent to: {receiptDto.RecipientPhone}");

                return Ok(new
                {
                    success = true,
                    message = $"Receipt will be sent via SMS to {receiptDto.RecipientPhone}",
                    status = "pending"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error sending receipt: {ex.Message}" });
            }
        }

        /// <summary>
        /// Print receipt (generates printable HTML)
        /// </summary>
        [HttpPost]
        [ActionName("PrintReceipt")]
        public IActionResult PrintReceipt([FromBody] ReceiptDetailDto receipt)
        {
            try
            {
                string receiptHtml = _receiptService.GenerateReceiptHtml(receipt);
                return Ok(new
                {
                    success = true,
                    html = receiptHtml,
                    receiptNumber = receipt.ReceiptNumber
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error preparing receipt for print: {ex.Message}" });
            }
        }
    }
}
