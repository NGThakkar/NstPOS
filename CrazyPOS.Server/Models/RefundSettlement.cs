#nullable disable
using System;

namespace CrazyPOS.Server.Models;

public partial class RefundSettlement
{
    public long RefundSettlementId { get; set; }

    public long ReturnId { get; set; }

    public string RefundMethod { get; set; }

    public decimal Amount { get; set; }

    public string SettlementStatus { get; set; }

    public string PaymentReference { get; set; }

    public long? ProcessedByUserId { get; set; }

    public DateTime? ProcessedAt { get; set; }

    public string Notes { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual SalesReturn SalesReturn { get; set; }

    public virtual User ProcessedByUser { get; set; }
}
