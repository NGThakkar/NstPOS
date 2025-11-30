#nullable disable
using System;

namespace CrazyPOS.Server.Models;

public partial class User
{
    public long UserId { get; set; }

    public string Username { get; set; }

    public string Email { get; set; }

    public string PasswordHash { get; set; }

    public string FullName { get; set; }

    public string Role { get; set; }  // "Admin", "Manager", "Cashier"

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? LastLogin { get; set; }

    public DateTime? LastUpdated { get; set; }

    public virtual ICollection<UserSession> UserSessions { get; set; } = new List<UserSession>();
}
