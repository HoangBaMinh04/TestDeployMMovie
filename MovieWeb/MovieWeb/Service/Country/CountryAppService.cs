using Microsoft.EntityFrameworkCore;
using MovieWeb.DTOs.Common;

namespace MovieWeb.Service.Country
{
    public interface ICountryAppService
    {
        Task<long> CreateAsync(CreateCountryDto input);
        Task UpdateAsync(UpdateCountryDto input);
        Task<CountryDto> GetAsync(long id);
        Task<List<CountryDto>> GetByNameAsync(string name);
        Task<List<CountryDto>> GetAllAsync();
        Task DeleteAsync(long id);
        Task<PagedResultDto<CountryDto>> GetPagedAsync(PagedRequestDto input);
    }

    public class CountryAppService : ICountryAppService
    {
        private readonly MyDbContext _db;
        private const long UnknownCountryId = 1;

        public CountryAppService(MyDbContext db)
        {
            _db = db;
        }

        private static CountryDto MapToDto(Entities.Country c)
        {
            return new CountryDto
            {
                Id = c.Id,
                Name = c.Name,
                Code = c.Code,
                MovieCount = c.Movies?.Count ?? 0
            };
        }

        private async Task EnsureUnknownCountryExistsAsync()
        {
            var exists = await _db.Countries.AnyAsync(x => x.Id == UnknownCountryId);
            if (!exists)
            {
                _db.Countries.Add(new Entities.Country
                {
                    Id = UnknownCountryId,
                    Name = "Unknown",
                    Code = "XX"
                });
                await _db.SaveChangesAsync();
            }
        }

        public async Task<long> CreateAsync(CreateCountryDto input)
        {
            if (string.IsNullOrWhiteSpace(input.Name))
                throw new ArgumentException("Name is required");

            var country = new Entities.Country
            {
                Name = input.Name.Trim(),
                Code = input.Code?.Trim().ToUpper(),
            };

            _db.Countries.Add(country);
            await _db.SaveChangesAsync();

            return country.Id;
        }

        public async Task UpdateAsync(UpdateCountryDto input)
        {
            var country = await _db.Countries
                .FirstOrDefaultAsync(c => c.Id == input.Id);

            if (country == null)
                throw new KeyNotFoundException("Country not found");

            if (string.IsNullOrWhiteSpace(input.Name))
                throw new ArgumentException("Name is required");

            country.Name = input.Name.Trim();
            country.Code = input.Code.Trim().ToUpper();

            await _db.SaveChangesAsync();
        }

        public async Task<CountryDto> GetAsync(long id)
        {
            var country = await _db.Countries
                .Include(c => c.Movies)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (country == null)
                throw new KeyNotFoundException("Country not found");

            return MapToDto(country);
        }

        public async Task<List<CountryDto>> GetAllAsync()
        {
            var countries = await _db.Countries
                .Include(c => c.Movies)
                .OrderBy(c => c.Name)
                .ToListAsync();

            return countries.Select(MapToDto).ToList();
        }

        public async Task DeleteAsync(long id)
        {
            var country = await _db.Countries
                .Include(c => c.Movies)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (country == null) return;

            // Chuyển tất cả movies về Unknown trước khi xóa
            if (country.Movies?.Any() == true)
            {
                await EnsureUnknownCountryExistsAsync();
                foreach (var m in country.Movies)
                    m.CountryId = UnknownCountryId;
            }

            _db.Countries.Remove(country);
            await _db.SaveChangesAsync();
        }

        public async Task<PagedResultDto<CountryDto>> GetPagedAsync(PagedRequestDto input)
        {
            var query = _db.Countries
                .Include(c => c.Movies)
                .AsQueryable();

            // Search
            if (!string.IsNullOrWhiteSpace(input.SearchTerm))
            {
                var search = input.SearchTerm.ToUpper();
                query = query.Where(ct =>
                    ct.Name.ToLower().Contains(search) ||
                    (ct.Code != null && ct.Code.ToUpper().Contains(search))
                );
            }

            // Sort
            query = input.SortBy?.ToLower() switch
            {
                "name" => input.SortDescending
                    ? query.OrderByDescending(c => c.Name)
                    : query.OrderBy(c => c.Name),
                "code" => input.SortDescending
                    ? query.OrderByDescending(c => c.Code)
                    : query.OrderBy(c => c.Code),
                "id" => input.SortDescending
                    ? query.OrderByDescending(c => c.Id)
                    : query.OrderBy(c => c.Id),
                "moviecount" => input.SortDescending
                    ? query.OrderByDescending(c => c.Movies.Count)
                    : query.OrderBy(c => c.Movies.Count),
                _ => query.OrderBy(c => c.Name)
            };

            var totalCount = await query.CountAsync();

            var items = await query
                .Skip((input.PageNumber - 1) * input.PageSize)
                .Take(input.PageSize)
                .ToListAsync();

            return new PagedResultDto<CountryDto>
            {
                Items = items.Select(MapToDto).ToList(),
                TotalCount = totalCount,
                PageNumber = input.PageNumber,
                PageSize = input.PageSize
            };
        }

        public async Task<List<CountryDto>> GetByNameAsync(string name)
        {
            var countries = await _db.Countries
                .Where(m => EF.Functions.ILike(m.Name, $"%{name}%"))
                .ToListAsync();

            return countries.Select(MapToDto).ToList();
        }
    }
}