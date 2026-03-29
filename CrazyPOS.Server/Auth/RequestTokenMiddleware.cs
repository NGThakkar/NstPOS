using CrazyPOS.Server.Services;
using Microsoft.Extensions.Options;
using System.Security.Claims;

namespace CrazyPOS.Server.Auth;

/// <summary>
/// Middleware that enforces per-request single-use token validation for every
/// authenticated request.  Insert between UseAuthentication() and UseAuthorization().
///
/// Skip conditions (all bypass this check):
///   - EnforcePerRequestTokens is false  (feature flag for staged rollout)
///   - Request is not authenticated (login, register, validate-token, etc.)
///   - Endpoint carries [SkipRequestToken] (e.g. IssueRequestToken itself)
/// </summary>
public sealed class RequestTokenMiddleware(
    RequestDelegate next,
    IOptions<SecuritySettings> settings)
{
    private readonly SecuritySettings _settings = settings.Value;

    // IRequestTokenService is Scoped → injected per-request via InvokeAsync parameters.
    public async Task InvokeAsync(HttpContext context, IRequestTokenService tokenService)
    {
        // Feature flag: bypass entirely when enforcement is disabled.
        if (!_settings.EnforcePerRequestTokens)
        {
            await next(context);
            return;
        }

        // Unauthenticated requests (login, register, etc.) pass through.
        if (context.User.Identity is not { IsAuthenticated: true })
        {
            await next(context);
            return;
        }

        // Endpoints decorated with [SkipRequestToken] are exempt.
        var endpoint = context.GetEndpoint();
        if (endpoint?.Metadata.GetMetadata<SkipRequestTokenAttribute>() is not null)
        {
            await next(context);
            return;
        }

        // Require the X-Request-Token header.
        var requestToken = context.Request.Headers["X-Request-Token"].FirstOrDefault()?.Trim();
        if (string.IsNullOrEmpty(requestToken))
        {
            await WriteError(context, StatusCodes.Status401Unauthorized,
                "RequestTokenRequired",
                "A single-use X-Request-Token header is required for every authenticated request. " +
                "Obtain one from POST /api/Auth/IssueRequestToken before each call.");
            return;
        }

        // Resolve the session ID from the claims set by SessionAuthenticationHandler.
        var sessionIdValue = context.User.FindFirstValue("SessionId");
        if (!long.TryParse(sessionIdValue, out var sessionId))
        {
            await WriteError(context, StatusCodes.Status401Unauthorized,
                "InvalidSession",
                "Session claim is missing or malformed.");
            return;
        }

        // Atomically validate and consume the token.  Returns false for expired, reused, or forged tokens.
        var consumed = await tokenService.ValidateAndConsumeAsync(requestToken, sessionId, context.RequestAborted);
        if (!consumed)
        {
            await WriteError(context, StatusCodes.Status401Unauthorized,
                "InvalidRequestToken",
                "Request token is invalid, expired, or has already been used. Obtain a fresh token.");
            return;
        }

        await next(context);
    }

    private static Task WriteError(HttpContext context, int statusCode, string error, string message)
    {
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";
        return context.Response.WriteAsync(
            $"{{\"error\":\"{error}\",\"message\":\"{message}\"}}");
    }
}
