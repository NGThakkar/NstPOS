using CrazyPOS.Server.Dto;
using CrazyPOS.Server.Models;
using Microsoft.EntityFrameworkCore;

namespace CrazyPOS.Server.Services;

public class ReportingService : IReportingService
{
    private readonly IDbContextFactory<crazypos_devContext> _dbFactory;

    public ReportingService(IDbContextFactory<crazypos_devContext> dbFactory)
    {
        _dbFactory = dbFactory;
    }

    public async Task<IReadOnlyList<DailySalesReportDto>> GetDailySalesAsync(DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default)
    {
        await using var dbContext = await _dbFactory.CreateDbContextAsync(cancellationToken);
        var rangeStart = startDate.Date;
        var rangeEndExclusive = endDate.Date.AddDays(1);

        var transactions = await dbContext.SalesTransactions
            .AsNoTracking()
            .Where(t => t.Status == "completed"
                        && t.TransactionDate >= rangeStart
                        && t.TransactionDate < rangeEndExclusive)
            .Select(t => new
            {
                Date = t.TransactionDate.Date,
                t.TransactionId,
                t.TotalAmount,
                t.TaxAmount,
                t.DiscountAmount
            })
            .ToListAsync(cancellationToken);

        if (transactions.Count == 0)
        {
            return Array.Empty<DailySalesReportDto>();
        }

        var completedTransactionIdsInRange = dbContext.SalesTransactions
            .AsNoTracking()
            .Where(t => t.Status == "completed"
                        && t.TransactionDate >= rangeStart
                        && t.TransactionDate < rangeEndExclusive)
            .Select(t => t.TransactionId);

        var itemQuantities = await dbContext.TransactionItems
            .AsNoTracking()
            .Join(
                completedTransactionIdsInRange,
                ti => ti.TransactionId,
                transactionId => transactionId,
                (ti, _) => ti)
            .GroupBy(ti => ti.TransactionId)
            .Select(g => new { g.Key, Quantity = g.Sum(x => x.Quantity) })
            .ToListAsync(cancellationToken);

        var quantityLookup = itemQuantities.ToDictionary(x => x.Key, x => x.Quantity);

        return transactions
            .GroupBy(t => t.Date)
            .OrderBy(g => g.Key)
            .Select(g =>
            {
                var itemsSold = g.Sum(t => quantityLookup.TryGetValue(t.TransactionId, out var qty) ? qty : 0);
                var totalSales = g.Sum(t => t.TotalAmount);
                var transactionCount = g.Count();
                return new DailySalesReportDto
                {
                    Date = g.Key,
                    TotalSales = totalSales,
                    TotalTax = g.Sum(t => t.TaxAmount),
                    TotalDiscount = g.Sum(t => t.DiscountAmount),
                    TransactionCount = transactionCount,
                    ItemsSold = itemsSold,
                    AverageTransaction = transactionCount == 0 ? 0 : totalSales / transactionCount
                };
            })
            .ToList();
    }

    public async Task<IReadOnlyList<HourlySalesPointDto>> GetHourlySalesAsync(DateTime date, CancellationToken cancellationToken = default)
    {
        await using var dbContext = await _dbFactory.CreateDbContextAsync(cancellationToken);
        var dayStart = date.Date;
        var dayEnd = dayStart.AddDays(1);

        var rawPoints = await dbContext.SalesTransactions
            .AsNoTracking()
            .Where(t => t.Status == "completed" && t.TransactionDate >= dayStart && t.TransactionDate < dayEnd)
            .GroupBy(t => t.TransactionDate.Hour)
            .Select(g => new HourlySalesPointDto
            {
                Hour = g.Key,
                TotalSales = g.Sum(x => x.TotalAmount),
                TransactionCount = g.Count(),
                AverageTransaction = g.Count() == 0 ? 0 : g.Sum(x => x.TotalAmount) / g.Count()
            })
            .ToListAsync(cancellationToken);

        var byHour = rawPoints.ToDictionary(x => x.Hour, x => x);
        var fullDay = new List<HourlySalesPointDto>(24);
        for (var hour = 0; hour < 24; hour++)
        {
            fullDay.Add(byHour.TryGetValue(hour, out var point)
                ? point
                : new HourlySalesPointDto { Hour = hour, TotalSales = 0, TransactionCount = 0, AverageTransaction = 0 });
        }

        return fullDay;
    }

    public async Task<PagedResultDto<CashierPerformanceDto>> GetCashierPerformanceAsync(DateTime startDate, DateTime endDate, int pageNumber, int pageSize, CancellationToken cancellationToken = default)
    {
        await using var dbContext = await _dbFactory.CreateDbContextAsync(cancellationToken);
        var rangeStart = startDate.Date;
        var rangeEndExclusive = endDate.Date.AddDays(1);

        var query = dbContext.SalesTransactions
            .AsNoTracking()
            .Where(t => t.Status == "completed"
                        && t.TransactionDate >= rangeStart
                        && t.TransactionDate < rangeEndExclusive)
            .Join(
                dbContext.Users.AsNoTracking(),
                t => t.UserId,
                u => u.UserId,
                (t, u) => new { t, u })
            .GroupBy(x => new { x.u.UserId, x.u.FullName })
            .Select(g => new CashierPerformanceDto
            {
                UserId = g.Key.UserId,
                CashierName = g.Key.FullName ?? "Unknown",
                TransactionCount = g.Count(),
                TotalSales = g.Sum(x => x.t.TotalAmount),
                TotalDiscount = g.Sum(x => x.t.DiscountAmount),
                AverageTransaction = g.Count() == 0 ? 0 : g.Sum(x => x.t.TotalAmount) / g.Count()
            })
            .OrderByDescending(x => x.TotalSales);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResultDto<CashierPerformanceDto>
        {
            PageNumber = pageNumber,
            PageSize = pageSize,
            TotalCount = totalCount,
            Items = items
        };
    }

    public async Task<IReadOnlyList<CategoryPerformanceDto>> GetCategoryPerformanceAsync(DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default)
    {
        await using var dbContext = await _dbFactory.CreateDbContextAsync(cancellationToken);
        var rangeStart = startDate.Date;
        var rangeEndExclusive = endDate.Date.AddDays(1);

        var rows = await dbContext.TransactionItems
            .AsNoTracking()
            .Join(
                dbContext.SalesTransactions.AsNoTracking().Where(t => t.Status == "completed"
                                                                      && t.TransactionDate >= rangeStart
                                                                      && t.TransactionDate < rangeEndExclusive),
                ti => ti.TransactionId,
                st => st.TransactionId,
                (ti, st) => ti)
            .Join(
                dbContext.Products.AsNoTracking(),
                ti => ti.Productid,
                p => p.Productid,
                (ti, p) => new { ti, p })
            .Join(
                dbContext.Categories.AsNoTracking(),
                x => x.p.Categoryid,
                c => c.Categoryid,
                (x, c) => new
                {
                    c.Categoryid,
                    CategoryName = c.Name,
                    x.ti.Quantity,
                    x.ti.LineTotal
                })
            .GroupBy(x => new { x.Categoryid, x.CategoryName })
            .Select(g => new
            {
                g.Key.Categoryid,
                g.Key.CategoryName,
                QuantitySold = g.Sum(x => x.Quantity),
                TotalRevenue = g.Sum(x => x.LineTotal)
            })
            .OrderByDescending(x => x.TotalRevenue)
            .ToListAsync(cancellationToken);

        var totalRevenue = rows.Sum(x => x.TotalRevenue);
        return rows
            .Select(x => new CategoryPerformanceDto
            {
                CategoryId = x.Categoryid,
                CategoryName = x.CategoryName,
                QuantitySold = x.QuantitySold,
                TotalRevenue = x.TotalRevenue,
                RevenueSharePercent = totalRevenue == 0 ? 0 : Math.Round((x.TotalRevenue / totalRevenue) * 100m, 2)
            })
            .ToList();
    }

    public async Task<IReadOnlyList<ProductPerformanceDto>> GetTopProductsAsync(DateTime startDate, DateTime endDate, int limit, CancellationToken cancellationToken = default)
    {
        await using var dbContext = await _dbFactory.CreateDbContextAsync(cancellationToken);
        var rangeStart = startDate.Date;
        var rangeEndExclusive = endDate.Date.AddDays(1);

        return await dbContext.TransactionItems
            .AsNoTracking()
            .Join(
                dbContext.SalesTransactions.AsNoTracking().Where(t => t.Status == "completed"
                                                                      && t.TransactionDate >= rangeStart
                                                                      && t.TransactionDate < rangeEndExclusive),
                ti => ti.TransactionId,
                st => st.TransactionId,
                (ti, st) => ti)
            .Join(
                dbContext.Products.AsNoTracking(),
                ti => ti.Productid,
                p => p.Productid,
                (ti, p) => new { ti, p })
            .GroupBy(x => new { x.p.Productid, x.p.Name })
            .Select(g => new ProductPerformanceDto
            {
                ProductId = g.Key.Productid,
                ProductName = g.Key.Name ?? "Unknown product",
                QuantitySold = g.Sum(x => x.ti.Quantity),
                TotalRevenue = g.Sum(x => x.ti.LineTotal)
            })
            .OrderByDescending(x => x.TotalRevenue)
            .Take(limit)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<PaymentMethodPerformanceDto>> GetPaymentMethodPerformanceAsync(DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default)
    {
        await using var dbContext = await _dbFactory.CreateDbContextAsync(cancellationToken);
        var rangeStart = startDate.Date;
        var rangeEndExclusive = endDate.Date.AddDays(1);

        var rows = await dbContext.SalesTransactions
            .AsNoTracking()
            .Where(t => t.Status == "completed"
                        && t.TransactionDate >= rangeStart
                        && t.TransactionDate < rangeEndExclusive)
            .GroupBy(t => t.PaymentMethod)
            .Select(g => new
            {
                PaymentMethod = g.Key,
                TransactionCount = g.Count(),
                TotalAmount = g.Sum(x => x.TotalAmount)
            })
            .OrderByDescending(x => x.TotalAmount)
            .ToListAsync(cancellationToken);

        var totalTransactions = rows.Sum(x => x.TransactionCount);
        return rows.Select(x => new PaymentMethodPerformanceDto
        {
            PaymentMethod = x.PaymentMethod ?? "Unknown",
            TransactionCount = x.TransactionCount,
            TotalAmount = x.TotalAmount,
            TransactionSharePercent = totalTransactions == 0 ? 0 : Math.Round((decimal)x.TransactionCount / totalTransactions * 100m, 2)
        }).ToList();
    }

    public async Task<TopPerformersDto> GetTopPerformersAsync(DateTime startDate, DateTime endDate, int limit, CancellationToken cancellationToken = default)
    {
        var topProducts = await GetTopProductsAsync(startDate, endDate, limit, cancellationToken);
        var topCashiers = await GetCashierPerformanceAsync(startDate, endDate, pageNumber: 1, pageSize: limit, cancellationToken);
        var topCategories = await GetCategoryPerformanceAsync(startDate, endDate, cancellationToken);

        return new TopPerformersDto
        {
            StartDate = startDate.Date,
            EndDate = endDate.Date,
            TopProducts = topProducts,
            TopCashiers = topCashiers.Items,
            TopCategories = topCategories.Take(limit).ToList()
        };
    }
}