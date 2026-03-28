using CrazyPOS.Server.Auth;
using CrazyPOS.Server.Dto;
using CrazyPOS.Server.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace CrazyPOS.Server.Controllers
{
    [Authorize]
    [Route("api/[controller]/[action]")]
    [ApiController]
    public class SalesController : ControllerBase
    {
        private readonly IDbContextFactory<crazypos_devContext> _dbFactory;
        private readonly ICurrentUserService _currentUser;

        public SalesController(IDbContextFactory<crazypos_devContext> dbFactory, ICurrentUserService currentUser)
        {
            _dbFactory = dbFactory;
            _currentUser = currentUser;
        }

        /// <summary>
        /// Search for product by barcode or product ID
        /// </summary>
        [HttpGet]
        [ActionName("SearchByBarcode")]
        public IActionResult SearchByBarcode(string barcode)
        {
            if (string.IsNullOrWhiteSpace(barcode))
            {
                return BadRequest(new { success = false, message = "Barcode is required" });
            }

            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    // Try to find by barcode or product ID
                    var product = dbContext.Products.FirstOrDefault(p =>
                        p.Barcode == barcode || p.Productid.ToString() == barcode);

                    if (product == null)
                    {
                        return Ok(new BarcodeSearchDto
                        {
                            Found = false,
                            ProductName = "Product not found"
                        });
                    }

                    return Ok(new BarcodeSearchDto
                    {
                        ProductId = product.Productid,
                        ProductName = product.Name,
                        Barcode = product.Barcode,
                        Price = product.Price ?? 0,
                        Stock = product.Stock ?? 0,
                        Found = true
                    });
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error searching product: {ex.Message}" });
            }
        }

        /// <summary>
        /// Create a new sales transaction
        /// </summary>
        [HttpPost]
        [ActionName("CreateTransaction")]
        public async Task<IActionResult> CreateTransaction([FromBody] CreateSalesTransactionDto transactionDto)
        {
            if (transactionDto == null || transactionDto.Items == null || transactionDto.Items.Count == 0)
            {
                return BadRequest(new { success = false, message = "Transaction items are required" });
            }

            if (string.IsNullOrWhiteSpace(transactionDto.PaymentMethod))
            {
                return BadRequest(new { success = false, message = "Payment method is required" });
            }

            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    // Get current user from auth context
                    long userId = _currentUser.UserId;

                    // Create transaction
                    var transaction = new SalesTransaction
                    {
                        TransactionCode = "TXN-" + DateTime.Now.ToString("yyyyMMddHHmmss"),
                        UserId = userId,
                        TransactionDate = DateTime.UtcNow,
                        SubTotal = transactionDto.SubTotal,
                        TaxAmount = transactionDto.TaxAmount,
                        TotalAmount = transactionDto.TotalAmount,
                        PaymentMethod = transactionDto.PaymentMethod,
                        AmountTendered = transactionDto.AmountTendered,
                        ChangeAmount = transactionDto.AmountTendered.HasValue
                            ? transactionDto.AmountTendered.Value - transactionDto.TotalAmount
                            : 0,
                        DiscountAmount = transactionDto.DiscountAmount,
                        Notes = transactionDto.Notes,
                        Status = "completed",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    };

                    dbContext.SalesTransactions.Add(transaction);
                    await dbContext.SaveChangesAsync();

                    // Add transaction items
                    foreach (var item in transactionDto.Items)
                    {
                        var product = await dbContext.Products.FindAsync(item.ProductId);
                        if (product == null)
                            continue;

                        var transactionItem = new TransactionItem
                        {
                            TransactionId = transaction.TransactionId,
                            Productid = item.ProductId,
                            Quantity = item.Quantity,
                            UnitPrice = item.UnitPrice,
                            DiscountPercent = item.DiscountPercent,
                            DiscountAmount = item.DiscountAmount,
                            LineTotal = (item.UnitPrice - item.DiscountAmount) * item.Quantity,
                            CreatedAt = DateTime.UtcNow
                        };

                        dbContext.TransactionItems.Add(transactionItem);

                        // Update product stock
                        product.Stock = (product.Stock ?? 0) - item.Quantity;
                        dbContext.Products.Update(product);

                        // Record inventory movement
                        var inventory = new Inventory
                        {
                            Productid = item.ProductId,
                            Quantity = -item.Quantity,  // Negative because it's a sale
                            MovementType = "Sale",
                            Reference = transaction.TransactionCode,
                            Notes = $"Sale via transaction {transaction.TransactionCode}",
                            CreatedAt = DateTime.UtcNow,
                            CreatedBy = "POS System"
                        };

                        dbContext.Inventories.Add(inventory);
                    }

                    await dbContext.SaveChangesAsync();

                    // Update daily sales summary
                    await UpdateDailySalesSummary(dbContext);

                    return Ok(new
                    {
                        success = true,
                        message = "Transaction created successfully",
                        transactionId = transaction.TransactionId,
                        transactionCode = transaction.TransactionCode,
                        totalAmount = transaction.TotalAmount
                    });
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error creating transaction: {ex.Message}" });
            }
        }

        /// <summary>
        /// Get transaction details
        /// </summary>
        [HttpGet]
        [ActionName("GetTransaction")]
        public IActionResult GetTransaction(long transactionId)
        {
            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var transaction = dbContext.SalesTransactions
                        .Include(t => t.TransactionItems)
                        .ThenInclude(ti => ti.Product)
                        .Include(t => t.User)
                        .FirstOrDefault(t => t.TransactionId == transactionId);

                    if (transaction == null)
                    {
                        return NotFound(new { success = false, message = "Transaction not found" });
                    }

                    var transactionDto = new SalesTransactionDto
                    {
                        TransactionId = transaction.TransactionId,
                        TransactionCode = transaction.TransactionCode,
                        UserId = transaction.UserId,
                        TransactionDate = transaction.TransactionDate,
                        SubTotal = transaction.SubTotal,
                        TaxAmount = transaction.TaxAmount,
                        TotalAmount = transaction.TotalAmount,
                        PaymentMethod = transaction.PaymentMethod,
                        AmountTendered = transaction.AmountTendered,
                        ChangeAmount = transaction.ChangeAmount,
                        DiscountAmount = transaction.DiscountAmount,
                        Status = transaction.Status,
                        Cashier = transaction.User?.FullName ?? "Unknown",
                        Items = transaction.TransactionItems.Select(ti => new TransactionItemDto
                        {
                            ItemId = ti.ItemId,
                            ProductId = ti.Productid,
                            ProductName = ti.Product.Name,
                            Quantity = ti.Quantity,
                            UnitPrice = ti.UnitPrice,
                            DiscountPercent = ti.DiscountPercent,
                            DiscountAmount = ti.DiscountAmount,
                            LineTotal = ti.LineTotal
                        }).ToList()
                    };

                    return Ok(transactionDto);
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error retrieving transaction: {ex.Message}" });
            }
        }

        /// <summary>
        /// Get daily sales report
        /// </summary>
        [HttpGet]
        [ActionName("GetDailySalesReport")]
        public IActionResult GetDailySalesReport(DateTime? date = null)
        {
            var reportDate = (date ?? DateTime.Today).Date;

            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var transactions = dbContext.SalesTransactions
                        .Where(t => t.TransactionDate.Date == reportDate && t.Status == "completed")
                        .ToList();

                    var items = dbContext.TransactionItems
                        .Where(ti => dbContext.SalesTransactions
                            .Where(t => t.TransactionDate.Date == reportDate)
                            .Select(t => t.TransactionId)
                            .Contains(ti.TransactionId))
                        .ToList();

                    var report = new DailySalesReportDto
                    {
                        Date = reportDate,
                        TotalSales = transactions.Sum(t => t.TotalAmount),
                        TotalTax = transactions.Sum(t => t.TaxAmount),
                        TotalDiscount = transactions.Sum(t => t.DiscountAmount),
                        TransactionCount = transactions.Count,
                        ItemsSold = items.Sum(i => i.Quantity),
                        AverageTransaction = transactions.Count > 0 ? transactions.Sum(t => t.TotalAmount) / transactions.Count : 0
                    };

                    return Ok(report);
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error retrieving sales report: {ex.Message}" });
            }
        }

        /// <summary>
        /// Get all transactions for a date range
        /// </summary>
        [HttpGet]
        [ActionName("GetTransactionsByDateRange")]
        public IActionResult GetTransactionsByDateRange(DateTime startDate, DateTime endDate)
        {
            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var transactions = dbContext.SalesTransactions
                        .Where(t => t.TransactionDate.Date >= startDate.Date && t.TransactionDate.Date <= endDate.Date)
                        .OrderByDescending(t => t.TransactionDate)
                        .Take(500)
                        .ToList();

                    var transactionDtos = transactions.Select(t => new
                    {
                        t.TransactionId,
                        t.TransactionCode,
                        t.TransactionDate,
                        t.TotalAmount,
                        t.PaymentMethod,
                        t.Status,
                        ItemCount = dbContext.TransactionItems.Count(ti => ti.TransactionId == t.TransactionId)
                    }).ToList();

                    return Ok(transactionDtos);
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error retrieving transactions: {ex.Message}" });
            }
        }

        /// <summary>
        /// Get payment methods
        /// </summary>
        [HttpGet]
        [ActionName("GetPaymentMethods")]
        public IActionResult GetPaymentMethods()
        {
            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var methods = dbContext.PaymentMethods
                        .Where(m => m.IsActive)
                        .Select(m => new PaymentMethodDto
                        {
                            PaymentMethodId = m.PaymentMethodId,
                            MethodName = m.MethodName,
                            Description = m.Description,
                            IsActive = m.IsActive
                        })
                        .ToList();

                    return Ok(methods);
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error retrieving payment methods: {ex.Message}" });
            }
        }

        /// <summary>
        /// Cancel a transaction
        /// </summary>
        [HttpPost]
        [ActionName("CancelTransaction")]
        public async Task<IActionResult> CancelTransaction(long transactionId, string reason)
        {
            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var transaction = await dbContext.SalesTransactions
                        .Include(t => t.TransactionItems)
                        .FirstOrDefaultAsync(t => t.TransactionId == transactionId);

                    if (transaction == null)
                    {
                        return NotFound(new { success = false, message = "Transaction not found" });
                    }

                    if (transaction.Status == "cancelled")
                    {
                        return BadRequest(new { success = false, message = "Transaction already cancelled" });
                    }

                    // Restore stock for cancelled items
                    foreach (var item in transaction.TransactionItems)
                    {
                        var product = await dbContext.Products.FindAsync(item.Productid);
                        if (product != null)
                        {
                            product.Stock = (product.Stock ?? 0) + item.Quantity;
                            dbContext.Products.Update(product);

                            // Record reversal inventory movement
                            var reversalInventory = new Inventory
                            {
                                Productid = item.Productid,
                                Quantity = item.Quantity,  // Positive to restore
                                MovementType = "Return",
                                Reference = $"Reversal of {transaction.TransactionCode}",
                                Notes = $"Cancelled transaction - {reason}",
                                CreatedAt = DateTime.UtcNow,
                                CreatedBy = "POS System"
                            };

                            dbContext.Inventories.Add(reversalInventory);
                        }
                    }

                    transaction.Status = "cancelled";
                    transaction.Notes = $"Cancelled: {reason}";
                    await dbContext.SaveChangesAsync();

                    return Ok(new { success = true, message = "Transaction cancelled successfully" });
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error cancelling transaction: {ex.Message}" });
            }
        }

        // Helper method to update daily sales summary
        private async Task UpdateDailySalesSummary(crazypos_devContext dbContext)
        {
            var today = DateTime.Today;
            var summary = await dbContext.DailySalesSummaries
                .FirstOrDefaultAsync(s => s.SummaryDate == today);

            var dailyTransactions = dbContext.SalesTransactions
                .Where(t => t.TransactionDate.Date == today && t.Status == "completed")
                .ToList();

            var dailyItems = dbContext.TransactionItems
                .Where(ti => dbContext.SalesTransactions
                    .Where(t => t.TransactionDate.Date == today)
                    .Select(t => t.TransactionId)
                    .Contains(ti.TransactionId))
                .ToList();

            if (summary == null)
            {
                summary = new DailySalesSummary
                {
                    SummaryDate = today,
                    TotalSales = dailyTransactions.Sum(t => t.TotalAmount),
                    TotalTax = dailyTransactions.Sum(t => t.TaxAmount),
                    TotalDiscount = dailyTransactions.Sum(t => t.DiscountAmount),
                    TransactionCount = dailyTransactions.Count,
                    ItemsSold = dailyItems.Sum(i => i.Quantity),
                    CreatedAt = DateTime.UtcNow
                };
                dbContext.DailySalesSummaries.Add(summary);
            }
            else
            {
                summary.TotalSales = dailyTransactions.Sum(t => t.TotalAmount);
                summary.TotalTax = dailyTransactions.Sum(t => t.TaxAmount);
                summary.TotalDiscount = dailyTransactions.Sum(t => t.DiscountAmount);
                summary.TransactionCount = dailyTransactions.Count;
                summary.ItemsSold = dailyItems.Sum(i => i.Quantity);
                dbContext.DailySalesSummaries.Update(summary);
            }

            await dbContext.SaveChangesAsync();
        }
    }
}
