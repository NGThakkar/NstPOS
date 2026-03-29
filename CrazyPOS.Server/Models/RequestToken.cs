#nullable disable
using System.ComponentModel.DataAnnotations;

namespace CrazyPOS.Server.Models;

public partial class RequestToken
{
    public long RequestTokenId { get; set; }

    public long SessionId { get; set; }

    /// <summary>SHA-256 hash of the plaintext token handed to the client. Never stored in plain form.</summary>
    public string TokenHash { get; set; }

    public DateTime IssuedAtUtc { get; set; }

    public DateTime ExpiresAtUtc { get; set; }

    /// <summary>Null = not yet used. Set atomically on first successful validation.</summary>
    [ConcurrencyCheck]
    public DateTime? UsedAtUtc { get; set; }

    public virtual UserSession Session { get; set; }
}
