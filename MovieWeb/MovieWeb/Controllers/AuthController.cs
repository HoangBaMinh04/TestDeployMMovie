using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MovieWeb.Service.Auth;
using static MovieWeb.Service.Auth.AuthDto;

namespace MovieWeb.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthAppService _authService;

        public AuthController(IAuthAppService authService)
        {
            _authService = authService;
        }

        /// Đăng ký tài khoản mới
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RequestRegisterDto dto, CancellationToken ct)
        {
            try
            {
                await _authService.RegisterAsync(dto, ct);
                return Ok(new { message = "Đăng ký thành công." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        /// Đăng nhập - Trả về Access Token và Refresh Token
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] RequestLoginDto dto, CancellationToken ct)
        {
            try
            {
                var (accessToken, refreshToken) = await _authService.LoginAsync(dto, ct);

                var response = new LoginResponseDto(
                    AccessToken: accessToken,
                    RefreshToken: refreshToken
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        /// Refresh Token - Lấy Access Token mới bằng Refresh Token
        [HttpPost("refresh")]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequestDto dto, CancellationToken ct)
        {
            try
            {
                var (accessToken, refreshToken) = await _authService.RefreshTokenAsync(dto.RefreshToken, ct);

                var response = new RefreshTokenResponseDto(
                    AccessToken: accessToken,
                    RefreshToken: refreshToken
                );

                return Ok(response);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        /// Logout - Vô hiệu hóa Refresh Token hiện tại
        [Authorize]
        [HttpPost("logout")]
        public async Task<IActionResult> Logout(CancellationToken ct)
        {
            try
            {
                await _authService.RevokeRefreshTokenAsync(User, ct);
                return Ok(new { message = "Đăng xuất thành công." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        /// Đổi mật khẩu (Yêu cầu đăng nhập)
        [Authorize]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto, CancellationToken ct)
        {
            try
            {
                await _authService.ChangePasswordAsync(User, dto, ct);
                return Ok(new { message = "Đổi mật khẩu thành công. Vui lòng đăng nhập lại." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        /// Yêu cầu đặt lại mật khẩu - Gửi OTP qua email
        [HttpPost("request-reset")]
        public async Task<IActionResult> RequestReset([FromBody] RequestPasswordResetDto dto, CancellationToken ct)
        {
            try
            {
                await _authService.RequestResetAsync(dto, ct);
                // Luôn trả OK để tránh leak thông tin user tồn tại hay không
                return Ok(new { message = "Nếu email tồn tại, OTP đã được gửi." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        /// Đặt lại mật khẩu bằng OTP
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordWithOtpDto dto, CancellationToken ct)
        {
            try
            {
                await _authService.ResetWithOtpAsync(dto, ct);
                return Ok(new { message = "Đặt lại mật khẩu thành công." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

    }

}
