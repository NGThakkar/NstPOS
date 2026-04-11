#nullable disable
using System;

namespace CrazyPOS.Server.Models;

public partial class ReturnItem
{
    public long ReturnItemId { get; set; }

    public long ReturnId { get; set; }

    public long OriginalTransactionItemId { get; set; }

    public long ProductId { get; set; }

    public int Quantity { get; set; }

    public decimal UnitPrice { get; set; }

    public decimal DiscountReversal { get; set; }

    public decimal TaxReversal { get; set; }

    public decimal RefundLineTotal { get; set; }

    public string InventoryDisposition { get; set; }

    public string DispositionNotes { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual SalesReturn SalesReturn { get; set; }

    public virtual TransactionItem OriginalTransactionItem { get; set; }

    public virtual Product Product { get; set; }
}
