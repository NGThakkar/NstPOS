using CrazyPOS.Server.Auth;
using CrazyPOS.Server.Controllers;
using CrazyPOS.Server.Dto;
using CrazyPOS.Server.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrazyPOS.Server.Tests;

public class PromotionControllerDateHandlingTests
{
    [Fact]
    public async Task CreatePromotion_PreservesMidnightAndCrossDayDateTimes()
    {
        var factory = CreateFactory(nameof(CreatePromotion_PreservesMidnightAndCrossDayDateTimes));
        var controller = new PromotionController(factory, new TestCurrentUserService(userId: 77, role: "Manager"));

        var startsAt = new DateTime(2026, 3, 29, 0, 0, 0, DateTimeKind.Unspecified);
        var endsAt = new DateTime(2026, 3, 30, 0, 15, 0, DateTimeKind.Unspecified);

        var result = await controller.CreatePromotion(new CreatePromotionDto
        {
            PromotionCode = "DATE-MIDNIGHT-01",
            Name = "Midnight Promo",
            PromotionType = "basket",
            ValueType = "fixed",
            ValueAmount = 10m,
            AppliesTo = "all",
            StartsAt = startsAt,
            EndsAt = endsAt,
            Qualifiers = new List<PromotionQualifierDto>()
        });

        var ok = Assert.IsType<OkObjectResult>(result);
        var dto = Assert.IsType<PromotionDto>(ok.Value);

        Assert.Equal(startsAt, dto.StartsAt);
        Assert.Equal(DateTimeKind.Unspecified, dto.StartsAt.Kind);
        Assert.Equal(endsAt, dto.EndsAt);
        Assert.Equal(DateTimeKind.Unspecified, dto.EndsAt!.Value.Kind);

        await using var db = await factory.CreateDbContextAsync();
        var saved = await db.Promotions.SingleAsync(p => p.PromotionCode == "DATE-MIDNIGHT-01");

        Assert.Equal(startsAt, saved.StartsAt);
        Assert.Equal(DateTimeKind.Unspecified, saved.StartsAt.Kind);
        Assert.Equal(endsAt, saved.EndsAt);
        Assert.Equal(DateTimeKind.Unspecified, saved.EndsAt!.Value.Kind);
    }

    [Fact]
    public async Task UpdatePromotion_PreservesEditedDateTimes()
    {
        var factory = CreateFactory(nameof(UpdatePromotion_PreservesEditedDateTimes));

        long promotionId;
        await using (var seedDb = await factory.CreateDbContextAsync())
        {
            var seeded = new Promotion
            {
                PromotionCode = "DATE-EDIT-01",
                Name = "Editable Promo",
                PromotionType = "basket",
                ValueType = "percent",
                ValueAmount = 5m,
                AppliesTo = "all",
                StartsAt = new DateTime(2026, 3, 29, 9, 0, 0, DateTimeKind.Unspecified),
                EndsAt = new DateTime(2026, 3, 29, 18, 0, 0, DateTimeKind.Unspecified),
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = 1
            };

            seedDb.Promotions.Add(seeded);
            await seedDb.SaveChangesAsync();
            promotionId = seeded.PromotionId;
        }

        var controller = new PromotionController(factory, new TestCurrentUserService(userId: 88, role: "Manager"));
        var newStart = new DateTime(2026, 4, 1, 23, 55, 0, DateTimeKind.Unspecified);
        var newEnd = new DateTime(2026, 4, 2, 0, 5, 0, DateTimeKind.Unspecified);

        var result = await controller.UpdatePromotion(new UpdatePromotionDto
        {
            PromotionId = promotionId,
            PromotionCode = "DATE-EDIT-01",
            Name = "Editable Promo Updated",
            PromotionType = "basket",
            ValueType = "percent",
            ValueAmount = 7.5m,
            AppliesTo = "all",
            StartsAt = newStart,
            EndsAt = newEnd,
            Qualifiers = new List<PromotionQualifierDto>()
        });

        var ok = Assert.IsType<OkObjectResult>(result);
        var dto = Assert.IsType<PromotionDto>(ok.Value);

        Assert.Equal(newStart, dto.StartsAt);
        Assert.Equal(DateTimeKind.Unspecified, dto.StartsAt.Kind);
        Assert.Equal(newEnd, dto.EndsAt);
        Assert.Equal(DateTimeKind.Unspecified, dto.EndsAt!.Value.Kind);

        await using var db = await factory.CreateDbContextAsync();
        var saved = await db.Promotions.SingleAsync(p => p.PromotionId == promotionId);

        Assert.Equal(newStart, saved.StartsAt);
        Assert.Equal(DateTimeKind.Unspecified, saved.StartsAt.Kind);
        Assert.Equal(newEnd, saved.EndsAt);
        Assert.Equal(DateTimeKind.Unspecified, saved.EndsAt!.Value.Kind);
    }

    [Fact]
    public async Task CreatePromotion_NormalizesUtcKindWithoutClockShift()
    {
        var factory = CreateFactory(nameof(CreatePromotion_NormalizesUtcKindWithoutClockShift));
        var controller = new PromotionController(factory, new TestCurrentUserService(userId: 99, role: "Manager"));

        var utcStart = new DateTime(2026, 3, 29, 10, 30, 0, DateTimeKind.Utc);

        var result = await controller.CreatePromotion(new CreatePromotionDto
        {
            PromotionCode = "DATE-UTC-01",
            Name = "UTC Kind Promo",
            PromotionType = "basket",
            ValueType = "fixed",
            ValueAmount = 3m,
            AppliesTo = "all",
            StartsAt = utcStart,
            EndsAt = null,
            Qualifiers = new List<PromotionQualifierDto>()
        });

        var ok = Assert.IsType<OkObjectResult>(result);
        var dto = Assert.IsType<PromotionDto>(ok.Value);

        Assert.Equal(new DateTime(2026, 3, 29, 10, 30, 0, DateTimeKind.Unspecified), dto.StartsAt);
        Assert.Equal(DateTimeKind.Unspecified, dto.StartsAt.Kind);

        await using var db = await factory.CreateDbContextAsync();
        var saved = await db.Promotions.SingleAsync(p => p.PromotionCode == "DATE-UTC-01");

        Assert.Equal(new DateTime(2026, 3, 29, 10, 30, 0, DateTimeKind.Unspecified), saved.StartsAt);
        Assert.Equal(DateTimeKind.Unspecified, saved.StartsAt.Kind);
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

    private sealed class TestCurrentUserService(long userId, string role) : ICurrentUserService
    {
        public bool IsAuthenticated => true;
        public long UserId => userId;
        public string Username => "test-user";
        public string Role => role;
        public bool IsInRole(string roleName) => string.Equals(role, roleName, StringComparison.OrdinalIgnoreCase);
    }
}
