using System.Collections.Concurrent;
using System.Text.Json;
using CrazyPOS.Server.Dto;
using CrazyPOS.Server.Models;
using Microsoft.EntityFrameworkCore;

namespace CrazyPOS.Server.Services.Pricing;

public class PricingEngine : IPricingEngine
{
    private const decimal TaxRate = 0.0875m;
    private static readonly TimeSpan SnapshotTtl = TimeSpan.FromMinutes(30);

    private readonly ConcurrentDictionary<string, PricingSnapshot> _snapshots = new();

    public async Task<PricingPreviewResponseDto> PreviewPricingAsync(
        crazypos_devContext dbContext,
        PricingPreviewRequestDto request,
        long userId,
        CancellationToken cancellationToken = default)
    {
        if (request.Items == null || request.Items.Count == 0)
        {
            throw new ArgumentException("At least one item is required");
        }

        var normalizedItems = request.Items
            .Where(i => i.Quantity > 0)
            .GroupBy(i => i.ProductId)
            .Select(g => new PricingPreviewItemDto { ProductId = g.Key, Quantity = g.Sum(x => x.Quantity) })
            .ToList();

        if (normalizedItems.Count == 0)
        {
            throw new ArgumentException("At least one item with positive quantity is required");
        }

        var productIds = normalizedItems.Select(i => i.ProductId).Distinct().ToList();
        var products = new Dictionary<long, Product>();
        foreach (var productId in productIds)
        {
            var product = await dbContext.Products
                .FirstOrDefaultAsync(p => p.Productid == productId, cancellationToken);
            if (product != null)
            {
                products[productId] = product;
            }
        }

        var missingProducts = productIds.Where(id => !products.ContainsKey(id)).ToList();
        if (missingProducts.Count > 0)
        {
            throw new ArgumentException($"Invalid product IDs: {string.Join(", ", missingProducts)}");
        }

        var now = DateTime.SpecifyKind(DateTime.Now, DateTimeKind.Unspecified);
        var requestedIds = (request.RequestedPromotionIds ?? new List<long>()).Distinct().ToList();
        var couponCode = string.IsNullOrWhiteSpace(request.CouponCode) ? null : request.CouponCode.Trim();

        var promotions = await dbContext.Promotions
            .Include(p => p.PromotionQualifiers)
            .Where(p => p.IsActive)
            .OrderBy(p => p.PromotionId)
            .ToListAsync(cancellationToken);

        promotions = promotions
            .Where(p => IsPromotionWithinWindow(p, now))
            .ToList();

        if (requestedIds.Count > 0 || !string.IsNullOrWhiteSpace(couponCode))
        {
            var requestedSet = requestedIds.ToHashSet();
            promotions = promotions
                .Where(p => requestedSet.Contains(p.PromotionId)
                    || (!string.IsNullOrEmpty(couponCode)
                        && string.Equals(p.PromotionCode, couponCode, StringComparison.OrdinalIgnoreCase)))
                .ToList();
        }

        var responseItems = new List<PricingPreviewItemResultDto>();
        var responsePromotions = new List<PricingPreviewPromotionResultDto>();
        var warnings = new List<string>();

        decimal subTotal = 0;
        decimal itemDiscountTotal = 0;

        foreach (var item in normalizedItems)
        {
            var product = products[item.ProductId];
            var unitPrice = product.Price ?? 0;
            var baseLineTotal = Round(unitPrice * item.Quantity);
            subTotal += baseLineTotal;

            var eligibleItemPromotions = promotions
                .Where(p => IsPromotionEligibleForItem(p, product, item.Quantity, baseLineTotal))
                .ToList();

            var selectedPromotion = SelectBestItemPromotion(eligibleItemPromotions, baseLineTotal, out var itemDiscount);
            var lineTotal = Round(baseLineTotal - itemDiscount);
            itemDiscountTotal += itemDiscount;

            if (selectedPromotion != null)
            {
                UpsertPromotionResult(responsePromotions, selectedPromotion, itemDiscount);
            }

            responseItems.Add(new PricingPreviewItemResultDto
            {
                ProductId = product.Productid,
                ProductName = product.Name,
                Quantity = item.Quantity,
                UnitPrice = unitPrice,
                BaseLineTotal = baseLineTotal,
                DiscountAmount = itemDiscount,
                LineTotal = lineTotal,
                PromotionId = selectedPromotion?.PromotionId,
                PromotionDiscountAmount = itemDiscount,
                PricingRuleSnapshot = selectedPromotion == null
                    ? null
                    : JsonSerializer.Serialize(new
                    {
                        selectedPromotion.PromotionId,
                        selectedPromotion.Name,
                        selectedPromotion.PromotionType,
                        selectedPromotion.ValueType,
                        selectedPromotion.ValueAmount
                    })
            });
        }

        var discountedSubtotal = Round(subTotal - itemDiscountTotal);

        var basketPromotions = promotions
            .Where(p => IsBasketPromotion(p) && IsPromotionEligibleForBasket(p, discountedSubtotal))
            .ToList();

        decimal basketDiscountTotal = 0;
        if (basketPromotions.Count > 0)
        {
            var nonStackable = basketPromotions
                .Where(p => !p.Stackable)
                .Select(p => new { Promotion = p, Discount = CalculateDiscountAmount(p, discountedSubtotal) })
                .OrderByDescending(x => x.Discount)
                .ThenBy(x => x.Promotion.PromotionId)
                .FirstOrDefault();

            if (nonStackable != null)
            {
                basketDiscountTotal += nonStackable.Discount;
                UpsertPromotionResult(responsePromotions, nonStackable.Promotion, nonStackable.Discount);
            }
            else
            {
                foreach (var promo in basketPromotions.OrderBy(p => p.PromotionId))
                {
                    var discount = CalculateDiscountAmount(promo, discountedSubtotal);
                    if (discount <= 0)
                    {
                        continue;
                    }

                    basketDiscountTotal += discount;
                    UpsertPromotionResult(responsePromotions, promo, discount);
                }
            }
        }

        var discountAmount = Round(itemDiscountTotal + basketDiscountTotal);
        if (discountAmount > subTotal)
        {
            discountAmount = subTotal;
        }

        var taxableAmount = Round(subTotal - discountAmount);
        if (taxableAmount < 0)
        {
            taxableAmount = 0;
        }

        var taxAmount = Round(taxableAmount * TaxRate);
        var totalAmount = Round(taxableAmount + taxAmount);

        if (requestedIds.Count > 0)
        {
            var resolvedRequested = promotions.Select(p => p.PromotionId).ToHashSet();
            foreach (var missingId in requestedIds.Where(id => !resolvedRequested.Contains(id)))
            {
                warnings.Add($"Promotion {missingId} was not found or is not active.");
            }
        }

        if (!string.IsNullOrEmpty(couponCode) && !promotions.Any(p =>
            !string.IsNullOrWhiteSpace(p.PromotionCode)
            && string.Equals(p.PromotionCode.Trim(), couponCode, StringComparison.OrdinalIgnoreCase)))
        {
            warnings.Add("Coupon code is invalid or inactive.");
        }

        var requiresApproval = responsePromotions.Any(p => p.RequiresApproval);
        var snapshotId = Guid.NewGuid().ToString("N");

        var snapshot = new PricingSnapshot
        {
            SnapshotId = snapshotId,
            CreatedAtUtc = now,
            ExpiresAtUtc = now.Add(SnapshotTtl),
            CreatedByUserId = userId,
            SubTotal = subTotal,
            TaxAmount = taxAmount,
            DiscountAmount = discountAmount,
            TotalAmount = totalAmount,
            RequiresApproval = requiresApproval,
            CouponCode = couponCode,
            RequestedPromotionIds = requestedIds,
            Items = responseItems.Select(i => new PricingSnapshotItem
            {
                ProductId = i.ProductId,
                ProductName = i.ProductName,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                DiscountAmount = i.DiscountAmount,
                LineTotal = i.LineTotal,
                PromotionId = i.PromotionId,
                PromotionDiscountAmount = i.PromotionDiscountAmount,
                PricingRuleSnapshot = i.PricingRuleSnapshot
            }).ToList(),
            Promotions = responsePromotions.Select(p => new PricingSnapshotPromotion
            {
                PromotionId = p.PromotionId,
                PromotionCode = p.PromotionCode,
                PromotionName = p.PromotionName,
                DiscountAmount = p.DiscountAmount,
                RequiresApproval = p.RequiresApproval
            }).ToList()
        };

        _snapshots[snapshot.SnapshotId] = snapshot;
        CleanupExpiredSnapshots();

        return new PricingPreviewResponseDto
        {
            PricingSnapshotId = snapshotId,
            SubTotal = subTotal,
            TaxAmount = taxAmount,
            DiscountAmount = discountAmount,
            TotalAmount = totalAmount,
            RequiresApproval = requiresApproval,
            Items = responseItems,
            AppliedPromotions = responsePromotions,
            Warnings = warnings
        };
    }

    public bool TryGetSnapshot(string snapshotId, out PricingSnapshot snapshot)
    {
        CleanupExpiredSnapshots();
        if (_snapshots.TryGetValue(snapshotId, out var existing) && existing.ExpiresAtUtc > DateTime.UtcNow)
        {
            snapshot = existing;
            return true;
        }

        snapshot = null!;
        return false;
    }

    public bool TryApproveSnapshot(
        string snapshotId,
        long approvedByUserId,
        string? note,
        out PricingApprovalRecord? approval,
        out string? error)
    {
        approval = null;
        error = null;

        if (!TryGetSnapshot(snapshotId, out var snapshot))
        {
            error = "Pricing snapshot not found or expired.";
            return false;
        }

        if (!snapshot.RequiresApproval)
        {
            error = "Pricing snapshot does not require approval.";
            return false;
        }

        snapshot.ApprovedByUserId = approvedByUserId;
        snapshot.ApprovedAtUtc = DateTime.UtcNow;
        snapshot.ApprovalNote = string.IsNullOrWhiteSpace(note) ? null : note.Trim();

        approval = new PricingApprovalRecord
        {
            PricingSnapshotId = snapshot.SnapshotId,
            ApprovedByUserId = approvedByUserId,
            ApprovedAtUtc = snapshot.ApprovedAtUtc.Value,
            Note = snapshot.ApprovalNote
        };

        return true;
    }

    public void RemoveSnapshot(string snapshotId)
    {
        _snapshots.TryRemove(snapshotId, out _);
    }

    private static bool IsBasketPromotion(Promotion promotion)
    {
        return string.Equals(promotion.AppliesTo, "basket", StringComparison.OrdinalIgnoreCase)
            || string.Equals(promotion.PromotionType, "basket", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsPromotionEligibleForBasket(Promotion promotion, decimal basketAmount)
    {
        if (!IsWithinUsageLimit(promotion))
        {
            return false;
        }

        if (promotion.MinBasketAmount.HasValue && basketAmount < promotion.MinBasketAmount.Value)
        {
            return false;
        }

        return IsQualifierSatisfied(promotion.PromotionQualifiers, basketAmount, 1);
    }

    private static bool IsPromotionEligibleForItem(Promotion promotion, Product product, int quantity, decimal baseLineTotal)
    {
        if (!IsWithinUsageLimit(promotion))
        {
            return false;
        }

        if (promotion.MinBasketAmount.HasValue && baseLineTotal < promotion.MinBasketAmount.Value)
        {
            return false;
        }

        if (promotion.TargetProductId.HasValue && promotion.TargetProductId.Value != product.Productid)
        {
            return false;
        }

        if (promotion.TargetCategoryId.HasValue && promotion.TargetCategoryId.Value != product.Categoryid)
        {
            return false;
        }

        var appliesTo = promotion.AppliesTo?.Trim();
        if (!string.IsNullOrWhiteSpace(appliesTo)
            && !appliesTo.Equals("item", StringComparison.OrdinalIgnoreCase)
            && !appliesTo.Equals("all", StringComparison.OrdinalIgnoreCase)
            && !appliesTo.Equals("product", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return IsQualifierSatisfied(promotion.PromotionQualifiers, baseLineTotal, quantity);
    }

    private static bool IsWithinUsageLimit(Promotion promotion)
    {
        return !promotion.UsageLimit.HasValue || promotion.UsageCount < promotion.UsageLimit.Value;
    }

    private static bool IsPromotionWithinWindow(Promotion promotion, DateTime now)
    {
        if (promotion.StartsAt > now)
        {
            return false;
        }

        if (promotion.EndsAt.HasValue && promotion.EndsAt.Value < now)
        {
            return false;
        }

        return true;
    }

    private static bool IsQualifierSatisfied(IEnumerable<PromotionQualifier> qualifiers, decimal amount, int quantity)
    {
        foreach (var qualifier in qualifiers)
        {
            var qType = qualifier.QualifierType?.Trim().ToLowerInvariant();
            var qOperator = qualifier.QualifierOperator?.Trim().ToLowerInvariant();
            var qValue = qualifier.QualifierValue?.Trim();

            if (string.IsNullOrWhiteSpace(qType) || string.IsNullOrWhiteSpace(qOperator) || string.IsNullOrWhiteSpace(qValue))
            {
                continue;
            }

            switch (qType)
            {
                case "min_quantity":
                    if (!int.TryParse(qValue, out var minQty) || !Compare(quantity, minQty, qOperator))
                    {
                        return false;
                    }

                    break;
                case "min_amount":
                case "min_basket":
                case "min_line_amount":
                    if (!decimal.TryParse(qValue, out var minAmount) || !Compare(amount, minAmount, qOperator))
                    {
                        return false;
                    }

                    break;
            }
        }

        return true;
    }

    private static bool Compare(decimal left, decimal right, string op)
    {
        return op switch
        {
            ">" => left > right,
            ">=" => left >= right,
            "<" => left < right,
            "<=" => left <= right,
            "=" => left == right,
            "==" => left == right,
            "!=" => left != right,
            _ => false
        };
    }

    private static bool Compare(int left, int right, string op)
    {
        return op switch
        {
            ">" => left > right,
            ">=" => left >= right,
            "<" => left < right,
            "<=" => left <= right,
            "=" => left == right,
            "==" => left == right,
            "!=" => left != right,
            _ => false
        };
    }

    private static Promotion? SelectBestItemPromotion(List<Promotion> eligiblePromotions, decimal baseLineTotal, out decimal discount)
    {
        discount = 0;
        if (eligiblePromotions.Count == 0)
        {
            return null;
        }

        var ranked = eligiblePromotions
            .Select(p => new
            {
                Promotion = p,
                Discount = CalculateDiscountAmount(p, baseLineTotal)
            })
            .Where(x => x.Discount > 0)
            .OrderByDescending(x => x.Discount)
            .ThenBy(x => x.Promotion.PromotionId)
            .ToList();

        if (ranked.Count == 0)
        {
            return null;
        }

        var selected = ranked.First();
        discount = selected.Discount;
        return selected.Promotion;
    }

    private static decimal CalculateDiscountAmount(Promotion promotion, decimal amount)
    {
        if (amount <= 0)
        {
            return 0;
        }

        var valueType = promotion.ValueType?.Trim().ToLowerInvariant();
        decimal discount = valueType switch
        {
            "percent" or "percentage" => amount * (promotion.ValueAmount / 100m),
            "fixed" or "amount" => promotion.ValueAmount,
            _ => 0
        };

        if (promotion.MaxDiscountAmount.HasValue && discount > promotion.MaxDiscountAmount.Value)
        {
            discount = promotion.MaxDiscountAmount.Value;
        }

        if (discount > amount)
        {
            discount = amount;
        }

        return Round(discount);
    }

    private static void UpsertPromotionResult(
        List<PricingPreviewPromotionResultDto> results,
        Promotion promotion,
        decimal discount)
    {
        if (discount <= 0)
        {
            return;
        }

        var existing = results.FirstOrDefault(r => r.PromotionId == promotion.PromotionId);
        if (existing == null)
        {
            results.Add(new PricingPreviewPromotionResultDto
            {
                PromotionId = promotion.PromotionId,
                PromotionCode = promotion.PromotionCode,
                PromotionName = promotion.Name,
                DiscountAmount = discount,
                RequiresApproval = promotion.RequiresApproval
            });
            return;
        }

        existing.DiscountAmount = Round(existing.DiscountAmount + discount);
    }

    private void CleanupExpiredSnapshots()
    {
        var now = DateTime.UtcNow;
        foreach (var snapshot in _snapshots.Where(s => s.Value.ExpiresAtUtc <= now).ToList())
        {
            _snapshots.TryRemove(snapshot.Key, out _);
        }
    }

    private static decimal Round(decimal value) => Math.Round(value, 2, MidpointRounding.AwayFromZero);
}
