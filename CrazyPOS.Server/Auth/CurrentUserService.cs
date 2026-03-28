using System.Security.Claims;

namespace CrazyPOS.Server.Auth;

public interface ICurrentUserService
{
    bool IsAuthenticated { get; }
    long UserId { get; }
    string Username { get; }
    string Role { get; }
    bool IsInRole(string role);
}

public sealed class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    private ClaimsPrincipal? User => httpContextAccessor.HttpContext?.User;

    public bool IsAuthenticated =>
        User?.Identity?.IsAuthenticated == true;

    public long UserId =>
        long.TryParse(User?.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;

    public string Username =>
        User?.FindFirstValue(ClaimTypes.Name) ?? string.Empty;

    public string Role =>
        User?.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

    public bool IsInRole(string role) =>
        User?.IsInRole(role) == true;
}
