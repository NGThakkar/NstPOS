#nullable disable
using System;

namespace CrazyPOS.Server.Models;

public partial class TransactionPromotion
{
    public long TransactionPromotionId { get; set; }

    public long TransactionId { get; set; }

    public long PromotionId { get; set; }

    public long? ApprovalUserId { get; set; }

    public string ApprovalNote { get; set; }

    public decimal DiscountAmount { get; set; }

    public DateTime AppliedAt { get; set; }

    public virtual SalesTransaction SalesTransaction { get; set; }

    public virtual Promotion Promotion { get; set; }

    public virtual User ApprovalUser { get; set; }
}
