namespace CrazyPOS.Server.Dto
{
    public class TransactionPromotionDto
    {
        public long PromotionId { get; set; }
        public string? PromotionCode { get; set; }
        public string PromotionName { get; set; } = string.Empty;
        public decimal DiscountAmount { get; set; }
        public bool RequiresApproval { get; set; }
        public long? ApprovalUserId { get; set; }
        public string? ApprovalNote { get; set; }
    }

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
        public string Cashier { get; set; }
        public List<TransactionItemDto> Items { get; set; }
        public List<TransactionPromotionDto> Promotions { get; set; } = new();
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
        public long? PromotionId { get; set; }
        public decimal PromotionDiscountAmount { get; set; }
        public string? PricingRuleSnapshot { get; set; }
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
        public string? PricingSnapshotId { get; set; }
        public List<long> RequestedPromotionIds { get; set; } = new();
        public string? CouponCode { get; set; }
        public List<AppliedPromotionInputDto> AppliedPromotions { get; set; } = new();
    }

    public class CreateTransactionItemDto
    {
        public long ProductId { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal DiscountPercent { get; set; }
        public decimal DiscountAmount { get; set; }
        public long? PromotionId { get; set; }
    }

    public class AppliedPromotionInputDto
    {
        public long PromotionId { get; set; }
        public long? ApprovalUserId { get; set; }
        public string? ApprovalNote { get; set; }
    }

    public class PricingPreviewRequestDto
    {
        public List<PricingPreviewItemDto> Items { get; set; } = new();
        public List<long> RequestedPromotionIds { get; set; } = new();
        public string? CouponCode { get; set; }
    }

    public class PricingPreviewItemDto
    {
        public long ProductId { get; set; }
        public int Quantity { get; set; }
    }

    public class PricingPreviewResponseDto
    {
        public string PricingSnapshotId { get; set; } = string.Empty;
        public decimal SubTotal { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public bool RequiresApproval { get; set; }
        public List<PricingPreviewItemResultDto> Items { get; set; } = new();
        public List<PricingPreviewPromotionResultDto> AppliedPromotions { get; set; } = new();
        public List<string> Warnings { get; set; } = new();
    }

    public class PricingPreviewItemResultDto
    {
        public long ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal BaseLineTotal { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal LineTotal { get; set; }
        public long? PromotionId { get; set; }
        public decimal PromotionDiscountAmount { get; set; }
        public string? PricingRuleSnapshot { get; set; }
    }

    public class PricingPreviewPromotionResultDto
    {
        public long PromotionId { get; set; }
        public string? PromotionCode { get; set; }
        public string PromotionName { get; set; } = string.Empty;
        public decimal DiscountAmount { get; set; }
        public bool RequiresApproval { get; set; }
    }

    public class ApproveDiscountRequestDto
    {
        public string PricingSnapshotId { get; set; } = string.Empty;
        public string? Note { get; set; }
    }

    public class ApproveDiscountResponseDto
    {
        public string PricingSnapshotId { get; set; } = string.Empty;
        public long ApprovedByUserId { get; set; }
        public DateTime ApprovedAtUtc { get; set; }
        public string? Note { get; set; }
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
