using CrazyPOS.Server.Dto;

namespace CrazyPOS.Server.Services.Pricing;

public class PricingSnapshot
{
    public string SnapshotId { get; init; } = string.Empty;
    public DateTime CreatedAtUtc { get; init; }
    public DateTime ExpiresAtUtc { get; init; }
    public long CreatedByUserId { get; init; }
    public decimal SubTotal { get; init; }
    public decimal TaxAmount { get; init; }
    public decimal DiscountAmount { get; init; }
    public decimal TotalAmount { get; init; }
    public bool RequiresApproval { get; init; }
    public long? ApprovedByUserId { get; set; }
    public DateTime? ApprovedAtUtc { get; set; }
    public string? ApprovalNote { get; set; }
    public string? CouponCode { get; init; }
    public List<long> RequestedPromotionIds { get; init; } = new();
    public List<PricingSnapshotItem> Items { get; init; } = new();
    public List<PricingSnapshotPromotion> Promotions { get; init; } = new();
}

public class PricingSnapshotItem
{
    public long ProductId { get; init; }
    public string ProductName { get; init; } = string.Empty;
    public int Quantity { get; init; }
    public decimal UnitPrice { get; init; }
    public decimal DiscountAmount { get; init; }
    public decimal LineTotal { get; init; }
    public long? PromotionId { get; init; }
    public decimal PromotionDiscountAmount { get; init; }
    public string? PricingRuleSnapshot { get; init; }
}

public class PricingSnapshotPromotion
{
    public long PromotionId { get; init; }
    public string? PromotionCode { get; init; }
    public string PromotionName { get; init; } = string.Empty;
    public decimal DiscountAmount { get; init; }
    public bool RequiresApproval { get; init; }
}

public class PricingApprovalRecord
{
    public string PricingSnapshotId { get; init; } = string.Empty;
    public long ApprovedByUserId { get; init; }
    public DateTime ApprovedAtUtc { get; init; }
    public string? Note { get; init; }
}

public class PromotionEvaluationResult
{
    public PricingPreviewResponseDto Response { get; init; } = new();
    public PricingSnapshot Snapshot { get; init; } = new();
}
