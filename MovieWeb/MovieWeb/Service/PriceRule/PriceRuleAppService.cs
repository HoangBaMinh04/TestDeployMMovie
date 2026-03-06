using Microsoft.EntityFrameworkCore;
using MovieWeb.DTOs.Common;

namespace MovieWeb.Service.PriceRule
{
    public interface IPriceRuleService
    {
        Task<int> CreateAsync(CreatePriceRuleDto input);
        Task UpdateAsync(UpdatePriceRuleDto input);
        Task<PriceRuleDto> GetByIdAsync(int id);
        Task<List<PriceRuleDto>> GetByCinemaAsync(int cinemaId);
        Task<List<PriceRuleDto>> GetActiveRulesAsync(int cinemaId);
        Task DeleteAsync(int id);
        Task ToggleActiveAsync(int id);
        Task<decimal> CalculatePriceAsync(int cinemaId, string tier, DateTime showtime, decimal basePrice);
        Task<PagedResultDto<PriceRuleDto>> GetPagedAsync(PagedRequestDto input, int? cinemaId = null, bool? isActive = null, string? tier = null);
    }

    public class PriceRuleService : IPriceRuleService
    {
        private readonly MyDbContext _db;
        private static readonly string[] ValidTiers = { "Standard", "VIP", "Deluxe" };

        public PriceRuleService(MyDbContext db)
        {
            _db = db;
        }

        private static PriceRuleDto MapToDto(Entities.PriceRule pr)
        {
            return new PriceRuleDto
            {
                Id = pr.Id,
                CinemaId = pr.CinemaId,
                CinemaName = pr.Cinema?.Name ?? "",
                Name = pr.Name,
                Tier = pr.Tier,
                DayOfWeek = pr.DayOfWeek,
                TimeFrom = pr.TimeFrom,
                TimeTo = pr.TimeTo,
                PriceModifier = pr.PriceModifier,
                IsPercentage = pr.IsPercentage,
                IsActive = pr.IsActive,
                Priority = pr.Priority
            };
        }

        public async Task<int> CreateAsync(CreatePriceRuleDto input)
        {
            if (string.IsNullOrWhiteSpace(input.Name))
                throw new ArgumentException("Rule name is required");

            // Validate cinema
            var cinemaExists = await _db.Cinemas
                .AnyAsync(c => c.Id == input.CinemaId && !c.IsDeleted);

            if (!cinemaExists)
                throw new KeyNotFoundException($"Cinema with Id={input.CinemaId} not found");

            // Validate tier if provided
            if (!string.IsNullOrEmpty(input.Tier) && !ValidTiers.Contains(input.Tier))
                throw new ArgumentException($"Invalid tier. Valid values: {string.Join(", ", ValidTiers)}");

            // Validate time range
            if (input.TimeFrom.HasValue && input.TimeTo.HasValue)
            {
                if (input.TimeFrom >= input.TimeTo)
                    throw new ArgumentException("TimeFrom must be before TimeTo");
            }

            // Validate price modifier
            if (input.IsPercentage && (input.PriceModifier < 0 || input.PriceModifier > 200))
                throw new ArgumentException("Percentage modifier must be between 0 and 10 (0% - 2000%)");

            var priceRule = new Entities.PriceRule
            {
                CinemaId = input.CinemaId,
                Name = input.Name.Trim(),
                Tier = input.Tier,
                DayOfWeek = input.DayOfWeek,
                TimeFrom = input.TimeFrom,
                TimeTo = input.TimeTo,
                PriceModifier = input.PriceModifier,
                IsPercentage = input.IsPercentage,
                IsActive = true,
                Priority = input.Priority
            };

            _db.PriceRules.Add(priceRule);
            await _db.SaveChangesAsync();
            return priceRule.Id;
        }

        public async Task UpdateAsync(UpdatePriceRuleDto input)
        {
            var priceRule = await _db.PriceRules
                .FirstOrDefaultAsync(pr => pr.Id == input.Id);

            if (priceRule == null)
                throw new KeyNotFoundException($"PriceRule with Id={input.Id} not found");

            if (string.IsNullOrWhiteSpace(input.Name))
                throw new ArgumentException("Rule name is required");

            // Validate tier if provided
            if (!string.IsNullOrEmpty(input.Tier) && !ValidTiers.Contains(input.Tier))
                throw new ArgumentException($"Invalid tier. Valid values: {string.Join(", ", ValidTiers)}");

            // Validate time range
            if (input.TimeFrom.HasValue && input.TimeTo.HasValue)
            {
                if (input.TimeFrom >= input.TimeTo)
                    throw new ArgumentException("TimeFrom must be before TimeTo");
            }

            priceRule.Name = input.Name.Trim();
            priceRule.Tier = input.Tier;
            priceRule.DayOfWeek = input.DayOfWeek;
            priceRule.TimeFrom = input.TimeFrom;
            priceRule.TimeTo = input.TimeTo;
            priceRule.PriceModifier = input.PriceModifier;
            priceRule.IsPercentage = input.IsPercentage;
            priceRule.IsActive = input.IsActive;
            priceRule.Priority = input.Priority;

            await _db.SaveChangesAsync();
        }

        public async Task<PriceRuleDto> GetByIdAsync(int id)
        {
            var priceRule = await _db.PriceRules
                .Include(pr => pr.Cinema)
                .FirstOrDefaultAsync(pr => pr.Id == id);

            if (priceRule == null)
                throw new KeyNotFoundException($"PriceRule with Id={id} not found");

            return MapToDto(priceRule);
        }

        public async Task<List<PriceRuleDto>> GetByCinemaAsync(int cinemaId)
        {
            var rules = await _db.PriceRules
                .Include(pr => pr.Cinema)
                .Where(pr => pr.CinemaId == cinemaId)
                .OrderBy(pr => pr.Priority)
                .ThenBy(pr => pr.Name)
                .ToListAsync();

            return rules.Select(MapToDto).ToList();
        }

        public async Task<List<PriceRuleDto>> GetActiveRulesAsync(int cinemaId)
        {
            var rules = await _db.PriceRules
                .Include(pr => pr.Cinema)
                .Where(pr => pr.CinemaId == cinemaId && pr.IsActive)
                .OrderBy(pr => pr.Priority)
                .ToListAsync();

            return rules.Select(MapToDto).ToList();
        }

        public async Task DeleteAsync(int id)
        {
            var priceRule = await _db.PriceRules.FindAsync(id);
            if (priceRule == null) return;

            _db.PriceRules.Remove(priceRule);
            await _db.SaveChangesAsync();
        }

        public async Task ToggleActiveAsync(int id)
        {
            var priceRule = await _db.PriceRules.FindAsync(id);
            if (priceRule == null)
                throw new KeyNotFoundException($"PriceRule with Id={id} not found");

            priceRule.IsActive = !priceRule.IsActive;
            await _db.SaveChangesAsync();
        }

        public async Task<decimal> CalculatePriceAsync(
            int cinemaId,
            string tier,
            DateTime showtime,
            decimal basePrice)
        {
            // Get applicable rules
            var rules = await _db.PriceRules
                .Where(pr => pr.CinemaId == cinemaId && pr.IsActive)
                .OrderBy(pr => pr.Priority)
                .ToListAsync();

            decimal finalPrice = basePrice;
            var showtimeDay = showtime.DayOfWeek;
            var showtimeTime = TimeOnly.FromDateTime(showtime);

            foreach (var rule in rules)
            {
                bool applies = true;

                // Check tier match (null = applies to all)
                if (rule.Tier != null && rule.Tier != tier)
                    applies = false;

                // Check day of week match (null = applies to all days)
                if (rule.DayOfWeek.HasValue && rule.DayOfWeek.Value != showtimeDay)
                    applies = false;

                // Check time range match (null = applies to all times)
                if (rule.TimeFrom.HasValue && rule.TimeTo.HasValue)
                {
                    if (showtimeTime < rule.TimeFrom.Value || showtimeTime > rule.TimeTo.Value)
                        applies = false;
                }

                if (applies)
                {
                    if (rule.IsPercentage)
                    {
                        // Multiply by percentage (1.5 = +50%, 0.8 = -20%)
                        finalPrice *= (1 + rule.PriceModifier / 100m);
                    }
                    else
                    {
                        // Add fixed amount
                        finalPrice += rule.PriceModifier;
                    }
                }
            }

            return Math.Max(0, finalPrice); // Ensure price is not negative
        }

        public async Task<PagedResultDto<PriceRuleDto>> GetPagedAsync(
            PagedRequestDto input,
            int? cinemaId = null,
            bool? isActive = null,
            string? tier = null)
        {
            var query = _db.PriceRules
                .Include(pr => pr.Cinema)
                .AsQueryable();
            //filter
            if (cinemaId.HasValue)
            {
                query = query.Where(pr => pr.CinemaId == cinemaId.Value);
            }

            if (isActive.HasValue)
            {
                query = query.Where(pr => pr.IsActive == isActive.Value);
            }

            if (!string.IsNullOrWhiteSpace(tier))
            {
                query = query.Where(pr => pr.Tier == tier);
            }

            // Search
            if (!string.IsNullOrWhiteSpace(input.SearchTerm))
            {
                var term = input.SearchTerm.Trim().ToLower();
                query = query.Where(pr =>
                    pr.Name.ToLower().Contains(term) ||
                    (pr.Tier != null && pr.Tier.ToLower().Contains(term))
                );
            }

            // Sort
            query = input.SortBy?.ToLower() switch
            {
                "name" => input.SortDescending
                    ? query.OrderByDescending(pr => pr.Name)
                    : query.OrderBy(pr => pr.Name),
                "priority" => input.SortDescending
                    ? query.OrderByDescending(pr => pr.Priority)
                    : query.OrderBy(pr => pr.Priority),
                "cinema" => input.SortDescending
                    ? query.OrderByDescending(pr => pr.Cinema.Name)
                    : query.OrderBy(pr => pr.Cinema.Name),
                _ => query.OrderBy(pr => pr.Priority).ThenBy(pr => pr.Name)
            };

            var totalCount = await query.CountAsync();

            var items = await query
                .Skip((input.PageNumber - 1) * input.PageSize)
                .Take(input.PageSize)
                .ToListAsync();

            return new PagedResultDto<PriceRuleDto>
            {
                Items = items.Select(MapToDto).ToList(),
                TotalCount = totalCount,
                PageNumber = input.PageNumber,
                PageSize = input.PageSize
            };
        }
    }
}