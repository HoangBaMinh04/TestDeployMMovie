using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MovieWeb.Entities
{
    [Table("Cinemas")]
    public class Cinema
    {
        public int Id { get; set; }

        [Required, MaxLength(200)]
        public string Name { get; set; } = default!;

        [MaxLength(300)]
        public string? Address { get; set; }

        [MaxLength(50)]
        public string? PhoneNumber { get; set; }

        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }

        public bool IsActive { get; set; } = true;
        public bool IsDeleted { get; set; }

        // Navigation
        public ICollection<Room> Rooms { get; set; } = new List<Room>();
        public ICollection<Showtime> Showtimes { get; set; } = new List<Showtime>();
        public ICollection<PriceRule> PriceRules { get; set; } = new List<PriceRule>();
    }
}
