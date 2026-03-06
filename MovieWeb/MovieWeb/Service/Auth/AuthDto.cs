namespace MovieWeb.Service.Auth
{
    public class AuthDto
    {
        // Register
        public record RequestRegisterDto(string Email, string Password, string ConfirmPassword);

        // Login
        public record RequestLoginDto(string Email, string Password);

        // Login Response
        public record LoginResponseDto(string AccessToken, string RefreshToken, string TokenType = "Bearer");

        // Refresh Token Request
        public record RefreshTokenRequestDto(string RefreshToken);

        // Refresh Token Response (giống LoginResponse)
        public record RefreshTokenResponseDto(string AccessToken, string RefreshToken, string TokenType = "Bearer");

        // Change Password
        public record ChangePasswordDto(string CurrentPassword, string NewPassword, string ConfirmNewPassword);

        // Request Password Reset
        public record RequestPasswordResetDto(string Email);

        // Reset Password with OTP
        public record ResetPasswordWithOtpDto(string Email, string OtpCode, string NewPassword, string ConfirmNewPassword);
    }
}
