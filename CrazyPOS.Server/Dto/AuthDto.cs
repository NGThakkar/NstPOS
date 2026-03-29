namespace CrazyPOS.Server.Dto
{
    public class LoginRequestDto
    {
        public string Username { get; set; }
        public string Password { get; set; }
    }

    public class LoginResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public string Token { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public UserDto User { get; set; }
    }

    public class UserDto
    {
        public long UserId { get; set; }
        public string Username { get; set; }
        public string Email { get; set; }
        public string FullName { get; set; }
        public string Role { get; set; }
        public bool IsActive { get; set; }
        public DateTime LastLogin { get; set; }
    }

    public class RegisterUserDto
    {
        public string Username { get; set; }
        public string Email { get; set; }
        public string Password { get; set; }
        public string FullName { get; set; }
        public string Role { get; set; }  // "Admin", "Manager", "Cashier"
    }

    public class LogoutRequestDto
    {
        public string Token { get; set; }
    }

    public class ChangePasswordDto
    {
        public long UserId { get; set; }
        public string CurrentPassword { get; set; }
        public string NewPassword { get; set; }
    }

    public class UpdateUserDto
    {
        public string FullName { get; set; }
        public string Email { get; set; }
    }

    public class ChangeUserPasswordDto
    {
        public string CurrentPassword { get; set; }
        public string NewPassword { get; set; }
    }

    /// <summary>Response from POST /api/Auth/IssueRequestToken.</summary>
    public class IssueRequestTokenResponseDto
    {
        /// <summary>Plaintext single-use token. Send as X-Request-Token on the next authenticated call.</summary>
        public string Token { get; set; }
        /// <summary>UTC time at which this token expires.</summary>
        public DateTime ExpiresAt { get; set; }
        /// <summary>Seconds until this token expires.</summary>
        public int TtlSeconds { get; set; }
    }
}
