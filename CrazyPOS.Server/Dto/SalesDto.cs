namespace CrazyPOS.Server.Dto
{
    public class SalesTransactionDto
    {
        public long TransactionId { get; set; }
        public string TransactionCode { get; set; }
        public long UserId { get; set; }
        public DateTime TransactionDate { get; set; }
        public decimal SubTotal { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public string PaymentMethod { get; set; }
        public decimal? AmountTendered { get; set; }
        public decimal? ChangeAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public string Notes { get; set; }
        public string Status { get; set; }
        public List<TransactionItemDto> Items { get; set; }
    }

    public class TransactionItemDto
    {
        public long ItemId { get; set; }
        public long ProductId { get; set; }
        public string ProductName { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal DiscountPercent { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal LineTotal { get; set; }
    }

    public class CreateSalesTransactionDto
    {
        public List<CreateTransactionItemDto> Items { get; set; }
        public decimal SubTotal { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public string PaymentMethod { get; set; }
        public decimal? AmountTendered { get; set; }
        public decimal DiscountAmount { get; set; }
        public string Notes { get; set; }
    }

    public class CreateTransactionItemDto
    {
        public long ProductId { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal DiscountPercent { get; set; }
        public decimal DiscountAmount { get; set; }
    }

    public class BarcodeSearchDto
    {
        public long ProductId { get; set; }
        public string ProductName { get; set; }
        public string Barcode { get; set; }
        public decimal Price { get; set; }
        public int Stock { get; set; }
        public bool Found { get; set; }
    }

    public class DailySalesReportDto
    {
        public DateTime Date { get; set; }
        public decimal TotalSales { get; set; }
        public decimal TotalTax { get; set; }
        public decimal TotalDiscount { get; set; }
        public int TransactionCount { get; set; }
        public int ItemsSold { get; set; }
        public decimal AverageTransaction { get; set; }
    }

    public class PaymentMethodDto
    {
        public long PaymentMethodId { get; set; }
        public string MethodName { get; set; }
        public string Description { get; set; }
        public bool IsActive { get; set; }
    }
}
