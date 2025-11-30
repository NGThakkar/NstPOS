#nullable disable
using System;
using System.Collections.Generic;

namespace CrazyPOS.Server.Models;

public partial class Inventory
{
    public long Id { get; set; }

    public long Productid { get; set; }

    public int Quantity { get; set; }

    public string MovementType { get; set; }

    public string Reference { get; set; }

    public DateTime CreatedAt { get; set; }

    public string CreatedBy { get; set; }

    public string Notes { get; set; }

    public virtual Product Product { get; set; }

    public virtual ICollection<InventoryAudit> InventoryAudits { get; set; } = new List<InventoryAudit>();
}
