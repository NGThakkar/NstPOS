using System;

namespace CrazyPOS.Server.Dto
{
    public class InventoryDto
    {
        public long InventoryId { get; set; }
        public long Productid { get; set; }
        public string? ProductName { get; set; }
        public int Quantity { get; set; }
        public string? MovementType { get; set; }
        public string? Reference { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? CreatedBy { get; set; }
        public string? Notes { get; set; }
    }

    public class InventorySummaryDto
    {
        public long Productid { get; set; }
        public string? ProductName { get; set; }
        public int CurrentStock { get; set; }
        public int ReorderLevel { get; set; }
        public int ReorderQuantity { get; set; }
        public string? Status { get; set; }  // "In Stock", "Low Stock", "Out of Stock"
        public decimal? UnitPrice { get; set; }
        public decimal? TotalValue { get; set; }
    }

    public class InventoryMovementDto
    {
        public long Productid { get; set; }
        public int QuantityChange { get; set; }
        public string MovementType { get; set; }  // "Purchase", "Sale", "Adjustment", "Return"
        public string? Reference { get; set; }
        public string? Notes { get; set; }
    }
}
