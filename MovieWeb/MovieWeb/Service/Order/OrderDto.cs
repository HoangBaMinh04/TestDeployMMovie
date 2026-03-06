using MovieWeb.Entities;

namespace MovieWeb.Service.Order
{
    public class OrderDto
    {
        public long Id { get; set; }
        public string OrderCode { get; set; } = default!;
        public long ShowtimeId { get; set; }
        public string MovieName { get; set; } = default!;
        public string CinemaName { get; set; } = default!;
        public string RoomName { get; set; } = default!;
        public DateTime ShowtimeStart { get; set; }
        public long? UserId { get; set; }
        public string? UserName { get; set; }
        public string? UserEmail { get; set; }
        public string? PhoneNumber { get; set; }
        public OrderStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal FinalAmount { get; set; }
        public List<TicketInfo> Tickets { get; set; } = new();
        public string? PaymentType { get; set; }

    }

    public class TicketInfo
    {
        public long TicketId { get; set; }
        public string SeatLabel { get; set; } = default!;
        public string Tier { get; set; } = default!;
        public decimal Price { get; set; }
    }

    public class CreateOrderDto
    {
        public long ShowtimeId { get; set; }
        public List<int> SeatIds { get; set; } = new();
        public string? UserName { get; set; }
        public string? UserEmail { get; set; }
        public string? UserPhone { get; set; }
        public string? PromotionCode { get; set; }
    }

    public class OrderDetailDto
    {
        public long Id { get; set; }
        public string OrderCode { get; set; } = default!;
        public long ShowtimeId { get; set; }
        public string MovieName { get; set; } = default!;
        public string CinemaName { get; set; } = default!;
        public string RoomName { get; set; } = default!;
        public DateTime ShowtimeStart { get; set; }
        public long? UserId { get; set; }
        public string? UserName { get; set; }
        public string? UserEmail { get; set; }
        public string? PhoneNumber { get; set; }
        public OrderStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal FinalAmount { get; set; }
        public List<TicketInfo> Tickets { get; set; } = new();
        public string? PaymentType { get; set; }
        public string? PaymentProvider { get; set; }
        public List<PaymentInfo> Payments { get; set; } = new();
    }

    public class PaymentInfo
    {
        public long PaymentId { get; set; }
        public string TransactionId { get; set; } = default!;
        public string Provider { get; set; } = default!;
        public string Status { get; set; } = default!;
        public decimal Amount { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
