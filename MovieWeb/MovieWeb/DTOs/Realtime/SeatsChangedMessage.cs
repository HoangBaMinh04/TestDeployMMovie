namespace MovieWeb.DTOs.Realtime
{
    public class SeatsChangedMessage
    {
        public long ShowtimeId { get; set; }

        public List<SeatStatusDto> Seats { get; set; } = new();
    }
}
