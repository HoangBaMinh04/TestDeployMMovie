using MovieWeb.DTOs.Common;
using System.ComponentModel.DataAnnotations;


namespace MovieWeb.Service.UserManagement
{
    public class UserPagedRequestDto : PagedRequestDto
    {
        public bool? IsActive { get; set; }
        public string? Role { get; set; }
    }

    public class UserListItemDto
    {
        public long Id { get; set; }
        public string? Email { get; set; }
        public string? FullName { get; set; }
        public string? PhoneNumber { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<string> Roles { get; set; } = new();
    }

    public class UserDetailDto : UserListItemDto
    {
        public bool EmailConfirmed { get; set; }
        public bool TwoFactorEnabled { get; set; }
        public int AccessFailedCount { get; set; }
        public DateTimeOffset? LockoutEnd { get; set; }
    }

    public class CreateUserDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [StringLength(100, MinimumLength = 6)]
        public string Password { get; set; } = string.Empty;

        [StringLength(200)]
        public string? FullName { get; set; }

        [Phone]
        public string? PhoneNumber { get; set; }

        public DateTime? DateOfBirth { get; set; }

        public bool IsActive { get; set; } = true;

        public List<string> Roles { get; set; } = new();
    }

    public class UpdateUserDto
    {
        [Required]
        public long Id { get; set; }

        [StringLength(200)]
        public string? FullName { get; set; }

        [Phone]
        public string? PhoneNumber { get; set; }

        public DateTime? DateOfBirth { get; set; }

        public bool IsActive { get; set; }

        public List<string>? Roles { get; set; }
    }

    public class UpdateUserStatusDto
    {
        public bool IsActive { get; set; }
    }

    public class ResetUserPasswordDto
    {
        [Required]
        [StringLength(100, MinimumLength = 6)]
        public string NewPassword { get; set; } = string.Empty;
    }
}