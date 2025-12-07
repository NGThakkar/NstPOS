#nullable disable
using System;

namespace CrazyPOS.Server.Models;

public partial class BarcodeMapping
{
    public long BarcodeId { get; set; }

    public string Barcode { get; set; }

    public long Productid { get; set; }

    public string BarcodeType { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual Product Product { get; set; }
}
