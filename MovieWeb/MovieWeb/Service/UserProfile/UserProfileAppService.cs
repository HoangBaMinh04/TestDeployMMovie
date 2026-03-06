using Microsoft.AspNetCore.Identity;
using MovieWeb.Entities;
using System.Security.Claims;

namespace MovieWeb.Service.UserProfile
{
    public interface IUserProfileAppService
    {
        Task<UserProfileDto> GetAsync(ClaimsPrincipal principal);
        Task<UserProfileDto> UpdateAsync(ClaimsPrincipal principal, UpdateUserProfileDto dto);
    }
    public class UserProfileAppService : IUserProfileAppService
    {
        private readonly UserManager<AppUser> _userManager;

        public UserProfileAppService(UserManager<AppUser> userManager)
        {
            _userManager = userManager;
        }

        public static UserProfileDto MapToDto(AppUser user)
        {
            return new UserProfileDto
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                PhoneNumber = user.PhoneNumber,
                DateOfBirth = user.DateOfBirth,
            };
        }

        public async Task<UserProfileDto> GetAsync(ClaimsPrincipal principal)
        {
            var user = await _userManager.GetUserAsync(principal);
            if (user is null)
            {
                throw new UnauthorizedAccessException("Không xác định được người dùng hiện tại.");
            }

            return MapToDto(user);
        }

        public async Task<UserProfileDto> UpdateAsync(ClaimsPrincipal principal, UpdateUserProfileDto dto)
        {
            if (dto is null)
            {
                throw new ArgumentNullException(nameof(dto));
            }

            var user = await _userManager.GetUserAsync(principal);
            if (user is null)
            {
                throw new UnauthorizedAccessException("Không xác định được người dùng hiện tại.");
            }

            if (dto.DateOfBirth.HasValue && dto.DateOfBirth.Value.Date > DateTime.UtcNow.Date)
            {
                throw new ArgumentException("Ngày sinh không hợp lệ.");
            }

            var hasChanges = false;

            if (dto.FullName != user.FullName)
            {
                user.FullName = dto.FullName;
                hasChanges = true;
            }

            if (dto.DateOfBirth != user.DateOfBirth)
            {
                user.DateOfBirth = dto.DateOfBirth;
                hasChanges = true;
            }

            if (dto.PhoneNumber != user.PhoneNumber)
            {
                user.PhoneNumber = dto.PhoneNumber;
                user.PhoneNumberConfirmed = false;
                hasChanges = true;
            }

            if (!hasChanges)
            {
                return MapToDto(user);
            }

            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded)
            {
                var error = string.Join("; ", result.Errors.Select(e => e.Description));
                throw new InvalidOperationException(error);
            }

            return MapToDto(user);
        }
    }
}
