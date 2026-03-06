namespace MovieWeb.Service.Cinema
{
    public class CinemaDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = default!;
        public string? Address { get; set; }
        public string? PhoneNumber { get; set; }
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
        public bool IsActive { get; set; }
        public int RoomCount { get; set; }
    }

    public class CreateCinemaDto
    {
        public string Name { get; set; } = default!;
        public string? Address { get; set; }
        public string? PhoneNumber { get; set; }
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
    }

    public class UpdateCinemaDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = default!;
        public string? Address { get; set; }
        public string? PhoneNumber { get; set; }
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
        public bool IsActive { get; set; }
    }
}
