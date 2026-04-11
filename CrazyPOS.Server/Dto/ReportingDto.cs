namespace CrazyPOS.Server.Dto;

public class HourlySalesPointDto
{
    public int Hour { get; set; }
    public decimal TotalSales { get; set; }
    public int TransactionCount { get; set; }
    public decimal AverageTransaction { get; set; }
}

public class CashierPerformanceDto
{
    public long UserId { get; set; }
    public string CashierName { get; set; } = string.Empty;
    public int TransactionCount { get; set; }
    public decimal TotalSales { get; set; }
    public decimal TotalDiscount { get; set; }
    public decimal AverageTransaction { get; set; }
}

public class CategoryPerformanceDto
{
    public long CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public int QuantitySold { get; set; }
    public decimal TotalRevenue { get; set; }
    public decimal RevenueSharePercent { get; set; }
}

public class ProductPerformanceDto
{
    public long ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int QuantitySold { get; set; }
    public decimal TotalRevenue { get; set; }
}

public class PaymentMethodPerformanceDto
{
    public string PaymentMethod { get; set; } = string.Empty;
    public int TransactionCount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal TransactionSharePercent { get; set; }
}

public class TopPerformersDto
{
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public IReadOnlyList<ProductPerformanceDto> TopProducts { get; set; } = Array.Empty<ProductPerformanceDto>();
    public IReadOnlyList<CashierPerformanceDto> TopCashiers { get; set; } = Array.Empty<CashierPerformanceDto>();
    public IReadOnlyList<CategoryPerformanceDto> TopCategories { get; set; } = Array.Empty<CategoryPerformanceDto>();
}

public class PagedResultDto<T>
{
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public IReadOnlyList<T> Items { get; set; } = Array.Empty<T>();
}