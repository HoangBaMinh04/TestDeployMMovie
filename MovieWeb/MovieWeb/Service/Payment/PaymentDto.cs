using MovieWeb.Entities;

namespace MovieWeb.Service.Payment
{
    public class PaymentDto
    {
        public long Id { get; set; }
        public long OrderId { get; set; }
        public string OrderCode { get; set; } = default!;
        public string TransactionId { get; set; } = default!;
        public string Provider { get; set; } = default!;
        public PaymentStatus Status { get; set; }
        public decimal Amount { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
    }

    public class CreatePaymentDto
    {
        public long OrderId { get; set; }
        public string Provider { get; set; } = default!; // VNPay/MoMo/ZaloPay
        public string? ReturnUrl { get; set; }
    }

    public class PaymentCallbackDto
    {
        public string TransactionId { get; set; } = default!;
        public string? GatewayTransactionId { get; set; }
        public string? ResponseCode { get; set; }
        public Dictionary<string, string>? RawData { get; set; }
    }
}