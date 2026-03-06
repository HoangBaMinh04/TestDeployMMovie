using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MovieWeb.Entities
{
    [Table("Orders")]
    [Index(nameof(OrderCode), IsUnique = true)]
    [Index(nameof(UserId), nameof(Status))]
    [Index(nameof(Status), nameof(ExpiresAt))]
    public class Order
    {
        public long Id { get; set; }

        [Required, MaxLength(50)]
        public string OrderCode { get; set; } = default!; // ORD-20250110-XXXXX

        public long ShowtimeId { get; set; }
        public long? UserId { get; set; }

        [MaxLength(200)]
        public string? UserName { get; set; } // Guest checkout

        [MaxLength(200)]
        public string? UserEmail { get; set; }

        [MaxLength(20)]
        public string? UserPhone { get; set; }

        public OrderStatus Status { get; set; } = OrderStatus.Pending;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime ExpiresAt { get; set; }

        [Range(0, 100000000)]
        public decimal TotalAmount { get; set; }

        [Range(0, 100000000)]
        public decimal DiscountAmount { get; set; }

        [Range(0, 100000000)]
        public decimal FinalAmount { get; set; }

        // Cancellation
        [MaxLength(500)]
        public string? CanceledReason { get; set; }

        public DateTime? CanceledAt { get; set; }

        // Promotion
        public int? PromotionId { get; set; }

        // Navigation
        public Showtime Showtime { get; set; } = default!;
        public AppUser? User { get; set; }
        public Promotion? Promotion { get; set; }
        public ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();
        public ICollection<ShowtimeSeat> ShowtimeSeats { get; set; } = new List<ShowtimeSeat>();
        public ICollection<Payment> Payments { get; set; } = new List<Payment>();
        public ICollection<MovieReview> MovieReviews { get; set; } = new List<MovieReview>();
    }

    public enum OrderStatus
    {
        Pending,        // Đang chờ thanh toán
        Holding,        // Đang giữ ghế
        Paid,           // Đã thanh toán đủ
        PartiallyPaid,  // Thanh toán một phần
        Canceled,       // Đã hủy
        Expired,        // Hết hạn giữ ghế
        Refunded,       // Đã hoàn tiền đủ
        PartiallyRefunded // Hoàn tiền một phần
    }
}
