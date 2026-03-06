using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations.Schema;

namespace MovieWeb.Entities
{
    [Table("ShowtimeSeats")]
    [Index(nameof(ShowtimeId), nameof(SeatId), IsUnique = true)]
    [Index(nameof(Status), nameof(HoldUntil))]
    public class ShowtimeSeat
    {
        public long Id { get; set; }
        public long ShowtimeId { get; set; }
        public int SeatId { get; set; }

        public SeatStatus Status { get; set; } = SeatStatus.Available;

        public long? OrderId { get; set; }
        public DateTime? HoldUntil { get; set; }
        public DateTime? UpdatedAt { get; set; }

        // Navigation
        public Showtime Showtime { get; set; } = default!;
        public Seat Seat { get; set; } = default!;
        public Order? Order { get; set; }
    }

    public enum SeatStatus
    {
        Available,  // Có thể đặt
        Holding,    // Đang giữ tạm (trong giỏ hàng)
        Sold        // Đã bán
    }

}
