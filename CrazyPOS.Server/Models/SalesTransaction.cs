#nullable disable
using System;

namespace CrazyPOS.Server.Models;

public partial class SalesTransaction
{
    public long TransactionId { get; set; }

    public string TransactionCode { get; set; }

    public long UserId { get; set; }

    public long? CustomerId { get; set; }

    public DateTime TransactionDate { get; set; }

    public decimal SubTotal { get; set; }

    public decimal TaxAmount { get; set; }

    public decimal TotalAmount { get; set; }

    public string PaymentMethod { get; set; }

    public decimal? AmountTendered { get; set; }

    public decimal? ChangeAmount { get; set; }

    public decimal DiscountAmount { get; set; }

    public decimal RefundedAmount { get; set; }

    public string ReturnStatus { get; set; }

    public string Notes { get; set; }

    public string Status { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User User { get; set; }

    public virtual Customer Customer { get; set; }

    public virtual ICollection<TransactionItem> TransactionItems { get; set; } = new List<TransactionItem>();

    public virtual ICollection<PaymentTenderLog> PaymentTenderLogs { get; set; } = new List<PaymentTenderLog>();

    public virtual ICollection<TransactionPromotion> TransactionPromotions { get; set; } = new List<TransactionPromotion>();

    public virtual ICollection<SalesReturn> SalesReturns { get; set; } = new List<SalesReturn>();
}
