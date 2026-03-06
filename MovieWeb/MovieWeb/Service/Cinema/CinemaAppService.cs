using Microsoft.EntityFrameworkCore;
using MovieWeb.DTOs.Common;

namespace MovieWeb.Service.Cinema
{
    public interface ICinemaService
    {
        Task<int> CreateAsync(CreateCinemaDto input);
        Task UpdateAsync(UpdateCinemaDto input);
        Task<CinemaDto> GetByIdAsync(int id);
        Task<CinemaDto> GetByAddressAsync(string address);
        Task<List<CinemaDto>> GetByNameAsync(string name);
        Task<List<CinemaDto>> GetAllAsync();
        Task<List<CinemaDto>> GetActiveAsync();
        Task DeleteAsync(int id);
        Task<PagedResultDto<CinemaDto>> GetPagedAsync(PagedRequestDto input, bool? isActive = null);
        Task ToggleActiveAsync(int id);
    }

    public class CinemaService : ICinemaService
    {
        private readonly MyDbContext _db;

        public CinemaService(MyDbContext db)
        {
            _db = db;
        }

        private static CinemaDto MapToDto(Entities.Cinema cinema)
        {
            return new CinemaDto
            {
                Id = cinema.Id,
                Name = cinema.Name,
                Address = cinema.Address,
                PhoneNumber = cinema.PhoneNumber,
                Latitude = cinema.Latitude,
                Longitude = cinema.Longitude,
                IsActive = cinema.IsActive,
                RoomCount = cinema.Rooms.Count
            };
        }

        public async Task<int> CreateAsync(CreateCinemaDto input)
        {
            if (string.IsNullOrWhiteSpace(input.Name))
                throw new ArgumentException("Cinema name is required");

            // Validate duplicate name
            var nameExists = await _db.Cinemas
                .AnyAsync(c => c.Name.ToLower() == input.Name.Trim().ToLower() && !c.IsDeleted);

            if (nameExists)
                throw new InvalidOperationException($"Cinema with name '{input.Name}' already exists");

            var cinema = new Entities.Cinema
            {
                Name = input.Name.Trim(),
                Address = input.Address?.Trim(),
                PhoneNumber = input.PhoneNumber?.Trim(),
                Latitude = input.Latitude,
                Longitude = input.Longitude,
                IsActive = true,
                IsDeleted = false
            };

            _db.Cinemas.Add(cinema);
            await _db.SaveChangesAsync();
            return cinema.Id;
        }

        public async Task UpdateAsync(UpdateCinemaDto input)
        {
            var cinema = await _db.Cinemas
                .FirstOrDefaultAsync(c => c.Id == input.Id && !c.IsDeleted);

            if (cinema == null)
                throw new KeyNotFoundException($"Cinema with Id={input.Id} not found");

            if (string.IsNullOrWhiteSpace(input.Name))
                throw new ArgumentException("Cinema name is required");

            // Validate duplicate name (except current)
            var nameExists = await _db.Cinemas
                .AnyAsync(c => c.Id != input.Id
                    && c.Name.ToLower() == input.Name.Trim().ToLower()
                    && !c.IsDeleted);

            if (nameExists)
                throw new InvalidOperationException($"Cinema with name '{input.Name}' already exists");

            cinema.Name = input.Name.Trim();
            cinema.Address = input.Address?.Trim();
            cinema.PhoneNumber = input.PhoneNumber?.Trim();
            cinema.Latitude = input.Latitude;
            cinema.Longitude = input.Longitude;
            cinema.IsActive = input.IsActive;

            await _db.SaveChangesAsync();
        }

        public async Task<CinemaDto> GetByIdAsync(int id)
        {
            var cinema = await _db.Cinemas
                .Include(c => c.Rooms.Where(r => !r.IsDeleted))
                .FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted);

            if (cinema == null)
                throw new KeyNotFoundException($"Cinema with Id={id} not found");

            return MapToDto(cinema);
        }

        public async Task<List<CinemaDto>> GetAllAsync()
        {
            var cinemas = await _db.Cinemas
                .Include(c => c.Rooms.Where(r => !r.IsDeleted))
                .Where(c => !c.IsDeleted)
                .OrderBy(c => c.Name)
                .ToListAsync();

            return cinemas.Select(MapToDto).ToList();
        }

        public async Task<List<CinemaDto>> GetActiveAsync()
        {
            var cinemas = await _db.Cinemas
                .Include(c => c.Rooms.Where(r => !r.IsDeleted && r.IsActive))
                .Where(c => !c.IsDeleted && c.IsActive)
                .OrderBy(c => c.Name)
                .ToListAsync();

            return cinemas.Select(MapToDto).ToList();
        }

        public async Task DeleteAsync(int id)
        {
            var cinema = await _db.Cinemas
                .Include(c => c.Rooms)
                .Include(c => c.Showtimes)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (cinema == null) return;

            // Check if cinema has active showtimes
            var hasActiveShowtimes = await _db.Showtimes
                .AnyAsync(st => st.CinemaId == id && st.StartAt > DateTime.UtcNow);

            if (hasActiveShowtimes)
                throw new InvalidOperationException("Cannot delete cinema with upcoming showtimes");

            // Soft delete
            cinema.IsDeleted = true;
            cinema.IsActive = false;

            // Soft delete all rooms
            foreach (var room in cinema.Rooms)
            {
                room.IsDeleted = true;
                room.IsActive = false;
            }

            await _db.SaveChangesAsync();
        }

        public async Task ToggleActiveAsync(int id)
        {
            var cinema = await _db.Cinemas
                .FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted);

            if (cinema == null)
                throw new KeyNotFoundException($"Cinema with Id={id} not found");

            cinema.IsActive = !cinema.IsActive;
            await _db.SaveChangesAsync();
        }

        public async Task<PagedResultDto<CinemaDto>> GetPagedAsync(
            PagedRequestDto input,
            bool? isActive = null)
        {
            var query = _db.Cinemas
                .Include(c => c.Rooms.Where(r => !r.IsDeleted))
                .Where(c => !c.IsDeleted)
                .AsQueryable();

            // Filter by active status
            if (isActive.HasValue)
            {
                query = query.Where(c => c.IsActive == isActive.Value);
            }

            // Search
            if (!string.IsNullOrWhiteSpace(input.SearchTerm))
            {
                var term = input.SearchTerm.Trim().ToLower();
                query = query.Where(c =>
                    c.Name.ToLower().Contains(term) ||
                    (c.Address != null && c.Address.ToLower().Contains(term)) ||
                    (c.PhoneNumber != null && c.PhoneNumber.Contains(term))
                );
            }

            // Sort
            query = input.SortBy?.ToLower() switch
            {
                "name" => input.SortDescending
                    ? query.OrderByDescending(c => c.Name)
                    : query.OrderBy(c => c.Name),
                "address" => input.SortDescending
                    ? query.OrderByDescending(c => c.Address)
                    : query.OrderBy(c => c.Address),
                "roomcount" => input.SortDescending
                    ? query.OrderByDescending(c => c.Rooms.Count)
                    : query.OrderBy(c => c.Rooms.Count),
                _ => query.OrderBy(c => c.Name)
            };

            var totalCount = await query.CountAsync();

            var items = await query
                .Skip((input.PageNumber - 1) * input.PageSize)
                .Take(input.PageSize)
                .ToListAsync();

            return new PagedResultDto<CinemaDto>
            {
                Items = items.Select(MapToDto).ToList(),
                TotalCount = totalCount,
                PageNumber = input.PageNumber,
                PageSize = input.PageSize
            };
        }

        public async Task<CinemaDto> GetByAddressAsync(string address)
        {
            var cinema = await _db.Cinemas
            .Include(c => c.Rooms.Where(r => !r.IsDeleted))
            .FirstOrDefaultAsync(c => c.Address == address && !c.IsDeleted);

            if (cinema == null)
                throw new KeyNotFoundException($"Cinema with address ={address} not found");

            return MapToDto(cinema);
        }

        public async Task<List<CinemaDto>> GetByNameAsync(string name)
        {
            var cinemas = await _db.Cinemas
                .Where(m => EF.Functions.ILike(m.Name, $"%{name}%"))
                .ToListAsync();

            return cinemas.Select(MapToDto).ToList();
        }
    }
}
