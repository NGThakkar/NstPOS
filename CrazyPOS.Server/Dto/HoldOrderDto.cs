using System;
using System.Collections.Generic;

namespace CrazyPOS.Server.Dto
{
    public class HoldOrderDto
    {
        public long Holdorderid { get; set; }
        public string? CustomerName { get; set; }
        public decimal TotalAmount { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string? Status { get; set; }
        public List<HoldOrderItemDto>? Items { get; set; }
    }

    public class CreateHoldOrderDto
    {
        public string? CustomerName { get; set; }
        public decimal TotalAmount { get; set; }
        public List<HoldOrderItemDto>? Items { get; set; }
    }
}
