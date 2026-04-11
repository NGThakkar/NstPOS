using CrazyPOS.Server.Controllers;
using CrazyPOS.Server.Dto;
using CrazyPOS.Server.Services;
using Microsoft.AspNetCore.Mvc;

namespace CrazyPOS.Server.Tests;

public class ReportingControllerTests
{
    [Fact]
    public async Task GetDailySales_ReturnsBadRequest_WhenStartAfterEnd()
    {
        var controller = new ReportingController(new FakeReportingService());

        var result = await controller.GetDailySales(
            startDate: new DateTime(2026, 4, 12),
            endDate: new DateTime(2026, 4, 11),
            cancellationToken: CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task GetCashierPerformance_ReturnsBadRequest_WhenPageSizeOutOfRange()
    {
        var controller = new ReportingController(new FakeReportingService());

        var result = await controller.GetCashierPerformance(
            startDate: new DateTime(2026, 4, 10),
            endDate: new DateTime(2026, 4, 11),
            pageNumber: 1,
            pageSize: 0,
            cancellationToken: CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    private sealed class FakeReportingService : IReportingService
    {
        public Task<IReadOnlyList<DailySalesReportDto>> GetDailySalesAsync(DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default)
            => Task.FromResult<IReadOnlyList<DailySalesReportDto>>(Array.Empty<DailySalesReportDto>());

        public Task<IReadOnlyList<HourlySalesPointDto>> GetHourlySalesAsync(DateTime date, CancellationToken cancellationToken = default)
            => Task.FromResult<IReadOnlyList<HourlySalesPointDto>>(Array.Empty<HourlySalesPointDto>());

        public Task<PagedResultDto<CashierPerformanceDto>> GetCashierPerformanceAsync(DateTime startDate, DateTime endDate, int pageNumber, int pageSize, CancellationToken cancellationToken = default)
            => Task.FromResult(new PagedResultDto<CashierPerformanceDto>());

        public Task<IReadOnlyList<CategoryPerformanceDto>> GetCategoryPerformanceAsync(DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default)
            => Task.FromResult<IReadOnlyList<CategoryPerformanceDto>>(Array.Empty<CategoryPerformanceDto>());

        public Task<IReadOnlyList<ProductPerformanceDto>> GetTopProductsAsync(DateTime startDate, DateTime endDate, int limit, CancellationToken cancellationToken = default)
            => Task.FromResult<IReadOnlyList<ProductPerformanceDto>>(Array.Empty<ProductPerformanceDto>());

        public Task<IReadOnlyList<PaymentMethodPerformanceDto>> GetPaymentMethodPerformanceAsync(DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default)
            => Task.FromResult<IReadOnlyList<PaymentMethodPerformanceDto>>(Array.Empty<PaymentMethodPerformanceDto>());

        public Task<TopPerformersDto> GetTopPerformersAsync(DateTime startDate, DateTime endDate, int limit, CancellationToken cancellationToken = default)
            => Task.FromResult(new TopPerformersDto());
    }
}
