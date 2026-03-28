namespace CrazyPOS.Server.Auth;

public sealed class SecuritySettings
{
    public int TokenExpiryHours { get; set; } = 8;
    public string[] CorsOrigins { get; set; } = [];
}
