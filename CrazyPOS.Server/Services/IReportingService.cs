using CrazyPOS.Server.Dto;

namespace CrazyPOS.Server.Services;

public interface IReportingService
{
    Task<IReadOnlyList<DailySalesReportDto>> GetDailySalesAsync(DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<HourlySalesPointDto>> GetHourlySalesAsync(DateTime date, CancellationToken cancellationToken = default);
    Task<PagedResultDto<CashierPerformanceDto>> GetCashierPerformanceAsync(DateTime startDate, DateTime endDate, int pageNumber, int pageSize, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CategoryPerformanceDto>> GetCategoryPerformanceAsync(DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ProductPerformanceDto>> GetTopProductsAsync(DateTime startDate, DateTime endDate, int limit, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<PaymentMethodPerformanceDto>> GetPaymentMethodPerformanceAsync(DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default);
    Task<TopPerformersDto> GetTopPerformersAsync(DateTime startDate, DateTime endDate, int limit, CancellationToken cancellationToken = default);
}