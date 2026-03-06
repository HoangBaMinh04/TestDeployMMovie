using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using MovieWeb.DTOs.Realtime;
using MovieWeb.Service.Realtime;

namespace MovieWeb.Hubs
{
    [AllowAnonymous]
    public class ShowtimeHub : Hub<IShowtimeClient>
    {
        public Task JoinShowtime(long showtimeId)
        {
            return Groups.AddToGroupAsync(Context.ConnectionId, ShowtimeRealtimeAppService.GetGroupName(showtimeId));
        }

        public Task LeaveShowtime(long showtimeId)
        {
            return Groups.RemoveFromGroupAsync(Context.ConnectionId, ShowtimeRealtimeAppService.GetGroupName(showtimeId));
        }
    }

    public interface IShowtimeClient
    {
        Task SeatsChanged(SeatsChangedMessage message);
    }
}
