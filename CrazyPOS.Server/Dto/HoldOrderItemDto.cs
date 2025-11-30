namespace CrazyPOS.Server.Dto
{
    public class HoldOrderItemDto
    {
        public long Productid { get; set; }
        public string? ProductName { get; set; }
        public int Quantity { get; set; }
        public decimal Price { get; set; }
        public decimal Total { get; set; }
    }
}
