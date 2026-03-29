#nullable disable
using System;

namespace CrazyPOS.Server.Models;

public partial class Promotion
{
    public long PromotionId { get; set; }

    public string PromotionCode { get; set; }

    public string Name { get; set; }

    public string Description { get; set; }

    public string PromotionType { get; set; }

    public string ValueType { get; set; }

    public decimal ValueAmount { get; set; }

    public decimal? MaxDiscountAmount { get; set; }

    public decimal? MinBasketAmount { get; set; }

    public string AppliesTo { get; set; }

    public long? TargetCategoryId { get; set; }

    public long? TargetProductId { get; set; }

    public bool Stackable { get; set; }

    public bool RequiresApproval { get; set; }

    public DateTime StartsAt { get; set; }

    public DateTime? EndsAt { get; set; }

    public int? UsageLimit { get; set; }

    public int UsageCount { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public long CreatedBy { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public long? UpdatedBy { get; set; }

    public virtual ICollection<PromotionQualifier> PromotionQualifiers { get; set; } = new List<PromotionQualifier>();

    public virtual ICollection<TransactionPromotion> TransactionPromotions { get; set; } = new List<TransactionPromotion>();
}
