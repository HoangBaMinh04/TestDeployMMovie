using Microsoft.EntityFrameworkCore;
using MovieWeb.DTOs.Common;
using MovieWeb.Entities;
using MovieWeb.Service.Tmdb;
using System.Globalization;
using System.Reflection;
using System.Runtime.Serialization;
using System.Text;
using System.Text.RegularExpressions;

namespace MovieWeb.Service.Movie
{
    public interface IMovieAppService
    {
        Task<long> CreateAsync(CreateMovieDto input);
        Task UpdateAsync(UpdateMovieDto input);
        Task<MovieDto> GetByIdAsync(long id);
        Task<List<MovieDto>> GetByNameAsync(string name);
        Task<List<MovieDto>> GetBySlugAsync(string slug);
        Task<List<MovieDto>> GetAllAsync();
        Task<List<MovieDto>> GetAllIsDeleteAsync(bool includeDeleted = true);
        Task DeleteAsync(long id);
        Task<bool> ToggleDeleteAsync(long id);
        Task<List<MovieDto>> GetByCategoryAsync(long categoryId);
        Task<List<MovieDto>> GetByCountryAsync(long countryId);
        Task<List<MovieDto>> GetByCinemaAsync(int cinemaId);
        Task<List<MovieDto>> GetFilteredAsync(long? categoryId, long? countryId, int? cinemaId, string? q);
        Task<PagedResultDto<MovieDto>> GetPagedAsync(PagedRequestDto input,
            long? categoryId = null, long? countryId = null);
        Task<PagedResultDto<MovieDto>> GetPagedAdminAsync(
            PagedRequestDto input,
            long? categoryId = null,
            long? countryId = null,
            bool includeDeleted = true);
        Task<List<MovieDto>> GetNowShowingAsync();
        Task<List<MovieDto>> GetComingSoonAsync();
    }

    public class MovieAppService : IMovieAppService
    {
        private readonly MyDbContext _db;
        private readonly ITmdbClient _tmdbClient;

        public MovieAppService(MyDbContext db, ITmdbClient tmdbClient)
        {
            _db = db;
            _tmdbClient = tmdbClient;
        }

        // -------- Helpers --------
        private async Task EnsureCountryExistsAsync(long countryId)
        {
            var exists = await _db.Countries.AnyAsync(x => x.Id == countryId);
            if (!exists)
                throw new ArgumentException($"CountryId={countryId} không tồn tại.");
        }

        private static MovieDto MapToDto(Entities.Movie m)
        {
            return new MovieDto
            {
                Id = m.Id,
                Name = m.Name,
                Description = m.Description,
                Slug = m.Slug,
                Quality = m.Quality,
                Year = m.Year,
                Duration = m.Duration,
                ReleaseDate = m.ReleaseDate,
                AgeRating = m.AgeRating,
                TrailerUrl = m.TrailerUrl,
                ThumbnailUrl = m.ThumbnailUrl,
                PosterUrl = m.PosterUrl,
                IsPublished = m.IsPublished,
                IsDeleted = m.IsDeleted,
                AverageRating = m.AverageRating,
                TotalReviews = m.TotalReviews,
                CreatedAt = m.CreatedAt,
                CountryId = m.CountryId,
                CountryName = m.Country?.Name,
                Categories = m.MovieCategories?
                    .OrderBy(mc => mc.DisplayOrder)
                    .Select(mc => new MovieCategoryInfo
                    {
                        CategoryId = mc.CategoryId,
                        CategoryName = mc.Category.Name,
                        IsPrimary = mc.IsPrimary,
                        DisplayOrder = mc.DisplayOrder
                    }).ToList() ?? new()
            };
        }


        // ==================== Helpers ====================
        private static IReadOnlyList<string> GetEnumDisplayValues<TEnum>() where TEnum : struct, Enum
        {
            return Enum.GetValues(typeof(TEnum))
                .Cast<Enum>()
                .Select(e =>
                {
                    var member = typeof(TEnum).GetMember(e.ToString()).First();
                    var attr = member.GetCustomAttribute<EnumMemberAttribute>();
                    return attr?.Value ?? e.ToString();
                })
                .ToList();
        }

        public async Task<long> CreateAsync(CreateMovieDto input)
        {
            if (string.IsNullOrWhiteSpace(input.Name))
                throw new ArgumentException("Name is required");

            // Extra defense: enum range
            if (!Enum.IsDefined(typeof(Quality), input.Quality))
            {
                var allow = string.Join(", ", GetEnumDisplayValues<Quality>());
                throw new ArgumentException($"Invalid quality. Valid options: {allow}");
            }

            if (input.AgeRating.HasValue && !Enum.IsDefined(typeof(AgeRating), input.AgeRating.Value))
            {
                var allow = string.Join(", ", GetEnumDisplayValues<AgeRating>());
                throw new ArgumentException($"Invalid age rating. Valid options: {allow} (or null)");
            }

            await EnsureCountryExistsAsync(input.CountryId);

            var baseSlug = BuildBaseSlug(input.Slug, input.Name);
            var uniqueSlug = await GenerateUniqueSlugAsync(baseSlug);
            var resolvedDescription = await ResolveDescriptionAsync(input.Description, input.Name, input.Year);
            var movie = new Entities.Movie
            {
                Name = input.Name.Trim(),
                Description = resolvedDescription,
                Quality = input.Quality,
                Slug = uniqueSlug,
                Year = input.Year,
                Duration = input.Duration,
                ReleaseDate = input.ReleaseDate,
                AgeRating = input.AgeRating,
                TrailerUrl = await ResolveTrailerUrlAsync(input.TrailerUrl, input.Name, input.Year),
                ThumbnailUrl = input.ThumbnailUrl,
                PosterUrl = await ResolvePosterUrlAsync(input.PosterUrl, input.Name, input.Year),
                CountryId = input.CountryId,
                CreatedAt = DateTime.UtcNow,
                IsPublished = true,
            };

            _db.Movies.Add(movie);
            await _db.SaveChangesAsync(); // Cần Id trước khi thêm MovieCategory

            // Thêm categories với metadata
            if (input.Categories?.Any() == true)
            {
                var categoryIds = input.Categories.Select(c => c.CategoryId).Distinct().ToList();

                // Validate categories tồn tại
                var existingCategories = await _db.Categories
                    .Where(c => categoryIds.Contains(c.Id))
                    .Select(c => c.Id)
                    .ToListAsync();

                if (existingCategories.Count != categoryIds.Count)
                {
                    var missing = categoryIds.Except(existingCategories);
                    throw new ArgumentException($"CategoryId không tồn tại: {string.Join(", ", missing)}");
                }

                // Thêm MovieCategory
                foreach (var catDto in input.Categories)
                {
                    _db.MovieCategories.Add(new Entities.MovieCategory
                    {
                        MovieId = movie.Id,
                        CategoryId = catDto.CategoryId,
                        IsPrimary = catDto.IsPrimary,
                        DisplayOrder = catDto.DisplayOrder
                    });
                }

                await _db.SaveChangesAsync();
            }

            return movie.Id;
        }

        public async Task UpdateAsync(UpdateMovieDto input)
        {
            var movie = await _db.Movies
                .Include(m => m.MovieCategories)
                .FirstOrDefaultAsync(m => m.Id == input.Id);

            if (movie == null)
                throw new KeyNotFoundException("Movie not found");

            if (string.IsNullOrWhiteSpace(input.Name))
                throw new ArgumentException("Name is required");

            // Validate Country nếu thay đổi
            if (movie.CountryId != input.CountryId)
                await EnsureCountryExistsAsync(input.CountryId);

            var baseSlug = BuildBaseSlug(input.Slug, input.Name);
            // Update các trường cơ bản
            movie.Name = input.Name.Trim();
            movie.Description = await ResolveDescriptionAsync(input.Description, input.Name, input.Year);
            movie.Slug = await GenerateUniqueSlugAsync(baseSlug, ignoreId: movie.Id);
            movie.Quality = input.Quality;
            movie.Year = input.Year;
            movie.Duration = input.Duration;
            movie.ReleaseDate = input.ReleaseDate;
            movie.AgeRating = input.AgeRating;
            var resolvedTrailerUrl = await ResolveTrailerUrlAsync(input.TrailerUrl, input.Name, input.Year);
            if (!IsNullish(resolvedTrailerUrl))
                movie.TrailerUrl = resolvedTrailerUrl;

            movie.ThumbnailUrl = input.ThumbnailUrl;
            movie.IsPublished = input.IsPublished;
            movie.CountryId = input.CountryId;

            var resolvedPosterUrl = await ResolvePosterUrlAsync(input.PosterUrl, input.Name, input.Year);
            if (!IsNullish(resolvedPosterUrl))
                movie.PosterUrl = resolvedPosterUrl;

            // Sync MovieCategories
            var desiredCategories = input.Categories ?? new();
            var categoryIds = desiredCategories.Select(c => c.CategoryId).Distinct().ToList();

            // Validate categories nếu có
            if (categoryIds.Any())
            {
                var existingCategories = await _db.Categories
                    .Where(c => categoryIds.Contains(c.Id))
                    .Select(c => c.Id)
                    .ToListAsync();

                if (existingCategories.Count != categoryIds.Count)
                {
                    var missing = categoryIds.Except(existingCategories);
                    throw new ArgumentException($"CategoryId không tồn tại: {string.Join(", ", missing)}");
                }
            }

            // Xóa các MovieCategory không còn trong danh sách
            var toRemove = movie.MovieCategories
                .Where(mc => !categoryIds.Contains(mc.CategoryId))
                .ToList();

            foreach (var mc in toRemove)
                _db.MovieCategories.Remove(mc);

            // Update hoặc thêm mới
            foreach (var catDto in desiredCategories)
            {
                var existing = movie.MovieCategories
                    .FirstOrDefault(mc => mc.CategoryId == catDto.CategoryId);

                if (existing != null)
                {
                    // Update metadata
                    existing.IsPrimary = catDto.IsPrimary;
                    existing.DisplayOrder = catDto.DisplayOrder;
                }
                else
                {
                    // Thêm mới
                    _db.MovieCategories.Add(new Entities.MovieCategory
                    {
                        MovieId = movie.Id,
                        CategoryId = catDto.CategoryId,
                        IsPrimary = catDto.IsPrimary,
                        DisplayOrder = catDto.DisplayOrder
                    });
                }
            }

            await _db.SaveChangesAsync();
        }

        public async Task<MovieDto> GetByIdAsync(long id)
        {
            var movie = await _db.Movies
                .Include(m => m.Country)
                .Include(m => m.MovieCategories)
                    .ThenInclude(mc => mc.Category)
                .FirstOrDefaultAsync(m => m.Id == id);

            if (movie == null)
                throw new KeyNotFoundException("Movie not found");

            return MapToDto(movie);
        }

        public async Task<List<MovieDto>> GetAllAsync()
        {
            var movies = await _db.Movies
                .Include(m => m.Country)
                .Include(m => m.MovieCategories)
                    .ThenInclude(mc => mc.Category)
                .OrderBy(m => m.Name)
                .ToListAsync();

            return movies.Select(MapToDto).ToList();
        }

        public async Task DeleteAsync(long id)
        {
            // GỢI Ý: kiểm tra tồn tại sớm
            var exists = await _db.Movies.AnyAsync(m => m.Id == id);
            if (!exists) return;

            using var tx = await _db.Database.BeginTransactionAsync();

            // Xóa tất cả bảng phụ thuộc tới Movie trước
            await _db.Showtimes.Where(s => s.MovieId == id).ExecuteDeleteAsync();
            await _db.MovieCategories.Where(mc => mc.MovieId == id).ExecuteDeleteAsync();

            // Cuối cùng xóa Movie
            await _db.Movies.Where(m => m.Id == id).ExecuteDeleteAsync();

            await tx.CommitAsync();
        }

        public async Task<List<MovieDto>> GetByNameAsync(string name)
        {
            var movies = await _db.Movies
                .Include(m => m.Country)
                .Include(m => m.MovieCategories)
                    .ThenInclude(mc => mc.Category)
                .Where(m => EF.Functions.ILike(m.Name, $"%{name}%"))
                .ToListAsync();

            return movies.Select(MapToDto).ToList();
        }


        public async Task<List<MovieDto>> GetByCinemaAsync(int cinemaId)
        {
            var movies = await _db.Movies
                .Include(m => m.Country)
                .Include(m => m.MovieCategories)
                    .ThenInclude(mc => mc.Category)
                .Where(m => m.Showtimes.Any(st => st.CinemaId == cinemaId))
                .OrderBy(m => m.Name)
                .ToListAsync();

            return movies.Select(MapToDto).ToList();
        }

        public async Task<List<MovieDto>> GetByCategoryAsync(long categoryId)
        {
            var movies = await _db.Movies
                .Include(m => m.Country)
                .Include(m => m.MovieCategories)
                    .ThenInclude(mc => mc.Category)
                .Where(m => m.MovieCategories.Any(mc => mc.CategoryId == categoryId))
                .ToListAsync();

            return movies.Select(MapToDto).ToList();
        }

        public async Task<List<MovieDto>> GetByCountryAsync(long countryId)
        {
            var movies = await _db.Movies
                .Include(m => m.Country)
                .Include(m => m.MovieCategories)
                    .ThenInclude(mc => mc.Category)
                .Where(m => m.CountryId == countryId)
                .ToListAsync();

            return movies.Select(MapToDto).ToList();
        }

        public async Task<List<MovieDto>> GetFilteredAsync(long? categoryId, long? countryId, int? cinemaId, string? q)
        {
            var queryable = _db.Movies
                .Include(m => m.Country)
                .Include(m => m.MovieCategories)
                    .ThenInclude(mc => mc.Category)
                .AsQueryable();

            if (categoryId.HasValue)
                queryable = queryable.Where(m => m.MovieCategories.Any(mc => mc.CategoryId == categoryId.Value));

            if (countryId.HasValue)
                queryable = queryable.Where(m => m.CountryId == countryId.Value);

            if (cinemaId.HasValue)
                queryable = queryable.Where(m => m.Showtimes.Any(st => st.CinemaId == cinemaId.Value));

            if (!string.IsNullOrWhiteSpace(q))
                queryable = queryable.Where(m => EF.Functions.ILike(m.Name, $"%{q}%"));

            var data = await queryable
                .OrderBy(m => m.Name)
                .ToListAsync();

            return data.Select(MapToDto).ToList();
        }

        public async Task<PagedResultDto<MovieDto>> GetPagedAsync(
            PagedRequestDto input,
            long? categoryId = null,
            long? countryId = null)
        {
            var query = _db.Movies
                .AsNoTracking()
                .Include(m => m.MovieCategories)
                    .ThenInclude(mc => mc.Category)
                .Include(m => m.Country)
                .AsQueryable();

            // Search
            if (!string.IsNullOrWhiteSpace(input.SearchTerm))
            {
                var term = input.SearchTerm.Trim().ToLower();
                query = query.Where(m =>
                    m.Name.ToLower().Contains(term) ||
                    (m.Slug != null && m.Slug.ToLower().Contains(term)) ||
                    (m.Description != null && m.Description.ToLower().Contains(term))
                );
            }

            // Filter theo Category
            if (categoryId.HasValue)
            {
                var catId = categoryId.Value;
                query = query.Where(m => m.MovieCategories.Any(mc => mc.CategoryId == catId));
            }

            // Filter theo Country
            if (countryId.HasValue)
            {
                var cId = countryId.Value;
                query = query.Where(m => m.CountryId == cId);
            }

            // Sort
            query = input.SortBy?.ToLower() switch
            {
                "name" => input.SortDescending
                    ? query.OrderByDescending(m => m.Name)
                    : query.OrderBy(m => m.Name),
                "id" => input.SortDescending
                    ? query.OrderByDescending(m => m.Id)
                    : query.OrderBy(m => m.Id),
                "year" => input.SortDescending
                    ? query.OrderByDescending(m => m.Year)
                    : query.OrderBy(m => m.Year),
                "createdat" => input.SortDescending
                    ? query.OrderByDescending(m => m.CreatedAt)
                    : query.OrderBy(m => m.CreatedAt),
                "releasedate" => input.SortDescending
                    ? query.OrderByDescending(m => m.ReleaseDate)
                    : query.OrderBy(m => m.ReleaseDate),
                _ => query.OrderBy(m => m.Name) // default
            };

            // Total
            var totalCount = await query.CountAsync();

            // Paging
            var items = await query
                .Skip((input.PageNumber - 1) * input.PageSize)
                .Take(input.PageSize)
                .ToListAsync();

            return new PagedResultDto<MovieDto>
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


        public async Task<List<MovieDto>> GetNowShowingAsync()
        {
            var now = DateTime.UtcNow;

            var movies = await _db.Movies
                .Include(m => m.Country)
                .Include(m => m.MovieCategories)
                    .ThenInclude(mc => mc.Category)
                .Where(m => m.IsPublished && !m.IsDeleted && m.ReleaseDate <= now)
                .OrderByDescending(m => m.ReleaseDate)
                .ToListAsync();

            return movies.Select(MapToDto).ToList();
        }

        public async Task<List<MovieDto>> GetComingSoonAsync()
        {
            var now = DateTime.UtcNow;

            var movies = await _db.Movies
                .Include(m => m.Country)
                .Include(m => m.MovieCategories)
                    .ThenInclude(mc => mc.Category)
                .Where(m => m.IsPublished && !m.IsDeleted && m.ReleaseDate > now)
                .OrderBy(m => m.ReleaseDate)
                .ToListAsync();

            return movies.Select(MapToDto).ToList();
        }
        private async Task<string?> ResolvePosterUrlAsync(string? providedPosterUrl, string title, int? year)
        {
            if (!IsNullish(providedPosterUrl))
                return providedPosterUrl!.Trim();

            var posterPath = await _tmdbClient.TryGetPosterPathAsync(title, year)
                          ?? await _tmdbClient.TryGetPosterPathAsync(title, null);
            return _tmdbClient.BuildPosterUrl(posterPath);
        }


        private async Task<string?> ResolveTrailerUrlAsync(string? providedTrailerUrl, string title, int? year)
        {
            if (!IsNullish(providedTrailerUrl))
                return providedTrailerUrl!.Trim();

            return await _tmdbClient.TryGetTrailerUrlAsync(title, year)
                ?? await _tmdbClient.TryGetTrailerUrlAsync(title, null); // fallback: bỏ year
        }

        private async Task<string?> ResolveDescriptionAsync(string? providedDescription, string title, int? year)
        {
            var trimmedDescription = IsNullish(providedDescription) ? null : providedDescription!.Trim();

            var overview = await _tmdbClient.TryGetOverviewAsync(title, year)
                        ?? await _tmdbClient.TryGetOverviewAsync(title, null); // fallback: bỏ year
            var trimmedOverview = IsNullish(overview) ? null : overview!.Trim();

            if (trimmedDescription is null) return trimmedOverview;
            if (trimmedOverview is null) return trimmedDescription;
            if (trimmedDescription.Contains(trimmedOverview, StringComparison.OrdinalIgnoreCase))
                return trimmedDescription;

            return $"{trimmedDescription}\n\n{trimmedOverview}";
        }

        public async Task<List<MovieDto>> GetBySlugAsync(string slug)
        {
            var movies = await _db.Movies
                .Include(m => m.Country)
                .Include(m => m.MovieCategories)
                    .ThenInclude(mc => mc.Category)
                .Where(m => m.Slug == slug || EF.Functions.ILike(m.Name, $"%{slug}%"))
                .ToListAsync();

            if (movies == null)
                throw new KeyNotFoundException("Movie not found");
            return movies.Select(MapToDto).ToList();
        }

        public async Task<bool> ToggleDeleteAsync(long id)
        {
            var movie = await _db.Movies
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(m => m.Id == id);

            if (movie == null)
            {
                throw new KeyNotFoundException("Movie not found");
            }

            movie.IsDeleted = !movie.IsDeleted;
            movie.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return movie.IsDeleted;
        }

        private static bool IsNullish(string? s) =>
    string.IsNullOrWhiteSpace(s)
    || string.Equals(s, "null", StringComparison.OrdinalIgnoreCase)
    || string.Equals(s, "undefined", StringComparison.OrdinalIgnoreCase);

        public async Task<List<MovieDto>> GetAllIsDeleteAsync(bool includeDeleted = true)
        {
            var query = _db.Movies
                .Include(m => m.Country)
                .Include(m => m.MovieCategories).ThenInclude(mc => mc.Category)
                .AsQueryable();

            if (includeDeleted) query = query.IgnoreQueryFilters();

            var movies = await query.OrderBy(m => m.Name).ToListAsync();
            return movies.Select(MapToDto).ToList();
        }

        public async Task<PagedResultDto<MovieDto>> GetPagedAdminAsync(
            PagedRequestDto input,
            long? categoryId = null,
            long? countryId = null,
            bool includeDeleted = true)
        {
            var query = _db.Movies
                .AsNoTracking()
                .Include(m => m.MovieCategories).ThenInclude(mc => mc.Category)
                .Include(m => m.Country)
                .AsQueryable();

            // Bỏ global query filter nếu muốn lấy full
            if (includeDeleted)
                query = query.IgnoreQueryFilters();

            // Search
            if (!string.IsNullOrWhiteSpace(input.SearchTerm))
            {
                var term = input.SearchTerm.Trim().ToLower();
                query = query.Where(m =>
                    m.Name.ToLower().Contains(term) ||
                    (m.Slug != null && m.Slug.ToLower().Contains(term)) ||
                    (m.Description != null && m.Description.ToLower().Contains(term)));
            }

            // Filter
            if (categoryId.HasValue)
                query = query.Where(m => m.MovieCategories.Any(mc => mc.CategoryId == categoryId.Value));

            if (countryId.HasValue)
                query = query.Where(m => m.CountryId == countryId.Value);


            // Sort
            query = input.SortBy?.ToLower() switch
            {
                "name" => input.SortDescending ? query.OrderByDescending(m => m.Name) : query.OrderBy(m => m.Name),
                "id" => input.SortDescending ? query.OrderByDescending(m => m.Id) : query.OrderBy(m => m.Id),
                "year" => input.SortDescending ? query.OrderByDescending(m => m.Year) : query.OrderBy(m => m.Year),
                "createdat" => input.SortDescending ? query.OrderByDescending(m => m.CreatedAt) : query.OrderBy(m => m.CreatedAt),
                "releasedate" => input.SortDescending ? query.OrderByDescending(m => m.ReleaseDate) : query.OrderBy(m => m.ReleaseDate),
                _ => query.OrderBy(m => m.Name)
            };

            var totalCount = await query.CountAsync();

            var items = await query
                .Skip((input.PageNumber - 1) * input.PageSize)
                .Take(input.PageSize)
                .ToListAsync();

            return new PagedResultDto<MovieDto>
            {
                Items = items.Select(MapToDto).ToList(),
                TotalCount = totalCount,
                PageNumber = input.PageNumber,
                PageSize = input.PageSize
            };
        }

    }


}