using CrazyPOS.Server.Dto;
using CrazyPOS.Server.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrazyPOS.Server.Controllers
{
    [Route("api/[controller]/[action]")]
    [ApiController]
    public class RoleController : ControllerBase
    {
        private readonly IDbContextFactory<crazypos_devContext> _dbFactory;

        public RoleController(IDbContextFactory<crazypos_devContext> dbFactory)
        {
            _dbFactory = dbFactory;
        }

        /// <summary>
        /// Get all roles with their permissions
        /// </summary>
        [HttpGet]
        [ActionName("GetRoles")]
        public IActionResult GetRoles()
        {
            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var roles = dbContext.Roles
                        .Where(r => r.IsActive)
                        .Include(r => r.RolePermissions)
                        .ThenInclude(rp => rp.Permission)
                        .Select(r => new RoleDto
                        {
                            RoleId = r.RoleId,
                            RoleName = r.RoleName,
                            Description = r.Description,
                            IsActive = r.IsActive,
                            Permissions = r.RolePermissions
                                .Where(rp => rp.Permission.IsActive)
                                .Select(rp => rp.Permission.PermissionCode)
                                .ToList()
                        })
                        .ToList();

                    return Ok(roles);
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error retrieving roles: {ex.Message}" });
            }
        }

        /// <summary>
        /// Get specific role with permissions
        /// </summary>
        [HttpGet]
        [ActionName("GetRole")]
        public IActionResult GetRole(long roleId)
        {
            if (roleId <= 0)
            {
                return BadRequest(new { success = false, message = "Invalid role ID" });
            }

            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var role = dbContext.Roles
                        .Where(r => r.RoleId == roleId)
                        .Include(r => r.RolePermissions)
                        .ThenInclude(rp => rp.Permission)
                        .Select(r => new RoleDto
                        {
                            RoleId = r.RoleId,
                            RoleName = r.RoleName,
                            Description = r.Description,
                            IsActive = r.IsActive,
                            Permissions = r.RolePermissions
                                .Where(rp => rp.Permission.IsActive)
                                .Select(rp => rp.Permission.PermissionCode)
                                .ToList()
                        })
                        .FirstOrDefault();

                    if (role == null)
                    {
                        return NotFound(new { success = false, message = "Role not found" });
                    }

                    return Ok(role);
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error retrieving role: {ex.Message}" });
            }
        }

        /// <summary>
        /// Get all permissions
        /// </summary>
        [HttpGet]
        [ActionName("GetPermissions")]
        public IActionResult GetPermissions()
        {
            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var permissions = dbContext.Permissions
                        .Where(p => p.IsActive)
                        .Select(p => new PermissionDto
                        {
                            PermissionId = p.PermissionId,
                            PermissionCode = p.PermissionCode,
                            PermissionName = p.PermissionName,
                            Description = p.Description,
                            Module = p.Module,
                            IsActive = p.IsActive
                        })
                        .OrderBy(p => p.Module)
                        .ThenBy(p => p.PermissionName)
                        .ToList();

                    return Ok(permissions);
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error retrieving permissions: {ex.Message}" });
            }
        }

        /// <summary>
        /// Get user with their role and permissions
        /// </summary>
        [HttpGet]
        [ActionName("GetUserWithRole")]
        public IActionResult GetUserWithRole(long userId)
        {
            if (userId <= 0)
            {
                return BadRequest(new { success = false, message = "Invalid user ID" });
            }

            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var user = dbContext.Users
                        .Where(u => u.UserId == userId)
                        .FirstOrDefault();

                    if (user == null)
                    {
                        return NotFound(new { success = false, message = "User not found" });
                    }

                    var role = dbContext.Roles
                        .Where(r => r.RoleName == user.Role)
                        .Include(r => r.RolePermissions)
                        .ThenInclude(rp => rp.Permission)
                        .FirstOrDefault();

                    var permissions = role?.RolePermissions
                        .Where(rp => rp.Permission.IsActive)
                        .Select(rp => rp.Permission.PermissionCode)
                        .ToList() ?? new List<string>();

                    var userWithRole = new UserWithRoleDto
                    {
                        UserId = user.UserId,
                        Username = user.Username,
                        Email = user.Email,
                        FullName = user.FullName,
                        Role = user.Role,
                        Permissions = permissions,
                        IsActive = user.IsActive,
                        LastLogin = user.LastLogin ?? DateTime.MinValue
                    };

                    return Ok(userWithRole);
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error retrieving user: {ex.Message}" });
            }
        }

        /// <summary>
        /// Check if user has specific permission
        /// </summary>
        [HttpGet]
        [ActionName("HasPermission")]
        public IActionResult HasPermission(long userId, string permissionCode)
        {
            if (userId <= 0 || string.IsNullOrWhiteSpace(permissionCode))
            {
                return BadRequest(new { success = false, message = "Invalid user ID or permission code" });
            }

            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var user = dbContext.Users.FirstOrDefault(u => u.UserId == userId);
                    if (user == null)
                    {
                        return NotFound(new { success = false, message = "User not found" });
                    }

                    var hasPermission = dbContext.RolePermissions
                        .Include(rp => rp.Role)
                        .Include(rp => rp.Permission)
                        .Any(rp => rp.Role.RoleName == user.Role && 
                                   rp.Permission.PermissionCode == permissionCode &&
                                   rp.Permission.IsActive);

                    return Ok(new { hasPermission, permissionCode, userRole = user.Role });
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error checking permission: {ex.Message}" });
            }
        }

        /// <summary>
        /// Update user role
        /// </summary>
        [HttpPost]
        [ActionName("UpdateUserRole")]
        public IActionResult UpdateUserRole([FromBody] UpdateUserRoleDto request)
        {
            if (request.UserId <= 0 || string.IsNullOrWhiteSpace(request.Role))
            {
                return BadRequest(new { success = false, message = "Invalid user ID or role" });
            }

            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var user = dbContext.Users.Find(request.UserId);
                    if (user == null)
                    {
                        return NotFound(new { success = false, message = "User not found" });
                    }

                    var roleExists = dbContext.Roles
                        .Any(r => r.RoleName == request.Role && r.IsActive);
                    
                    if (!roleExists)
                    {
                        return BadRequest(new { success = false, message = "Invalid role" });
                    }

                    var oldRole = user.Role;
                    user.Role = request.Role;
                    user.LastUpdated = DateTime.UtcNow;

                    dbContext.SaveChanges();

                    return Ok(new 
                    { 
                        success = true, 
                        message = $"User role updated from {oldRole} to {request.Role}",
                        userId = user.UserId,
                        newRole = user.Role
                    });
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error updating user role: {ex.Message}" });
            }
        }

        /// <summary>
        /// Get audit logs
        /// </summary>
        [HttpGet]
        [ActionName("GetAuditLogs")]
        public IActionResult GetAuditLogs(int pageNumber = 1, int pageSize = 50)
        {
            if (pageNumber < 1 || pageSize < 1)
            {
                return BadRequest(new { success = false, message = "Invalid page parameters" });
            }

            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var totalCount = dbContext.AuditLogs.Count();

                    var auditLogs = dbContext.AuditLogs
                        .Include(a => a.User)
                        .OrderByDescending(a => a.CreatedAt)
                        .Skip((pageNumber - 1) * pageSize)
                        .Take(pageSize)
                        .Select(a => new AuditLogDto
                        {
                            AuditLogId = a.AuditLogId,
                            UserId = a.UserId,
                            Username = a.User.Username,
                            Action = a.Action,
                            Module = a.Module,
                            EntityType = a.EntityType,
                            EntityId = a.EntityId,
                            OldValue = a.OldValue,
                            NewValue = a.NewValue,
                            Status = a.Status,
                            IPAddress = a.IPAddress,
                            CreatedAt = a.CreatedAt
                        })
                        .ToList();

                    return Ok(new
                    {
                        success = true,
                        totalCount,
                        pageNumber,
                        pageSize,
                        data = auditLogs
                    });
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error retrieving audit logs: {ex.Message}" });
            }
        }

        /// <summary>
        /// Log user action to audit trail
        /// </summary>
        [HttpPost]
        [ActionName("LogAction")]
        public IActionResult LogAction([FromBody] AuditLogDto auditLogDto)
        {
            if (auditLogDto.UserId <= 0 || string.IsNullOrWhiteSpace(auditLogDto.Action))
            {
                return BadRequest(new { success = false, message = "Invalid audit log data" });
            }

            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var auditLog = new AuditLog
                    {
                        UserId = auditLogDto.UserId,
                        Action = auditLogDto.Action,
                        Module = auditLogDto.Module,
                        EntityType = auditLogDto.EntityType,
                        EntityId = auditLogDto.EntityId,
                        OldValue = auditLogDto.OldValue,
                        NewValue = auditLogDto.NewValue,
                        Status = auditLogDto.Status ?? "Success",
                        IPAddress = auditLogDto.IPAddress,
                        CreatedAt = DateTime.UtcNow
                    };

                    dbContext.AuditLogs.Add(auditLog);
                    dbContext.SaveChanges();

                    return Ok(new { success = true, message = "Action logged successfully", auditLogId = auditLog.AuditLogId });
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error logging action: {ex.Message}" });
            }
        }
    }
}
