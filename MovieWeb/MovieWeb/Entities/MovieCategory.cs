using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations.Schema;

namespace MovieWeb.Entities
{
    [Table("MovieCategories")]
    [Index(nameof(MovieId), nameof(CategoryId), IsUnique = true)]
    public class MovieCategory
    {
        public long MovieId { get; set; }
        public long CategoryId { get; set; }
        public bool IsPrimary { get; set; }
        public int DisplayOrder { get; set; }

        // Navigation
        public Movie Movie { get; set; } = default!;
        public Category Category { get; set; } = default!;
    }
}
