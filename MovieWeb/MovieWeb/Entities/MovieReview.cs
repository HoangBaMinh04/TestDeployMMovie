using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MovieWeb.Entities
{
    [Table("MovieReviews")]
    [Index(nameof(MovieId), nameof(UserId))]
    [Index(nameof(MovieId), nameof(UserId), IsUnique = true)]
    public class MovieReview
    {
        public long Id { get; set; }

        // Foreign Keys
        public long MovieId { get; set; }
        public long UserId { get; set; }
        public long? OrderId { get; set; }

        // Review Content
        [Range(1, 5)]
        public int Rating { get; set; }

        [MaxLength(1000)]
        public string? Comment { get; set; }
        [MaxLength(100)]
        public string? Title { get; set; }

        [Required]
        [StringLength(2000, MinimumLength = 20)]
        public string Content { get; set; } = default!;

        // Metadata
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime? UpdatedAt { get; set; }
        public bool IsVerifiedPurchase { get; set; }
        public bool IsVisible { get; set; } = true;
        public bool IsDeleted { get; set; }

        // Helpful votes aggregate
        public int HelpfulCount { get; set; }
        public int NotHelpfulCount { get; set; }

        // Navigation
        public Movie Movie { get; set; } = default!;
        public AppUser User { get; set; } = default!;
        public Order? Order { get; set; }
        public ICollection<ReviewReport> Reports { get; set; } = new List<ReviewReport>();
        public ICollection<ReviewHelpful> Helpfuls { get; set; } = new List<ReviewHelpful>();
    }
}
