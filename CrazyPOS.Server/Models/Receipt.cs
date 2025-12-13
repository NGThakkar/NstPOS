#nullable disable
using System;

namespace CrazyPOS.Server.Models;

public partial class Receipt
{
    public long ReceiptId { get; set; }

    public long TransactionId { get; set; }

    public string ReceiptNumber { get; set; }

    public string RecipientEmail { get; set; }

    public string RecipientPhone { get; set; }

    public int DeliveryMethod { get; set; } // 0=Print, 1=Email, 2=SMS, 3=WhatsApp

    public DateTime CreatedAt { get; set; }

    public DateTime? SentAt { get; set; }

    public string Status { get; set; } // Pending, Sent, Failed

    public string Notes { get; set; }

    public virtual SalesTransaction SalesTransaction { get; set; }
}
