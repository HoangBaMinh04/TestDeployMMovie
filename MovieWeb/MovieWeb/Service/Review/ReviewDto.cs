using MovieWeb.DTOs.Common;

namespace MovieWeb.Service.Review
{
    public class ReviewDto
    {
        public long Id { get; set; }
        public long MovieId { get; set; }
        public string MovieName { get; set; } = string.Empty;
        public long UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public int Rating { get; set; }
        public string? Title { get; set; }
        public string Content { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public bool IsVerifiedPurchase { get; set; }
        public bool IsVisible { get; set; }
        public bool IsDeleted { get; set; }
        public int HelpfulCount { get; set; }
        public int NotHelpfulCount { get; set; }
        public bool? CurrentUserVoted { get; set; }
        public bool IsMine { get; set; }
    }

    public class ReviewStatsDto
    {
        public long MovieId { get; set; }
        public decimal AverageRating { get; set; }
        public int TotalReviews { get; set; }
        public Dictionary<int, int> RatingDistribution { get; set; } = new();
    }

    public class CanReviewDto
    {
        public bool CanReview { get; set; }
        public string? Reason { get; set; }
        public bool HasExistingReview { get; set; }
        public long? ExistingReviewId { get; set; }
        public bool RequiresPurchase { get; set; }
        public DateTime? NextAllowedUpdate { get; set; }
    }

    public class CreateReviewDto
    {
        public long MovieId { get; set; }
        public long? OrderId { get; set; }
        public int Rating { get; set; }
        public string? Title { get; set; }
        public string Content { get; set; } = string.Empty;
    }

    public class UpdateReviewDto
    {
        public long Id { get; set; }
        public int Rating { get; set; }
        public string? Title { get; set; }
        public string Content { get; set; } = string.Empty;
    }

    public class VoteReviewDto
    {
        public bool IsHelpful { get; set; }
    }

    public class ReportReviewDto
    {
        public string Reason { get; set; } = string.Empty;
        public string? Description { get; set; }
    }

    public class ReviewQueryDto : PagedRequestDto
    {
        public bool? OnlyVerified { get; set; }
        public int? Rating { get; set; }
        public string? SortBy { get; set; }
    }

    public class ReviewAdminQueryDto : PagedRequestDto
    {
        public long? MovieId { get; set; }
        public long? UserId { get; set; }
        public bool? IsVisible { get; set; }
        public bool IncludeDeleted { get; set; }
    }

    public class ReviewReportDto
    {
        public long Id { get; set; }
        public long ReviewId { get; set; }
        public long MovieId { get; set; }
        public string MovieName { get; set; } = string.Empty;
        public long ReportedByUserId { get; set; }
        public string ReportedByUserName { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsResolved { get; set; }
        public string? AdminNote { get; set; }
        public int Rating { get; set; }
        public string ReviewContent { get; set; } = string.Empty;
        public bool ReviewIsVisible { get; set; }
    }

    public class ResolveReviewReportDto
    {
        public bool IsResolved { get; set; }
        public string? AdminNote { get; set; }
    }
}