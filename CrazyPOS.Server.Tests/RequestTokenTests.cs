using CrazyPOS.Server.Auth;
using CrazyPOS.Server.Models;
using CrazyPOS.Server.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CrazyPOS.Server.Tests;

/// <summary>
/// Unit tests for <see cref="RequestTokenService"/> covering the token lifecycle:
/// issuance, valid single-use consumption, replay rejection, expiry, session binding,
/// and forgery resistance.
///
/// Uses EF Core InMemory provider.  Concurrent-consume atomicity (DbUpdateConcurrencyException
/// path) is production-only behaviour enforced by SQL Server row locking; that scenario
/// requires integration tests against a real database.
/// </summary>
public class RequestTokenTests
{
    // ── helpers ──────────────────────────────────────────────────────────────

    private static IDbContextFactory<crazypos_devContext> CreateFactory(string dbName)
    {
        var options = new DbContextOptionsBuilder<crazypos_devContext>()
            .UseInMemoryDatabase(dbName)
            .Options;
        return new TestDbContextFactory(options);
    }

    private static IRequestTokenService CreateService(
        IDbContextFactory<crazypos_devContext> factory,
        SecuritySettings? settings = null)
    {
        var s = settings ?? new SecuritySettings
        {
            EnforcePerRequestTokens = true,
            RequestTokenTTLSeconds = 30,
        };
        return new RequestTokenService(factory, Options.Create(s));
    }

    private sealed class TestDbContextFactory(DbContextOptions<crazypos_devContext> options)
        : IDbContextFactory<crazypos_devContext>
    {
        public crazypos_devContext CreateDbContext() => new(options);
        public Task<crazypos_devContext> CreateDbContextAsync(CancellationToken ct = default)
            => Task.FromResult(new crazypos_devContext(options));
    }

    // ── issuance ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task IssueAsync_ReturnsNonEmptyToken()
    {
        var svc = CreateService(CreateFactory(nameof(IssueAsync_ReturnsNonEmptyToken)));
        var token = await svc.IssueAsync(sessionId: 42);
        Assert.False(string.IsNullOrEmpty(token));
    }

    [Fact]
    public async Task IssueAsync_TwoCallsReturnDistinctTokens()
    {
        var svc = CreateService(CreateFactory(nameof(IssueAsync_TwoCallsReturnDistinctTokens)));
        var t1 = await svc.IssueAsync(sessionId: 1);
        var t2 = await svc.IssueAsync(sessionId: 1);
        Assert.NotEqual(t1, t2);
    }

    // ── valid consumption ─────────────────────────────────────────────────────

    [Fact]
    public async Task ValidateAndConsumeAsync_FreshToken_ReturnsTrue()
    {
        var svc = CreateService(CreateFactory(nameof(ValidateAndConsumeAsync_FreshToken_ReturnsTrue)));
        var token = await svc.IssueAsync(sessionId: 1);
        Assert.True(await svc.ValidateAndConsumeAsync(token, sessionId: 1));
    }

    [Fact]
    public async Task ValidateAndConsumeAsync_MultipleDistinctTokens_EachConsumedOnce()
    {
        var svc = CreateService(CreateFactory(nameof(ValidateAndConsumeAsync_MultipleDistinctTokens_EachConsumedOnce)));
        var t1 = await svc.IssueAsync(sessionId: 1);
        var t2 = await svc.IssueAsync(sessionId: 1);

        Assert.True(await svc.ValidateAndConsumeAsync(t1, sessionId: 1));
        Assert.True(await svc.ValidateAndConsumeAsync(t2, sessionId: 1));
    }

    // ── replay protection ─────────────────────────────────────────────────────

    [Fact]
    public async Task ValidateAndConsumeAsync_ReplayAttack_SecondUseRejected()
    {
        var svc = CreateService(CreateFactory(nameof(ValidateAndConsumeAsync_ReplayAttack_SecondUseRejected)));
        var token = await svc.IssueAsync(sessionId: 1);

        var firstResult = await svc.ValidateAndConsumeAsync(token, sessionId: 1);
        var replayResult = await svc.ValidateAndConsumeAsync(token, sessionId: 1);

        Assert.True(firstResult,  "first use should succeed");
        Assert.False(replayResult, "replay attempt must be rejected");
    }

    [Fact]
    public async Task ValidateAndConsumeAsync_ReplayAfterBothTokensConsumed_BothRejected()
    {
        var svc = CreateService(CreateFactory(nameof(ValidateAndConsumeAsync_ReplayAfterBothTokensConsumed_BothRejected)));
        var t1 = await svc.IssueAsync(sessionId: 1);
        var t2 = await svc.IssueAsync(sessionId: 1);

        await svc.ValidateAndConsumeAsync(t1, sessionId: 1);
        await svc.ValidateAndConsumeAsync(t2, sessionId: 1);

        Assert.False(await svc.ValidateAndConsumeAsync(t1, sessionId: 1), "t1 replay");
        Assert.False(await svc.ValidateAndConsumeAsync(t2, sessionId: 1), "t2 replay");
    }

    // ── expiry ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task ValidateAndConsumeAsync_ExpiredToken_ReturnsFalse()
    {
        // TTL = -1 seconds → expires 1 second in the past at issue time
        var settings = new SecuritySettings { RequestTokenTTLSeconds = -1, EnforcePerRequestTokens = true };
        var svc = CreateService(CreateFactory(nameof(ValidateAndConsumeAsync_ExpiredToken_ReturnsFalse)), settings);

        var token = await svc.IssueAsync(sessionId: 1);

        Assert.False(await svc.ValidateAndConsumeAsync(token, sessionId: 1));
    }

    // ── forgery resistance ────────────────────────────────────────────────────

    [Fact]
    public async Task ValidateAndConsumeAsync_ForgedToken_ReturnsFalse()
    {
        var svc = CreateService(CreateFactory(nameof(ValidateAndConsumeAsync_ForgedToken_ReturnsFalse)));
        Assert.False(await svc.ValidateAndConsumeAsync("totally-forged-token-value", sessionId: 1));
    }

    [Fact]
    public async Task ValidateAndConsumeAsync_EmptyToken_ReturnsFalse()
    {
        var svc = CreateService(CreateFactory(nameof(ValidateAndConsumeAsync_EmptyToken_ReturnsFalse)));
        Assert.False(await svc.ValidateAndConsumeAsync(string.Empty, sessionId: 1));
    }

    [Fact]
    public async Task ValidateAndConsumeAsync_TokenWithSqlInjectionPayload_ReturnsFalse()
    {
        var svc = CreateService(CreateFactory(nameof(ValidateAndConsumeAsync_TokenWithSqlInjectionPayload_ReturnsFalse)));
        Assert.False(await svc.ValidateAndConsumeAsync("'; DROP TABLE request_tokens; --", sessionId: 1));
    }

    // ── session binding ───────────────────────────────────────────────────────

    [Fact]
    public async Task ValidateAndConsumeAsync_WrongSession_ReturnsFalse()
    {
        var svc = CreateService(CreateFactory(nameof(ValidateAndConsumeAsync_WrongSession_ReturnsFalse)));

        // Token issued for session 1
        var token = await svc.IssueAsync(sessionId: 1);

        // Attempted consumption under session 2 must fail
        Assert.False(await svc.ValidateAndConsumeAsync(token, sessionId: 2));
    }

    [Fact]
    public async Task ValidateAndConsumeAsync_CorrectSessionAfterWrongAttempt_StillSucceeds()
    {
        var svc = CreateService(CreateFactory(nameof(ValidateAndConsumeAsync_CorrectSessionAfterWrongAttempt_StillSucceeds)));
        var token = await svc.IssueAsync(sessionId: 1);

        // Wrong session does NOT consume the token
        var wrongResult = await svc.ValidateAndConsumeAsync(token, sessionId: 999);
        // Correct session can still use it
        var correctResult = await svc.ValidateAndConsumeAsync(token, sessionId: 1);

        Assert.False(wrongResult);
        Assert.True(correctResult);
    }
}
