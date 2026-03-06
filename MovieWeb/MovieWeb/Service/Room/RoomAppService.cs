using Microsoft.EntityFrameworkCore;
using MovieWeb.DTOs.Common;

namespace MovieWeb.Service.Room
{
    public interface IRoomService
    {
        Task<int> CreateAsync(CreateRoomDto input);
        Task UpdateAsync(UpdateRoomDto input);
        Task<RoomDto> GetByIdAsync(int id);
        Task<List<RoomDto>> GetAllAsync();
        Task<List<RoomDto>> GetByCinemaAsync(int cinemaId);
        Task DeleteAsync(int id);
        Task<PagedResultDto<RoomDto>> GetPagedAsync(PagedRequestDto input, int? cinemaId = null);
        Task ToggleActiveAsync(int id);
    }

    public class RoomService : IRoomService
    {
        private readonly MyDbContext _db;

        public RoomService(MyDbContext db)
        {
            _db = db;
        }

        private static RoomDto MapToDto(Entities.Room room)
        {
            return new RoomDto
            {
                Id = room.Id,
                CinemaId = room.CinemaId,
                CinemaName = room.Cinema?.Name ?? "",
                Name = room.Name,
                Rows = room.Rows,
                Cols = room.Cols,
                TotalSeats = room.Seats.Count,
                IsActive = room.IsActive
            };
        }

        public async Task<int> CreateAsync(CreateRoomDto input)
        {
            if (string.IsNullOrWhiteSpace(input.Name))
                throw new ArgumentException("Room name is required");

            // Validate cinema exists
            var cinema = await _db.Cinemas
                .FirstOrDefaultAsync(c => c.Id == input.CinemaId && !c.IsDeleted);

            if (cinema == null)
                throw new KeyNotFoundException($"Cinema with Id={input.CinemaId} not found");

            // Validate duplicate room name in same cinema
            var nameExists = await _db.Rooms
                .AnyAsync(r => r.CinemaId == input.CinemaId
                    && r.Name.ToLower() == input.Name.Trim().ToLower()
                    && !r.IsDeleted);

            if (nameExists)
                throw new InvalidOperationException($"Room '{input.Name}' already exists in this cinema");

            // Validate rows and cols
            if (input.Rows < 1 || input.Rows > 50)
                throw new ArgumentException("Rows must be between 1 and 50");

            if (input.Cols < 1 || input.Cols > 50)
                throw new ArgumentException("Cols must be between 1 and 50");

            var room = new Entities.Room
            {
                CinemaId = input.CinemaId,
                Name = input.Name.Trim(),
                Rows = input.Rows,
                Cols = input.Cols,
                IsActive = true,
                IsDeleted = false
            };

            _db.Rooms.Add(room);
            await _db.SaveChangesAsync();

            // Auto-generate seats
            await GenerateSeatsForRoom(room.Id, input.Rows, input.Cols);

            return room.Id;
        }

        public async Task UpdateAsync(UpdateRoomDto input)
        {
            var room = await _db.Rooms
                .Include(r => r.Cinema)
                .FirstOrDefaultAsync(r => r.Id == input.Id && !r.IsDeleted);

            if (room == null)
                throw new KeyNotFoundException($"Room with Id={input.Id} not found");

            if (string.IsNullOrWhiteSpace(input.Name))
                throw new ArgumentException("Room name is required");

            // Validate duplicate name (except current)
            var nameExists = await _db.Rooms
                .AnyAsync(r => r.Id != input.Id
                    && r.CinemaId == room.CinemaId
                    && r.Name.ToLower() == input.Name.Trim().ToLower()
                    && !r.IsDeleted);

            if (nameExists)
                throw new InvalidOperationException($"Room '{input.Name}' already exists in this cinema");

            room.Name = input.Name.Trim();
            room.CinemaId = input.CinemaId;
            room.Cols = input.Cols;
            room.Rows = input.Rows;
            room.IsActive = input.IsActive;

            await _db.SaveChangesAsync();
        }

        public async Task<RoomDto> GetByIdAsync(int id)
        {
            var room = await _db.Rooms
                .Include(r => r.Cinema)
                .Include(r => r.Seats.Where(s => s.IsActive))
                .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);

            if (room == null)
                throw new KeyNotFoundException($"Room with Id={id} not found");

            return MapToDto(room);
        }

        public async Task<List<RoomDto>> GetAllAsync()
        {
            var rooms = await _db.Rooms
                .Include(r => r.Cinema)
                .Include(r => r.Seats)
                .Where(r => !r.IsDeleted)
                .OrderBy(r => r.Cinema.Name)
                .ThenBy(r => r.Name)
                .ToListAsync();

            return rooms.Select(MapToDto).ToList();
        }

        public async Task<List<RoomDto>> GetByCinemaAsync(int cinemaId)
        {
            var rooms = await _db.Rooms
                .Include(r => r.Cinema)
                .Include(r => r.Seats.Where(s => s.IsActive))
                .Where(r => r.CinemaId == cinemaId && !r.IsDeleted && r.IsActive)
                .OrderBy(r => r.Name)
                .ToListAsync();

            return rooms.Select(MapToDto).ToList();
        }

        public async Task DeleteAsync(int id)
        {
            var room = await _db.Rooms
                .Include(r => r.Showtimes)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (room == null) return;

            // Check if room has upcoming showtimes
            var hasActiveShowtimes = await _db.Showtimes
                .AnyAsync(st => st.RoomId == id && st.StartAt > DateTime.UtcNow);

            if (hasActiveShowtimes)
                throw new InvalidOperationException("Cannot delete room with upcoming showtimes");

            // Soft delete
            room.IsDeleted = true;
            room.IsActive = false;

            await _db.SaveChangesAsync();
        }

        public async Task ToggleActiveAsync(int id)
        {
            var room = await _db.Rooms
                .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);

            if (room == null)
                throw new KeyNotFoundException($"Room with Id={id} not found");

            room.IsActive = !room.IsActive;
            await _db.SaveChangesAsync();
        }

        public async Task<PagedResultDto<RoomDto>> GetPagedAsync(
            PagedRequestDto input,
            int? cinemaId = null)
        {
            var query = _db.Rooms
                .Include(r => r.Cinema)
                .Include(r => r.Seats)
                .Where(r => !r.IsDeleted)
                .AsQueryable();

            // Filter by cinema
            if (cinemaId.HasValue)
            {
                query = query.Where(r => r.CinemaId == cinemaId.Value);
            }

            // Search
            if (!string.IsNullOrWhiteSpace(input.SearchTerm))
            {
                var term = input.SearchTerm.Trim().ToLower();
                query = query.Where(r =>
                    r.Name.ToLower().Contains(term) ||
                    r.Cinema.Name.ToLower().Contains(term)
                );
            }

            // Sort
            query = input.SortBy?.ToLower() switch
            {
                "name" => input.SortDescending
                    ? query.OrderByDescending(r => r.Name)
                    : query.OrderBy(r => r.Name),
                "cinema" => input.SortDescending
                    ? query.OrderByDescending(r => r.Cinema.Name)
                    : query.OrderBy(r => r.Cinema.Name),
                "seats" => input.SortDescending
                    ? query.OrderByDescending(r => r.Seats.Count)
                    : query.OrderBy(r => r.Seats.Count),
                _ => query.OrderBy(r => r.Cinema.Name).ThenBy(r => r.Name)
            };

            var totalCount = await query.CountAsync();

            var items = await query
                .Skip((input.PageNumber - 1) * input.PageSize)
                .Take(input.PageSize)
                .ToListAsync();

            return new PagedResultDto<RoomDto>
            {
                Items = items.Select(MapToDto).ToList(),
                TotalCount = totalCount,
                PageNumber = input.PageNumber,
                PageSize = input.PageSize
            };
        }


        private async Task GenerateSeatsForRoom(int roomId, int rows, int cols)
        {
            var seats = new List<Entities.Seat>();

            int startVipRow = Math.Min(5, rows);
            int endVipRow = Math.Max(startVipRow, rows - 3);

            int startDeluxeRow = Math.Min(6, rows);
            int endDeluxeRow = Math.Max(startDeluxeRow, rows - 3);

            int mid = (cols + 1) / 2;
            int deluxeStartCol = Math.Max(1, mid - 1);
            int deluxeEndCol = Math.Min(cols, deluxeStartCol + 3);

            for (int row = 1; row <= rows; row++)
            {
                string rowLetter = ((char)('A' + row - 1)).ToString();

                for (int col = 1; col <= cols; col++)
                {
                    string tier = "Standard";

                    if (row >= startVipRow && row <= endVipRow)
                        tier = "VIP";

                    if (row >= startDeluxeRow && row <= endDeluxeRow &&
                        col >= deluxeStartCol && col <= deluxeEndCol)
                        tier = "Deluxe";

                    seats.Add(new Entities.Seat
                    {
                        RoomId = roomId,
                        Label = $"{rowLetter}{col}",
                        Row = row,
                        Col = col,
                        Tier = tier,
                        IsActive = true
                    });

                    Console.WriteLine($"{rowLetter}{col}: {tier}");
                }
            }

            await _db.Seats.AddRangeAsync(seats);
            await _db.SaveChangesAsync();
        }
    }
}