#nullable disable
using System;

namespace CrazyPOS.Server.Models;

public partial class TransactionItem
{
    public long ItemId { get; set; }

    public long TransactionId { get; set; }

    public long Productid { get; set; }

    public int Quantity { get; set; }

    public int ReturnedQuantity { get; set; }

    public decimal UnitPrice { get; set; }

    public decimal DiscountPercent { get; set; }

    public decimal DiscountAmount { get; set; }

    public long? PromotionId { get; set; }

    public decimal PromotionDiscountAmount { get; set; }

    public string PricingRuleSnapshot { get; set; }

    public decimal LineTotal { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual SalesTransaction SalesTransaction { get; set; }

    public virtual Product Product { get; set; }

    public virtual Promotion Promotion { get; set; }

    public virtual ICollection<ReturnItem> ReturnItems { get; set; } = new List<ReturnItem>();
}
