using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MovieWeb.Entities
{
    [Table("Payments")]
    [Index(nameof(OrderId))]
    [Index(nameof(TransactionId), IsUnique = true)]
    [Index(nameof(Status), nameof(CreatedAt))]
    [Index(nameof(Provider), nameof(Status))]
    public class Payment
    {
        public long Id { get; set; }
        public long OrderId { get; set; }

        [Required, MaxLength(100)]
        public string TransactionId { get; set; } = default!; // PAY-XXXXX hoặc từ gateway

        [Required, MaxLength(50)]
        public string Provider { get; set; } = default!; // VNPay/MoMo/ZaloPay/Momo/Cash/BankTransfer

        public PaymentType Type { get; set; }

        public PaymentStatus Status { get; set; } = PaymentStatus.Pending;

        [Range(0, 100000000)]
        public decimal Amount { get; set; }

        [MaxLength(10)]
        public string Currency { get; set; } = "VND";

        // Gateway response
        [MaxLength(200)]
        public string? GatewayTransactionId { get; set; } // Transaction ID từ VNPay/MoMo

        [MaxLength(500)]
        public string? GatewayResponse { get; set; } // Raw response từ gateway

        [MaxLength(50)]
        public string? GatewayResponseCode { get; set; }

        // Timestamps
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ProcessedAt { get; set; } // Khi gateway xử lý xong
        public DateTime? CompletedAt { get; set; } // Khi hoàn tất (success)
        public DateTime? FailedAt { get; set; }
        public DateTime? RefundedAt { get; set; }

        // Failure/Refund info
        [MaxLength(500)]
        public string? FailureReason { get; set; }

        [MaxLength(500)]
        public string? RefundReason { get; set; }

        [MaxLength(100)]
        public string? RefundTransactionId { get; set; }

        [Range(0, 100000000)]
        public decimal? RefundAmount { get; set; }

        // Metadata
        [MaxLength(50)]
        public string? IpAddress { get; set; }

        [MaxLength(200)]
        public string? UserAgent { get; set; }

        public string? MetadataJson { get; set; } // JSON cho các thông tin thêm

        // Navigation
        public Order Order { get; set; } = default!;
    }

    public enum PaymentType
    {
        Payment,  // Thanh toán mua vé
        Refund    // Hoàn tiền
    }

    public enum PaymentStatus
    {
        Pending,      // Đang chờ xử lý
        Processing,   // Đang xử lý tại gateway
        Success,      // Thành công
        Failed,       // Thất bại
        Canceled,     // Hủy bỏ
        Expired,      // Hết hạn
        Refunded,     // Đã hoàn tiền
        PartiallyRefunded // Hoàn một phần
    }
}
