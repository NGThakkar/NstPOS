using CrazyPOS.Server.Dto;
using CrazyPOS.Server.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace CrazyPOS.Server.Controllers
{
    [Route("api/[controller]/[action]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IDbContextFactory<crazypos_devContext> _dbFactory;
        private readonly IConfiguration _configuration;

        public AuthController(IDbContextFactory<crazypos_devContext> dbFactory, IConfiguration configuration)
        {
            _dbFactory = dbFactory;
            _configuration = configuration;
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

                    // Create user session
                    var userSession = new UserSession
                    {
                        UserId = user.UserId,
                        Token = token,
                        LoginTime = DateTime.UtcNow,
                        IsActive = true,
                        IPAddress = GetClientIpAddress(),
                        UserAgent = Request.Headers["User-Agent"].ToString()
                    };

                    dbContext.UserSessions.Add(userSession);
                    user.LastLogin = DateTime.UtcNow;
                    dbContext.SaveChanges();

                    return Ok(new LoginResponseDto
                    {
                        Success = true,
                        Message = "Login successful",
                        Token = token,
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

                    return Ok(new 
                    { 
                        valid = true, 
                        message = "Token is valid",
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

        [HttpGet]
        [ActionName("GetUsers")]
        public IActionResult GetUsers()
        {
            try
            {
                using (var dbContext = _dbFactory.CreateDbContext())
                {
                    var users = dbContext.Users
                        .Select(u => new UserDto
                        {
                            UserId = u.UserId,
                            Username = u.Username,
                            Email = u.Email,
                            FullName = u.FullName,
                            Role = u.Role,
                            IsActive = u.IsActive,
                            LastLogin = u.LastLogin ?? DateTime.MinValue
                        })
                        .ToList();

                    return Ok(users);
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = $"Error retrieving users: {ex.Message}" });
            }
        }

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
