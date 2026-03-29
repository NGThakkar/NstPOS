using CrazyPOS.Server.Auth;
using CrazyPOS.Server.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Security.Cryptography;
using System.Text;

namespace CrazyPOS.Server.Services;

/// <summary>
/// Production implementation of <see cref="IRequestTokenService"/>.
///
/// Token security properties:
///   - 256-bit entropy (32 random bytes from RandomNumberGenerator)
///   - Only the SHA-256 hash is persisted; plaintext is never stored.
///   - Atomic single-use enforced via EF optimistic concurrency on the UsedAtUtc column
///     ([ConcurrencyCheck] generates "WHERE used_at_utc = @original" on SQL Server,
///     so concurrent duplicate requests cause a DbUpdateConcurrencyException and are rejected).
/// </summary>
public sealed class RequestTokenService(
    IDbContextFactory<crazypos_devContext> dbFactory,
    IOptions<SecuritySettings> settings) : IRequestTokenService
{
    private readonly SecuritySettings _settings = settings.Value;

    public async Task<string> IssueAsync(long sessionId, CancellationToken ct = default)
    {
        var rawBytes = new byte[32];
        RandomNumberGenerator.Fill(rawBytes);
        var plaintext = Convert.ToBase64String(rawBytes);
        var hash = ComputeHash(plaintext);

        var now = DateTime.UtcNow;

        await using var db = await dbFactory.CreateDbContextAsync(ct);
        db.RequestTokens.Add(new RequestToken
        {
            SessionId = sessionId,
            TokenHash = hash,
            IssuedAtUtc = now,
            ExpiresAtUtc = now.AddSeconds(_settings.RequestTokenTTLSeconds),
        });
        await db.SaveChangesAsync(ct);

        return plaintext;
    }

    public async Task<bool> ValidateAndConsumeAsync(string token, long sessionId, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(token)) return false;

        var hash = ComputeHash(token);
        var now = DateTime.UtcNow;

        await using var db = await dbFactory.CreateDbContextAsync(ct);

        var entry = await db.RequestTokens.FirstOrDefaultAsync(
            t => t.TokenHash == hash
              && t.SessionId == sessionId
              && t.UsedAtUtc == null
              && t.ExpiresAtUtc > now,
            ct);

        if (entry is null) return false;

        entry.UsedAtUtc = now;

        try
        {
            // EF generates WHERE ... AND used_at_utc = @original (IS NULL).
            // On SQL Server this is a row-level atomic consume; a concurrent duplicate request
            // gets 0 rows affected and EF raises DbUpdateConcurrencyException.
            await db.SaveChangesAsync(ct);
            return true;
        }
        catch (DbUpdateConcurrencyException)
        {
            // Another request consumed this token first — treat as invalid.
            return false;
        }
    }

    private static string ComputeHash(string input) =>
        Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(input)));
}
