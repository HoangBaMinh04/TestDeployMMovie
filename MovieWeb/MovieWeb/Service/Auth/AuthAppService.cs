using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using MovieWeb.Entities;
using MovieWeb.Service.Email;
using MovieWeb.Service.OTP;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using static MovieWeb.Service.Auth.AuthDto;

namespace MovieWeb.Service.Auth
{
    public interface IAuthAppService
    {
        Task RegisterAsync(RequestRegisterDto dto, CancellationToken ct = default);
        Task<(string accessToken, string refreshToken)> LoginAsync(RequestLoginDto dto, CancellationToken ct = default);
        Task<(string accessToken, string refreshToken)> RefreshTokenAsync(string refreshToken, CancellationToken ct = default);
        Task RevokeRefreshTokenAsync(ClaimsPrincipal principal, CancellationToken ct = default);
        Task ChangePasswordAsync(ClaimsPrincipal principal, ChangePasswordDto dto, CancellationToken ct = default);
        Task RequestResetAsync(RequestPasswordResetDto dto, CancellationToken ct = default);
        Task ResetWithOtpAsync(ResetPasswordWithOtpDto dto, CancellationToken ct = default);
    }

    public class AuthAppService : IAuthAppService
    {
        private readonly UserManager<AppUser> _userManager;
        private readonly RoleManager<IdentityRole<long>> _roleManager;
        private readonly IOtpAppService _otp;
        private readonly IEmailAppService _email;
        private readonly IConfiguration _cfg;

        public AuthAppService(
            UserManager<AppUser> userManager,
            RoleManager<IdentityRole<long>> roleManager,
            IOtpAppService otp,
            IEmailAppService email,
            IConfiguration cfg)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _otp = otp;
            _email = email;
            _cfg = cfg;
        }

        // Đăng ký + auto gán role "User"
        public async Task RegisterAsync(RequestRegisterDto dto, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
                throw new ArgumentException("Email và mật khẩu là bắt buộc.");

            if (dto.Password != dto.ConfirmPassword)
                throw new ArgumentException("Password và ConfirmPassword phải trùng nhau.");

            var existed = await _userManager.FindByEmailAsync(dto.Email);
            if (existed != null) throw new InvalidOperationException("Email đã tồn tại.");

            var user = new AppUser
            {
                UserName = dto.Email,
                Email = dto.Email,
                EmailConfirmed = true
            };

            var res = await _userManager.CreateAsync(user, dto.Password);
            if (!res.Succeeded)
                throw new InvalidOperationException(string.Join("; ", res.Errors.Select(e => e.Description)));

            if (!await _roleManager.RoleExistsAsync("User"))
                await _roleManager.CreateAsync(new IdentityRole<long>("User"));

            var addRole = await _userManager.AddToRoleAsync(user, "User");
            if (!addRole.Succeeded)
                throw new InvalidOperationException(string.Join("; ", addRole.Errors.Select(e => e.Description)));
        }

        // Login - trả về access token và refresh token
        public async Task<(string accessToken, string refreshToken)> LoginAsync(
            RequestLoginDto dto, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
                throw new ArgumentException("Thiếu thông tin đăng nhập.");

            var user = await _userManager.FindByEmailAsync(dto.Email);
            if (user == null)
                throw new InvalidOperationException("Sai tài khoản hoặc mật khẩu.");

            var ok = await _userManager.CheckPasswordAsync(user, dto.Password);
            if (!ok)
                throw new InvalidOperationException("Sai tài khoản hoặc mật khẩu.");

            if (!user.IsActive)
                throw new InvalidOperationException("Tài khoản đã bị vô hiệu hóa.");

            var accessToken = await GenerateAccessTokenAsync(user);
            var refreshToken = await GenerateAndSaveRefreshTokenAsync(user);

            return (accessToken, refreshToken);
        }

        // Refresh Token - lấy access token mới
        public async Task<(string accessToken, string refreshToken)> RefreshTokenAsync(
            string refreshToken, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(refreshToken))
                throw new ArgumentException("Refresh token không hợp lệ.");

            // Hash refresh token để so sánh với DB
            var refreshHash = Sha256(refreshToken);

            // Tìm user có refresh token này
            var users = _userManager.Users.ToList();
            AppUser? user = null;

            foreach (var u in users)
            {
                var storedToken = await _userManager.GetAuthenticationTokenAsync(u, "JWT", "RefreshToken");
                if (storedToken == refreshHash)
                {
                    user = u;
                    break;
                }
            }

            if (user == null)
                throw new UnauthorizedAccessException("Refresh token không hợp lệ hoặc đã hết hạn.");

            // Kiểm tra expiry (nếu có lưu)
            var expiryStr = await _userManager.GetAuthenticationTokenAsync(user, "JWT", "RefreshTokenExpiry");
            if (!string.IsNullOrEmpty(expiryStr))
            {
                if (DateTime.TryParse(expiryStr, out var expiry))
                {
                    if (expiry < DateTime.UtcNow)
                        throw new UnauthorizedAccessException("Refresh token đã hết hạn.");
                }
            }

            // Generate token mới
            var newAccessToken = await GenerateAccessTokenAsync(user);
            var newRefreshToken = await GenerateAndSaveRefreshTokenAsync(user);

            return (newAccessToken, newRefreshToken);
        }

        // Revoke Refresh Token (logout)
        public async Task RevokeRefreshTokenAsync(ClaimsPrincipal principal, CancellationToken ct = default)
        {
            var user = await _userManager.GetUserAsync(principal);
            if (user == null)
                throw new UnauthorizedAccessException("Không xác định được người dùng.");

            await _userManager.RemoveAuthenticationTokenAsync(user, "JWT", "RefreshToken");
            await _userManager.RemoveAuthenticationTokenAsync(user, "JWT", "RefreshTokenExpiry");
            await _userManager.UpdateSecurityStampAsync(user);
        }

        // Đổi mật khẩu (đang đăng nhập)
        public async Task ChangePasswordAsync(ClaimsPrincipal principal, ChangePasswordDto dto, CancellationToken ct = default)
        {
            if (dto is null) throw new ArgumentNullException(nameof(dto));
            if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword != dto.ConfirmNewPassword)
                throw new ArgumentException("Mật khẩu xác nhận không khớp.");

            if (dto.NewPassword == dto.CurrentPassword)
                throw new ArgumentException("Mật khẩu mới không được trùng mật khẩu hiện tại.");

            var user = await _userManager.GetUserAsync(principal);
            if (user == null) throw new UnauthorizedAccessException("Không xác định được người dùng.");

            var res = await _userManager.ChangePasswordAsync(user, dto.CurrentPassword, dto.NewPassword);
            if (!res.Succeeded)
                throw new InvalidOperationException(string.Join("; ", res.Errors.Select(e => e.Description)));

            // Vô hiệu hoá toàn bộ token/phiên cũ
            await _userManager.RemoveAuthenticationTokenAsync(user, "JWT", "RefreshToken");
            await _userManager.RemoveAuthenticationTokenAsync(user, "JWT", "RefreshTokenExpiry");
            await _userManager.UpdateSecurityStampAsync(user);
        }

        // Yêu cầu đặt lại mật khẩu (gửi OTP)
        public async Task RequestResetAsync(RequestPasswordResetDto dto, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(dto.Email))
                throw new ArgumentException("Email là bắt buộc.");

            var user = await _userManager.FindByEmailAsync(dto.Email);
            if (user != null)
            {
                var code = _otp.GenerateAndStore(dto.Email, TimeSpan.FromMinutes(5));
                var html = $@"<p>Mã OTP đặt lại mật khẩu:</p>
                              <h2 style='letter-spacing:4px'>{code}</h2>
                              <p>Hết hạn sau 5 phút.</p>";
                await _email.SendAsync(dto.Email, "OTP đặt lại mật khẩu", html, ct);
            }
        }

        // Đặt lại mật khẩu bằng OTP
        public async Task ResetWithOtpAsync(ResetPasswordWithOtpDto dto, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword != dto.ConfirmNewPassword)
                throw new ArgumentException("Mật khẩu xác nhận không khớp.");

            var user = await _userManager.FindByEmailAsync(dto.Email);
            if (user == null) throw new InvalidOperationException("Email hoặc OTP không hợp lệ.");

            if (!_otp.Verify(dto.Email, dto.OtpCode))
                throw new InvalidOperationException("OTP không đúng hoặc đã hết hạn.");

            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var res = await _userManager.ResetPasswordAsync(user, token, dto.NewPassword);
            if (!res.Succeeded)
                throw new InvalidOperationException(string.Join("; ", res.Errors.Select(e => e.Description)));

            await _userManager.RemoveAuthenticationTokenAsync(user, "JWT", "RefreshToken");
            await _userManager.RemoveAuthenticationTokenAsync(user, "JWT", "RefreshTokenExpiry");
            await _userManager.UpdateSecurityStampAsync(user);
        }

        private async Task<string> GenerateAccessTokenAsync(AppUser user)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_cfg["Jwt:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var expMinutes = int.Parse(_cfg["Jwt:AccessTokenExpireMinutes"] ?? "20");

            var claims = new List<Claim>
            {
                new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new(ClaimTypes.Name, user.UserName ?? ""),
                new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new("SecurityStamp", user.SecurityStamp ?? "")
            };

            var roles = await _userManager.GetRolesAsync(user);
            foreach (var role in roles)
            {
                claims.Add(new Claim(ClaimTypes.Role, role));
            }

            var jwt = new JwtSecurityToken(
                issuer: _cfg["Jwt:Issuer"],
                audience: _cfg["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(expMinutes),
                signingCredentials: creds);

            return new JwtSecurityTokenHandler().WriteToken(jwt);
        }


        private async Task<string> GenerateAndSaveRefreshTokenAsync(AppUser user)
        {
            var refreshToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
            var refreshHash = Sha256(refreshToken);
            var expireDays = int.Parse(_cfg["Jwt:RefreshTokenExpireDays"] ?? "7");
            var expiry = DateTime.UtcNow.AddDays(expireDays);

            // Lưu hash của refresh token
            await _userManager.SetAuthenticationTokenAsync(user, "JWT", "RefreshToken", refreshHash);

            // Lưu thời gian hết hạn
            await _userManager.SetAuthenticationTokenAsync(user, "JWT", "RefreshTokenExpiry", expiry.ToString("O"));

            return refreshToken;
        }

        private static string Sha256(string input)
        {
            using var sha = SHA256.Create();
            return Convert.ToHexString(sha.ComputeHash(Encoding.UTF8.GetBytes(input)));
        }
    }
}