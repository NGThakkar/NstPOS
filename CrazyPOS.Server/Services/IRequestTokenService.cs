namespace CrazyPOS.Server.Services;

/// <summary>
/// Issues and validates cryptographically strong single-use request tokens that are
/// bound to a session and expire after a configurable TTL.
/// </summary>
public interface IRequestTokenService
{
    /// <summary>
    /// Issues a new single-use request token for the given session.
    /// Returns the plaintext token value that must be sent as the X-Request-Token header.
    /// Only the SHA-256 hash is stored server-side.
    /// </summary>
    Task<string> IssueAsync(long sessionId, CancellationToken ct = default);

    /// <summary>
    /// Atomically validates and consumes a request token.
    /// Returns <c>true</c> if the token was valid, bound to the session, within TTL,
    /// and had not been used before.  Once consumed the token can never be reused.
    /// Returns <c>false</c> for expired, forged, reused, or wrong-session tokens.
    /// </summary>
    Task<bool> ValidateAndConsumeAsync(string token, long sessionId, CancellationToken ct = default);
}
