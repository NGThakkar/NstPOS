using CrazyPOS.Server.Dto;
using CrazyPOS.Server.Models;
using CrazyPOS.Server.Services;
using Microsoft.EntityFrameworkCore;

namespace CrazyPOS.Server.Tests;

public class ReportingServiceTests
{
    [Fact]
    public async Task GetDailySalesAsync_ReturnsExpectedAggregates()
    {
        var dbName = nameof(GetDailySalesAsync_ReturnsExpectedAggregates);
        var factory = CreateFactory(dbName);

        await SeedReportingDataAsync(factory);

        var service = new ReportingService(factory);
        var startDate = new DateTime(2026, 4, 10);
        var endDate = new DateTime(2026, 4, 11);

        var report = await service.GetDailySalesAsync(startDate, endDate);

        Assert.Equal(2, report.Count);
        var day1 = report.Single(r => r.Date == new DateTime(2026, 4, 10));
        var day2 = report.Single(r => r.Date == new DateTime(2026, 4, 11));

        Assert.Equal(300m, day1.TotalSales);
        Assert.Equal(2, day1.TransactionCount);
        Assert.Equal(4, day1.ItemsSold);

        Assert.Equal(150m, day2.TotalSales);
        Assert.Equal(1, day2.TransactionCount);
        Assert.Equal(3, day2.ItemsSold);
    }

    [Fact]
    public async Task GetCashierPerformanceAsync_ReturnsPagedResults()
    {
        var dbName = nameof(GetCashierPerformanceAsync_ReturnsPagedResults);
        var factory = CreateFactory(dbName);

        await SeedReportingDataAsync(factory);

        var service = new ReportingService(factory);
        var startDate = new DateTime(2026, 4, 10);
        var endDate = new DateTime(2026, 4, 11);

        var page = await service.GetCashierPerformanceAsync(startDate, endDate, pageNumber: 1, pageSize: 1);

        Assert.Equal(1, page.PageNumber);
        Assert.Equal(1, page.PageSize);
        Assert.Equal(2, page.TotalCount);
        Assert.Single(page.Items);
        Assert.Equal("Manager One", page.Items[0].CashierName);
    }

    private static async Task SeedReportingDataAsync(IDbContextFactory<crazypos_devContext> factory)
    {
        await using var db = await factory.CreateDbContextAsync();

        db.Users.AddRange(
            new User
            {
                UserId = 1,
                Username = "manager1",
                Email = "manager1@test.local",
                PasswordHash = "hash",
                FullName = "Manager One",
                Role = "Manager",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new User
            {
                UserId = 2,
                Username = "cashier1",
                Email = "cashier1@test.local",
                PasswordHash = "hash",
                FullName = "Cashier One",
                Role = "Cashier",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });

        db.Categories.Add(new Category { Categoryid = 10, Name = "Beverages" });
        db.Products.AddRange(
            new Product { Productid = 100, Name = "Coffee", Categoryid = 10, Price = 50m, Stock = 100 },
            new Product { Productid = 101, Name = "Tea", Categoryid = 10, Price = 75m, Stock = 100 });

        db.SalesTransactions.AddRange(
            new SalesTransaction
            {
                TransactionId = 1000,
                TransactionCode = "TXN-1000",
                UserId = 1,
                TransactionDate = new DateTime(2026, 4, 10, 9, 0, 0),
                SubTotal = 100m,
                TaxAmount = 7m,
                TotalAmount = 107m,
                PaymentMethod = "Cash",
                DiscountAmount = 0,
                RefundedAmount = 0,
                ReturnStatus = "none",
                Notes = "",
                Status = "completed",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new SalesTransaction
            {
                TransactionId = 1001,
                TransactionCode = "TXN-1001",
                UserId = 1,
                TransactionDate = new DateTime(2026, 4, 10, 10, 0, 0),
                SubTotal = 193m,
                TaxAmount = 0,
                TotalAmount = 193m,
                PaymentMethod = "Card",
                DiscountAmount = 7m,
                RefundedAmount = 0,
                ReturnStatus = "none",
                Notes = "",
                Status = "completed",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new SalesTransaction
            {
                TransactionId = 1002,
                TransactionCode = "TXN-1002",
                UserId = 2,
                TransactionDate = new DateTime(2026, 4, 11, 11, 0, 0),
                SubTotal = 150m,
                TaxAmount = 0,
                TotalAmount = 150m,
                PaymentMethod = "Card",
                DiscountAmount = 0,
                RefundedAmount = 0,
                ReturnStatus = "none",
                Notes = "",
                Status = "completed",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });

        db.TransactionItems.AddRange(
            new TransactionItem
            {
                ItemId = 1,
                TransactionId = 1000,
                Productid = 100,
                Quantity = 1,
                UnitPrice = 50m,
                DiscountPercent = 0,
                DiscountAmount = 0,
                PromotionDiscountAmount = 0,
                PricingRuleSnapshot = "",
                LineTotal = 50m,
                CreatedAt = DateTime.UtcNow
            },
            new TransactionItem
            {
                ItemId = 2,
                TransactionId = 1000,
                Productid = 101,
                Quantity = 1,
                UnitPrice = 50m,
                DiscountPercent = 0,
                DiscountAmount = 0,
                PromotionDiscountAmount = 0,
                PricingRuleSnapshot = "",
                LineTotal = 50m,
                CreatedAt = DateTime.UtcNow
            },
            new TransactionItem
            {
                ItemId = 3,
                TransactionId = 1001,
                Productid = 101,
                Quantity = 2,
                UnitPrice = 100m,
                DiscountPercent = 3.5m,
                DiscountAmount = 7m,
                PromotionDiscountAmount = 0,
                PricingRuleSnapshot = "",
                LineTotal = 193m,
                CreatedAt = DateTime.UtcNow
            },
            new TransactionItem
            {
                ItemId = 4,
                TransactionId = 1002,
                Productid = 100,
                Quantity = 3,
                UnitPrice = 50m,
                DiscountPercent = 0,
                DiscountAmount = 0,
                PromotionDiscountAmount = 0,
                PricingRuleSnapshot = "",
                LineTotal = 150m,
                CreatedAt = DateTime.UtcNow
            });

        await db.SaveChangesAsync();
    }

    private static IDbContextFactory<crazypos_devContext> CreateFactory(string dbName)
    {
        var options = new DbContextOptionsBuilder<crazypos_devContext>()
            .UseInMemoryDatabase(dbName)
            .Options;

        return new TestDbContextFactory(options);
    }

    private sealed class TestDbContextFactory(DbContextOptions<crazypos_devContext> options)
        : IDbContextFactory<crazypos_devContext>
    {
        public crazypos_devContext CreateDbContext() => new(options);

        public Task<crazypos_devContext> CreateDbContextAsync(CancellationToken cancellationToken = default)
            => Task.FromResult(CreateDbContext());
        }
    }
