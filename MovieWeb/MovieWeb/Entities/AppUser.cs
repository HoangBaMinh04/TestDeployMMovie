using Microsoft.AspNetCore.Identity;

namespace MovieWeb.Entities
{
    public class AppUser : IdentityUser<long>
    {
        public string? FullName { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public ICollection<Order> Orders { get; set; } = new List<Order>();
        public ICollection<MovieReview> Reviews { get; set; } = new List<MovieReview>();

        public ICollection<ReviewHelpful> ReviewHelpfulVotes { get; set; } = new List<ReviewHelpful>();
        public ICollection<ReviewReport> ReviewReports { get; set; } = new List<ReviewReport>();
    }
}
