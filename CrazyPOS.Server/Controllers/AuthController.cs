using CrazyPOS.Server.Auth;
using CrazyPOS.Server.Dto;
using CrazyPOS.Server.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Security.Cryptography;
using System.Text;

namespace CrazyPOS.Server.Controllers
{
    [Route("api/[controller]/[action]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IDbContextFactory<crazypos_devContext> _dbFactory;
        private readonly SecuritySettings _security;

        public AuthController(IDbContextFactory<crazypos_devContext> dbFactory, IOptions<SecuritySettings> securitySettings)
        {
            _dbFactory = dbFactory;
            _security = securitySettings.Value;
        }

        [HttpPost]
        [ActionName("Login")]
        public IActionResult Login([FromBody] LoginRequestDto loginRequest)
        {
            if (string.IsNullOrWhiteSpace(loginRequest.Username) || string.IsNullOrWhiteSpace(loginRequest.Password))
            {
                return BadRequest(new LoginResponseDto
                {
                    Success = false,
                    Message = "Username and password are required"
                });
            }

            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var user = dbContext.Users.FirstOrDefault(u => u.Username == loginRequest.Username);
                    
                    if (user == null)
                    {
                        return Unauthorized(new LoginResponseDto
                        {
                            Success = false,
                            Message = "Invalid username or password"
                        });
                    }

                    if (!user.IsActive)
                    {
                        return Unauthorized(new LoginResponseDto
                        {
                            Success = false,
                            Message = "User account is inactive"
                        });
                    }

                    // Verify password
                    if (!VerifyPassword(loginRequest.Password, user.PasswordHash))
                    {
                        return Unauthorized(new LoginResponseDto
                        {
                            Success = false,
                            Message = "Invalid username or password"
                        });
                    }

                    // Generate token
                    string token = GenerateToken();

                    var loginTime = DateTime.UtcNow;
                    var expiresAt = loginTime.AddHours(_security.TokenExpiryHours);

                    // Create user session
                    var userSession = new UserSession
                    {
                        UserId = user.UserId,
                        Token = token,
                        LoginTime = loginTime,
                        IsActive = true,
                        IPAddress = GetClientIpAddress(),
                        UserAgent = Request.Headers["User-Agent"].ToString()
                    };

                    dbContext.UserSessions.Add(userSession);
                    user.LastLogin = loginTime;
                    dbContext.SaveChanges();

                    return Ok(new LoginResponseDto
                    {
                        Success = true,
                        Message = "Login successful",
                        Token = token,
                        ExpiresAt = expiresAt,
                        User = new UserDto
                        {
                            UserId = user.UserId,
                            Username = user.Username,
                            Email = user.Email,
                            FullName = user.FullName,
                            Role = user.Role,
                            IsActive = user.IsActive,
                            LastLogin = user.LastLogin ?? DateTime.UtcNow
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new LoginResponseDto
                {
                    Success = false,
                    Message = $"Login failed: {ex.Message}"
                });
            }
        }

        [HttpPost]
        [ActionName("Logout")]
        public IActionResult Logout([FromBody] LogoutRequestDto logoutRequest)
        {
            if (string.IsNullOrWhiteSpace(logoutRequest.Token))
            {
                return BadRequest(new { success = false, message = "Token is required" });
            }

            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var session = dbContext.UserSessions.FirstOrDefault(s => s.Token == logoutRequest.Token && s.IsActive);
                    
                    if (session == null)
                    {
                        return NotFound(new { success = false, message = "Session not found" });
                    }

                    session.LogoutTime = DateTime.UtcNow;
                    session.IsActive = false;
                    dbContext.SaveChanges();

                    return Ok(new { success = true, message = "Logout successful" });
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Logout failed: {ex.Message}" });
            }
        }

        [HttpPost]
        [ActionName("Register")]
        public IActionResult Register([FromBody] RegisterUserDto registerRequest)
        {
            if (string.IsNullOrWhiteSpace(registerRequest.Username) || 
                string.IsNullOrWhiteSpace(registerRequest.Password) ||
                string.IsNullOrWhiteSpace(registerRequest.Email))
            {
                return BadRequest(new { success = false, message = "Username, email, and password are required" });
            }

            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    // Check if user already exists
                    if (dbContext.Users.Any(u => u.Username == registerRequest.Username))
                    {
                        return BadRequest(new { success = false, message = "Username already exists" });
                    }

                    if (dbContext.Users.Any(u => u.Email == registerRequest.Email))
                    {
                        return BadRequest(new { success = false, message = "Email already exists" });
                    }

                    var user = new User
                    {
                        Username = registerRequest.Username,
                        Email = registerRequest.Email,
                        FullName = registerRequest.FullName,
                        PasswordHash = HashPassword(registerRequest.Password),
                        Role = registerRequest.Role ?? "Cashier",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    };

                    dbContext.Users.Add(user);
                    dbContext.SaveChanges();

                    return Ok(new { success = true, message = "User registered successfully", userId = user.UserId });
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Registration failed: {ex.Message}" });
            }
        }

        [Authorize]
        [HttpPost]
        [ActionName("ChangePassword")]
        public IActionResult ChangePassword([FromBody] ChangePasswordDto changePasswordRequest)
        {
            if (changePasswordRequest.UserId <= 0 || 
                string.IsNullOrWhiteSpace(changePasswordRequest.CurrentPassword) ||
                string.IsNullOrWhiteSpace(changePasswordRequest.NewPassword))
            {
                return BadRequest(new { success = false, message = "Invalid request" });
            }

            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var user = dbContext.Users.Find(changePasswordRequest.UserId);
                    if (user == null)
                    {
                        return NotFound(new { success = false, message = "User not found" });
                    }

                    // Verify current password
                    if (!VerifyPassword(changePasswordRequest.CurrentPassword, user.PasswordHash))
                    {
                        return Unauthorized(new { success = false, message = "Current password is incorrect" });
                    }

                    user.PasswordHash = HashPassword(changePasswordRequest.NewPassword);
                    user.LastUpdated = DateTime.UtcNow;
                    dbContext.SaveChanges();

                    return Ok(new { success = true, message = "Password changed successfully" });
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Change password failed: {ex.Message}" });
            }
        }

        [HttpGet]
        [ActionName("ValidateToken")]
        public IActionResult ValidateToken(string token)
        {
            if (string.IsNullOrWhiteSpace(token))
            {
                return BadRequest(new { valid = false, message = "Token is required" });
            }

            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var session = dbContext.UserSessions
                        .Include(s => s.User)
                        .FirstOrDefault(s => s.Token == token && s.IsActive);

                    if (session == null)
                    {
                        return Unauthorized(new { valid = false, message = "Invalid or expired token" });
                    }

                    var expiresAt = session.LoginTime.AddHours(_security.TokenExpiryHours);
                    if (DateTime.UtcNow > expiresAt)
                    {
                        session.IsActive = false;
                        session.LogoutTime = DateTime.UtcNow;
                        dbContext.SaveChanges();
                        return Unauthorized(new { valid = false, message = "Session has expired" });
                    }

                    return Ok(new
                    {
                        valid = true,
                        message = "Token is valid",
                        expiresAt,
                        user = new UserDto
                        {
                            UserId = session.User.UserId,
                            Username = session.User.Username,
                            Email = session.User.Email,
                            FullName = session.User.FullName,
                            Role = session.User.Role,
                            IsActive = session.User.IsActive,
                            LastLogin = session.User.LastLogin ?? DateTime.UtcNow
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { valid = false, message = $"Token validation failed: {ex.Message}" });
            }
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpGet]
        [ActionName("GetUsers")]
        public IActionResult GetUsers()
        {
            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    // Get all users with safe datetime handling
                    var users = new List<UserDto>();
                    
                    try
                    {
                        users = dbContext.Users
                            .AsEnumerable()  // Bring data to memory first to avoid SQL datetime issues
                            .Select(u => new UserDto
                            {
                                UserId = u.UserId,
                                Username = u.Username,
                                Email = u.Email,
                                FullName = u.FullName,
                                Role = u.Role,
                                IsActive = u.IsActive,
                                LastLogin = u.LastLogin.HasValue && u.LastLogin.Value > DateTime.MinValue 
                                    ? u.LastLogin.Value 
                                    : DateTime.MinValue
                            })
                            .ToList();
                    }
                    catch (Exception ex)
                    {
                        // If there's a datetime issue, try to get users without LastLogin
                        return BadRequest(new { success = false, message = $"Error retrieving users: {ex.Message}. There may be invalid datetime values in the database." });
                    }

                    return Ok(users);
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error retrieving users: {ex.Message}" });
            }
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpPost]
        [ActionName("DeactivateUser")]
        public IActionResult DeactivateUser(long userId)
        {
            if (userId <= 0)
            {
                return BadRequest(new { success = false, message = "Invalid user ID" });
            }

            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var user = dbContext.Users.Find(userId);
                    if (user == null)
                    {
                        return NotFound(new { success = false, message = "User not found" });
                    }

                    user.IsActive = false;
                    user.LastUpdated = DateTime.UtcNow;

                    // Logout all active sessions for this user
                    var activeSessions = dbContext.UserSessions
                        .Where(s => s.UserId == userId && s.IsActive)
                        .ToList();
                    
                    foreach (var session in activeSessions)
                    {
                        session.IsActive = false;
                        session.LogoutTime = DateTime.UtcNow;
                    }

                    dbContext.SaveChanges();

                    return Ok(new { success = true, message = "User deactivated successfully" });
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error deactivating user: {ex.Message}" });
            }
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpPost]
        [ActionName("ReactivateUser")]
        public IActionResult ReactivateUser(long userId)
        {
            if (userId <= 0)
            {
                return BadRequest(new { success = false, message = "Invalid user ID" });
            }

            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var user = dbContext.Users.Find(userId);
                    if (user == null)
                    {
                        return NotFound(new { success = false, message = "User not found" });
                    }

                    user.IsActive = true;
                    user.LastUpdated = DateTime.UtcNow;
                    dbContext.SaveChanges();

                    return Ok(new { success = true, message = "User reactivated successfully" });
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error reactivating user: {ex.Message}" });
            }
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpPost]
        [ActionName("CreateUser")]
        public IActionResult CreateUser([FromBody] RegisterUserDto createRequest)
        {
            if (string.IsNullOrWhiteSpace(createRequest.Username) || 
                string.IsNullOrWhiteSpace(createRequest.Password) ||
                string.IsNullOrWhiteSpace(createRequest.Email))
            {
                return BadRequest(new { success = false, message = "Username, email, and password are required" });
            }

            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    // Check if user already exists
                    if (dbContext.Users.Any(u => u.Username == createRequest.Username))
                    {
                        return BadRequest(new { success = false, message = "Username already exists" });
                    }

                    if (dbContext.Users.Any(u => u.Email == createRequest.Email))
                    {
                        return BadRequest(new { success = false, message = "Email already exists" });
                    }

                    var user = new User
                    {
                        Username = createRequest.Username,
                        Email = createRequest.Email,
                        FullName = createRequest.FullName,
                        PasswordHash = HashPassword(createRequest.Password),
                        Role = createRequest.Role ?? "Cashier",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    };

                    dbContext.Users.Add(user);
                    dbContext.SaveChanges();

                    return Ok(new 
                    { 
                        success = true, 
                        message = "User created successfully", 
                        userId = user.UserId,
                        user = new UserDto
                        {
                            UserId = user.UserId,
                            Username = user.Username,
                            Email = user.Email,
                            FullName = user.FullName,
                            Role = user.Role,
                            IsActive = user.IsActive,
                            LastLogin = user.LastLogin ?? DateTime.MinValue
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"User creation failed: {ex.Message}" });
            }
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpPut("UpdateUser/{userId}")]
        public IActionResult UpdateUser(long userId, [FromBody] UpdateUserDto updateRequest)
        {
            if (userId <= 0)
            {
                return BadRequest(new { success = false, message = "Invalid user ID" });
            }

            if (string.IsNullOrWhiteSpace(updateRequest.FullName) || 
                string.IsNullOrWhiteSpace(updateRequest.Email))
            {
                return BadRequest(new { success = false, message = "Full name and email are required" });
            }

            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var user = dbContext.Users.Find(userId);
                    if (user == null)
                    {
                        return NotFound(new { success = false, message = "User not found" });
                    }

                    // Check if new email already exists (for different user)
                    if (updateRequest.Email != user.Email && 
                        dbContext.Users.Any(u => u.Email == updateRequest.Email))
                    {
                        return BadRequest(new { success = false, message = "Email already exists" });
                    }

                    user.FullName = updateRequest.FullName;
                    user.Email = updateRequest.Email;
                    user.LastUpdated = DateTime.UtcNow;

                    dbContext.SaveChanges();

                    return Ok(new 
                    { 
                        success = true, 
                        message = "User updated successfully",
                        user = new UserDto
                        {
                            UserId = user.UserId,
                            Username = user.Username,
                            Email = user.Email,
                            FullName = user.FullName,
                            Role = user.Role,
                            IsActive = user.IsActive,
                            LastLogin = user.LastLogin ?? DateTime.MinValue
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"User update failed: {ex.Message}" });
            }
        }

        [Authorize]
        [HttpPost("ChangeUserPassword/{userId}")]
        public IActionResult ChangeUserPassword(long userId, [FromBody] ChangeUserPasswordDto changePasswordRequest)
        {
            if (userId <= 0)
            {
                return BadRequest(new { success = false, message = "Invalid user ID" });
            }

            if (string.IsNullOrWhiteSpace(changePasswordRequest.CurrentPassword) ||
                string.IsNullOrWhiteSpace(changePasswordRequest.NewPassword))
            {
                return BadRequest(new { success = false, message = "Current password and new password are required" });
            }

            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var user = dbContext.Users.Find(userId);
                    if (user == null)
                    {
                        return NotFound(new { success = false, message = "User not found" });
                    }

                    // Verify current password
                    if (!VerifyPassword(changePasswordRequest.CurrentPassword, user.PasswordHash))
                    {
                        return Unauthorized(new { success = false, message = "Current password is incorrect" });
                    }

                    user.PasswordHash = HashPassword(changePasswordRequest.NewPassword);
                    user.LastUpdated = DateTime.UtcNow;
                    dbContext.SaveChanges();

                    return Ok(new { success = true, message = "Password changed successfully" });
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Change password failed: {ex.Message}" });
            }
        }

        // Helper methods
        private string HashPassword(string password)
        {
            using (var sha256 = SHA256.Create())
            {
                var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
                return Convert.ToBase64String(hashedBytes);
            }
        }

        private bool VerifyPassword(string password, string hash)
        {
            var hashOfInput = HashPassword(password);
            Console.WriteLine($"Comparing hashes: {hashOfInput} == {hash}");
            return hashOfInput == hash;
        }

        private string GenerateToken()
        {
            var randomBytes = new byte[32];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(randomBytes);
            }
            return Convert.ToBase64String(randomBytes);
        }

        private string GetClientIpAddress()
        {
            var ipAddress = Request.HttpContext.Connection.RemoteIpAddress?.ToString();
            if (ipAddress == "::1") ipAddress = "127.0.0.1";
            return ipAddress ?? "Unknown";
        }
    }
}
