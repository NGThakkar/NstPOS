namespace CrazyPOS.Server.Dto
{
    public class ReturnPreviewRequestDto
    {
        public long OriginalTransactionId { get; set; }
        public string ReasonCode { get; set; } = string.Empty;
        public string? ReasonNotes { get; set; }
        public List<ReturnItemInputDto> Items { get; set; } = new();
    }

    public class ReturnItemInputDto
    {
        public long OriginalTransactionItemId { get; set; }
        public int Quantity { get; set; }
        public string InventoryDisposition { get; set; } = "restock";
        public string? DispositionNotes { get; set; }
    }

    public class ReturnPreviewResponseDto
    {
        public long OriginalTransactionId { get; set; }
        public decimal SubtotalReversal { get; set; }
        public decimal TaxReversal { get; set; }
        public decimal DiscountReversal { get; set; }
        public decimal RefundTotal { get; set; }
        public List<ReturnPreviewItemDto> Items { get; set; } = new();
        public List<string> Warnings { get; set; } = new();
    }

    public class ReturnPreviewItemDto
    {
        public long OriginalTransactionItemId { get; set; }
        public long ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal SubtotalReversal { get; set; }
        public decimal TaxReversal { get; set; }
        public decimal DiscountReversal { get; set; }
        public decimal RefundLineTotal { get; set; }
    }

    public class CreateReturnDto
    {
        public long OriginalTransactionId { get; set; }
        public string ReasonCode { get; set; } = string.Empty;
        public string? ReasonNotes { get; set; }
        public string? Notes { get; set; }
        public string RefundMethod { get; set; } = "cash";
        public bool RequiresManagerApproval { get; set; }
        public List<ReturnItemInputDto> Items { get; set; } = new();
    }

    public class ReturnDetailDto
    {
        public long ReturnId { get; set; }
        public string ReturnCode { get; set; } = string.Empty;
        public long OriginalTransactionId { get; set; }
        public DateTime ReturnDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public string RefundStatus { get; set; } = string.Empty;
        public string ReasonCode { get; set; } = string.Empty;
        public string? ReasonNotes { get; set; }
        public decimal SubtotalReversal { get; set; }
        public decimal TaxReversal { get; set; }
        public decimal DiscountReversal { get; set; }
        public decimal RefundTotal { get; set; }
        public List<ReturnDetailItemDto> Items { get; set; } = new();
        public List<RefundSettlementDto> Settlements { get; set; } = new();
    }

    public class ReturnDetailItemDto
    {
        public long ReturnItemId { get; set; }
        public long OriginalTransactionItemId { get; set; }
        public long ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal DiscountReversal { get; set; }
        public decimal TaxReversal { get; set; }
        public decimal RefundLineTotal { get; set; }
        public string InventoryDisposition { get; set; } = string.Empty;
    }

    public class ReturnSummaryDto
    {
        public long ReturnId { get; set; }
        public string ReturnCode { get; set; } = string.Empty;
        public long OriginalTransactionId { get; set; }
        public DateTime ReturnDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public string RefundStatus { get; set; } = string.Empty;
        public decimal RefundTotal { get; set; }
        public int ItemCount { get; set; }
    }

    public class RefundSettlementDto
    {
        public long RefundSettlementId { get; set; }
        public long ReturnId { get; set; }
        public string RefundMethod { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string SettlementStatus { get; set; } = string.Empty;
        public string? PaymentReference { get; set; }
        public long? ProcessedByUserId { get; set; }
        public DateTime? ProcessedAt { get; set; }
        public string? Notes { get; set; }
    }

    public class UpdateRefundSettlementDto
    {
        public long ReturnId { get; set; }
        public string RefundMethod { get; set; } = "cash";
        public decimal Amount { get; set; }
        public string SettlementStatus { get; set; } = "pending";
        public string? PaymentReference { get; set; }
        public string? Notes { get; set; }
    }
}
