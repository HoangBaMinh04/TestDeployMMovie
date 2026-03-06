using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MovieWeb.Entities
{
    [Table("Categories")]
    [Index(nameof(Slug), IsUnique = true)]
    public class Category
    {
        public long Id { get; set; }

        [Required, MaxLength(100)]
        public string Name { get; set; } = default!;

        [MaxLength(100)]
        public string? Slug { get; set; }

        [MaxLength(500)]
        public string? Description { get; set; }

        public bool IsDeleted { get; set; }

        // Navigation
        public ICollection<MovieCategory> MovieCategories { get; set; } = new List<MovieCategory>();
    }
}
