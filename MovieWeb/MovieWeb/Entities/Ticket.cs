using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MovieWeb.Entities
{
    [Table("Tickets")]
    [Index(nameof(OrderId))]
    public class Ticket
    {
        public long Id { get; set; }
        public long OrderId { get; set; }
        public int SeatId { get; set; }

        [Range(0, 1000000)]
        public decimal Price { get; set; }

        [MaxLength(50)]
        public string TicketCode { get; set; } = default!; // TKT-XXXXX (QR code)

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsUsed { get; set; }
        public DateTime? UsedAt { get; set; }

        // Navigation
        public Order Order { get; set; } = default!;
        public Seat Seat { get; set; } = default!;

        // Computed property
        [NotMapped]
        public string? Tier => Seat?.Tier;
    }
}
