using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MovieWeb.Entities
{
    [Table("Rooms")]
    [Index(nameof(CinemaId), nameof(Name), IsUnique = true)]
    public class Room
    {
        public int Id { get; set; }
        public int CinemaId { get; set; }

        [Required, MaxLength(100)]
        public string Name { get; set; } = default!;

        [Range(1, 50)]
        public int Rows { get; set; }

        [Range(1, 50)]
        public int Cols { get; set; }

        public bool IsActive { get; set; } = true;
        public bool IsDeleted { get; set; }

        // Navigation
        public Cinema Cinema { get; set; } = default!;
        public ICollection<Seat> Seats { get; set; } = new List<Seat>();
        public ICollection<Showtime> Showtimes { get; set; } = new List<Showtime>();
    }
}
