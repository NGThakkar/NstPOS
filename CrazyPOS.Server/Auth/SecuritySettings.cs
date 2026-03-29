namespace CrazyPOS.Server.Auth;

public sealed class SecuritySettings
{
    public int TokenExpiryHours { get; set; } = 8;
    public string[] CorsOrigins { get; set; } = [];

    /// <summary>
    /// When true every authenticated HTTP request must supply a fresh single-use
    /// X-Request-Token header obtained from POST /api/Auth/IssueRequestToken.
    /// Set to false to disable enforcement (e.g. during staged rollout).
    /// </summary>
    public bool EnforcePerRequestTokens { get; set; } = true;

    /// <summary>Lifetime of a single-use request token in seconds (default 30).</summary>
    public int RequestTokenTTLSeconds { get; set; } = 30;
}
