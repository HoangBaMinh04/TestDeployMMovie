using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MovieWeb.Entities
{
    [Table("ReviewReports")]
    [Index(nameof(ReviewId), nameof(ReportedByUserId), IsUnique = true)]
    public class ReviewReport
    {
        public long Id { get; set; }

        public long ReviewId { get; set; }
        public long ReportedByUserId { get; set; }

        [Required]
        [MaxLength(100)]
        public string Reason { get; set; } = default!;

        [MaxLength(1000)]
        public string? Description { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsResolved { get; set; }

        [MaxLength(500)]
        public string? AdminNote { get; set; }

        public MovieReview Review { get; set; } = default!;
        public AppUser ReportedByUser { get; set; } = default!;
    }
}
