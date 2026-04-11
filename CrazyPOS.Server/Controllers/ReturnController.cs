using CrazyPOS.Server.Auth;
using CrazyPOS.Server.Dto;
using CrazyPOS.Server.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrazyPOS.Server.Controllers
{
    [Authorize]
    [Route("api/[controller]/[action]")]
    [ApiController]
    public class ReturnController : ControllerBase
    {
        private readonly IDbContextFactory<crazypos_devContext> _dbFactory;
        private readonly ICurrentUserService _currentUser;

        public ReturnController(
            IDbContextFactory<crazypos_devContext> dbFactory,
            ICurrentUserService currentUser)
        {
            _dbFactory = dbFactory;
            _currentUser = currentUser;
        }

        [HttpPost]
        [ActionName("PreviewReturn")]
        public async Task<IActionResult> PreviewReturn([FromBody] ReturnPreviewRequestDto request)
        {
            if (request?.Items == null || request.Items.Count == 0)
            {
                return BadRequest(new { success = false, message = "At least one return item is required" });
            }

            try
            {
                using var dbContext = _dbFactory.CreateDbContext();

                if (!await HasPermissionAsync(dbContext, _currentUser.UserId, "SALES_RETURN_CREATE"))
                {
                    return Forbid();
                }

                var transaction = await LoadTransactionForReturnAsync(dbContext, request.OriginalTransactionId);
                if (transaction == null)
                {
                    return NotFound(new { success = false, message = "Original transaction not found" });
                }

                var preview = BuildReturnPreview(transaction, request.Items);
                return Ok(preview);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error previewing return: {ex.Message}" });
            }
        }

        [HttpPost]
        [ActionName("CreateReturn")]
        public async Task<IActionResult> CreateReturn([FromBody] CreateReturnDto request)
        {
            if (request?.Items == null || request.Items.Count == 0)
            {
                return BadRequest(new { success = false, message = "At least one return item is required" });
            }

            try
            {
                using var dbContext = _dbFactory.CreateDbContext();

                if (!await HasPermissionAsync(dbContext, _currentUser.UserId, "SALES_RETURN_CREATE"))
                {
                    return Forbid();
                }

                if (request.RequiresManagerApproval && !_currentUser.IsInRole("Admin") && !_currentUser.IsInRole("Manager"))
                {
                    return Forbid();
                }

                var transaction = await LoadTransactionForReturnAsync(dbContext, request.OriginalTransactionId);
                if (transaction == null)
                {
                    return NotFound(new { success = false, message = "Original transaction not found" });
                }

                var preview = BuildReturnPreview(transaction, request.Items);

                await using var tx = await dbContext.Database.BeginTransactionAsync();

                var salesReturn = new SalesReturn
                {
                    ReturnCode = $"RTN-{DateTime.UtcNow:yyyyMMddHHmmssfff}",
                    OriginalTransactionId = transaction.TransactionId,
                    CustomerId = transaction.CustomerId,
                    ProcessedByUserId = _currentUser.UserId,
                    ApprovedByUserId = _currentUser.IsInRole("Admin") || _currentUser.IsInRole("Manager") ? _currentUser.UserId : null,
                    ReturnDate = DateTime.UtcNow,
                    Status = "completed",
                    RefundStatus = IsImmediateRefundMethod(request.RefundMethod) ? "settled" : "pending",
                    ReasonCode = string.IsNullOrWhiteSpace(request.ReasonCode) ? "unspecified" : request.ReasonCode.Trim(),
                    ReasonNotes = request.ReasonNotes,
                    SubtotalReversal = preview.SubtotalReversal,
                    TaxReversal = preview.TaxReversal,
                    DiscountReversal = preview.DiscountReversal,
                    RefundTotal = preview.RefundTotal,
                    Notes = request.Notes,
                    CreatedAt = DateTime.UtcNow
                };

                dbContext.SalesReturns.Add(salesReturn);
                await dbContext.SaveChangesAsync();

                foreach (var input in request.Items)
                {
                    var originalItem = transaction.TransactionItems.First(ti => ti.ItemId == input.OriginalTransactionItemId);
                    var returnQty = input.Quantity;
                    var itemDiscountReversal = RoundCurrency((originalItem.DiscountAmount / originalItem.Quantity) * returnQty);
                    var itemTaxReversal = CalculateItemTaxReversal(transaction, originalItem, returnQty);
                    var refundLineTotal = RoundCurrency((originalItem.UnitPrice * returnQty) - itemDiscountReversal + itemTaxReversal);

                    var returnItem = new ReturnItem
                    {
                        ReturnId = salesReturn.ReturnId,
                        OriginalTransactionItemId = originalItem.ItemId,
                        ProductId = originalItem.Productid,
                        Quantity = returnQty,
                        UnitPrice = originalItem.UnitPrice,
                        DiscountReversal = itemDiscountReversal,
                        TaxReversal = itemTaxReversal,
                        RefundLineTotal = refundLineTotal,
                        InventoryDisposition = NormalizeDisposition(input.InventoryDisposition),
                        DispositionNotes = input.DispositionNotes,
                        CreatedAt = DateTime.UtcNow
                    };

                    dbContext.ReturnItems.Add(returnItem);

                    originalItem.ReturnedQuantity += returnQty;
                    dbContext.TransactionItems.Update(originalItem);

                    if (string.Equals(returnItem.InventoryDisposition, "restock", StringComparison.OrdinalIgnoreCase))
                    {
                        var product = await dbContext.Products.FirstOrDefaultAsync(p => p.Productid == originalItem.Productid);
                        if (product != null)
                        {
                            product.Stock = (product.Stock ?? 0) + returnQty;
                            dbContext.Products.Update(product);
                        }
                    }

                    dbContext.Inventories.Add(new Inventory
                    {
                        Productid = originalItem.Productid,
                        Quantity = string.Equals(returnItem.InventoryDisposition, "restock", StringComparison.OrdinalIgnoreCase) ? returnQty : 0,
                        MovementType = "Return",
                        Reference = salesReturn.ReturnCode,
                        Notes = $"Return {salesReturn.ReturnCode} ({returnItem.InventoryDisposition})",
                        CreatedAt = DateTime.UtcNow,
                        CreatedBy = _currentUser.Username
                    });
                }

                dbContext.RefundSettlements.Add(new RefundSettlement
                {
                    ReturnId = salesReturn.ReturnId,
                    RefundMethod = string.IsNullOrWhiteSpace(request.RefundMethod) ? "cash" : request.RefundMethod.Trim().ToLowerInvariant(),
                    Amount = salesReturn.RefundTotal,
                    SettlementStatus = salesReturn.RefundStatus,
                    ProcessedByUserId = salesReturn.RefundStatus == "settled" ? _currentUser.UserId : null,
                    ProcessedAt = salesReturn.RefundStatus == "settled" ? DateTime.UtcNow : null,
                    Notes = request.Notes,
                    CreatedAt = DateTime.UtcNow
                });

                transaction.RefundedAmount = RoundCurrency(transaction.RefundedAmount + salesReturn.RefundTotal);
                transaction.ReturnStatus = CalculateReturnStatus(transaction.TransactionItems);
                dbContext.SalesTransactions.Update(transaction);

                await dbContext.SaveChangesAsync();
                await tx.CommitAsync();

                var detail = await BuildReturnDetailAsync(dbContext, salesReturn.ReturnId);
                return Ok(detail);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error creating return: {ex.Message}" });
            }
        }

        [HttpGet]
        [ActionName("GetReturn")]
        public async Task<IActionResult> GetReturn(long returnId)
        {
            if (returnId <= 0)
            {
                return BadRequest(new { success = false, message = "Invalid return ID" });
            }

            try
            {
                using var dbContext = _dbFactory.CreateDbContext();
                var detail = await BuildReturnDetailAsync(dbContext, returnId);
                if (detail == null)
                {
                    return NotFound(new { success = false, message = "Return not found" });
                }

                return Ok(detail);
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error retrieving return: {ex.Message}" });
            }
        }

        [HttpGet]
        [ActionName("GetReturnsByDateRange")]
        public async Task<IActionResult> GetReturnsByDateRange(DateTime startDate, DateTime endDate)
        {
            if (endDate < startDate)
            {
                return BadRequest(new { success = false, message = "End date cannot be earlier than start date" });
            }

            try
            {
                using var dbContext = _dbFactory.CreateDbContext();
                var returns = await dbContext.SalesReturns
                    .Include(r => r.ReturnItems)
                    .Where(r => r.ReturnDate.Date >= startDate.Date && r.ReturnDate.Date <= endDate.Date)
                    .OrderByDescending(r => r.ReturnDate)
                    .Take(500)
                    .Select(r => new ReturnSummaryDto
                    {
                        ReturnId = r.ReturnId,
                        ReturnCode = r.ReturnCode,
                        OriginalTransactionId = r.OriginalTransactionId,
                        ReturnDate = r.ReturnDate,
                        Status = r.Status,
                        RefundStatus = r.RefundStatus,
                        RefundTotal = r.RefundTotal,
                        ItemCount = r.ReturnItems.Sum(ri => ri.Quantity)
                    })
                    .ToListAsync();

                return Ok(returns);
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error retrieving returns: {ex.Message}" });
            }
        }

        [HttpPost]
        [ActionName("UpdateRefundSettlement")]
        public async Task<IActionResult> UpdateRefundSettlement([FromBody] UpdateRefundSettlementDto request)
        {
            if (request.ReturnId <= 0 || request.Amount <= 0 || string.IsNullOrWhiteSpace(request.SettlementStatus))
            {
                return BadRequest(new { success = false, message = "Return ID, amount, and settlement status are required" });
            }

            try
            {
                using var dbContext = _dbFactory.CreateDbContext();

                if (!await HasPermissionAsync(dbContext, _currentUser.UserId, "SALES_REFUND_SETTLE"))
                {
                    return Forbid();
                }

                var salesReturn = await dbContext.SalesReturns.FirstOrDefaultAsync(r => r.ReturnId == request.ReturnId);
                if (salesReturn == null)
                {
                    return NotFound(new { success = false, message = "Return not found" });
                }

                var settlement = new RefundSettlement
                {
                    ReturnId = request.ReturnId,
                    RefundMethod = string.IsNullOrWhiteSpace(request.RefundMethod) ? "cash" : request.RefundMethod.Trim().ToLowerInvariant(),
                    Amount = request.Amount,
                    SettlementStatus = request.SettlementStatus.Trim().ToLowerInvariant(),
                    PaymentReference = request.PaymentReference,
                    ProcessedByUserId = _currentUser.UserId,
                    ProcessedAt = DateTime.UtcNow,
                    Notes = request.Notes,
                    CreatedAt = DateTime.UtcNow
                };

                dbContext.RefundSettlements.Add(settlement);

                salesReturn.RefundStatus = settlement.SettlementStatus;
                salesReturn.UpdatedAt = DateTime.UtcNow;
                dbContext.SalesReturns.Update(salesReturn);

                await dbContext.SaveChangesAsync();

                return Ok(new RefundSettlementDto
                {
                    RefundSettlementId = settlement.RefundSettlementId,
                    ReturnId = settlement.ReturnId,
                    RefundMethod = settlement.RefundMethod,
                    Amount = settlement.Amount,
                    SettlementStatus = settlement.SettlementStatus,
                    PaymentReference = settlement.PaymentReference,
                    ProcessedByUserId = settlement.ProcessedByUserId,
                    ProcessedAt = settlement.ProcessedAt,
                    Notes = settlement.Notes
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error updating refund settlement: {ex.Message}" });
            }
        }

        private static decimal RoundCurrency(decimal amount)
        {
            return Math.Round(amount, 2, MidpointRounding.AwayFromZero);
        }

        private static string NormalizeDisposition(string? disposition)
        {
            if (string.IsNullOrWhiteSpace(disposition))
            {
                return "restock";
            }

            var normalized = disposition.Trim().ToLowerInvariant();
            return normalized is "restock" or "damaged" or "discard" ? normalized : "restock";
        }

        private static bool IsImmediateRefundMethod(string? refundMethod)
        {
            var method = string.IsNullOrWhiteSpace(refundMethod) ? "cash" : refundMethod.Trim().ToLowerInvariant();
            return method == "cash";
        }

        private static string CalculateReturnStatus(IEnumerable<TransactionItem> items)
        {
            var itemList = items.ToList();
            if (itemList.Count == 0)
            {
                return "none";
            }

            var hasAnyReturn = itemList.Any(i => i.ReturnedQuantity > 0);
            if (!hasAnyReturn)
            {
                return "none";
            }

            var allReturned = itemList.All(i => i.ReturnedQuantity >= i.Quantity);
            return allReturned ? "full" : "partial";
        }

        private static decimal CalculateItemTaxReversal(SalesTransaction transaction, TransactionItem item, int returnQuantity)
        {
            if (transaction.TaxAmount <= 0)
            {
                return 0;
            }

            var transactionLineTotal = transaction.TransactionItems.Sum(i => i.LineTotal);
            if (transactionLineTotal <= 0)
            {
                return 0;
            }

            var itemNetShare = item.LineTotal / transactionLineTotal;
            var itemTaxTotal = transaction.TaxAmount * itemNetShare;
            var unitTax = itemTaxTotal / item.Quantity;
            return RoundCurrency(unitTax * returnQuantity);
        }

        private static ReturnPreviewResponseDto BuildReturnPreview(SalesTransaction transaction, List<ReturnItemInputDto> inputs)
        {
            if (transaction.Status == "cancelled")
            {
                throw new ArgumentException("Cancelled transactions cannot be returned");
            }

            if (inputs.Any(i => i.Quantity <= 0))
            {
                throw new ArgumentException("Return quantity must be greater than zero");
            }

            var requestedItemIds = inputs.Select(i => i.OriginalTransactionItemId).Distinct().ToHashSet();
            var transactionItems = transaction.TransactionItems.Where(i => requestedItemIds.Contains(i.ItemId)).ToDictionary(i => i.ItemId);

            if (transactionItems.Count != requestedItemIds.Count)
            {
                throw new ArgumentException("One or more transaction items were not found in the original sale");
            }

            var previewItems = new List<ReturnPreviewItemDto>();
            foreach (var input in inputs)
            {
                var item = transactionItems[input.OriginalTransactionItemId];
                var remainingQty = item.Quantity - item.ReturnedQuantity;

                if (input.Quantity > remainingQty)
                {
                    throw new ArgumentException($"Return quantity exceeds remaining quantity for item {item.ItemId}");
                }

                var subtotalReversal = RoundCurrency(item.UnitPrice * input.Quantity);
                var discountReversal = RoundCurrency((item.DiscountAmount / item.Quantity) * input.Quantity);
                var taxReversal = CalculateItemTaxReversal(transaction, item, input.Quantity);
                var refundLineTotal = RoundCurrency(subtotalReversal - discountReversal + taxReversal);

                previewItems.Add(new ReturnPreviewItemDto
                {
                    OriginalTransactionItemId = item.ItemId,
                    ProductId = item.Productid,
                    ProductName = item.Product?.Name ?? $"Product {item.Productid}",
                    Quantity = input.Quantity,
                    UnitPrice = item.UnitPrice,
                    SubtotalReversal = subtotalReversal,
                    DiscountReversal = discountReversal,
                    TaxReversal = taxReversal,
                    RefundLineTotal = refundLineTotal
                });
            }

            return new ReturnPreviewResponseDto
            {
                OriginalTransactionId = transaction.TransactionId,
                SubtotalReversal = RoundCurrency(previewItems.Sum(i => i.SubtotalReversal)),
                DiscountReversal = RoundCurrency(previewItems.Sum(i => i.DiscountReversal)),
                TaxReversal = RoundCurrency(previewItems.Sum(i => i.TaxReversal)),
                RefundTotal = RoundCurrency(previewItems.Sum(i => i.RefundLineTotal)),
                Items = previewItems,
                Warnings = new List<string>()
            };
        }

        private async Task<SalesTransaction?> LoadTransactionForReturnAsync(crazypos_devContext dbContext, long transactionId)
        {
            return await dbContext.SalesTransactions
                .Include(t => t.TransactionItems)
                .ThenInclude(ti => ti.Product)
                .FirstOrDefaultAsync(t => t.TransactionId == transactionId);
        }

        private async Task<ReturnDetailDto?> BuildReturnDetailAsync(crazypos_devContext dbContext, long returnId)
        {
            var salesReturn = await dbContext.SalesReturns
                .Include(r => r.ReturnItems)
                .ThenInclude(ri => ri.Product)
                .Include(r => r.RefundSettlements)
                .FirstOrDefaultAsync(r => r.ReturnId == returnId);

            if (salesReturn == null)
            {
                return null;
            }

            return new ReturnDetailDto
            {
                ReturnId = salesReturn.ReturnId,
                ReturnCode = salesReturn.ReturnCode,
                OriginalTransactionId = salesReturn.OriginalTransactionId,
                ReturnDate = salesReturn.ReturnDate,
                Status = salesReturn.Status,
                RefundStatus = salesReturn.RefundStatus,
                ReasonCode = salesReturn.ReasonCode,
                ReasonNotes = salesReturn.ReasonNotes,
                SubtotalReversal = salesReturn.SubtotalReversal,
                TaxReversal = salesReturn.TaxReversal,
                DiscountReversal = salesReturn.DiscountReversal,
                RefundTotal = salesReturn.RefundTotal,
                Items = salesReturn.ReturnItems
                    .OrderBy(ri => ri.ReturnItemId)
                    .Select(ri => new ReturnDetailItemDto
                    {
                        ReturnItemId = ri.ReturnItemId,
                        OriginalTransactionItemId = ri.OriginalTransactionItemId,
                        ProductId = ri.ProductId,
                        ProductName = ri.Product?.Name ?? $"Product {ri.ProductId}",
                        Quantity = ri.Quantity,
                        UnitPrice = ri.UnitPrice,
                        DiscountReversal = ri.DiscountReversal,
                        TaxReversal = ri.TaxReversal,
                        RefundLineTotal = ri.RefundLineTotal,
                        InventoryDisposition = ri.InventoryDisposition
                    }).ToList(),
                Settlements = salesReturn.RefundSettlements
                    .OrderBy(rs => rs.RefundSettlementId)
                    .Select(rs => new RefundSettlementDto
                    {
                        RefundSettlementId = rs.RefundSettlementId,
                        ReturnId = rs.ReturnId,
                        RefundMethod = rs.RefundMethod,
                        Amount = rs.Amount,
                        SettlementStatus = rs.SettlementStatus,
                        PaymentReference = rs.PaymentReference,
                        ProcessedByUserId = rs.ProcessedByUserId,
                        ProcessedAt = rs.ProcessedAt,
                        Notes = rs.Notes
                    }).ToList()
            };
        }

        private async Task<bool> HasPermissionAsync(crazypos_devContext dbContext, long userId, string permissionCode)
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
                                && rp.Permission.PermissionCode == permissionCode
                                && rp.Permission.IsActive);
        }
    }
}
