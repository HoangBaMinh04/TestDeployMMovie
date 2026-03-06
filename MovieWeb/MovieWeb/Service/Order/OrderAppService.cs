using Microsoft.EntityFrameworkCore;
using MovieWeb.DTOs.Common;
using MovieWeb.Entities;
using MovieWeb.Service.PriceRule;
using MovieWeb.Service.Promotion;
using MovieWeb.Service.Realtime;

namespace MovieWeb.Service.Order
{
    public interface IOrderService
    {
        Task<long> CreateAsync(CreateOrderDto input, long? userId = null);
        Task<OrderDto> GetByIdAsync(long id);
        Task<OrderDetailDto> GetDetailAsync(long id);
        Task<OrderDto> GetByCodeAsync(string orderCode);
        Task<List<OrderDto>> GetByUserAsync(long userId);
        Task<List<OrderDto>> GetPendingOrdersAsync();
        Task CancelOrderAsync(long orderId, string reason);
        Task ExpireOrderAsync(long orderId);
        Task<PagedResultDto<OrderDto>> GetPagedAsync(PagedRequestDto input, long? userId = null, OrderStatus? status = null);
        Task ProcessExpiredOrdersAsync(); // Background job
    }

    public class OrderService : IOrderService
    {
        private readonly MyDbContext _db;
        private readonly IPriceRuleService _priceRuleService;
        private readonly IPromotionService _promotionService;
        private const int ORDER_HOLD_MINUTES = 10;
        private readonly IShowtimeRealtimeAppService _realtimeService;

        public OrderService(
            MyDbContext db,
            IPriceRuleService priceRuleService,
            IPromotionService promotionService,
            IShowtimeRealtimeAppService realtimeService)

        {
            _db = db;
            _priceRuleService = priceRuleService;
            _promotionService = promotionService;
            _realtimeService = realtimeService;
        }

        private static OrderDto MapToDto(Entities.Order order)
        {
            return new OrderDto
            {
                Id = order.Id,
                OrderCode = order.OrderCode,
                ShowtimeId = order.ShowtimeId,
                MovieName = order.Showtime?.Movie?.Name ?? "",
                CinemaName = order.Showtime?.Cinema?.Name ?? "",
                RoomName = order.Showtime?.Room?.Name ?? "",
                ShowtimeStart = order.Showtime?.StartAt ?? DateTime.MinValue,
                UserId = order.UserId,
                UserName = order.UserName,
                UserEmail = order.UserEmail,
                PhoneNumber = order.UserPhone,
                Status = order.Status,
                CreatedAt = order.CreatedAt,
                ExpiresAt = order.ExpiresAt,
                TotalAmount = order.TotalAmount,
                DiscountAmount = order.DiscountAmount,
                FinalAmount = order.FinalAmount,
                PaymentType = "VNPay",
                Tickets = order.Tickets.Select(t => new TicketInfo
                {
                    TicketId = t.Id,
                    SeatLabel = t.Seat?.Label ?? "",
                    Tier = t.Seat?.Tier ?? "",
                    Price = t.Price
                }).ToList()
            };
        }

        public async Task<long> CreateAsync(CreateOrderDto input, long? userId = null)
        {
            using var transaction = await _db.Database.BeginTransactionAsync();
            try
            {
                // 1. Validate showtime
                var showtime = await _db.Showtimes
                    .Include(st => st.Movie)
                    .Include(st => st.Cinema)
                    .Include(st => st.Room)
                    .FirstOrDefaultAsync(st => st.Id == input.ShowtimeId && st.IsActive);

                if (showtime == null)
                    throw new KeyNotFoundException("Showtime not found");

                if (DateTime.UtcNow >= showtime.StartAt.AddMinutes(15))
                    throw new InvalidOperationException("Cannot book seat more 15 minutes from showtime start");

                // 2. Validate seats
                if (!input.SeatIds.Any())
                    throw new ArgumentException("At least one seat must be selected");

                var seats = await _db.Seats
                    .Where(s => input.SeatIds.Contains(s.Id) && s.RoomId == showtime.RoomId && s.IsActive)
                    .ToListAsync();

                if (seats.Count != input.SeatIds.Count)
                    throw new ArgumentException("Some seats are invalid or not available");

                // 3. Check seat availability
                var showtimeSeats = await _db.ShowtimeSeats
                    .Where(ss => ss.ShowtimeId == input.ShowtimeId && input.SeatIds.Contains(ss.SeatId))
                    .ToListAsync();

                foreach (var ss in showtimeSeats)
                {
                    if (ss.Status == SeatStatus.Sold)
                        throw new InvalidOperationException($"Seat {seats.First(s => s.Id == ss.SeatId).Label} is already sold");

                    if (ss.Status == SeatStatus.Holding && ss.HoldUntil > DateTime.UtcNow)
                        throw new InvalidOperationException($"Seat {seats.First(s => s.Id == ss.SeatId).Label} is being held by another customer");
                }

                // 4. Calculate prices
                decimal totalAmount = 0;
                var ticketPrices = new Dictionary<int, decimal>();

                foreach (var seat in seats)
                {
                    var price = await _priceRuleService.CalculatePriceAsync(
                        showtime.CinemaId,
                        seat.Tier,
                        showtime.StartAt,
                        showtime.BasePrice
                    );
                    ticketPrices[seat.Id] = price;
                    totalAmount += price;
                }

                // 5. Apply promotion
                decimal discountAmount = 0;
                int? promotionId = null;

                if (!string.IsNullOrEmpty(input.PromotionCode))
                {
                    var promotionResult = await _promotionService.ValidateAndApplyAsync(
                        input.PromotionCode,
                        totalAmount,
                        userId
                    );

                    if (promotionResult.IsValid)
                    {
                        discountAmount = promotionResult.DiscountAmount;
                        promotionId = promotionResult.PromotionId;
                    }
                }

                decimal finalAmount = totalAmount - discountAmount;

                // 6. Create order
                var order = new Entities.Order
                {
                    OrderCode = GenerateOrderCode(),
                    ShowtimeId = input.ShowtimeId,
                    UserId = userId,
                    UserName = input.UserName,
                    UserEmail = input.UserEmail,
                    UserPhone = input.UserPhone,
                    Status = OrderStatus.Holding,
                    CreatedAt = DateTime.UtcNow,
                    ExpiresAt = DateTime.UtcNow.AddMinutes(ORDER_HOLD_MINUTES),
                    TotalAmount = totalAmount,
                    DiscountAmount = discountAmount,
                    FinalAmount = finalAmount,
                    PromotionId = promotionId
                };

                _db.Orders.Add(order);
                await _db.SaveChangesAsync();

                // 7. Create tickets
                foreach (var seat in seats)
                {
                    var ticket = new Ticket
                    {
                        OrderId = order.Id,
                        SeatId = seat.Id,
                        Price = ticketPrices[seat.Id],
                        TicketCode = GenerateTicketCode(),
                        CreatedAt = DateTime.UtcNow,
                        IsUsed = false
                    };
                    _db.Tickets.Add(ticket);
                }

                // 8. Hold seats
                foreach (var ss in showtimeSeats)
                {
                    ss.Status = SeatStatus.Holding;
                    ss.OrderId = order.Id;
                    ss.HoldUntil = order.ExpiresAt;
                    ss.UpdatedAt = DateTime.UtcNow;
                }

                await _db.SaveChangesAsync();
                await transaction.CommitAsync();

                await _realtimeService.BroadcastSeatsChangedAsync(order.ShowtimeId, showtimeSeats);

                return order.Id;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<OrderDto> GetByIdAsync(long id)
        {
            var order = await _db.Orders
                .Include(o => o.Showtime)
                    .ThenInclude(st => st.Movie)
                .Include(o => o.Showtime)
                    .ThenInclude(st => st.Cinema)
                .Include(o => o.Showtime)
                    .ThenInclude(st => st.Room)
                .Include(o => o.Tickets)
                    .ThenInclude(t => t.Seat)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (order == null)
                throw new KeyNotFoundException($"Order with Id={id} not found");

            return MapToDto(order);
        }

        public async Task<OrderDetailDto> GetDetailAsync(long id)
        {
            var order = await _db.Orders
                .Include(o => o.Showtime)
                    .ThenInclude(st => st.Movie)
                .Include(o => o.Showtime)
                    .ThenInclude(st => st.Cinema)
                .Include(o => o.Showtime)
                    .ThenInclude(st => st.Room)
                .Include(o => o.Tickets)
                    .ThenInclude(t => t.Seat)
                .Include(o => o.Payments)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (order == null)
                throw new KeyNotFoundException($"Order with Id={id} not found");

            var dto = MapToDto(order);

            return new OrderDetailDto
            {
                Id = dto.Id,
                OrderCode = dto.OrderCode,
                ShowtimeId = dto.ShowtimeId,
                MovieName = dto.MovieName,
                CinemaName = dto.CinemaName,
                ShowtimeStart = dto.ShowtimeStart,
                RoomName = dto.RoomName,
                UserId = dto.UserId,
                UserName = dto.UserName,
                UserEmail = dto.UserEmail,
                PhoneNumber = dto.PhoneNumber,
                Status = dto.Status,
                CreatedAt = dto.CreatedAt,
                ExpiresAt = dto.ExpiresAt,
                TotalAmount = dto.TotalAmount,
                DiscountAmount = dto.DiscountAmount,
                FinalAmount = dto.FinalAmount,
                Tickets = dto.Tickets,
                PaymentProvider = order.Payments.FirstOrDefault()?.Provider,
                Payments = order.Payments.Select(p => new PaymentInfo
                {
                    PaymentId = p.Id,
                    TransactionId = p.TransactionId,
                    Provider = p.Provider,
                    Status = p.Status.ToString(),
                    Amount = p.Amount,
                    CreatedAt = p.CreatedAt
                }).ToList()
            };
        }

        public async Task<OrderDto> GetByCodeAsync(string orderCode)
        {
            var order = await _db.Orders
                .Include(o => o.Showtime)
                    .ThenInclude(st => st.Movie)
                .Include(o => o.Showtime)
                    .ThenInclude(st => st.Cinema)
                .Include(o => o.Showtime)
                    .ThenInclude(st => st.Room)
                .Include(o => o.Tickets)
                    .ThenInclude(t => t.Seat)
                .FirstOrDefaultAsync(o => o.OrderCode == orderCode);

            if (order == null)
                throw new KeyNotFoundException($"Order with code '{orderCode}' not found");

            return MapToDto(order);
        }

        public async Task<List<OrderDto>> GetByUserAsync(long userId)
        {
            var orders = await _db.Orders
                .Include(o => o.Showtime)
                    .ThenInclude(st => st.Movie)
                .Include(o => o.Showtime)
                    .ThenInclude(st => st.Cinema)
                .Include(o => o.Showtime)
                    .ThenInclude(st => st.Room)
                .Include(o => o.Tickets)
                    .ThenInclude(t => t.Seat)
                .Where(o => o.UserId == userId)
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();

            return orders.Select(MapToDto).ToList();
        }

        public async Task<List<OrderDto>> GetPendingOrdersAsync()
        {
            var orders = await _db.Orders
                .Include(o => o.Showtime)
                    .ThenInclude(st => st.Movie)
                .Include(o => o.Showtime)
                    .ThenInclude(st => st.Cinema)
                .Include(o => o.Showtime)
                    .ThenInclude(st => st.Room)
                .Include(o => o.Tickets)
                    .ThenInclude(t => t.Seat)
                .Where(o => o.Status == OrderStatus.Holding || o.Status == OrderStatus.Pending)
                .OrderBy(o => o.ExpiresAt)
                .ToListAsync();

            return orders.Select(MapToDto).ToList();
        }

        public async Task CancelOrderAsync(long orderId, string reason)
        {
            using var transaction = await _db.Database.BeginTransactionAsync();
            try
            {
                var order = await _db.Orders
                    .Include(o => o.ShowtimeSeats)
                    .Include(o => o.Payments)
                    .FirstOrDefaultAsync(o => o.Id == orderId);

                if (order == null)
                    throw new KeyNotFoundException($"Order with Id={orderId} not found");

                if (order.Status == OrderStatus.Paid)
                    throw new InvalidOperationException("Cannot cancel paid order. Request refund instead.");

                if (order.Status == OrderStatus.Canceled)
                    throw new InvalidOperationException("Order is already canceled");

                var updatedSeats = order.ShowtimeSeats.ToList();

                // Release held seats
                foreach (var ss in updatedSeats)
                {
                    ss.Status = SeatStatus.Available;
                    ss.OrderId = null;
                    ss.HoldUntil = null;
                    ss.UpdatedAt = DateTime.UtcNow;
                }

                // Update order status
                order.Status = OrderStatus.Canceled;
                order.CanceledReason = reason;
                order.CanceledAt = DateTime.UtcNow;

                await _db.SaveChangesAsync();
                await transaction.CommitAsync();
                await _realtimeService.BroadcastSeatsChangedAsync(order.ShowtimeId, updatedSeats);

            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task ExpireOrderAsync(long orderId)
        {
            using var transaction = await _db.Database.BeginTransactionAsync();
            try
            {
                var order = await _db.Orders
                    .Include(o => o.ShowtimeSeats)
                    .FirstOrDefaultAsync(o => o.Id == orderId);

                if (order == null) return;

                if (order.Status != OrderStatus.Holding && order.Status != OrderStatus.Pending)
                    return;

                var updatedSeats = order.ShowtimeSeats.ToList();

                // Release held seats
                foreach (var ss in updatedSeats)
                {
                    ss.Status = SeatStatus.Available;
                    ss.OrderId = null;
                    ss.HoldUntil = null;
                    ss.UpdatedAt = DateTime.UtcNow;
                }

                // Update order status
                order.Status = OrderStatus.Expired;

                await _db.SaveChangesAsync();
                await transaction.CommitAsync();
                await _realtimeService.BroadcastSeatsChangedAsync(order.ShowtimeId, updatedSeats);

            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<PagedResultDto<OrderDto>> GetPagedAsync(
            PagedRequestDto input,
            long? userId = null,
            OrderStatus? status = null)
        {
            var query = _db.Orders
                .Include(o => o.Showtime)
                    .ThenInclude(st => st.Movie)
                .Include(o => o.Showtime)
                    .ThenInclude(st => st.Cinema)
                .Include(o => o.Showtime)
                    .ThenInclude(st => st.Room)
                .Include(o => o.Tickets)
                    .ThenInclude(t => t.Seat)
                .AsQueryable();

            // Filter by user
            if (userId.HasValue)
            {
                query = query.Where(o => o.UserId == userId.Value);
            }

            // Filter by status
            if (status.HasValue)
            {
                query = query.Where(o => o.Status == status.Value);
            }

            // Search
            if (!string.IsNullOrWhiteSpace(input.SearchTerm))
            {
                var term = input.SearchTerm.Trim().ToLower();
                query = query.Where(o =>
                    o.OrderCode.ToLower().Contains(term) ||
                    (o.UserEmail != null && o.UserEmail.ToLower().Contains(term)) ||
                    o.Showtime.Movie.Name.ToLower().Contains(term)
                );
            }

            // Sort
            query = input.SortBy?.ToLower() switch
            {
                "createdat" => input.SortDescending
                    ? query.OrderByDescending(o => o.CreatedAt)
                    : query.OrderBy(o => o.CreatedAt),
                "status" => input.SortDescending
                    ? query.OrderByDescending(o => o.Status)
                    : query.OrderBy(o => o.Status),
                "amount" => input.SortDescending
                    ? query.OrderByDescending(o => o.FinalAmount)
                    : query.OrderBy(o => o.FinalAmount),
                _ => query.OrderByDescending(o => o.CreatedAt)
            };

            var totalCount = await query.CountAsync();

            var items = await query
                .Skip((input.PageNumber - 1) * input.PageSize)
                .Take(input.PageSize)
                .ToListAsync();

            return new PagedResultDto<OrderDto>
            {
                Items = items.Select(MapToDto).ToList(),
                TotalCount = totalCount,
                PageNumber = input.PageNumber,
                PageSize = input.PageSize
            };
        }

        public async Task ProcessExpiredOrdersAsync()
        {
            var expiredOrders = await _db.Orders
                .Include(o => o.ShowtimeSeats)
                .Where(o => (o.Status == OrderStatus.Holding || o.Status == OrderStatus.Pending)
                    && o.ExpiresAt <= DateTime.UtcNow)
                .ToListAsync();

            foreach (var order in expiredOrders)
            {
                await ExpireOrderAsync(order.Id);
            }
        }

        private static string GenerateOrderCode()
        {
            return $"ORD-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N").Substring(0, 8).ToUpper()}";
        }

        private static string GenerateTicketCode()
        {
            return $"TKT-{Guid.NewGuid().ToString("N").Substring(0, 10).ToUpper()}";
        }
    }
}