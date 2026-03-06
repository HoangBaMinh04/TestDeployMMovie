using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MovieWeb.Entities
{
    [Table("Seats")]
    [Index(nameof(RoomId), nameof(Label), IsUnique = true)]
    [Index(nameof(RoomId), nameof(Row), nameof(Col), IsUnique = true)]
    public class Seat
    {
        public int Id { get; set; }
        public int RoomId { get; set; }

        [Required, MaxLength(10)]
        public string Label { get; set; } = default!; // A1, A2, B1...

        public int Row { get; set; }
        public int Col { get; set; }

        [MaxLength(20)]
        public string Tier { get; set; } = "Standard"; // Standard/VIP/Couple/Deluxe

        public bool IsActive { get; set; } = true;

        // Navigation
        public Room Room { get; set; } = default!;
        public ICollection<ShowtimeSeat> ShowtimeSeats { get; set; } = new List<ShowtimeSeat>();
        public ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();
    }
}
