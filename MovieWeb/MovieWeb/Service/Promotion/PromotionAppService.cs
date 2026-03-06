using Microsoft.EntityFrameworkCore;
using MovieWeb.DTOs.Common;
using MovieWeb.Entities;

namespace MovieWeb.Service.Promotion
{
    public interface IPromotionService
    {
        Task<int> CreateAsync(CreatePromotionDto input);
        Task UpdateAsync(UpdatePromotionDto input);
        Task<PromotionDto> GetByIdAsync(int id);
        Task<PromotionDto> GetByCodeAsync(string code);
        Task<List<PromotionDto>> GetAllAsync();
        Task<List<PromotionDto>> GetActiveAsync();
        Task DeleteAsync(int id);
        Task ToggleActiveAsync(int id);
        Task<PromotionResultDto> ValidateAsync(ValidatePromotionDto input);
        Task<PromotionResultDto> ValidateAndApplyAsync(string code, decimal orderAmount, long? userId);
        Task<PagedResultDto<PromotionDto>> GetPagedAsync(PagedRequestDto input, bool? isActive = null);
    }

    public class PromotionService : IPromotionService
    {
        private readonly MyDbContext _db;

        public PromotionService(MyDbContext db)
        {
            _db = db;
        }

        private static PromotionDto MapToDto(Entities.Promotion promo)
        {
            return new PromotionDto
            {
                Id = promo.Id,
                Code = promo.Code,
                Name = promo.Name,
                Description = promo.Description,
                Type = promo.Type,
                Value = promo.Value,
                MaxDiscountAmount = promo.MaxDiscountAmount,
                MinOrderAmount = promo.MinOrderAmount,
                ValidFrom = promo.ValidFrom,
                ValidTo = promo.ValidTo,
                MaxUsage = promo.MaxUsage,
                CurrentUsage = promo.CurrentUsage,
                IsActive = promo.IsActive
            };
        }

        public async Task<int> CreateAsync(CreatePromotionDto input)
        {
            if (string.IsNullOrWhiteSpace(input.Code))
                throw new ArgumentException("Promotion code is required");

            if (string.IsNullOrWhiteSpace(input.Name))
                throw new ArgumentException("Promotion name is required");

            // Validate code uniqueness
            var codeExists = await _db.Promotions
                .AnyAsync(p => p.Code.ToLower() == input.Code.Trim().ToUpper());

            if (codeExists)
                throw new InvalidOperationException($"Promotion code '{input.Code}' already exists");

            // Validate dates
            if (input.ValidFrom >= input.ValidTo)
                throw new ArgumentException("ValidFrom must be before ValidTo");

            // Validate discount value
            if (input.Type == DiscountType.Percentage && (input.Value < 0 || input.Value > 100))
                throw new ArgumentException("Percentage value must be between 0 and 100");

            if (input.Type == DiscountType.Fixed && input.Value < 0)
                throw new ArgumentException("Fixed discount value must be positive");

            var promotion = new Entities.Promotion
            {
                Code = input.Code.Trim().ToUpper(),
                Name = input.Name.Trim(),
                Description = input.Description,
                Type = input.Type,
                Value = input.Value,
                MaxDiscountAmount = input.MaxDiscountAmount,
                MinOrderAmount = input.MinOrderAmount,
                ValidFrom = input.ValidFrom,
                ValidTo = input.ValidTo,
                MaxUsage = input.MaxUsage,
                MaxUsagePerUser = input.MaxUsagePerUser,
                CurrentUsage = 0,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _db.Promotions.Add(promotion);
            await _db.SaveChangesAsync();
            return promotion.Id;
        }

        public async Task UpdateAsync(UpdatePromotionDto input)
        {
            var promotion = await _db.Promotions.FindAsync(input.Id);

            if (promotion == null)
                throw new KeyNotFoundException($"Promotion with Id={input.Id} not found");

            if (string.IsNullOrWhiteSpace(input.Code))
                throw new ArgumentException("Promotion code is required");

            if (string.IsNullOrWhiteSpace(input.Name))
                throw new ArgumentException("Promotion name is required");

            // Validate code uniqueness (except current)
            var codeExists = await _db.Promotions
                .AnyAsync(p => p.Id != input.Id && p.Code.ToLower() == input.Code.Trim().ToUpper());

            if (codeExists)
                throw new InvalidOperationException($"Promotion code '{input.Code}' already exists");

            // Validate dates
            if (input.ValidFrom >= input.ValidTo)
                throw new ArgumentException("ValidFrom must be before ValidTo");

            if (input.MaxDiscountAmount < 0 || input.MinOrderAmount < 0)
                throw new ArgumentException("Amounts must be non-negative");

            if (input.MaxUsage <= 0 && input.MaxUsage.HasValue)
                throw new ArgumentException("MaxUsage must be greater than 0");

            if (input.MaxUsagePerUser <= 0 && input.MaxUsagePerUser.HasValue)
                throw new ArgumentException("MaxUsagePerUser must be greater than 0");

            promotion.Code = input.Code.Trim().ToUpper();
            promotion.Name = input.Name.Trim();
            promotion.Description = input.Description;
            promotion.Type = input.Type;
            promotion.Value = input.Value;
            promotion.MaxDiscountAmount = input.MaxDiscountAmount;
            promotion.MinOrderAmount = input.MinOrderAmount;
            promotion.ValidFrom = input.ValidFrom;
            promotion.ValidTo = input.ValidTo;
            promotion.MaxUsage = input.MaxUsage;
            promotion.MaxUsagePerUser = input.MaxUsagePerUser;
            promotion.IsActive = input.IsActive;

            await _db.SaveChangesAsync();
        }

        public async Task<PromotionDto> GetByIdAsync(int id)
        {
            var promotion = await _db.Promotions.FindAsync(id);

            if (promotion == null)
                throw new KeyNotFoundException($"Promotion with Id={id} not found");

            return MapToDto(promotion);
        }

        public async Task<PromotionDto> GetByCodeAsync(string code)
        {
            var promotion = await _db.Promotions
                .FirstOrDefaultAsync(p => p.Code.ToLower() == code.Trim().ToLower());

            if (promotion == null)
                throw new KeyNotFoundException($"Promotion with code '{code}' not found");

            return MapToDto(promotion);
        }

        public async Task<List<PromotionDto>> GetAllAsync()
        {
            var promotions = await _db.Promotions
                .OrderBy(p => p.Name)
                .ToListAsync();

            return promotions.Select(MapToDto).ToList();
        }

        public async Task<List<PromotionDto>> GetActiveAsync()
        {
            var now = DateTime.UtcNow;
            var promotions = await _db.Promotions
                .Where(p => p.IsActive
                    && p.ValidFrom <= now
                    && p.ValidTo >= now
                    && (p.MaxUsage == null || p.CurrentUsage < p.MaxUsage))
                .OrderBy(p => p.Name)
                .ToListAsync();

            return promotions.Select(MapToDto).ToList();
        }

        public async Task DeleteAsync(int id)
        {
            var promotion = await _db.Promotions
                .Include(p => p.Orders)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (promotion == null) return;

            // Check if promotion has been used
            if (promotion.Orders.Any())
                throw new InvalidOperationException("Cannot delete promotion that has been used");

            _db.Promotions.Remove(promotion);
            await _db.SaveChangesAsync();
        }

        public async Task ToggleActiveAsync(int id)
        {
            var promotion = await _db.Promotions.FindAsync(id);

            if (promotion == null)
                throw new KeyNotFoundException($"Promotion with Id={id} not found");

            promotion.IsActive = !promotion.IsActive;
            await _db.SaveChangesAsync();
        }

        public async Task<PromotionResultDto> ValidateAsync(ValidatePromotionDto input)
        {
            var promotion = await _db.Promotions
                .FirstOrDefaultAsync(p => p.Code.ToLower() == input.Code.Trim().ToLower());

            if (promotion == null)
            {
                return new PromotionResultDto
                {
                    IsValid = false,
                    ErrorMessage = "Promotion code not found"
                };
            }

            // Check if active
            if (!promotion.IsActive)
            {
                return new PromotionResultDto
                {
                    IsValid = false,
                    ErrorMessage = "This promotion is not active"
                };
            }

            // Check date validity
            var now = DateTime.UtcNow;
            if (now < promotion.ValidFrom)
            {
                return new PromotionResultDto
                {
                    IsValid = false,
                    ErrorMessage = $"This promotion is not valid until {promotion.ValidFrom:dd/MM/yyyy}"
                };
            }

            if (now > promotion.ValidTo)
            {
                return new PromotionResultDto
                {
                    IsValid = false,
                    ErrorMessage = "This promotion has expired"
                };
            }

            // Check min order amount
            if (promotion.MinOrderAmount.HasValue && input.OrderAmount < promotion.MinOrderAmount.Value)
            {
                return new PromotionResultDto
                {
                    IsValid = false,
                    ErrorMessage = $"Minimum order amount is {promotion.MinOrderAmount.Value:N0} VND"
                };
            }

            // Check max usage
            if (promotion.MaxUsage.HasValue && promotion.CurrentUsage >= promotion.MaxUsage.Value)
            {
                return new PromotionResultDto
                {
                    IsValid = false,
                    ErrorMessage = "This promotion has reached its maximum usage limit"
                };
            }

            // Check max usage per user
            if (promotion.MaxUsagePerUser.HasValue && input.UserId.HasValue)
            {
                var userUsageCount = await _db.Orders
                    .CountAsync(o => o.UserId == input.UserId.Value
                        && o.PromotionId == promotion.Id
                        && o.Status == OrderStatus.Paid);

                if (userUsageCount >= promotion.MaxUsagePerUser.Value)
                {
                    return new PromotionResultDto
                    {
                        IsValid = false,
                        ErrorMessage = "You have reached the maximum usage limit for this promotion"
                    };
                }
            }

            // Calculate discount
            decimal discountAmount = 0;

            if (promotion.Type == DiscountType.Percentage)
            {
                discountAmount = input.OrderAmount * (promotion.Value / 100);

                // Apply max discount cap
                if (promotion.MaxDiscountAmount.HasValue && discountAmount > promotion.MaxDiscountAmount.Value)
                {
                    discountAmount = promotion.MaxDiscountAmount.Value;
                }
            }
            else // Fixed
            {
                discountAmount = promotion.Value;
            }

            // Ensure discount doesn't exceed order amount
            discountAmount = Math.Min(discountAmount, input.OrderAmount);

            return new PromotionResultDto
            {
                IsValid = true,
                DiscountAmount = discountAmount,
                PromotionId = promotion.Id
            };
        }

        public async Task<PromotionResultDto> ValidateAndApplyAsync(string code, decimal orderAmount, long? userId)
        {
            var result = await ValidateAsync(new ValidatePromotionDto
            {
                Code = code,
                OrderAmount = orderAmount,
                UserId = userId
            });

            if (result.IsValid && result.PromotionId.HasValue)
            {
                // Increment usage counter
                var promotion = await _db.Promotions.FindAsync(result.PromotionId.Value);
                if (promotion != null)
                {
                    promotion.CurrentUsage++;
                    await _db.SaveChangesAsync();
                }
            }

            return result;
        }

        public async Task<PagedResultDto<PromotionDto>> GetPagedAsync(
            PagedRequestDto input,
            bool? isActive = null)
        {
            var query = _db.Promotions.AsQueryable();

            // Filter by active status
            if (isActive.HasValue)
            {
                query = query.Where(p => p.IsActive == isActive.Value);
            }

            // Search
            if (!string.IsNullOrWhiteSpace(input.SearchTerm))
            {
                var term = input.SearchTerm.Trim().ToLower();
                query = query.Where(p =>
                    p.Code.ToLower().Contains(term) ||
                    p.Name.ToLower().Contains(term) ||
                    (p.Description != null && p.Description.ToLower().Contains(term))
                );
            }

            // Sort
            query = input.SortBy?.ToLower() switch
            {
                "code" => input.SortDescending
                    ? query.OrderByDescending(p => p.Code)
                    : query.OrderBy(p => p.Code),
                "name" => input.SortDescending
                    ? query.OrderByDescending(p => p.Name)
                    : query.OrderBy(p => p.Name),
                "validfrom" => input.SortDescending
                    ? query.OrderByDescending(p => p.ValidFrom)
                    : query.OrderBy(p => p.ValidFrom),
                "validto" => input.SortDescending
                    ? query.OrderByDescending(p => p.ValidTo)
                    : query.OrderBy(p => p.ValidTo),
                "usage" => input.SortDescending
                    ? query.OrderByDescending(p => p.CurrentUsage)
                    : query.OrderBy(p => p.CurrentUsage),
                _ => query.OrderBy(p => p.Name)
            };

            var totalCount = await query.CountAsync();

            var items = await query
                .Skip((input.PageNumber - 1) * input.PageSize)
                .Take(input.PageSize)
                .ToListAsync();

            return new PagedResultDto<PromotionDto>
            {
                Items = items.Select(MapToDto).ToList(),
                TotalCount = totalCount,
                PageNumber = input.PageNumber,
                PageSize = input.PageSize
            };
        }
    }
}