#nullable disable
using System;

namespace CrazyPOS.Server.Models;

public partial class Role
{
    public long RoleId { get; set; }

    public string RoleName { get; set; }

    public string Description { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}

public partial class Permission
{
    public long PermissionId { get; set; }

    public string PermissionCode { get; set; }

    public string PermissionName { get; set; }

    public string Description { get; set; }

    public string Module { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}

public partial class RolePermission
{
    public long RolePermissionId { get; set; }

    public long RoleId { get; set; }

    public long PermissionId { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual Role Role { get; set; }

    public virtual Permission Permission { get; set; }
}

public partial class AuditLog
{
    public long AuditLogId { get; set; }

    public long UserId { get; set; }

    public string Action { get; set; }

    public string Module { get; set; }

    public string EntityType { get; set; }

    public long? EntityId { get; set; }

    public string OldValue { get; set; }

    public string NewValue { get; set; }

    public string Status { get; set; }

    public string IPAddress { get; set; }

    public string UserAgent { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User User { get; set; }
}
