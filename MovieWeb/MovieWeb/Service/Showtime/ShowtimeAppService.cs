using Microsoft.EntityFrameworkCore;
using MovieWeb.DTOs.Common;
using MovieWeb.Entities;
using MovieWeb.Service.PriceRule;

namespace MovieWeb.Service.Showtime
{
    public interface IShowtimeService
    {
        Task<long> CreateAsync(CreateShowtimeDto input);
        Task UpdateAsync(UpdateShowtimeDto input);
        Task<ShowtimeDto> GetByIdAsync(long id);
        Task<List<ShowtimeDto>> GetByMovieAsync(long movieId, DateTime? date = null);
        Task<List<ShowtimeDto>> GetByCinemaAsync(int cinemaId, DateTime? date = null);
        Task<List<ShowtimeSeatDto>> GetAvailableSeatsAsync(long showtimeId);
        Task DeleteAsync(long id);
        Task<PagedResultDto<ShowtimeDto>> GetPagedAsync(PagedRequestDto input, long? movieId = null, int? cinemaId = null, DateTime? date = null);
    }

    public class ShowtimeService : IShowtimeService
    {
        private readonly MyDbContext _db;
        private readonly IPriceRuleService _priceRuleService;

        public ShowtimeService(MyDbContext db, IPriceRuleService priceRuleService)
        {
            _db = db;
            _priceRuleService = priceRuleService;
        }

        private static ShowtimeDto MapToDto(Entities.Showtime st)
        {
            var availableSeats = st.ShowtimeSeats.Count(ss => ss.Status == SeatStatus.Available);
            var totalSeats = st.ShowtimeSeats.Count;

            return new ShowtimeDto
            {
                Id = st.Id,
                MovieId = st.MovieId,
                MovieName = st.Movie?.Name ?? "",
                CinemaId = st.CinemaId,
                CinemaName = st.Cinema?.Name ?? "",
                RoomId = st.RoomId,
                RoomName = st.Room?.Name ?? "",
                StartAt = st.StartAt,
                EndAt = st.EndAt,
                Format = st.Format,
                Language = st.Language,
                Subtitle = st.Subtitle,
                BasePrice = st.BasePrice,
                IsActive = st.IsActive,
                AvailableSeats = availableSeats,
                TotalSeats = totalSeats
            };
        }

        public async Task<long> CreateAsync(CreateShowtimeDto input)
        {
            // Validate movie
            var movie = await _db.Movies.FindAsync(input.MovieId);
            if (movie == null)
                throw new KeyNotFoundException($"Movie with Id={input.MovieId} not found");

            // Validate cinema & room
            var room = await _db.Rooms
                .Include(r => r.Cinema)
                .Include(r => r.Seats.Where(s => s.IsActive))
                .FirstOrDefaultAsync(r => r.Id == input.RoomId && r.CinemaId == input.CinemaId);

            if (room == null)
                throw new KeyNotFoundException($"Room with Id={input.RoomId} not found in Cinema {input.CinemaId}");

            if (!room.IsActive || room.IsDeleted)
                throw new InvalidOperationException("Room is not active");

            // Validate time
            if (input.StartAt <= DateTime.UtcNow)
                throw new ArgumentException("Start time must be in the future");

            if (input.EndAt <= input.StartAt)
                throw new ArgumentException("End time must be after start time");

            // Check room availability (no overlapping showtimes)
            var hasOverlap = await _db.Showtimes
                .AnyAsync(st => st.RoomId == input.RoomId
                    && st.IsActive
                    && ((input.StartAt >= st.StartAt && input.StartAt < st.EndAt) ||
                        (input.EndAt > st.StartAt && input.EndAt <= st.EndAt) ||
                        (input.StartAt <= st.StartAt && input.EndAt >= st.EndAt)));

            if (hasOverlap)
                throw new InvalidOperationException("Room is not available at this time");

            // Create showtime
            var showtime = new Entities.Showtime
            {
                MovieId = input.MovieId,
                CinemaId = input.CinemaId,
                RoomId = input.RoomId,
                StartAt = input.StartAt,
                EndAt = input.EndAt,
                Format = input.Format,
                Language = input.Language,
                Subtitle = input.Subtitle,
                BasePrice = input.BasePrice,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _db.Showtimes.Add(showtime);
            await _db.SaveChangesAsync();

            // Initialize ShowtimeSeats for all active seats in room
            foreach (var seat in room.Seats)
            {
                _db.ShowtimeSeats.Add(new ShowtimeSeat
                {
                    ShowtimeId = showtime.Id,
                    SeatId = seat.Id,
                    Status = SeatStatus.Available,
                    UpdatedAt = DateTime.UtcNow
                });
            }

            await _db.SaveChangesAsync();
            return showtime.Id;
        }

        public async Task UpdateAsync(UpdateShowtimeDto input)
        {
            var showtime = await _db.Showtimes
                .Include(st => st.Orders)
                .FirstOrDefaultAsync(st => st.Id == input.Id);

            if (showtime == null)
                throw new KeyNotFoundException($"Showtime with Id={input.Id} not found");

            // Cannot update if showtime has passed
            if (showtime.StartAt <= DateTime.UtcNow)
                throw new InvalidOperationException("Cannot update past showtime");

            // Cannot update if there are paid orders
            var hasPaidOrders = showtime.Orders.Any(o => o.Status == OrderStatus.Paid);
            if (hasPaidOrders)
                throw new InvalidOperationException("Cannot update showtime with paid orders");

            // Validate time if changed
            if (showtime.StartAt != input.StartAt || showtime.EndAt != input.EndAt)
            {
                if (input.StartAt <= DateTime.UtcNow)
                    throw new ArgumentException("Start time must be in the future");

                if (input.EndAt <= input.StartAt)
                    throw new ArgumentException("End time must be after start time");

                // Check room availability
                var hasOverlap = await _db.Showtimes
                    .AnyAsync(st => st.Id != input.Id
                        && st.RoomId == showtime.RoomId
                        && st.IsActive
                        && ((input.StartAt >= st.StartAt && input.StartAt < st.EndAt) ||
                            (input.EndAt > st.StartAt && input.EndAt <= st.EndAt) ||
                            (input.StartAt <= st.StartAt && input.EndAt >= st.EndAt)));

                if (hasOverlap)
                    throw new InvalidOperationException("Room is not available at this time");
            }
            showtime.CinemaId = input.CinemaId;
            showtime.MovieId = input.MovieId;
            showtime.RoomId = input.RoomId;
            showtime.StartAt = input.StartAt;
            showtime.EndAt = input.EndAt;
            showtime.Format = input.Format;
            showtime.Language = input.Language;
            showtime.Subtitle = input.Subtitle;
            showtime.BasePrice = input.BasePrice;
            showtime.IsActive = input.IsActive;

            await _db.SaveChangesAsync();
        }

        public async Task<ShowtimeDto> GetByIdAsync(long id)
        {
            var showtime = await _db.Showtimes
                .Include(st => st.Movie)
                .Include(st => st.Cinema)
                .Include(st => st.Room)
                .Include(st => st.ShowtimeSeats)
                .FirstOrDefaultAsync(st => st.Id == id);

            if (showtime == null)
                throw new KeyNotFoundException($"Showtime with Id={id} not found");

            return MapToDto(showtime);
        }

        public async Task<List<ShowtimeDto>> GetByMovieAsync(long movieId, DateTime? date = null)
        {
            var query = _db.Showtimes
                .Include(st => st.Movie)
                .Include(st => st.Cinema)
                .Include(st => st.Room)
                .Include(st => st.ShowtimeSeats)
                .Where(st => st.MovieId == movieId && st.IsActive && st.StartAt > DateTime.UtcNow);

            if (date.HasValue)
            {
                var startOfDay = date.Value.Date;
                var endOfDay = startOfDay.AddDays(1);
                query = query.Where(st => st.StartAt >= startOfDay && st.StartAt < endOfDay);
            }

            var showtimes = await query
                .OrderBy(st => st.StartAt)
                .ThenBy(st => st.Cinema.Name)
                .ToListAsync();

            return showtimes.Select(MapToDto).ToList();
        }

        public async Task<List<ShowtimeDto>> GetByCinemaAsync(int cinemaId, DateTime? date = null)
        {
            var query = _db.Showtimes
                .Include(st => st.Movie)
                .Include(st => st.Cinema)
                .Include(st => st.Room)
                .Include(st => st.ShowtimeSeats)
                .Where(st => st.CinemaId == cinemaId && st.IsActive && st.StartAt > DateTime.UtcNow);

            if (date.HasValue)
            {
                var startOfDay = date.Value.Date;
                var endOfDay = startOfDay.AddDays(1);
                query = query.Where(st => st.StartAt >= startOfDay && st.StartAt < endOfDay);
            }

            var showtimes = await query
                .OrderBy(st => st.StartAt)
                .ThenBy(st => st.Movie.Name)
                .ToListAsync();

            return showtimes.Select(MapToDto).ToList();
        }

        public async Task<List<ShowtimeSeatDto>> GetAvailableSeatsAsync(long showtimeId)
        {
            var showtime = await _db.Showtimes
                .Include(st => st.Cinema)
                .Include(st => st.ShowtimeSeats)
                    .ThenInclude(ss => ss.Seat)
                .FirstOrDefaultAsync(st => st.Id == showtimeId);

            if (showtime == null)
                throw new KeyNotFoundException($"Showtime with Id={showtimeId} not found");

            var seats = new List<ShowtimeSeatDto>();

            foreach (var ss in showtime.ShowtimeSeats.OrderBy(s => s.Seat.Row).ThenBy(s => s.Seat.Col))
            {
                // Calculate price based on tier and price rules
                var price = await _priceRuleService.CalculatePriceAsync(
                    showtime.CinemaId,
                    ss.Seat.Tier,
                    showtime.StartAt,
                    showtime.BasePrice
                );

                seats.Add(new ShowtimeSeatDto
                {
                    SeatId = ss.SeatId,
                    Label = ss.Seat.Label,
                    Row = ss.Seat.Row,
                    Col = ss.Seat.Col,
                    Tier = ss.Seat.Tier,
                    Status = ss.Status.ToString(),
                    Price = price
                });
            }

            return seats;
        }

        public async Task DeleteAsync(long id)
        {
            var showtime = await _db.Showtimes
                .Include(st => st.Orders)
                .FirstOrDefaultAsync(st => st.Id == id);

            if (showtime == null) return;

            // Cannot delete if showtime has started
            if (showtime.StartAt <= DateTime.UtcNow)
                throw new InvalidOperationException("Cannot delete past showtime");

            // Cannot delete if there are paid orders
            var hasPaidOrders = showtime.Orders.Any(o => o.Status == OrderStatus.Paid);
            if (hasPaidOrders)
                throw new InvalidOperationException("Cannot delete showtime with paid orders");

            // Cancel all pending orders
            var pendingOrders = showtime.Orders.Where(o => o.Status != OrderStatus.Paid).ToList();
            foreach (var order in pendingOrders)
            {
                order.Status = OrderStatus.Canceled;
                order.CanceledReason = "Showtime deleted";
                order.CanceledAt = DateTime.UtcNow;
            }

            // Soft delete or hard delete (your choice)
            showtime.IsActive = false;
            // Or: _db.Showtimes.Remove(showtime);

            await _db.SaveChangesAsync();
        }

        public async Task<PagedResultDto<ShowtimeDto>> GetPagedAsync(
            PagedRequestDto input,
            long? movieId = null,
            int? cinemaId = null,
            DateTime? date = null)
        {
            var query = _db.Showtimes
                .Include(st => st.Movie)
                .Include(st => st.Cinema)
                .Include(st => st.Room)
                .Include(st => st.ShowtimeSeats)
                .Where(st => st.IsActive)
                .AsQueryable();

            // Filter by movie
            if (movieId.HasValue)
            {
                query = query.Where(st => st.MovieId == movieId.Value);
            }

            // Filter by cinema
            if (cinemaId.HasValue)
            {
                query = query.Where(st => st.CinemaId == cinemaId.Value);
            }

            // Filter by date
            if (date.HasValue)
            {
                var startOfDay = date.Value.Date;
                var endOfDay = startOfDay.AddDays(1);
                query = query.Where(st => st.StartAt >= startOfDay && st.StartAt < endOfDay);
            }

            // Search
            if (!string.IsNullOrWhiteSpace(input.SearchTerm))
            {
                var term = input.SearchTerm.Trim().ToLower();
                query = query.Where(st =>
                    st.Movie.Name.ToLower().Contains(term) ||
                    st.Cinema.Name.ToLower().Contains(term)
                );
            }

            // Sort
            query = input.SortBy?.ToLower() switch
            {
                "startat" => input.SortDescending
                    ? query.OrderByDescending(st => st.StartAt)
                    : query.OrderBy(st => st.StartAt),
                "movie" => input.SortDescending
                    ? query.OrderByDescending(st => st.Movie.Name)
                    : query.OrderBy(st => st.Movie.Name),
                "cinema" => input.SortDescending
                    ? query.OrderByDescending(st => st.Cinema.Name)
                    : query.OrderBy(st => st.Cinema.Name),
                _ => query.OrderBy(st => st.StartAt)
            };

            var totalCount = await query.CountAsync();

            var items = await query
                .Skip((input.PageNumber - 1) * input.PageSize)
                .Take(input.PageSize)
                .ToListAsync();

            return new PagedResultDto<ShowtimeDto>
            {
                Items = items.Select(MapToDto).ToList(),
                TotalCount = totalCount,
                PageNumber = input.PageNumber,
                PageSize = input.PageSize
            };
        }
    }
}
