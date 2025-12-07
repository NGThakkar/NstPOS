#nullable disable
using System;

namespace CrazyPOS.Server.Models;

public partial class PaymentTenderLog
{
    public long TenderId { get; set; }

    public long TransactionId { get; set; }

    public string PaymentMethod { get; set; }

    public decimal AmountReceived { get; set; }

    public decimal? ChangeReturned { get; set; }

    public string PaymentStatus { get; set; }

    public string PaymentReference { get; set; }

    public string Notes { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual SalesTransaction SalesTransaction { get; set; }
}
