namespace CrazyPOS.Server.Dto
{
    public class ReceiptDto
    {
        public long ReceiptId { get; set; }
        public long TransactionId { get; set; }
        public string ReceiptNumber { get; set; }
        public string RecipientEmail { get; set; }
        public string RecipientPhone { get; set; }
        public int DeliveryMethod { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? SentAt { get; set; }
        public string Status { get; set; }
        public string Notes { get; set; }
    }

    public class CreateReceiptDto
    {
        public long TransactionId { get; set; }
        public string RecipientEmail { get; set; }
        public string RecipientPhone { get; set; }
        public int DeliveryMethod { get; set; } // 0=Print, 1=Email, 2=SMS, 3=WhatsApp
    }

    public class ReceiptDetailDto
    {
        public string BusinessName { get; set; }
        public string BusinessPhone { get; set; }
        public string BusinessEmail { get; set; }
        public string BusinessAddress { get; set; }

        public string ReceiptNumber { get; set; }
        public DateTime TransactionDate { get; set; }
        public string TransactionCode { get; set; }

        public string CustomerName { get; set; }
        public string CustomerPhone { get; set; }
        public string CustomerEmail { get; set; }

        public string CashierName { get; set; }
        public string PaymentMethod { get; set; }

        public List<ReceiptItemDto> Items { get; set; } = new List<ReceiptItemDto>();
        public List<ReceiptPromotionDto> Promotions { get; set; } = new List<ReceiptPromotionDto>();

        public decimal SubTotal { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal AmountTendered { get; set; }
        public decimal ChangeAmount { get; set; }
    }

    public class ReceiptItemDto
    {
        public string ProductName { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal LineTotal { get; set; }
    }

    public class ReceiptPromotionDto
    {
        public long PromotionId { get; set; }
        public string? PromotionCode { get; set; }
        public string PromotionName { get; set; } = string.Empty;
        public decimal DiscountAmount { get; set; }
        public bool RequiresApproval { get; set; }
    }
}
