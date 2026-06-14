using CrazyPOS.Server.Auth;
using CrazyPOS.Server.Dto;
using CrazyPOS.Server.Models;
using CrazyPOS.Server.Services.Pricing;
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
        private readonly IPricingEngine _pricingEngine;

        public SalesController(
            IDbContextFactory<crazypos_devContext> dbFactory,
            ICurrentUserService currentUser,
            IPricingEngine pricingEngine)
        {
            _dbFactory = dbFactory;
            _currentUser = currentUser;
            _pricingEngine = pricingEngine;
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
        /// Preview pricing using server-side promotion rules.
        /// </summary>
        [HttpPost]
        [ActionName("PreviewPricing")]
        public async Task<IActionResult> PreviewPricing([FromBody] PricingPreviewRequestDto request)
        {
            if (request?.Items == null || request.Items.Count == 0)
            {
                return BadRequest(new { success = false, message = "At least one item is required" });
            }

            try
            {
                using var dbContext = _dbFactory.CreateDbContext();
                var preview = await _pricingEngine.PreviewPricingAsync(dbContext, request, _currentUser.UserId);
                return Ok(preview);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error previewing pricing: {ex.Message}" });
            }
        }

        /// <summary>
        /// Approve a pricing snapshot that has restricted discounts.
        /// </summary>
        [HttpPost]
        [Authorize(Policy = "ManagerUp")]
        [ActionName("ApproveDiscount")]
        public IActionResult ApproveDiscount([FromBody] ApproveDiscountRequestDto request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.PricingSnapshotId))
            {
                return BadRequest(new { success = false, message = "Pricing snapshot ID is required" });
            }

            if (!_pricingEngine.TryApproveSnapshot(
                    request.PricingSnapshotId,
                    _currentUser.UserId,
                    request.Note,
                    out var approval,
                    out var error))
            {
                return BadRequest(new { success = false, message = error ?? "Unable to approve pricing snapshot" });
            }

            return Ok(new ApproveDiscountResponseDto
            {
                PricingSnapshotId = approval!.PricingSnapshotId,
                ApprovedByUserId = approval.ApprovedByUserId,
                ApprovedAtUtc = approval.ApprovedAtUtc,
                Note = approval.Note
            });
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
                    long userId = _currentUser.UserId;

                    var pricingRequest = new PricingPreviewRequestDto
                    {
                        Items = transactionDto.Items
                            .Where(i => i.Quantity > 0)
                            .Select(i => new PricingPreviewItemDto
                            {
                                ProductId = i.ProductId,
                                Quantity = i.Quantity
                            })
                            .ToList(),
                        RequestedPromotionIds = transactionDto.RequestedPromotionIds ?? new List<long>(),
                        CouponCode = transactionDto.CouponCode
                    };

                    if (pricingRequest.Items.Count == 0)
                    {
                        return BadRequest(new { success = false, message = "At least one transaction item with positive quantity is required" });
                    }

                    PricingSnapshot pricingSnapshot;
                    if (!string.IsNullOrWhiteSpace(transactionDto.PricingSnapshotId))
                    {
                        if (!_pricingEngine.TryGetSnapshot(transactionDto.PricingSnapshotId, out pricingSnapshot))
                        {
                            return BadRequest(new { success = false, message = "Pricing snapshot not found or expired. Recalculate pricing before checkout." });
                        }

                        if (pricingSnapshot.CreatedByUserId != userId && !_currentUser.IsInRole("Admin") && !_currentUser.IsInRole("Manager"))
                        {
                            return BadRequest(new { success = false, message = "Pricing snapshot does not belong to current user" });
                        }

                        var itemSignatureMismatch = pricingSnapshot.Items
                            .OrderBy(i => i.ProductId)
                            .Select(i => $"{i.ProductId}:{i.Quantity}")
                            .SequenceEqual(pricingRequest.Items.OrderBy(i => i.ProductId).Select(i => $"{i.ProductId}:{i.Quantity}")) == false;

                        if (itemSignatureMismatch)
                        {
                            return BadRequest(new { success = false, message = "Transaction items do not match pricing snapshot. Recalculate pricing before checkout." });
                        }
                    }
                    else
                    {
                        var preview = await _pricingEngine.PreviewPricingAsync(dbContext, pricingRequest, userId);
                        if (!_pricingEngine.TryGetSnapshot(preview.PricingSnapshotId, out pricingSnapshot))
                        {
                            return BadRequest(new { success = false, message = "Unable to resolve pricing snapshot for transaction" });
                        }
                    }

                    if (pricingSnapshot.DiscountAmount > 0 && !await HasDiscountPermissionAsync(dbContext, userId))
                    {
                        return Forbid();
                    }

                    if (pricingSnapshot.RequiresApproval
                        && !pricingSnapshot.ApprovedByUserId.HasValue
                        && !_currentUser.IsInRole("Admin")
                        && !_currentUser.IsInRole("Manager"))
                    {
                        return BadRequest(new { success = false, message = "Manager approval is required for one or more applied promotions" });
                    }

                    decimal amountTendered = transactionDto.AmountTendered ?? pricingSnapshot.TotalAmount;
                    if (amountTendered < pricingSnapshot.TotalAmount)
                    {
                        return BadRequest(new { success = false, message = "Amount tendered cannot be less than total amount" });
                    }

                    var transaction = new SalesTransaction
                    {
                        TransactionCode = "TXN-" + DateTime.UtcNow.ToString("yyyyMMddHHmmssfff"),
                        UserId = userId,
                        TransactionDate = DateTime.Now.ToLocalTime(),
                        SubTotal = pricingSnapshot.SubTotal,
                        TaxAmount = pricingSnapshot.TaxAmount,
                        TotalAmount = pricingSnapshot.TotalAmount,
                        PaymentMethod = transactionDto.PaymentMethod,
                        AmountTendered = amountTendered,
                        ChangeAmount = amountTendered - pricingSnapshot.TotalAmount,
                        DiscountAmount = pricingSnapshot.DiscountAmount,
                        RefundedAmount = 0,
                        ReturnStatus = "none",
                        Notes = transactionDto.Notes,
                        Status = "completed",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        CustomerId = transactionDto.CustomerId
                    };

                    dbContext.SalesTransactions.Add(transaction);
                    await dbContext.SaveChangesAsync();

                    foreach (var snapshotItem in pricingSnapshot.Items)
                    {
                        var product = await dbContext.Products.FindAsync(snapshotItem.ProductId);
                        if (product == null)
                        {
                            continue;
                        }

                        if ((product.Stock ?? 0) < snapshotItem.Quantity)
                        {
                            return BadRequest(new
                            {
                                success = false,
                                message = $"Insufficient stock for product {product.Name}. Available: {product.Stock ?? 0}, requested: {snapshotItem.Quantity}"
                            });
                        }

                        var baseLineTotal = snapshotItem.UnitPrice * snapshotItem.Quantity;
                        var discountPercent = baseLineTotal <= 0 ? 0 : Math.Round((snapshotItem.DiscountAmount / baseLineTotal) * 100m, 2, MidpointRounding.AwayFromZero);

                        var transactionItem = new TransactionItem
                        {
                            TransactionId = transaction.TransactionId,
                            Productid = snapshotItem.ProductId,
                            Quantity = snapshotItem.Quantity,
                            UnitPrice = snapshotItem.UnitPrice,
                            DiscountPercent = discountPercent,
                            DiscountAmount = snapshotItem.DiscountAmount,
                            PromotionId = snapshotItem.PromotionId,
                            PromotionDiscountAmount = snapshotItem.PromotionDiscountAmount,
                            PricingRuleSnapshot = snapshotItem.PricingRuleSnapshot,
                            LineTotal = snapshotItem.LineTotal,
                            CreatedAt = DateTime.UtcNow
                        };

                        dbContext.TransactionItems.Add(transactionItem);

                        product.Stock = (product.Stock ?? 0) - snapshotItem.Quantity;
                        dbContext.Products.Update(product);

                        var inventory = new Inventory
                        {
                            Productid = snapshotItem.ProductId,
                            Quantity = -snapshotItem.Quantity,
                            MovementType = "Sale",
                            Reference = transaction.TransactionCode,
                            Notes = $"Sale via transaction {transaction.TransactionCode}",
                            CreatedAt = DateTime.UtcNow,
                            CreatedBy = "POS System"
                        };

                        dbContext.Inventories.Add(inventory);
                    }

                    foreach (var promotion in pricingSnapshot.Promotions.Where(p => p.DiscountAmount > 0))
                    {
                        var transactionPromotion = new TransactionPromotion
                        {
                            TransactionId = transaction.TransactionId,
                            PromotionId = promotion.PromotionId,
                            DiscountAmount = promotion.DiscountAmount,
                            AppliedAt = DateTime.UtcNow,
                            ApprovalUserId = promotion.RequiresApproval
                                ? (pricingSnapshot.ApprovedByUserId ?? (_currentUser.IsInRole("Admin") || _currentUser.IsInRole("Manager") ? userId : null))
                                : null,
                            ApprovalNote = promotion.RequiresApproval ? pricingSnapshot.ApprovalNote : null
                        };

                        dbContext.TransactionPromotions.Add(transactionPromotion);

                        var promotionEntity = await dbContext.Promotions.FirstOrDefaultAsync(p => p.PromotionId == promotion.PromotionId);
                        if (promotionEntity != null)
                        {
                            promotionEntity.UsageCount += 1;
                        }
                    }

                    await dbContext.SaveChangesAsync();

                    await UpdateDailySalesSummary(dbContext);
                    _pricingEngine.RemoveSnapshot(pricingSnapshot.SnapshotId);

                    return Ok(new
                    {
                        success = true,
                        message = "Transaction created successfully",
                        transactionId = transaction.TransactionId,
                        transactionCode = transaction.TransactionCode,
                        totalAmount = transaction.TotalAmount,
                        pricingSnapshotId = pricingSnapshot.SnapshotId
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
                        .Include(t => t.TransactionPromotions)
                        .ThenInclude(tp => tp.Promotion)
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
                        RefundedAmount = transaction.RefundedAmount,
                        ReturnStatus = transaction.ReturnStatus,
                        Status = transaction.Status,
                        Cashier = transaction.User?.FullName ?? "Unknown",
                        Items = transaction.TransactionItems.Select(ti => new TransactionItemDto
                        {
                            ItemId = ti.ItemId,
                            ProductId = ti.Productid,
                            ProductName = ti.Product.Name,
                            Quantity = ti.Quantity,
                            ReturnedQuantity = ti.ReturnedQuantity,
                            UnitPrice = ti.UnitPrice,
                            DiscountPercent = ti.DiscountPercent,
                            DiscountAmount = ti.DiscountAmount,
                            LineTotal = ti.LineTotal,
                            PromotionId = ti.PromotionId,
                            PromotionDiscountAmount = ti.PromotionDiscountAmount,
                            PricingRuleSnapshot = ti.PricingRuleSnapshot
                        }).ToList(),
                        Promotions = transaction.TransactionPromotions.Select(tp => new TransactionPromotionDto
                        {
                            PromotionId = tp.PromotionId,
                            PromotionCode = tp.Promotion?.PromotionCode,
                            PromotionName = tp.Promotion?.Name ?? "Unknown promotion",
                            DiscountAmount = tp.DiscountAmount,
                            RequiresApproval = tp.Promotion?.RequiresApproval ?? false,
                            ApprovalUserId = tp.ApprovalUserId,
                            ApprovalNote = tp.ApprovalNote
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
                        t.RefundedAmount,
                        t.ReturnStatus,
                        // t.Customer = dbContext.Customers..FirstOrDefault(c => c.CustomerId == t.CustomerId.GetValueOrDefault(0)) ?? new Customer(),
                            CustomerName = t.CustomerId.HasValue
                                ? dbContext.Customers.Where(c => c.CustomerId == t.CustomerId.Value).Select(c => c.FirstName + " " + c.LastName).FirstOrDefault() ?? "Unknown customer"
                                : "No customer",
                        HasOpenRefundSettlement = dbContext.SalesReturns
                            .Where(r => r.OriginalTransactionId == t.TransactionId)
                            .Any(r => r.RefundStatus == "pending"),
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

                    if (await dbContext.SalesReturns.AnyAsync(r => r.OriginalTransactionId == transaction.TransactionId))
                    {
                        return BadRequest(new { success = false, message = "Transactions with returns cannot be cancelled" });
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

        private async Task<bool> HasDiscountPermissionAsync(crazypos_devContext dbContext, long userId)
        {
            if (_currentUser.IsInRole("Admin") || _currentUser.IsInRole("Manager"))
            {
                return true;
            }

            var user = await dbContext.Users.FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null)
            {
                return false;
            }

            return await dbContext.RolePermissions
                .Include(rp => rp.Role)
                .Include(rp => rp.Permission)
                .AnyAsync(rp => rp.Role.RoleName == user.Role
                                && rp.Permission.PermissionCode == "SALES_DISCOUNT"
                                && rp.Permission.IsActive);
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
