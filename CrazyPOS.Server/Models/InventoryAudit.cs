#nullable disable
using System;

namespace CrazyPOS.Server.Models;

public partial class InventoryAudit
{
    public long Id { get; set; }

    public long Inventoryid { get; set; }

    public int ChangeAmount { get; set; }

    public DateTime ChangeDate { get; set; }

    public virtual Inventory Inventory { get; set; }
}
