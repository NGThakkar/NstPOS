namespace CrazyPOS.Server.Dto
{
    public class RoleDto
    {
        public long RoleId { get; set; }
        public string RoleName { get; set; }
        public string Description { get; set; }
        public bool IsActive { get; set; }
        public List<string> Permissions { get; set; } = new List<string>();
    }

    public class PermissionDto
    {
        public long PermissionId { get; set; }
        public string PermissionCode { get; set; }
        public string PermissionName { get; set; }
        public string Description { get; set; }
        public string Module { get; set; }
        public bool IsActive { get; set; }
    }

    public class UserWithRoleDto
    {
        public long UserId { get; set; }
        public string Username { get; set; }
        public string Email { get; set; }
        public string FullName { get; set; }
        public string Role { get; set; }
        public List<string> Permissions { get; set; } = new List<string>();
        public bool IsActive { get; set; }
        public DateTime LastLogin { get; set; }
    }

    public class AuditLogDto
    {
        public long AuditLogId { get; set; }
        public long UserId { get; set; }
        public string Username { get; set; }
        public string Action { get; set; }
        public string Module { get; set; }
        public string EntityType { get; set; }
        public long? EntityId { get; set; }
        public string OldValue { get; set; }
        public string NewValue { get; set; }
        public string Status { get; set; }
        public string IPAddress { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateUserWithRoleDto
    {
        public string Username { get; set; }
        public string Email { get; set; }
        public string Password { get; set; }
        public string FullName { get; set; }
        public string Role { get; set; }  // "Admin", "Manager", "Cashier"
    }

    public class UpdateUserRoleDto
    {
        public long UserId { get; set; }
        public string Role { get; set; }
    }
}
