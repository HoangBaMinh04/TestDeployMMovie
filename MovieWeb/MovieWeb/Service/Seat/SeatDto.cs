namespace MovieWeb.Service.Seat
{
    public class SeatDto
    {
        public int Id { get; set; }
        public int RoomId { get; set; }
        public string Label { get; set; } = default!;
        public int Row { get; set; }
        public int Col { get; set; }
        public string Tier { get; set; } = default!;
        public bool IsActive { get; set; }
    }

    public class SeatLayoutDto
    {
        public int RoomId { get; set; }
        public string RoomName { get; set; } = default!;
        public int Rows { get; set; }
        public int Cols { get; set; }
        public List<SeatDto> Seats { get; set; } = new();
    }
}
