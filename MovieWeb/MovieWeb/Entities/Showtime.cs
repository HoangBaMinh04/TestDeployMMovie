using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MovieWeb.Entities
{
    [Table("Showtimes")]
    [Index(nameof(MovieId), nameof(StartAt))]
    [Index(nameof(CinemaId), nameof(RoomId), nameof(StartAt))]
    public class Showtime
    {
        public long Id { get; set; }
        public long MovieId { get; set; }
        public int CinemaId { get; set; }
        public int RoomId { get; set; }

        public DateTime StartAt { get; set; }
        public DateTime EndAt { get; set; }

        [MaxLength(20)]
        public string Format { get; set; } = "2D"; // 2D/3D/IMAX/4DX

        [MaxLength(10)]
        public string Language { get; set; } = "VI"; // VI/EN/KR...

        [MaxLength(10)]
        public string Subtitle { get; set; } = "VI"; // VI/EN/NONE

        [Range(0, 1000000)]
        public decimal BasePrice { get; set; }

        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Movie Movie { get; set; } = default!;
        public Cinema Cinema { get; set; } = default!;
        public Room Room { get; set; } = default!;
        public ICollection<ShowtimeSeat> ShowtimeSeats { get; set; } = new List<ShowtimeSeat>();
        public ICollection<Order> Orders { get; set; } = new List<Order>();
    }
}
