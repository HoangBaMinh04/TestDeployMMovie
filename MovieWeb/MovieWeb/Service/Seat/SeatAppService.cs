using Microsoft.EntityFrameworkCore;
using MovieWeb.Entities;

namespace MovieWeb.Service.Seat
{
    public interface ISeatService
    {
        Task<SeatDto> GetByIdAsync(int id);
        Task<SeatLayoutDto> GetRoomLayoutAsync(int roomId);
        Task<List<SeatDto>> GetByRoomAsync(int roomId);
        Task UpdateSeatTierAsync(int seatId, string tier);
        Task ToggleSeatActiveAsync(int seatId);
        Task BulkUpdateSeatsAsync(int roomId, List<UpdateSeatDto> updates);
    }

    public class UpdateSeatDto
    {
        public int SeatId { get; set; }
        public string? Tier { get; set; }
        public bool? IsActive { get; set; }
    }

    public class SeatService : ISeatService
    {
        private readonly MyDbContext _db;
        private static readonly string[] ValidTiers = { "Standard", "VIP", "Deluxe" };

        public SeatService(MyDbContext db)
        {
            _db = db;
        }

        private static SeatDto MapToDto(Entities.Seat seat)
        {
            return new SeatDto
            {
                Id = seat.Id,
                RoomId = seat.RoomId,
                Label = seat.Label,
                Row = seat.Row,
                Col = seat.Col,
                Tier = seat.Tier,
                IsActive = seat.IsActive
            };
        }

        public async Task<SeatDto> GetByIdAsync(int id)
        {
            var seat = await _db.Seats
                .FirstOrDefaultAsync(s => s.Id == id);

            if (seat == null)
                throw new KeyNotFoundException($"Seat with Id={id} not found");

            return MapToDto(seat);
        }

        public async Task<SeatLayoutDto> GetRoomLayoutAsync(int roomId)
        {
            var room = await _db.Rooms
                .Include(r => r.Seats.Where(s => s.IsActive))
                .FirstOrDefaultAsync(r => r.Id == roomId && !r.IsDeleted);

            if (room == null)
                throw new KeyNotFoundException($"Room with Id={roomId} not found");

            return new SeatLayoutDto
            {
                RoomId = room.Id,
                RoomName = room.Name,
                Rows = room.Rows,
                Cols = room.Cols,
                Seats = room.Seats
                    .OrderBy(s => s.Row)
                    .ThenBy(s => s.Col)
                    .Select(MapToDto)
                    .ToList()
            };
        }

        public async Task<List<SeatDto>> GetByRoomAsync(int roomId)
        {
            var seats = await _db.Seats
                .Where(s => s.RoomId == roomId)
                .OrderBy(s => s.Row)
                .ThenBy(s => s.Col)
                .ToListAsync();

            return seats.Select(MapToDto).ToList();
        }

        public async Task UpdateSeatTierAsync(int seatId, string tier)
        {
            if (!ValidTiers.Contains(tier))
                throw new ArgumentException($"Invalid tier. Valid values: {string.Join(", ", ValidTiers)}");

            var seat = await _db.Seats.FindAsync(seatId);
            if (seat == null)
                throw new KeyNotFoundException($"Seat with Id={seatId} not found");

            // Check if seat has upcoming bookings
            var hasUpcomingBookings = await _db.ShowtimeSeats
                .Include(ss => ss.Showtime)
                .AnyAsync(ss => ss.SeatId == seatId
                    && ss.Status != SeatStatus.Available
                    && ss.Showtime.StartAt > DateTime.UtcNow);

            if (hasUpcomingBookings)
                throw new InvalidOperationException("Cannot change tier for seat with upcoming bookings");

            seat.Tier = tier;
            await _db.SaveChangesAsync();
        }

        public async Task ToggleSeatActiveAsync(int seatId)
        {
            var seat = await _db.Seats.FindAsync(seatId);
            if (seat == null)
                throw new KeyNotFoundException($"Seat with Id={seatId} not found");

            // Check if seat has upcoming bookings
            if (seat.IsActive)
            {
                var hasUpcomingBookings = await _db.ShowtimeSeats
                    .Include(ss => ss.Showtime)
                    .AnyAsync(ss => ss.SeatId == seatId
                        && ss.Status != SeatStatus.Available
                        && ss.Showtime.StartAt > DateTime.UtcNow);

                if (hasUpcomingBookings)
                    throw new InvalidOperationException("Cannot deactivate seat with upcoming bookings");
            }

            seat.IsActive = !seat.IsActive;
            await _db.SaveChangesAsync();
        }

        public async Task BulkUpdateSeatsAsync(int roomId, List<UpdateSeatDto> updates)
        {
            var room = await _db.Rooms
                .Include(r => r.Seats)
                .FirstOrDefaultAsync(r => r.Id == roomId && !r.IsDeleted);

            if (room == null)
                throw new KeyNotFoundException($"Room with Id={roomId} not found");

            var seatIds = updates.Select(u => u.SeatId).ToList();
            var seats = room.Seats.Where(s => seatIds.Contains(s.Id)).ToList();

            if (seats.Count != updates.Count)
                throw new ArgumentException("Some seat IDs are invalid or not in this room");

            foreach (var update in updates)
            {
                var seat = seats.First(s => s.Id == update.SeatId);

                if (update.Tier != null)
                {
                    if (!ValidTiers.Contains(update.Tier))
                        throw new ArgumentException($"Invalid tier '{update.Tier}' for seat {seat.Label}");

                    seat.Tier = update.Tier;
                }

                if (update.IsActive.HasValue)
                {
                    // Check upcoming bookings if deactivating
                    if (seat.IsActive && !update.IsActive.Value)
                    {
                        var hasUpcomingBookings = await _db.ShowtimeSeats
                            .Include(ss => ss.Showtime)
                            .AnyAsync(ss => ss.SeatId == seat.Id
                                && ss.Status != SeatStatus.Available
                                && ss.Showtime.StartAt > DateTime.UtcNow);

                        if (hasUpcomingBookings)
                            throw new InvalidOperationException($"Cannot deactivate seat {seat.Label} with upcoming bookings");
                    }

                    seat.IsActive = update.IsActive.Value;
                }
            }

            await _db.SaveChangesAsync();
        }
    }
}