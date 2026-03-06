namespace MovieWeb.Service.Showtime
{
    public class ShowtimeDto
    {
        public long Id { get; set; }
        public long MovieId { get; set; }
        public string MovieName { get; set; } = default!;
        public int CinemaId { get; set; }
        public string CinemaName { get; set; } = default!;
        public int RoomId { get; set; }
        public string RoomName { get; set; } = default!;
        public DateTime StartAt { get; set; }
        public DateTime EndAt { get; set; }
        public string Format { get; set; } = default!;
        public string Language { get; set; } = default!;
        public string Subtitle { get; set; } = default!;
        public decimal BasePrice { get; set; }
        public bool IsActive { get; set; }
        public int AvailableSeats { get; set; }
        public int TotalSeats { get; set; }
    }

    public class CreateShowtimeDto
    {
        public long MovieId { get; set; }
        public int CinemaId { get; set; }
        public int RoomId { get; set; }
        public DateTime StartAt { get; set; }
        public DateTime EndAt { get; set; }
        public string Format { get; set; } = "2D";
        public string Language { get; set; } = "VI";
        public string Subtitle { get; set; } = "VI";
        public decimal BasePrice { get; set; }
    }

    public class UpdateShowtimeDto
    {
        public long Id { get; set; }
        public long MovieId { get; set; }
        public int CinemaId { get; set; }
        public int RoomId { get; set; }
        public DateTime StartAt { get; set; }
        public DateTime EndAt { get; set; }
        public string Format { get; set; } = "2D";
        public string Language { get; set; } = "VI";
        public string Subtitle { get; set; } = "VI";
        public decimal BasePrice { get; set; }
        public bool IsActive { get; set; }
    }

    public class ShowtimeSeatDto
    {
        public int SeatId { get; set; }
        public string Label { get; set; } = default!;
        public int Row { get; set; }
        public int Col { get; set; }
        public string Tier { get; set; } = default!;
        public string Status { get; set; } = default!; // Available/Holding/Sold
        public decimal Price { get; set; }
    }
}