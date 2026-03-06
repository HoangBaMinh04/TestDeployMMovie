using Microsoft.EntityFrameworkCore;
using MovieWeb.DTOs.Common;
using MovieWeb.Entities;
using MovieWeb.Service.Realtime;

namespace MovieWeb.Service.Payment
{
    public interface IPaymentAppService
    {
        Task<long> CreateAsync(CreatePaymentDto input, string? ipAddress = null);
        Task<PaymentDto> GetByIdAsync(long id);
        Task<PaymentDto> GetByTransactionIdAsync(string transactionId);
        Task<List<PaymentDto>> GetByOrderAsync(long orderId);
        Task ProcessCallbackAsync(PaymentCallbackDto callback);
        Task<string> GeneratePaymentUrlAsync(long paymentId, string returnUrl);
        Task RefundAsync(long orderId, decimal amount, string reason);
        Task<PagedResultDto<PaymentDto>> GetPagedAsync(PagedRequestDto input, long? orderId = null, PaymentStatus? status = null);
    }

    public class PaymentAppService : IPaymentAppService
    {
        private readonly MyDbContext _db;
        private readonly IConfiguration _configuration;
        private readonly IVNPayAppService _vnPayService;
        private readonly IShowtimeRealtimeAppService _realtimeService;


        public PaymentAppService(MyDbContext db, IConfiguration configuration, IVNPayAppService vnPayService, IShowtimeRealtimeAppService realtimeService)
        {
            _db = db;
            _configuration = configuration;
            _vnPayService = vnPayService;
            _realtimeService = realtimeService;
        }

        private static PaymentDto MapToDto(Entities.Payment payment)
        {
            return new PaymentDto
            {
                Id = payment.Id,
                OrderId = payment.OrderId,
                OrderCode = payment.Order?.OrderCode ?? "",
                TransactionId = payment.TransactionId,
                Provider = payment.Provider,
                Status = payment.Status,
                Amount = payment.Amount,
                CreatedAt = payment.CreatedAt,
                CompletedAt = payment.CompletedAt
            };
        }

        public async Task<long> CreateAsync(CreatePaymentDto input, string? ipAddress = null)
        {
            // Validate order
            var order = await _db.Orders
                .Include(o => o.Showtime)
                .FirstOrDefaultAsync(o => o.Id == input.OrderId);

            if (order == null)
                throw new KeyNotFoundException($"Order with Id={input.OrderId} not found");

            // Validate order status
            if (order.Status != OrderStatus.Holding && order.Status != OrderStatus.Pending)
                throw new InvalidOperationException("Order is not in a payable state");

            // Check if order has expired
            if (order.ExpiresAt <= DateTime.UtcNow)
                throw new InvalidOperationException("Order has expired");

            // Check if order already has successful payment
            var hasSuccessfulPayment = await _db.Payments
                .AnyAsync(p => p.OrderId == input.OrderId && p.Status == PaymentStatus.Success);

            if (hasSuccessfulPayment)
                throw new InvalidOperationException("Order has already been paid");

            // Validate provider
            var validProviders = new[] { "VNPay", "MoMo", "ZaloPay", "Cash", "BankTransfer" };
            if (!validProviders.Contains(input.Provider))
                throw new ArgumentException($"Invalid payment provider. Valid options: {string.Join(", ", validProviders)}");

            // Create payment
            var payment = new Entities.Payment
            {
                OrderId = input.OrderId,
                TransactionId = GenerateTransactionId(),
                Provider = input.Provider,
                Type = PaymentType.Payment,
                Status = PaymentStatus.Pending,
                Amount = order.FinalAmount,
                Currency = "VND",
                CreatedAt = DateTime.UtcNow,
                IpAddress = ipAddress ?? "127.0.0.1", // ĐÃ SỬA: Lưu IP address
                MetadataJson = System.Text.Json.JsonSerializer.Serialize(new { ReturnUrl = input.ReturnUrl })
            };

            _db.Payments.Add(payment);

            // Update order status
            order.Status = OrderStatus.Pending;

            await _db.SaveChangesAsync();
            return payment.Id;
        }

        public async Task<PaymentDto> GetByIdAsync(long id)
        {
            var payment = await _db.Payments
                .Include(p => p.Order)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (payment == null)
                throw new KeyNotFoundException($"Payment with Id={id} not found");

            return MapToDto(payment);
        }

        public async Task<PaymentDto> GetByTransactionIdAsync(string transactionId)
        {
            var payment = await _db.Payments
                .Include(p => p.Order)
                .FirstOrDefaultAsync(p => p.TransactionId == transactionId);

            if (payment == null)
                throw new KeyNotFoundException($"Payment with TransactionId='{transactionId}' not found");

            return MapToDto(payment);
        }

        public async Task<List<PaymentDto>> GetByOrderAsync(long orderId)
        {
            var payments = await _db.Payments
                .Include(p => p.Order)
                .Where(p => p.OrderId == orderId)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            return payments.Select(MapToDto).ToList();
        }

        public async Task ProcessCallbackAsync(PaymentCallbackDto callback)
        {
            using var transaction = await _db.Database.BeginTransactionAsync();
            try
            {
                var payment = await _db.Payments
                    .Include(p => p.Order)
                        .ThenInclude(o => o.ShowtimeSeats)
                    .FirstOrDefaultAsync(p => p.TransactionId == callback.TransactionId);

                if (payment == null)
                    throw new KeyNotFoundException($"Payment with TransactionId='{callback.TransactionId}' not found");

                // Already processed
                if (payment.Status == PaymentStatus.Success)
                    return;

                // Update payment with gateway response
                payment.GatewayTransactionId = callback.GatewayTransactionId;
                payment.GatewayResponseCode = callback.ResponseCode;
                payment.GatewayResponse = callback.RawData != null
                    ? System.Text.Json.JsonSerializer.Serialize(callback.RawData)
                    : null;
                payment.ProcessedAt = DateTime.UtcNow;

                // Determine success based on response code
                bool isSuccess = callback.ResponseCode == "00";

                var updatedSeats = payment.Order.ShowtimeSeats.ToList();

                if (isSuccess)
                {
                    // Payment successful
                    payment.Status = PaymentStatus.Success;
                    payment.CompletedAt = DateTime.UtcNow;

                    // Update order status
                    payment.Order.Status = OrderStatus.Paid;

                    // Mark seats as sold
                    foreach (var ss in updatedSeats)
                    {
                        ss.Status = SeatStatus.Sold;
                        ss.UpdatedAt = DateTime.UtcNow;
                    }
                }
                else
                {
                    // Payment failed
                    payment.Status = PaymentStatus.Failed;
                    payment.FailedAt = DateTime.UtcNow;
                    payment.FailureReason = $"Gateway response: {callback.ResponseCode}";
                }

                await _db.SaveChangesAsync();
                await transaction.CommitAsync();
                await _realtimeService.BroadcastSeatsChangedAsync(payment.Order.ShowtimeId, updatedSeats);

            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<string> GeneratePaymentUrlAsync(long paymentId, string returnUrl)
        {
            var payment = await _db.Payments
                .Include(p => p.Order)
                .FirstOrDefaultAsync(p => p.Id == paymentId);

            if (payment == null)
                throw new KeyNotFoundException($"Payment with Id={paymentId} not found");

            if (payment.Status != PaymentStatus.Pending)
                throw new InvalidOperationException("Payment is not in pending state");

            // SINH URL TRƯỚC, chỉ update status KHI THÀNH CÔNG
            string paymentUrl = payment.Provider.ToLower() switch
            {
                "vnpay" => _vnPayService.CreatePaymentUrl(
                    payment.OrderId,
                    payment.Order.OrderCode,
                    payment.Amount,
                    payment.TransactionId,
                    payment.IpAddress ?? "127.0.0.1",
                    returnUrl
                ),
                "momo" => throw new NotImplementedException("MoMo integration not yet implemented"),
                "zalopay" => throw new NotImplementedException("ZaloPay integration not yet implemented"),
                _ => throw new NotImplementedException($"Payment URL generation for {payment.Provider} not implemented")
            };

            // Chỉ update status nếu sinh URL thành công (không throw exception)
            payment.Status = PaymentStatus.Processing;
            await _db.SaveChangesAsync();

            return paymentUrl;
        }

        public async Task RefundAsync(long orderId, decimal amount, string reason)
        {
            using var transaction = await _db.Database.BeginTransactionAsync();
            try
            {
                var order = await _db.Orders
                    .Include(o => o.Payments)
                    .Include(o => o.ShowtimeSeats)
                    .Include(o => o.Showtime)
                    .FirstOrDefaultAsync(o => o.Id == orderId);

                if (order == null)
                    throw new KeyNotFoundException($"Order with Id={orderId} not found");

                if (order.Status != OrderStatus.Paid)
                    throw new InvalidOperationException("Only paid orders can be refunded");

                // Check if showtime has passed
                if (order.Showtime.StartAt <= DateTime.UtcNow)
                    throw new InvalidOperationException("Cannot refund after showtime has started");

                // Find successful payment
                var originalPayment = order.Payments
                    .FirstOrDefault(p => p.Status == PaymentStatus.Success && p.Type == PaymentType.Payment);

                if (originalPayment == null)
                    throw new InvalidOperationException("No successful payment found for this order");

                // Validate refund amount
                if (amount > order.FinalAmount)
                    throw new ArgumentException("Refund amount cannot exceed order amount");

                // Create refund payment record
                var refundPayment = new Entities.Payment
                {
                    OrderId = orderId,
                    TransactionId = GenerateTransactionId(),
                    Provider = originalPayment.Provider,
                    Type = PaymentType.Refund,
                    Status = PaymentStatus.Success,
                    Amount = amount,
                    Currency = "VND",
                    CreatedAt = DateTime.UtcNow,
                    CompletedAt = DateTime.UtcNow,
                    RefundReason = reason,
                    RefundTransactionId = originalPayment.TransactionId,
                    RefundAmount = amount
                };

                _db.Payments.Add(refundPayment);

                // Update original payment
                originalPayment.RefundAmount = (originalPayment.RefundAmount ?? 0) + amount;
                originalPayment.RefundedAt = DateTime.UtcNow;

                // Update order status
                if (amount >= order.FinalAmount)
                {
                    order.Status = OrderStatus.Refunded;

                    // Release seats
                    foreach (var ss in order.ShowtimeSeats)
                    {
                        ss.Status = SeatStatus.Available;
                        ss.OrderId = null;
                        ss.UpdatedAt = DateTime.UtcNow;
                    }
                }
                else
                {
                    order.Status = OrderStatus.PartiallyRefunded;
                }

                await _db.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<PagedResultDto<PaymentDto>> GetPagedAsync(
            PagedRequestDto input,
            long? orderId = null,
            PaymentStatus? status = null)
        {
            var query = _db.Payments
                .Include(p => p.Order)
                .AsQueryable();

            if (orderId.HasValue)
                query = query.Where(p => p.OrderId == orderId.Value);

            if (status.HasValue)
                query = query.Where(p => p.Status == status.Value);

            if (!string.IsNullOrWhiteSpace(input.SearchTerm))
            {
                var term = input.SearchTerm.Trim().ToLower();
                query = query.Where(p =>
                    p.TransactionId.ToLower().Contains(term) ||
                    p.Order.OrderCode.ToLower().Contains(term) ||
                    p.Provider.ToLower().Contains(term)
                );
            }

            query = input.SortBy?.ToLower() switch
            {
                "createdat" => input.SortDescending
                    ? query.OrderByDescending(p => p.CreatedAt)
                    : query.OrderBy(p => p.CreatedAt),
                "status" => input.SortDescending
                    ? query.OrderByDescending(p => p.Status)
                    : query.OrderBy(p => p.Status),
                "amount" => input.SortDescending
                    ? query.OrderByDescending(p => p.Amount)
                    : query.OrderBy(p => p.Amount),
                "provider" => input.SortDescending
                    ? query.OrderByDescending(p => p.Provider)
                    : query.OrderBy(p => p.Provider),
                _ => query.OrderByDescending(p => p.CreatedAt)
            };

            var totalCount = await query.CountAsync();

            var items = await query
                .Skip((input.PageNumber - 1) * input.PageSize)
                .Take(input.PageSize)
                .ToListAsync();

            return new PagedResultDto<PaymentDto>
            {
                Items = items.Select(MapToDto).ToList(),
                TotalCount = totalCount,
                PageNumber = input.PageNumber,
                PageSize = input.PageSize
            };
        }

        private static string GenerateTransactionId()
        {
            return $"PAY-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid().ToString("N").Substring(0, 8).ToUpper()}";
        }
    }
}