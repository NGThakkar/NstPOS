#nullable disable
using System;

namespace CrazyPOS.Server.Models;

public partial class SalesReturn
{
    public long ReturnId { get; set; }

    public string ReturnCode { get; set; }

    public long OriginalTransactionId { get; set; }

    public long? CustomerId { get; set; }

    public long ProcessedByUserId { get; set; }

    public long? ApprovedByUserId { get; set; }

    public DateTime ReturnDate { get; set; }

    public string Status { get; set; }

    public string RefundStatus { get; set; }

    public string ReasonCode { get; set; }

    public string ReasonNotes { get; set; }

    public decimal SubtotalReversal { get; set; }

    public decimal TaxReversal { get; set; }

    public decimal DiscountReversal { get; set; }

    public decimal RefundTotal { get; set; }

    public string Notes { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual SalesTransaction OriginalTransaction { get; set; }

    public virtual Customer Customer { get; set; }

    public virtual User ProcessedByUser { get; set; }

    public virtual User ApprovedByUser { get; set; }

    public virtual ICollection<ReturnItem> ReturnItems { get; set; } = new List<ReturnItem>();

    public virtual ICollection<RefundSettlement> RefundSettlements { get; set; } = new List<RefundSettlement>();
}
