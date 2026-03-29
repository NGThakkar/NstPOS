using CrazyPOS.Server.Dto;
using CrazyPOS.Server.Models;
using CrazyPOS.Server.Services.Pricing;
using Microsoft.EntityFrameworkCore;

namespace CrazyPOS.Server.Tests;

public class PricingEngineTests
{
    [Fact]
    public async Task PreviewPricing_AppliesItemAndBasketDiscounts()
    {
        await using var db = CreateDbContext(nameof(PreviewPricing_AppliesItemAndBasketDiscounts));
        SeedProduct(db, productId: 101, categoryId: 10, price: 100m);

        db.Promotions.Add(new Promotion
        {
            PromotionId = 1001,
            Name = "Item 10%",
            PromotionType = "item",
            ValueType = "percent",
            ValueAmount = 10m,
            AppliesTo = "item",
            IsActive = true,
            StartsAt = DateTime.SpecifyKind(DateTime.Now.AddHours(-1), DateTimeKind.Unspecified),
            EndsAt = DateTime.SpecifyKind(DateTime.Now.AddHours(1), DateTimeKind.Unspecified),
            CreatedAt = DateTime.UtcNow,
            CreatedBy = 1
        });

        db.Promotions.Add(new Promotion
        {
            PromotionId = 1002,
            Name = "Basket 5",
            PromotionType = "basket",
            ValueType = "fixed",
            ValueAmount = 5m,
            AppliesTo = "basket",
            IsActive = true,
            StartsAt = DateTime.SpecifyKind(DateTime.Now.AddHours(-1), DateTimeKind.Unspecified),
            EndsAt = DateTime.SpecifyKind(DateTime.Now.AddHours(1), DateTimeKind.Unspecified),
            CreatedAt = DateTime.UtcNow,
            CreatedBy = 1
        });

        await db.SaveChangesAsync();

        var engine = new PricingEngine();
        var preview = await engine.PreviewPricingAsync(
            db,
            new PricingPreviewRequestDto
            {
                Items = new List<PricingPreviewItemDto>
                {
                    new() { ProductId = 101, Quantity = 2 }
                },
                RequestedPromotionIds = new List<long> { 1001, 1002 }
            },
            userId: 99);

        Assert.Equal(200m, preview.SubTotal);
        Assert.Equal(25m, preview.DiscountAmount);
        Assert.Equal(15.31m, preview.TaxAmount);
        Assert.Equal(190.31m, preview.TotalAmount);
        Assert.False(string.IsNullOrWhiteSpace(preview.PricingSnapshotId));
        Assert.Equal(2, preview.AppliedPromotions.Count);

        Assert.True(engine.TryGetSnapshot(preview.PricingSnapshotId, out var snapshot));
        Assert.Single(snapshot.Items);
        Assert.Equal(2, snapshot.Promotions.Count);
    }

    [Fact]
    public async Task PreviewPricing_RequiresApprovalAndCanBeApproved()
    {
        await using var db = CreateDbContext(nameof(PreviewPricing_RequiresApprovalAndCanBeApproved));
        SeedProduct(db, productId: 202, categoryId: 20, price: 50m);

        db.Promotions.Add(new Promotion
        {
            PromotionId = 2001,
            Name = "Manager Discount",
            PromotionType = "item",
            ValueType = "fixed",
            ValueAmount = 10m,
            AppliesTo = "item",
            RequiresApproval = true,
            IsActive = true,
            StartsAt = DateTime.SpecifyKind(DateTime.Now.AddHours(-1), DateTimeKind.Unspecified),
            EndsAt = DateTime.SpecifyKind(DateTime.Now.AddHours(1), DateTimeKind.Unspecified),
            CreatedAt = DateTime.UtcNow,
            CreatedBy = 1
        });

        await db.SaveChangesAsync();

        var engine = new PricingEngine();
        var preview = await engine.PreviewPricingAsync(
            db,
            new PricingPreviewRequestDto
            {
                Items = new List<PricingPreviewItemDto>
                {
                    new() { ProductId = 202, Quantity = 1 }
                },
                RequestedPromotionIds = new List<long> { 2001 }
            },
            userId: 44);

        Assert.True(preview.RequiresApproval);

        var approved = engine.TryApproveSnapshot(
            preview.PricingSnapshotId,
            approvedByUserId: 7,
            note: "Manager override",
            out var approval,
            out var error);

        Assert.True(approved);
        Assert.Null(error);
        Assert.NotNull(approval);
        Assert.Equal(7, approval!.ApprovedByUserId);
    }

    [Fact]
    public async Task PreviewPricing_ThrowsForUnknownProduct()
    {
        await using var db = CreateDbContext(nameof(PreviewPricing_ThrowsForUnknownProduct));
        var engine = new PricingEngine();

        await Assert.ThrowsAsync<ArgumentException>(() =>
            engine.PreviewPricingAsync(
                db,
                new PricingPreviewRequestDto
                {
                    Items = new List<PricingPreviewItemDto>
                    {
                        new() { ProductId = 9999, Quantity = 1 }
                    }
                },
                userId: 1));
    }

    [Fact]
    public async Task PreviewPricing_AppliesActiveCouponCode()
    {
        await using var db = CreateDbContext(nameof(PreviewPricing_AppliesActiveCouponCode));
        SeedProduct(db, productId: 301, categoryId: 30, price: 100m);

        db.Promotions.Add(new Promotion
        {
            PromotionId = 3001,
            PromotionCode = "COD1",
            Name = "Coupon Discount",
            PromotionType = "item",
            ValueType = "percent",
            ValueAmount = 5m,
            AppliesTo = "all",
            IsActive = true,
            StartsAt = DateTime.SpecifyKind(DateTime.Now.AddMinutes(-10), DateTimeKind.Unspecified),
            EndsAt = DateTime.SpecifyKind(DateTime.Now.AddMinutes(60), DateTimeKind.Unspecified),
            CreatedAt = DateTime.UtcNow,
            CreatedBy = 1
        });

        await db.SaveChangesAsync();

        var engine = new PricingEngine();
        var preview = await engine.PreviewPricingAsync(
            db,
            new PricingPreviewRequestDto
            {
                Items = new List<PricingPreviewItemDto>
                {
                    new() { ProductId = 301, Quantity = 1 }
                },
                CouponCode = "cod1"
            },
            userId: 5);

        Assert.Equal(5m, preview.DiscountAmount);
        Assert.Empty(preview.Warnings);
        Assert.Contains(preview.AppliedPromotions, p => p.PromotionCode == "COD1");
    }

    [Fact]
    public async Task PreviewPricing_ReturnsWarningForExpiredCouponCode()
    {
        await using var db = CreateDbContext(nameof(PreviewPricing_ReturnsWarningForExpiredCouponCode));
        SeedProduct(db, productId: 302, categoryId: 31, price: 50m);

        db.Promotions.Add(new Promotion
        {
            PromotionId = 3002,
            PromotionCode = "EXPIRED1",
            Name = "Expired Coupon",
            PromotionType = "item",
            ValueType = "fixed",
            ValueAmount = 3m,
            AppliesTo = "all",
            IsActive = true,
            StartsAt = DateTime.SpecifyKind(DateTime.Now.AddDays(-2), DateTimeKind.Unspecified),
            EndsAt = DateTime.SpecifyKind(DateTime.Now.AddMinutes(-1), DateTimeKind.Unspecified),
            CreatedAt = DateTime.UtcNow,
            CreatedBy = 1
        });

        await db.SaveChangesAsync();

        var engine = new PricingEngine();
        var preview = await engine.PreviewPricingAsync(
            db,
            new PricingPreviewRequestDto
            {
                Items = new List<PricingPreviewItemDto>
                {
                    new() { ProductId = 302, Quantity = 1 }
                },
                CouponCode = "EXPIRED1"
            },
            userId: 6);

        Assert.Equal(0m, preview.DiscountAmount);
        Assert.Contains("Coupon code is invalid or inactive.", preview.Warnings);
        Assert.Empty(preview.AppliedPromotions);
    }

    [Fact]
    public async Task PreviewPricing_ReturnsWarningForInvalidCouponCode()
    {
        await using var db = CreateDbContext(nameof(PreviewPricing_ReturnsWarningForInvalidCouponCode));
        SeedProduct(db, productId: 303, categoryId: 31, price: 75m);
        await db.SaveChangesAsync();

        var engine = new PricingEngine();
        var preview = await engine.PreviewPricingAsync(
            db,
            new PricingPreviewRequestDto
            {
                Items = new List<PricingPreviewItemDto>
                {
                    new() { ProductId = 303, Quantity = 1 }
                },
                CouponCode = "NO-SUCH-CODE"
            },
            userId: 7);

        Assert.Equal(0m, preview.DiscountAmount);
        Assert.Contains("Coupon code is invalid or inactive.", preview.Warnings);
    }

    [Fact]
    public async Task PreviewPricing_AppliesOverlappingItemAndBasketPromotions()
    {
        await using var db = CreateDbContext(nameof(PreviewPricing_AppliesOverlappingItemAndBasketPromotions));
        SeedProduct(db, productId: 304, categoryId: 32, price: 120m);

        db.Promotions.AddRange(
            new Promotion
            {
                PromotionId = 3003,
                PromotionCode = "ITEM10",
                Name = "Item 10%",
                PromotionType = "item",
                ValueType = "percent",
                ValueAmount = 10m,
                AppliesTo = "item",
                IsActive = true,
                StartsAt = DateTime.SpecifyKind(DateTime.Now.AddHours(-1), DateTimeKind.Unspecified),
                EndsAt = DateTime.SpecifyKind(DateTime.Now.AddHours(1), DateTimeKind.Unspecified),
                CreatedAt = DateTime.UtcNow,
                CreatedBy = 1
            },
            new Promotion
            {
                PromotionId = 3004,
                PromotionCode = "BASKET5",
                Name = "Basket 5",
                PromotionType = "basket",
                ValueType = "fixed",
                ValueAmount = 5m,
                AppliesTo = "basket",
                IsActive = true,
                StartsAt = DateTime.SpecifyKind(DateTime.Now.AddHours(-1), DateTimeKind.Unspecified),
                EndsAt = DateTime.SpecifyKind(DateTime.Now.AddHours(1), DateTimeKind.Unspecified),
                CreatedAt = DateTime.UtcNow,
                CreatedBy = 1
            });

        await db.SaveChangesAsync();

        var engine = new PricingEngine();
        var preview = await engine.PreviewPricingAsync(
            db,
            new PricingPreviewRequestDto
            {
                Items = new List<PricingPreviewItemDto>
                {
                    new() { ProductId = 304, Quantity = 1 }
                },
                RequestedPromotionIds = new List<long> { 3003, 3004 }
            },
            userId: 8);

        Assert.Equal(17m, preview.DiscountAmount);
        Assert.Equal(2, preview.AppliedPromotions.Count);
        Assert.DoesNotContain("Coupon code is invalid or inactive.", preview.Warnings);
    }

    private static crazypos_devContext CreateDbContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<crazypos_devContext>()
            .UseInMemoryDatabase(dbName)
            .Options;

        return new crazypos_devContext(options);
    }

    private static void SeedProduct(crazypos_devContext db, long productId, long categoryId, decimal price)
    {
        db.Products.Add(new Product
        {
            Productid = productId,
            Categoryid = categoryId,
            Name = $"Product-{productId}",
            Price = price,
            Stock = 100
        });
    }
}
