using Microsoft.AspNetCore.SignalR;
using MovieWeb.DTOs.Realtime;
using MovieWeb.Entities;
using MovieWeb.Hubs;

namespace MovieWeb.Service.Realtime
{
    public interface IShowtimeRealtimeAppService
    {
        Task BroadcastSeatsChangedAsync(long showtimeId, IEnumerable<ShowtimeSeat> seats);
    }
    public class ShowtimeRealtimeAppService : IShowtimeRealtimeAppService
    {
        private readonly IHubContext<ShowtimeHub, IShowtimeClient> _hubContext;

        public ShowtimeRealtimeAppService(IHubContext<ShowtimeHub, IShowtimeClient> hubContext)
        {
            _hubContext = hubContext;
        }

        public static string GetGroupName(long showtimeId) => $"showtime-{showtimeId}";

        public async Task BroadcastSeatsChangedAsync(long showtimeId, IEnumerable<ShowtimeSeat> seats)
        {
            var payload = new SeatsChangedMessage
            {
                ShowtimeId = showtimeId,
                Seats = seats.Select(ss => new SeatStatusDto
                {
                    SeatId = ss.SeatId,
                    Status = ss.Status.ToString(),
                    HoldUntil = ss.HoldUntil,
                    OrderId = ss.OrderId
                }).ToList()
            };

            await _hubContext.Clients.Group(GetGroupName(showtimeId)).SeatsChanged(payload);
        }
    }
}
