using Microsoft.EntityFrameworkCore;
using MovieWeb.DTOs.Common;
using MovieWeb.Entities;

namespace MovieWeb.Service.Review
{
    public interface IReviewAppService
    {
        Task<PagedResultDto<ReviewDto>> GetByMovieAsync(long movieId, ReviewQueryDto input, long? currentUserId = null);
        Task<ReviewDto> GetByIdAsync(long id, long? currentUserId = null);
        Task<List<ReviewDto>> GetMyReviewsAsync(long userId);
        Task<ReviewStatsDto> GetStatsAsync(long movieId);
        Task<CanReviewDto> CanUserReviewAsync(long userId, long movieId);
        Task<long> CreateAsync(CreateReviewDto input, long userId);
        Task UpdateAsync(UpdateReviewDto input, long userId);
        Task DeleteAsync(long id, long userId);
        Task VoteAsync(long reviewId, long userId, bool isHelpful);
        Task ReportAsync(long reviewId, long userId, ReportReviewDto input);
        Task<PagedResultDto<ReviewDto>> GetPagedAsync(ReviewAdminQueryDto input);
        Task<List<ReviewReportDto>> GetReportsAsync(bool includeResolved = false);
        Task ResolveReportAsync(long reportId, ResolveReviewReportDto input);
        Task HideAsync(long reviewId);
        Task ShowAsync(long reviewId);
        Task AdminDeleteAsync(long reviewId);
    }

    public class ReviewAppService : IReviewAppService
    {
        private readonly MyDbContext _db;

        public ReviewAppService(MyDbContext db)
        {
            _db = db;
        }

        public async Task<PagedResultDto<ReviewDto>> GetByMovieAsync(long movieId, ReviewQueryDto input, long? currentUserId = null)
        {
            var query = _db.MovieReviews
                .AsNoTracking()
                .Include(r => r.User)
                .Include(r => r.Movie)
                .Where(r => r.MovieId == movieId && !r.IsDeleted && r.IsVisible);

            if (input.OnlyVerified == true)
                query = query.Where(r => r.IsVerifiedPurchase);

            if (input.Rating.HasValue)
                query = query.Where(r => r.Rating == input.Rating.Value);

            query = input.SortBy?.ToLower() switch
            {
                "highest" => query.OrderByDescending(r => r.Rating).ThenByDescending(r => r.CreatedAt),
                "lowest" => query.OrderBy(r => r.Rating).ThenByDescending(r => r.CreatedAt),
                "helpful" => query.OrderByDescending(r => r.HelpfulCount - r.NotHelpfulCount).ThenByDescending(r => r.CreatedAt),
                _ => query.OrderByDescending(r => r.CreatedAt)
            };

            var pageNumber = Math.Max(1, input.PageNumber);
            var pageSize = Math.Clamp(input.PageSize, 1, 100);

            var totalCount = await query.CountAsync();
            var items = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var reviewIds = items.Select(r => r.Id).ToList();
            var userVotes = new Dictionary<long, bool?>();

            if (currentUserId.HasValue && reviewIds.Any())
            {
                userVotes = await _db.ReviewHelpfuls
                    .Where(v => v.UserId == currentUserId.Value && reviewIds.Contains(v.ReviewId))
                    .ToDictionaryAsync(v => v.ReviewId, v => (bool?)v.IsHelpful);
            }

            var dtoItems = items.Select(r => MapToDto(r, currentUserId, userVotes)).ToList();

            return new PagedResultDto<ReviewDto>
            {
                Items = dtoItems,
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize
            };
        }

        public async Task<ReviewDto> GetByIdAsync(long id, long? currentUserId = null)
        {
            var review = await _db.MovieReviews
                .AsNoTracking()
                .Include(r => r.User)
                .Include(r => r.Movie)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (review == null)
                throw new KeyNotFoundException("Review not found");

            bool? vote = null;
            if (currentUserId.HasValue)
            {
                vote = await _db.ReviewHelpfuls
                    .Where(v => v.ReviewId == id && v.UserId == currentUserId.Value)
                    .Select(v => (bool?)v.IsHelpful)
                    .FirstOrDefaultAsync();
            }

            var votes = new Dictionary<long, bool?> { { id, vote } };
            return MapToDto(review, currentUserId, votes);
        }

        public async Task<List<ReviewDto>> GetMyReviewsAsync(long userId)
        {
            var reviews = await _db.MovieReviews
                .AsNoTracking()
                .Include(r => r.Movie)
                .Include(r => r.User)
                .Where(r => r.UserId == userId && !r.IsDeleted)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return reviews.Select(r => MapToDto(r, userId, new Dictionary<long, bool?> { { r.Id, null } })).ToList();
        }

        public async Task<ReviewStatsDto> GetStatsAsync(long movieId)
        {
            var movie = await _db.Movies
                .AsNoTracking()
                .FirstOrDefaultAsync(m => m.Id == movieId);

            if (movie == null)
                throw new KeyNotFoundException("Movie not found");

            return new ReviewStatsDto
            {
                MovieId = movie.Id,
                AverageRating = movie.AverageRating,
                TotalReviews = movie.TotalReviews,
                RatingDistribution = new Dictionary<int, int>
                {
                    { 1, movie.TotalRating1Star },
                    { 2, movie.TotalRating2Star },
                    { 3, movie.TotalRating3Star },
                    { 4, movie.TotalRating4Star },
                    { 5, movie.TotalRating5Star }
                }
            };
        }

        public async Task<CanReviewDto> CanUserReviewAsync(long userId, long movieId)
        {
            var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
            {
                return new CanReviewDto
                {
                    CanReview = false,
                    Reason = "User not found",
                    RequiresPurchase = true
                };
            }

            if (!user.IsActive)
            {
                return new CanReviewDto
                {
                    CanReview = false,
                    Reason = "Tài khoản đã bị vô hiệu hoá",
                    RequiresPurchase = false
                };
            }

            var existing = await _db.MovieReviews
                .Where(r => r.MovieId == movieId && r.UserId == userId && !r.IsDeleted)
                .Select(r => new { r.Id, r.CreatedAt })
                .FirstOrDefaultAsync();

            if (existing != null)
            {
                return new CanReviewDto
                {
                    CanReview = false,
                    Reason = "Bạn đã đánh giá phim này",
                    HasExistingReview = true,
                    ExistingReviewId = existing.Id,
                    RequiresPurchase = false,
                    NextAllowedUpdate = existing.CreatedAt.AddDays(30)
                };
            }

            var now = DateTime.UtcNow;
            var eligibleOrders = await _db.Orders
                .AsNoTracking()
                .Include(o => o.Showtime)
                .Where(o => o.UserId == userId
                    && o.Showtime.MovieId == movieId
                    && (o.Status == OrderStatus.Paid
                        || o.Status == OrderStatus.PartiallyPaid
                        || o.Status == OrderStatus.Refunded
                        || o.Status == OrderStatus.PartiallyRefunded))
                .ToListAsync();

            if (!eligibleOrders.Any())
            {
                return new CanReviewDto
                {
                    CanReview = false,
                    Reason = "Bạn cần mua vé và xem phim trước khi đánh giá",
                    RequiresPurchase = true
                };
            }

            var completedOrders = eligibleOrders
                .Where(o => o.Showtime.EndAt <= now)
                .ToList();

            if (!completedOrders.Any())
            {
                return new CanReviewDto
                {
                    CanReview = false,
                    Reason = "Bạn chỉ có thể đánh giá sau khi suất chiếu kết thúc",
                    RequiresPurchase = false
                };
            }

            var withinWindow = completedOrders.Any(o => o.Showtime.EndAt >= now.AddDays(-90));
            if (!withinWindow)
            {
                return new CanReviewDto
                {
                    CanReview = false,
                    Reason = "Đã quá thời hạn 90 ngày kể từ khi xem phim",
                    RequiresPurchase = false
                };
            }

            return new CanReviewDto
            {
                CanReview = true,
                RequiresPurchase = false
            };
        }

        public async Task<long> CreateAsync(CreateReviewDto input, long userId)
        {
            if (input.Rating is < 1 or > 5)
                throw new ArgumentException("Rating must be between 1 and 5");

            if (string.IsNullOrWhiteSpace(input.Content) || input.Content.Length < 20)
                throw new ArgumentException("Content must have at least 20 characters");

            if (input.Title != null && input.Title.Length > 100)
                throw new ArgumentException("Title cannot exceed 100 characters");

            var permission = await CanUserReviewAsync(userId, input.MovieId);
            if (!permission.CanReview)
                throw new InvalidOperationException(permission.Reason ?? "Bạn không thể đánh giá phim này");

            Entities.Order? order = null;
            bool isVerified = false;

            if (input.OrderId.HasValue)
            {
                order = await _db.Orders
                    .Include(o => o.Showtime)
                    .FirstOrDefaultAsync(o => o.Id == input.OrderId.Value && o.UserId == userId);

                if (order == null || order.Showtime.MovieId != input.MovieId)
                    throw new ArgumentException("Order không hợp lệ cho phim này");

                isVerified = order.Showtime.EndAt <= DateTime.UtcNow &&
                    (order.Status == OrderStatus.Paid || order.Status == OrderStatus.PartiallyPaid || order.Status == OrderStatus.Refunded || order.Status == OrderStatus.PartiallyRefunded);
            }
            else
            {
                // Nếu không cung cấp OrderId, tìm đơn đủ điều kiện mới nhất
                var qualifyingOrder = await _db.Orders
                    .Include(o => o.Showtime)
                    .Where(o => o.UserId == userId
                        && o.Showtime.MovieId == input.MovieId
                        && o.Showtime.EndAt <= DateTime.UtcNow
                        && (o.Status == OrderStatus.Paid
                            || o.Status == OrderStatus.PartiallyPaid
                            || o.Status == OrderStatus.Refunded
                            || o.Status == OrderStatus.PartiallyRefunded))
                    .OrderByDescending(o => o.Showtime.EndAt)
                    .FirstOrDefaultAsync();

                if (qualifyingOrder != null)
                {
                    order = qualifyingOrder;
                    isVerified = true;
                }
            }

            var review = new MovieReview
            {
                MovieId = input.MovieId,
                UserId = userId,
                OrderId = order?.Id,
                Rating = input.Rating,
                Title = input.Title?.Trim(),
                Content = input.Content.Trim(),
                CreatedAt = DateTime.UtcNow,
                IsVerifiedPurchase = isVerified,
                IsVisible = true,
                IsDeleted = false,
                HelpfulCount = 0,
                NotHelpfulCount = 0
            };

            _db.MovieReviews.Add(review);
            await _db.SaveChangesAsync();

            await UpdateMovieAggregatesAsync(review.MovieId);

            return review.Id;
        }

        public async Task UpdateAsync(UpdateReviewDto input, long userId)
        {
            if (input.Rating is < 1 or > 5)
                throw new ArgumentException("Rating must be between 1 and 5");

            if (string.IsNullOrWhiteSpace(input.Content) || input.Content.Length < 20)
                throw new ArgumentException("Content must have at least 20 characters");

            if (input.Title != null && input.Title.Length > 100)
                throw new ArgumentException("Title cannot exceed 100 characters");

            var review = await _db.MovieReviews.FirstOrDefaultAsync(r => r.Id == input.Id && r.UserId == userId && !r.IsDeleted);
            if (review == null)
                throw new KeyNotFoundException("Review not found");

            review.Rating = input.Rating;
            review.Title = input.Title?.Trim();
            review.Content = input.Content.Trim();
            review.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            await UpdateMovieAggregatesAsync(review.MovieId);
        }

        public async Task DeleteAsync(long id, long userId)
        {
            var review = await _db.MovieReviews.FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId && !r.IsDeleted);
            if (review == null)
                throw new KeyNotFoundException("Review not found");

            review.IsDeleted = true;
            review.IsVisible = false;
            review.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            await UpdateMovieAggregatesAsync(review.MovieId);
        }

        public async Task VoteAsync(long reviewId, long userId, bool isHelpful)
        {
            var review = await _db.MovieReviews.FirstOrDefaultAsync(r => r.Id == reviewId && r.IsVisible && !r.IsDeleted);
            if (review == null)
                throw new KeyNotFoundException("Review not found");

            var existing = await _db.ReviewHelpfuls.FirstOrDefaultAsync(v => v.ReviewId == reviewId && v.UserId == userId);
            if (existing == null)
            {
                _db.ReviewHelpfuls.Add(new ReviewHelpful
                {
                    ReviewId = reviewId,
                    UserId = userId,
                    IsHelpful = isHelpful,
                    CreatedAt = DateTime.UtcNow
                });

                if (isHelpful)
                    review.HelpfulCount++;
                else
                    review.NotHelpfulCount++;
            }
            else if (existing.IsHelpful == isHelpful)
            {
                _db.ReviewHelpfuls.Remove(existing);
                if (isHelpful)
                    review.HelpfulCount = Math.Max(0, review.HelpfulCount - 1);
                else
                    review.NotHelpfulCount = Math.Max(0, review.NotHelpfulCount - 1);
            }
            else
            {
                if (existing.IsHelpful)
                    review.HelpfulCount = Math.Max(0, review.HelpfulCount - 1);
                else
                    review.NotHelpfulCount = Math.Max(0, review.NotHelpfulCount - 1);

                existing.IsHelpful = isHelpful;
                if (isHelpful)
                    review.HelpfulCount++;
                else
                    review.NotHelpfulCount++;
            }

            review.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        public async Task ReportAsync(long reviewId, long userId, ReportReviewDto input)
        {
            if (string.IsNullOrWhiteSpace(input.Reason))
                throw new ArgumentException("Reason is required");

            if (input.Reason.Length > 100)
                throw new ArgumentException("Reason cannot exceed 100 characters");

            if (input.Description?.Length > 1000)
                throw new ArgumentException("Description cannot exceed 1000 characters");

            var review = await _db.MovieReviews
                .Include(r => r.Reports)
                .FirstOrDefaultAsync(r => r.Id == reviewId && !r.IsDeleted);

            if (review == null)
                throw new KeyNotFoundException("Review not found");

            var existing = await _db.ReviewReports.FirstOrDefaultAsync(r => r.ReviewId == reviewId && r.ReportedByUserId == userId);
            if (existing != null)
            {
                existing.Reason = input.Reason.Trim();
                existing.Description = input.Description?.Trim();
                existing.CreatedAt = DateTime.UtcNow;
                existing.IsResolved = false;
                existing.AdminNote = null;
            }
            else
            {
                _db.ReviewReports.Add(new ReviewReport
                {
                    ReviewId = reviewId,
                    ReportedByUserId = userId,
                    Reason = input.Reason.Trim(),
                    Description = input.Description?.Trim(),
                    CreatedAt = DateTime.UtcNow,
                    IsResolved = false
                });
            }

            await _db.SaveChangesAsync();

            var reportCount = await _db.ReviewReports.CountAsync(r => r.ReviewId == reviewId && !r.IsResolved);
            if (reportCount >= 5 && review.IsVisible)
            {
                review.IsVisible = false;
                await _db.SaveChangesAsync();
                await UpdateMovieAggregatesAsync(review.MovieId);
            }
        }

        public async Task<PagedResultDto<ReviewDto>> GetPagedAsync(ReviewAdminQueryDto input)
        {
            var query = _db.MovieReviews
                .AsNoTracking()
                .Include(r => r.User)
                .Include(r => r.Movie)
                .AsQueryable();

            if (!input.IncludeDeleted)
                query = query.Where(r => !r.IsDeleted);

            if (input.MovieId.HasValue)
                query = query.Where(r => r.MovieId == input.MovieId.Value);

            if (input.UserId.HasValue)
                query = query.Where(r => r.UserId == input.UserId.Value);

            if (input.IsVisible.HasValue)
                query = query.Where(r => r.IsVisible == input.IsVisible.Value);

            if (!string.IsNullOrWhiteSpace(input.SearchTerm))
            {
                var term = input.SearchTerm.Trim().ToLower();
                query = query.Where(r =>
                    (r.Title != null && EF.Functions.ILike(r.Title, $"%{term}%")) ||
                    EF.Functions.ILike(r.Content, $"%{term}%"));
            }

            query = query.OrderByDescending(r => r.CreatedAt);

            var pageNumber = Math.Max(1, input.PageNumber);
            var pageSize = Math.Clamp(input.PageSize, 1, 100);
            var totalCount = await query.CountAsync();
            var items = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var dtoItems = items.Select(r => MapToDto(r, null, new Dictionary<long, bool?> { { r.Id, null } })).ToList();

            return new PagedResultDto<ReviewDto>
            {
                Items = dtoItems,
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize
            };
        }

        public async Task<List<ReviewReportDto>> GetReportsAsync(bool includeResolved = false)
        {
            var query = _db.ReviewReports
                .AsNoTracking()
                .Include(r => r.ReportedByUser)
                .Include(r => r.Review)
                .ThenInclude(rv => rv.Movie)
                .AsQueryable();

            if (!includeResolved)
                query = query.Where(r => !r.IsResolved);

            var reports = await query
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return reports.Select(r => new ReviewReportDto
            {
                Id = r.Id,
                ReviewId = r.ReviewId,
                MovieId = r.Review?.MovieId ?? 0,
                MovieName = r.Review?.Movie?.Name ?? string.Empty,
                ReportedByUserId = r.ReportedByUserId,
                ReportedByUserName = r.ReportedByUser?.FullName ?? r.ReportedByUser?.UserName ?? string.Empty,
                Reason = r.Reason,
                Description = r.Description,
                CreatedAt = r.CreatedAt,
                IsResolved = r.IsResolved,
                AdminNote = r.AdminNote,
                Rating = r.Review?.Rating ?? 0,
                ReviewContent = r.Review?.Content ?? string.Empty,
                ReviewIsVisible = r.Review?.IsVisible ?? false
            }).ToList();
        }

        public async Task ResolveReportAsync(long reportId, ResolveReviewReportDto input)
        {
            var report = await _db.ReviewReports.Include(r => r.Review).FirstOrDefaultAsync(r => r.Id == reportId);
            if (report == null)
                throw new KeyNotFoundException("Report not found");

            report.IsResolved = input.IsResolved;
            report.AdminNote = input.AdminNote?.Trim();

            if (input.IsResolved && report.Review != null && !report.Review.IsDeleted)
            {
                report.Review.IsVisible = true;
                await UpdateMovieAggregatesAsync(report.Review.MovieId);
            }

            await _db.SaveChangesAsync();
        }

        public async Task HideAsync(long reviewId)
        {
            var review = await _db.MovieReviews.FirstOrDefaultAsync(r => r.Id == reviewId && !r.IsDeleted);
            if (review == null)
                throw new KeyNotFoundException("Review not found");

            if (!review.IsVisible)
                return;

            review.IsVisible = false;
            review.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            await UpdateMovieAggregatesAsync(review.MovieId);
        }

        public async Task ShowAsync(long reviewId)
        {
            var review = await _db.MovieReviews.FirstOrDefaultAsync(r => r.Id == reviewId && !r.IsDeleted);
            if (review == null)
                throw new KeyNotFoundException("Review not found");

            if (review.IsVisible)
                return;

            review.IsVisible = true;
            review.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            await UpdateMovieAggregatesAsync(review.MovieId);
        }

        public async Task AdminDeleteAsync(long reviewId)
        {
            var review = await _db.MovieReviews.FirstOrDefaultAsync(r => r.Id == reviewId);
            if (review == null)
                throw new KeyNotFoundException("Review not found");

            if (review.IsDeleted)
                return;

            review.IsDeleted = true;
            review.IsVisible = false;
            review.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            await UpdateMovieAggregatesAsync(review.MovieId);
        }

        private static ReviewDto MapToDto(MovieReview review, long? currentUserId, IDictionary<long, bool?> votes)
        {
            votes.TryGetValue(review.Id, out var voteValue);

            return new ReviewDto
            {
                Id = review.Id,
                MovieId = review.MovieId,
                MovieName = review.Movie?.Name ?? string.Empty,
                UserId = review.UserId,
                UserName = review.User?.FullName ?? review.User?.UserName ?? string.Empty,
                Rating = review.Rating,
                Title = review.Title,
                Content = review.Content,
                CreatedAt = review.CreatedAt,
                UpdatedAt = review.UpdatedAt,
                IsVerifiedPurchase = review.IsVerifiedPurchase,
                IsVisible = review.IsVisible,
                IsDeleted = review.IsDeleted,
                HelpfulCount = review.HelpfulCount,
                NotHelpfulCount = review.NotHelpfulCount,
                CurrentUserVoted = voteValue,
                IsMine = currentUserId.HasValue && review.UserId == currentUserId.Value
            };
        }

        private async Task UpdateMovieAggregatesAsync(long movieId)
        {
            var movie = await _db.Movies.FirstOrDefaultAsync(m => m.Id == movieId);
            if (movie == null)
                return;

            var relevantReviews = await _db.MovieReviews
                .Where(r => r.MovieId == movieId && !r.IsDeleted && r.IsVisible)
                .ToListAsync();

            movie.TotalReviews = relevantReviews.Count;
            movie.TotalRating1Star = relevantReviews.Count(r => r.Rating == 1);
            movie.TotalRating2Star = relevantReviews.Count(r => r.Rating == 2);
            movie.TotalRating3Star = relevantReviews.Count(r => r.Rating == 3);
            movie.TotalRating4Star = relevantReviews.Count(r => r.Rating == 4);
            movie.TotalRating5Star = relevantReviews.Count(r => r.Rating == 5);
            movie.AverageRating = movie.TotalReviews > 0
                ? Math.Round((decimal)relevantReviews.Average(r => r.Rating), 2)
                : 0m;

            movie.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
        }
    }
}