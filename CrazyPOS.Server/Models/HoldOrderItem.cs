#nullable disable
using System;

namespace CrazyPOS.Server.Models;

public partial class HoldOrderItem
{
    public long Id { get; set; }

    public long HoldOrderId { get; set; }

    public long Productid { get; set; }

    public int Quantity { get; set; }

    public decimal Price { get; set; }

    public virtual HoldOrder HoldOrder { get; set; }

    public virtual Product Product { get; set; }
}
