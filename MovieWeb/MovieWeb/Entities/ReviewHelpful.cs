using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations.Schema;

namespace MovieWeb.Entities
{
    [Table("ReviewHelpfuls")]
    [Index(nameof(ReviewId), nameof(UserId), IsUnique = true)]
    public class ReviewHelpful
    {
        public long Id { get; set; }

        public long ReviewId { get; set; }
        public long UserId { get; set; }
        public bool IsHelpful { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public MovieReview Review { get; set; } = default!;
        public AppUser User { get; set; } = default!;
    }
}
