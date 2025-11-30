namespace CrazyPOS.Server.Dto
{
    public class ProductDto
    {
        public long? Productid { get; set; }

        public string? Name { get; set; }

        public decimal? Price { get; set; }

        public long? Categoryid { get; set; }

        public int? Stock { get; set; }

        public string? Image { get; set; }
        public string? Imgextension { get; set; }

        public string? Barcode { get; set; }

        public string? Description { get; set; }
        public string? CategoryName { get; set; }
    }
}
