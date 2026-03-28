using CrazyPOS.Server.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Text.Encodings.Web;

namespace CrazyPOS.Server.Auth;

public sealed class SessionAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IDbContextFactory<crazypos_devContext> dbFactory,
    IOptions<SecuritySettings> securitySettings)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "SessionToken";

    private readonly SecuritySettings _security = securitySettings.Value;

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        // Extract token from Authorization Bearer or X-Auth-Token header
        var authHeader = Request.Headers.Authorization.ToString();
        var token = authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
            ? authHeader["Bearer ".Length..].Trim()
            : Request.Headers["X-Auth-Token"].FirstOrDefault()?.Trim();

        if (string.IsNullOrEmpty(token))
            return AuthenticateResult.NoResult();

        await using var db = await dbFactory.CreateDbContextAsync();

        var session = await db.UserSessions
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.Token == token && s.IsActive);

        if (session?.User == null || !session.User.IsActive)
            return AuthenticateResult.Fail("Invalid or expired session token.");

        // Enforce token expiry
        var expiresAt = session.LoginTime.AddHours(_security.TokenExpiryHours);
        if (DateTime.UtcNow > expiresAt)
        {
            session.IsActive = false;
            session.LogoutTime = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return AuthenticateResult.Fail("Session token has expired.");
        }

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, session.User.UserId.ToString()),
            new Claim(ClaimTypes.Name, session.User.Username),
            new Claim(ClaimTypes.Role, session.User.Role ?? "Cashier"),
            new Claim("FullName", session.User.FullName ?? string.Empty),
            new Claim("SessionId", session.SessionId.ToString())
        };

        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);

        return AuthenticateResult.Success(ticket);
    }

    protected override Task HandleChallengeAsync(AuthenticationProperties properties)
    {
        Response.StatusCode = StatusCodes.Status401Unauthorized;
        Response.ContentType = "application/json";
        return Response.WriteAsync(
            "{\"error\":\"Unauthorized\",\"message\":\"Authentication is required.\"}");
    }

    protected override Task HandleForbiddenAsync(AuthenticationProperties properties)
    {
        Response.StatusCode = StatusCodes.Status403Forbidden;
        Response.ContentType = "application/json";
        return Response.WriteAsync(
            "{\"error\":\"Forbidden\",\"message\":\"You do not have permission to perform this action.\"}");
    }
}
