namespace MovieWeb.Service.Room
{
    public class RoomDto
    {
        public int Id { get; set; }
        public int CinemaId { get; set; }
        public string CinemaName { get; set; } = default!;
        public string Name { get; set; } = default!;
        public int Rows { get; set; }
        public int Cols { get; set; }
        public int TotalSeats { get; set; }
        public bool IsActive { get; set; }
    }

    public class CreateRoomDto
    {
        public int CinemaId { get; set; }
        public string Name { get; set; } = default!;
        public int Rows { get; set; }
        public int Cols { get; set; }
    }

    public class UpdateRoomDto
    {
        public int Id { get; set; }
        public int CinemaId { get; set; }
        public string Name { get; set; } = default!;
        public int Rows { get; set; }
        public int Cols { get; set; }
        public bool IsActive { get; set; }
    }
}
