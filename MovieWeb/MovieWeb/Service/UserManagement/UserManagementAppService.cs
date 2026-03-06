using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MovieWeb.DTOs.Common;
using MovieWeb.Entities;

namespace MovieWeb.Service.UserManagement
{
    public interface IUserManagementAppService
    {
        Task<PagedResultDto<UserListItemDto>> GetPagedAsync(UserPagedRequestDto input, CancellationToken ct = default);
        Task<UserDetailDto> GetAsync(long id, CancellationToken ct = default);
        Task<long> CreateAsync(CreateUserDto dto, CancellationToken ct = default);
        Task UpdateAsync(UpdateUserDto dto, CancellationToken ct = default);
        Task SetActiveAsync(long id, bool isActive, CancellationToken ct = default);
        Task ResetPasswordAsync(long id, ResetUserPasswordDto dto, CancellationToken ct = default);
    }

    public class UserManagementAppService : IUserManagementAppService
    {
        private readonly MyDbContext _db;
        private readonly UserManager<AppUser> _userManager;
        private readonly RoleManager<IdentityRole<long>> _roleManager;

        public UserManagementAppService(
            MyDbContext db,
            UserManager<AppUser> userManager,
            RoleManager<IdentityRole<long>> roleManager)
        {
            _db = db;
            _userManager = userManager;
            _roleManager = roleManager;
        }

        public async Task<PagedResultDto<UserListItemDto>> GetPagedAsync(UserPagedRequestDto input, CancellationToken ct = default)
        {
            if (input is null) throw new ArgumentNullException(nameof(input));

            var query = _db.Users.AsQueryable();

            if (!string.IsNullOrWhiteSpace(input.SearchTerm))
            {
                var pattern = $"%{input.SearchTerm.Trim()}%";
                query = query.Where(u =>
                    (u.Email != null && EF.Functions.ILike(u.Email, pattern)) ||
                    (u.UserName != null && EF.Functions.ILike(u.UserName, pattern)) ||
                    (u.FullName != null && EF.Functions.ILike(u.FullName, pattern)) ||
                    (u.PhoneNumber != null && EF.Functions.ILike(u.PhoneNumber, pattern)));
            }

            if (input.IsActive.HasValue)
            {
                query = query.Where(u => u.IsActive == input.IsActive.Value);
            }

            if (!string.IsNullOrWhiteSpace(input.Role))
            {
                var roleName = input.Role.Trim();
                query = from user in query
                        join userRole in _db.UserRoles on user.Id equals userRole.UserId
                        join role in _db.Roles on userRole.RoleId equals role.Id
                        where role.Name != null && role.Name == roleName
                        select user;
                query = query.Distinct();
            }

            query = input.SortBy?.ToLower() switch
            {
                "email" => input.SortDescending
                    ? query.OrderByDescending(u => u.Email)
                    : query.OrderBy(u => u.Email),
                "fullname" => input.SortDescending
                    ? query.OrderByDescending(u => u.FullName)
                    : query.OrderBy(u => u.FullName),
                "createdat" => input.SortDescending
                    ? query.OrderByDescending(u => u.CreatedAt)
                    : query.OrderBy(u => u.CreatedAt),
                "isactive" => input.SortDescending
                    ? query.OrderByDescending(u => u.IsActive)
                    : query.OrderBy(u => u.IsActive),
                _ => query.OrderByDescending(u => u.CreatedAt)
            };

            var totalCount = await query.CountAsync(ct);

            var pageNumber = input.PageNumber < 1 ? 1 : input.PageNumber;
            var pageSize = input.PageSize < 1 ? 10 : input.PageSize;

            var users = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(ct);

            var userIds = users.Select(u => u.Id).ToList();

            var roleLookup = await (from ur in _db.UserRoles
                                    join r in _db.Roles on ur.RoleId equals r.Id
                                    where userIds.Contains(ur.UserId)
                                    select new { ur.UserId, r.Name })
                                   .ToListAsync(ct);

            var rolesByUser = roleLookup
                .GroupBy(x => x.UserId)
                .ToDictionary(g => g.Key, g => g.Where(x => x.Name != null).Select(x => x.Name!).Distinct().ToList());

            var items = users.Select(u => new UserListItemDto
            {
                Id = u.Id,
                Email = u.Email,
                FullName = u.FullName,
                PhoneNumber = u.PhoneNumber,
                DateOfBirth = u.DateOfBirth,
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt,
                Roles = rolesByUser.TryGetValue(u.Id, out var roles) ? roles : new List<string>()
            }).ToList();

            return new PagedResultDto<UserListItemDto>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize
            };
        }

        public async Task<UserDetailDto> GetAsync(long id, CancellationToken ct = default)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
            if (user is null)
            {
                throw new KeyNotFoundException("User not found");
            }

            var roles = await (from ur in _db.UserRoles
                               join r in _db.Roles on ur.RoleId equals r.Id
                               where ur.UserId == user.Id
                               select r.Name)
                              .Where(name => name != null)
                              .Select(name => name!)
                              .Distinct()
                              .ToListAsync(ct);

            return new UserDetailDto
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                PhoneNumber = user.PhoneNumber,
                DateOfBirth = user.DateOfBirth,
                IsActive = user.IsActive,
                CreatedAt = user.CreatedAt,
                Roles = roles,
                EmailConfirmed = user.EmailConfirmed,
                TwoFactorEnabled = user.TwoFactorEnabled,
                AccessFailedCount = user.AccessFailedCount,
                LockoutEnd = user.LockoutEnd
            };
        }

        public async Task<long> CreateAsync(CreateUserDto dto, CancellationToken ct = default)
        {
            if (dto is null) throw new ArgumentNullException(nameof(dto));
            if (string.IsNullOrWhiteSpace(dto.Password))
            {
                throw new ArgumentException("Mật khẩu không hợp lệ.");
            }

            if (dto.DateOfBirth.HasValue && dto.DateOfBirth.Value.Date > DateTime.UtcNow.Date)
            {
                throw new ArgumentException("Ngày sinh không hợp lệ.");
            }

            var email = dto.Email.Trim();
            var existing = await _userManager.FindByEmailAsync(email);
            if (existing is not null)
            {
                throw new InvalidOperationException("Email đã tồn tại.");
            }

            var user = new AppUser
            {
                UserName = email,
                Email = email,
                FullName = string.IsNullOrWhiteSpace(dto.FullName) ? null : dto.FullName.Trim(),
                PhoneNumber = string.IsNullOrWhiteSpace(dto.PhoneNumber) ? null : dto.PhoneNumber.Trim(),
                DateOfBirth = dto.DateOfBirth?.Date,
                IsActive = dto.IsActive,
                EmailConfirmed = true,
                CreatedAt = DateTime.UtcNow
            };

            if (!dto.IsActive)
            {
                user.LockoutEnd = DateTimeOffset.MaxValue;
            }

            var createResult = await _userManager.CreateAsync(user, dto.Password);
            if (!createResult.Succeeded)
            {
                var error = string.Join("; ", createResult.Errors.Select(e => e.Description));
                throw new InvalidOperationException(error);
            }

            if (dto.Roles?.Any() == true)
            {
                var distinctRoles = dto.Roles
                    .Where(r => !string.IsNullOrWhiteSpace(r))
                    .Select(r => r.Trim())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList();

                foreach (var role in distinctRoles)
                {
                    if (!await _roleManager.RoleExistsAsync(role))
                    {
                        throw new KeyNotFoundException($"Role '{role}' không tồn tại.");
                    }
                }

                var addRolesResult = await _userManager.AddToRolesAsync(user, distinctRoles);
                if (!addRolesResult.Succeeded)
                {
                    var error = string.Join("; ", addRolesResult.Errors.Select(e => e.Description));
                    throw new InvalidOperationException(error);
                }
            }

            return user.Id;
        }

        public async Task UpdateAsync(UpdateUserDto dto, CancellationToken ct = default)
        {
            if (dto is null) throw new ArgumentNullException(nameof(dto));
            if (dto.DateOfBirth.HasValue && dto.DateOfBirth.Value.Date > DateTime.UtcNow.Date)
            {
                throw new ArgumentException("Ngày sinh không hợp lệ.");
            }

            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == dto.Id, ct);
            if (user is null)
            {
                throw new KeyNotFoundException("User not found");
            }

            user.FullName = string.IsNullOrWhiteSpace(dto.FullName) ? null : dto.FullName.Trim();
            user.PhoneNumber = string.IsNullOrWhiteSpace(dto.PhoneNumber) ? null : dto.PhoneNumber.Trim();
            user.DateOfBirth = dto.DateOfBirth?.Date;
            user.IsActive = dto.IsActive;
            user.LockoutEnd = dto.IsActive ? null : DateTimeOffset.MaxValue;
            if (dto.IsActive)
            {
                user.AccessFailedCount = 0;
            }

            var updateResult = await _userManager.UpdateAsync(user);
            if (!updateResult.Succeeded)
            {
                var error = string.Join("; ", updateResult.Errors.Select(e => e.Description));
                throw new InvalidOperationException(error);
            }

            if (dto.Roles is not null)
            {
                var targetRoles = dto.Roles
                    .Where(r => !string.IsNullOrWhiteSpace(r))
                    .Select(r => r.Trim())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList();

                foreach (var role in targetRoles)
                {
                    if (!await _roleManager.RoleExistsAsync(role))
                    {
                        throw new KeyNotFoundException($"Role '{role}' không tồn tại.");
                    }
                }

                var currentRoles = await _userManager.GetRolesAsync(user);
                var currentSet = new HashSet<string>(currentRoles, StringComparer.OrdinalIgnoreCase);
                var targetSet = new HashSet<string>(targetRoles, StringComparer.OrdinalIgnoreCase);

                var rolesToAdd = targetSet.Where(role => !currentSet.Contains(role)).ToList();
                var rolesToRemove = currentSet.Where(role => !targetSet.Contains(role)).ToList();

                if (rolesToAdd.Any())
                {
                    var addResult = await _userManager.AddToRolesAsync(user, rolesToAdd);
                    if (!addResult.Succeeded)
                    {
                        var error = string.Join("; ", addResult.Errors.Select(e => e.Description));
                        throw new InvalidOperationException(error);
                    }
                }

                if (rolesToRemove.Any())
                {
                    var removeResult = await _userManager.RemoveFromRolesAsync(user, rolesToRemove);
                    if (!removeResult.Succeeded)
                    {
                        var error = string.Join("; ", removeResult.Errors.Select(e => e.Description));
                        throw new InvalidOperationException(error);
                    }
                }
            }
        }

        public async Task SetActiveAsync(long id, bool isActive, CancellationToken ct = default)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
            if (user is null)
            {
                throw new KeyNotFoundException("User not found");
            }

            user.IsActive = isActive;
            user.LockoutEnd = isActive ? null : DateTimeOffset.MaxValue;
            if (isActive)
            {
                user.AccessFailedCount = 0;
            }

            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded)
            {
                var error = string.Join("; ", result.Errors.Select(e => e.Description));
                throw new InvalidOperationException(error);
            }
        }

        public async Task ResetPasswordAsync(long id, ResetUserPasswordDto dto, CancellationToken ct = default)
        {
            if (dto is null) throw new ArgumentNullException(nameof(dto));

            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
            if (user is null)
            {
                throw new KeyNotFoundException("User not found");
            }

            if (string.IsNullOrWhiteSpace(dto.NewPassword))
            {
                throw new ArgumentException("Mật khẩu không hợp lệ.");
            }

            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var result = await _userManager.ResetPasswordAsync(user, token, dto.NewPassword);
            if (!result.Succeeded)
            {
                var error = string.Join("; ", result.Errors.Select(e => e.Description));
                throw new InvalidOperationException(error);
            }

            await _userManager.UpdateSecurityStampAsync(user);
        }
    }
}