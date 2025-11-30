#nullable disable
using System;

namespace CrazyPOS.Server.Models;

public partial class UserSession
{
    public long SessionId { get; set; }

    public long UserId { get; set; }

    public string Token { get; set; }

    public DateTime LoginTime { get; set; }

    public DateTime? LogoutTime { get; set; }

    public string IPAddress { get; set; }

    public string UserAgent { get; set; }

    public bool IsActive { get; set; }

    public virtual User User { get; set; }
}
