using Microsoft.EntityFrameworkCore;
using MovieWeb.DTOs.Common;
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace MovieWeb.Service.Category
{
    public interface ICategoryAppService
    {
        Task<long> CreateAsync(CreateCategoryDto input);
        Task UpdateAsync(UpdateCategoryDto input);
        Task<CategoryDto> GetAsync(long id);
        Task<CategoryDetailDto> GetDetailAsync(long id);
        Task<List<CategoryDto>> GetByNameAsync(string name);
        Task<List<CategoryDto>> GetAllAsync();
        Task DeleteAsync(long id);
        Task<PagedResultDto<CategoryDto>> GetPagedAsync(PagedRequestDto input);
    }

    public class CategoryAppService : ICategoryAppService
    {
        private readonly MyDbContext _db;

        public CategoryAppService(MyDbContext db)
        {
            _db = db;
        }

        private static CategoryDto MapToDto(Entities.Category c)
        {
            return new CategoryDto
            {
                Id = c.Id,
                Name = c.Name,
                Slug = c.Slug,
                Description = c.Description,
                MovieCount = c.MovieCategories?.Count ?? 0
            };
        }

        private static CategoryDetailDto MapToDetailDto(Entities.Category c)
        {
            return new CategoryDetailDto
            {
                Id = c.Id,
                Name = c.Name,
                Slug = c.Slug,
                Description = c.Description,
                MovieCount = c.MovieCategories?.Count ?? 0,
                Movies = c.MovieCategories?
                    .OrderBy(mc => mc.DisplayOrder)
                    .Select(mc => new CategoryMovieInfo
                    {
                        MovieId = mc.MovieId,
                        MovieName = mc.Movie.Name,
                        IsPrimary = mc.IsPrimary
                    }).ToList() ?? new()
            };
        }

        public async Task<long> CreateAsync(CreateCategoryDto input)
        {
            if (string.IsNullOrWhiteSpace(input.Name))
                throw new ArgumentException("Name is required");

            var baseSlug = BuildBaseSlug(input.Slug, input.Name);
            var uniqueSlug = await GenerateUniqueSlugAsync(baseSlug);
            var category = new Entities.Category
            {
                Name = input.Name.Trim(),
                Slug = uniqueSlug,
                Description = input.Description
            };

            _db.Categories.Add(category);
            await _db.SaveChangesAsync();
            return category.Id;
        }

        public async Task UpdateAsync(UpdateCategoryDto input)
        {
            var category = await _db.Categories
                .FirstOrDefaultAsync(c => c.Id == input.Id);

            if (category == null)
                throw new KeyNotFoundException("Category not found");

            if (string.IsNullOrWhiteSpace(input.Name))
                throw new ArgumentException("Name is required");

            category.Name = input.Name.Trim();
            var baseSlug = BuildBaseSlug(input.Slug, input.Name);
            category.Slug = await GenerateUniqueSlugAsync(baseSlug, ignoreId: category.Id);
            category.Description = input.Description;

            await _db.SaveChangesAsync();
        }

        public async Task<CategoryDto> GetAsync(long id)
        {
            var category = await _db.Categories
                .Include(c => c.MovieCategories)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (category == null)
                throw new KeyNotFoundException("Category not found");

            return MapToDto(category);
        }

        public async Task<CategoryDetailDto> GetDetailAsync(long id)
        {
            var category = await _db.Categories
                .Include(c => c.MovieCategories)
                    .ThenInclude(mc => mc.Movie)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (category == null)
                throw new KeyNotFoundException("Category not found");

            return MapToDetailDto(category);
        }

        public async Task<List<CategoryDto>> GetAllAsync()
        {
            var categories = await _db.Categories
                .Include(c => c.MovieCategories)
                .OrderBy(c => c.Name)
                .ToListAsync();

            return categories.Select(MapToDto).ToList();
        }

        public async Task DeleteAsync(long id)
        {
            var category = await _db.Categories
                .Include(c => c.MovieCategories)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (category == null) return;

            // Xóa các liên kết MovieCategory trước
            if (category.MovieCategories?.Any() == true)
            {
                _db.MovieCategories.RemoveRange(category.MovieCategories);
            }

            _db.Categories.Remove(category);
            await _db.SaveChangesAsync();
        }

        public async Task<PagedResultDto<CategoryDto>> GetPagedAsync(PagedRequestDto input)
        {
            var query = _db.Categories
                .Include(c => c.MovieCategories)
                .AsQueryable();

            // Search
            if (!string.IsNullOrWhiteSpace(input.SearchTerm))
            {
                var search = input.SearchTerm.ToLower();
                query = query.Where(c =>
                    c.Name.ToLower().Contains(search) ||
                    (c.Slug != null && c.Slug.ToLower().Contains(search)) ||
                    (c.Description != null && c.Description.ToLower().Contains(search))
                );
            }

            // Sort
            query = input.SortBy?.ToLower() switch
            {
                "name" => input.SortDescending
                    ? query.OrderByDescending(c => c.Name)
                    : query.OrderBy(c => c.Name),
                "id" => input.SortDescending
                    ? query.OrderByDescending(c => c.Id)
                    : query.OrderBy(c => c.Id),
                "moviecount" => input.SortDescending
                    ? query.OrderByDescending(c => c.MovieCategories.Count)
                    : query.OrderBy(c => c.MovieCategories.Count),
                _ => query.OrderBy(c => c.Name)
            };

            var totalCount = await query.CountAsync();

            var items = await query
                .Skip((input.PageNumber - 1) * input.PageSize)
                .Take(input.PageSize)
                .ToListAsync();

            return new PagedResultDto<CategoryDto>
            {
                Items = items.Select(MapToDto).ToList(),
                TotalCount = totalCount,
                PageNumber = input.PageNumber,
                PageSize = input.PageSize
            };
        }
        private static string GenerateSlug(string input)
        {
            if (string.IsNullOrWhiteSpace(input))
                return string.Empty;

            input = input.ToLowerInvariant();

            // Bỏ dấu tiếng Việt
            input = input.Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder();
            foreach (var c in input)
            {
                var unicodeCategory = CharUnicodeInfo.GetUnicodeCategory(c);
                if (unicodeCategory != UnicodeCategory.NonSpacingMark)
                {
                    sb.Append(c);
                }
            }
            input = sb.ToString().Normalize(NormalizationForm.FormC);
            input = input.Replace("đ", "d");

            // Bỏ ký tự đặc biệt
            input = Regex.Replace(input, @"[^a-z0-9\s-]", "");

            // Thay khoảng trắng bằng dấu -
            input = Regex.Replace(input, @"\s+", "-").Trim('-');

            // Bỏ dấu - thừa
            input = Regex.Replace(input, "-{2,}", "-");

            return input;
        }


        //  coi slug rỗng/null như không nhập -> sinh từ Name
        private static string BuildBaseSlug(string? rawSlug, string name)
        {
            var source = string.IsNullOrWhiteSpace(rawSlug) ? name : rawSlug!;
            return GenerateSlug(source);
        }

        // kiểm tra DB để tạo slug duy nhất (bỏ qua chính nó khi update)
        private async Task<string> GenerateUniqueSlugAsync(string baseSlug, long? ignoreId = null)
        {
            if (string.IsNullOrWhiteSpace(baseSlug))
                baseSlug = "item";

            var slug = baseSlug;
            var i = 2;

            while (await _db.Movies.AsNoTracking()
                     .AnyAsync(m => m.Slug == slug && (!ignoreId.HasValue || m.Id != ignoreId.Value)))
            {
                slug = $"{baseSlug}-{i++}";
            }
            return slug;
        }

        public async Task<List<CategoryDto>> GetByNameAsync(string name)
        {
            var categories = await _db.Categories
                .Where(m => EF.Functions.ILike(m.Name, $"%{name}%"))
                .ToListAsync();

            return categories.Select(MapToDto).ToList();
        }
    }
}