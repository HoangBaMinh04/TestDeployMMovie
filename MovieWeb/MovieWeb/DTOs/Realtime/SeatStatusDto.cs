namespace MovieWeb.DTOs.Realtime
{
    public class SeatStatusDto
    {
        public int SeatId { get; set; }

        public string Status { get; set; } = string.Empty;

        public DateTime? HoldUntil { get; set; }

        public long? OrderId { get; set; }
    }
}
