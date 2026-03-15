using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using MovieWeb.Entities;
using MovieWeb.Service.SupportChat;

namespace MovieWeb.Hubs
{
    /// <summary>
    /// SignalR Hub cho chat realtime gi?a khách hàng và admin.
    /// 
    /// Client events (server ? client):
    /// - ReceiveMessage: Nh?n tin nh?n m?i
    /// - NewConversation: Admin nh?n thông báo có cu?c h?i tho?i m?i
    /// - ConversationAssigned: Thông báo admin ?ã nh?n x? lý
    /// - ConversationClosed: Thông báo cu?c h?i tho?i ?ã ?óng
    /// - UserTyping: Thông báo ?ang gõ
    /// - MessagesRead: Thông báo tin nh?n ?ã ???c ??c
    /// - Error: Thông báo l?i
    /// 
    /// Server methods (client ? server):
    /// - SendMessage: G?i tin nh?n
    /// - JoinConversation: Tham gia phòng chat
    /// - LeaveConversation: R?i phòng chat
    /// - Typing: G?i tr?ng thái ?ang gõ
    /// - MarkAsRead: ?ánh d?u ?ã ??c
    /// </summary>
    [Authorize]
    public class SupportChatHub : Hub
    {
        private readonly ISupportChatAppService _chatService;
        private readonly UserManager<AppUser> _userManager;
        private readonly ILogger<SupportChatHub> _logger;

        // Group name cho t?t c? admin online
        private const string AdminGroupName = "SupportAdmins";

        public SupportChatHub(
            ISupportChatAppService chatService,
            UserManager<AppUser> userManager,
            ILogger<SupportChatHub> logger)
        {
            _chatService = chatService;
            _userManager = userManager;
            _logger = logger;
        }

        /// <summary>
        /// Khi client k?t n?i, t? ??ng join vào group phù h?p
        /// </summary>
        public override async Task OnConnectedAsync()
        {
            var user = await GetCurrentUserAsync();
            if (user == null)
            {
                Context.Abort();
                return;
            }

            var isAdmin = await _userManager.IsInRoleAsync(user, "Admin");

            if (isAdmin)
            {
                // Admin join vào group admin ?? nh?n thông báo cu?c h?i tho?i m?i
                await Groups.AddToGroupAsync(Context.ConnectionId, AdminGroupName);
                _logger.LogInformation("Admin {UserId} ({UserName}) connected to SupportChatHub",
                    user.Id, user.UserName);
            }
            else
            {
                // Customer join vào group cá nhân
                await Groups.AddToGroupAsync(Context.ConnectionId, $"User_{user.Id}");
                _logger.LogInformation("Customer {UserId} ({UserName}) connected to SupportChatHub",
                    user.Id, user.UserName);
            }

            await base.OnConnectedAsync();
        }

        /// <summary>
        /// Khi client ng?t k?t n?i
        /// </summary>
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var user = await GetCurrentUserAsync();
            if (user != null)
            {
                var isAdmin = await _userManager.IsInRoleAsync(user, "Admin");
                if (isAdmin)
                {
                    await Groups.RemoveFromGroupAsync(Context.ConnectionId, AdminGroupName);
                }
                else
                {
                    await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"User_{user.Id}");
                }

                _logger.LogInformation("User {UserId} disconnected from SupportChatHub", user.Id);
            }

            await base.OnDisconnectedAsync(exception);
        }

        /// <summary>
        /// Tham gia vào phòng chat c?a cu?c h?i tho?i c? th?
        /// </summary>
        public async Task JoinConversation(long conversationId)
        {
            var user = await GetCurrentUserAsync();
            if (user == null) return;

            var isAdmin = await _userManager.IsInRoleAsync(user, "Admin");

            // Ki?m tra quy?n truy c?p
            var conversation = await _chatService.GetConversationAsync(conversationId, user.Id, isAdmin);
            if (conversation == null)
            {
                await Clients.Caller.SendAsync("Error", "Conversation not found or access denied");
                return;
            }

            var groupName = $"Conversation_{conversationId}";
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);

            // ?ánh d?u ?ã ??c khi join
            await _chatService.MarkMessagesAsReadAsync(conversationId, user.Id, isAdmin);

            // Thông báo cho ??i ph??ng bi?t tin nh?n ?ã ???c ??c
            await Clients.OthersInGroup(groupName).SendAsync("MessagesRead", new
            {
                ConversationId = conversationId,
                ReadByUserId = user.Id,
                ReadByRole = isAdmin ? "Admin" : "User"
            });

            _logger.LogInformation("User {UserId} joined conversation {ConversationId}", user.Id, conversationId);
        }

        /// <summary>
        /// R?i phòng chat
        /// </summary>
        public async Task LeaveConversation(long conversationId)
        {
            var groupName = $"Conversation_{conversationId}";
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);

            var user = await GetCurrentUserAsync();
            _logger.LogInformation("User {UserId} left conversation {ConversationId}", user?.Id, conversationId);
        }

        /// <summary>
        /// G?i tin nh?n trong cu?c h?i tho?i
        /// </summary>
        public async Task SendMessage(long conversationId, string content)
        {
            var user = await GetCurrentUserAsync();
            if (user == null) return;

            if (string.IsNullOrWhiteSpace(content))
            {
                await Clients.Caller.SendAsync("Error", "Message cannot be empty");
                return;
            }

            if (content.Length > 4000)
            {
                await Clients.Caller.SendAsync("Error", "Message cannot exceed 4000 characters");
                return;
            }

            var isAdmin = await _userManager.IsInRoleAsync(user, "Admin");
            var senderRole = isAdmin ? "Admin" : "User";

            var messageDto = await _chatService.SendMessageAsync(conversationId, user.Id, senderRole, content);
            if (messageDto == null)
            {
                await Clients.Caller.SendAsync("Error", "Failed to send message. Conversation may be closed.");
                return;
            }

            var groupName = $"Conversation_{conversationId}";

            // G?i tin nh?n t?i t?t c? ng??i trong cu?c h?i tho?i
            await Clients.Group(groupName).SendAsync("ReceiveMessage", new NewMessageEvent
            {
                ConversationId = conversationId,
                Message = messageDto
            });

            // N?u customer g?i ? thông báo cho t?t c? admin
            if (senderRole == "User")
            {
                await Clients.Group(AdminGroupName).SendAsync("ReceiveMessage", new NewMessageEvent
                {
                    ConversationId = conversationId,
                    Message = messageDto
                });
            }
            else
            {
                // N?u admin g?i ? thông báo cho customer (qua group cá nhân)
                var conversation = await _chatService.GetConversationAsync(conversationId, user.Id, true);
                if (conversation != null)
                {
                    await Clients.Group($"User_{conversation.CustomerId}").SendAsync("ReceiveMessage", new NewMessageEvent
                    {
                        ConversationId = conversationId,
                        Message = messageDto
                    });
                }
            }

            _logger.LogInformation("User {UserId} ({Role}) sent message in conversation {ConversationId}",
                user.Id, senderRole, conversationId);
        }

        /// <summary>
        /// G?i tr?ng thái ?ang gõ
        /// </summary>
        public async Task Typing(long conversationId, bool isTyping)
        {
            var user = await GetCurrentUserAsync();
            if (user == null) return;

            var groupName = $"Conversation_{conversationId}";

            await Clients.OthersInGroup(groupName).SendAsync("UserTyping", new TypingEvent
            {
                ConversationId = conversationId,
                UserId = user.Id,
                UserName = user.FullName ?? user.UserName ?? "Unknown",
                IsTyping = isTyping
            });
        }

        /// <summary>
        /// ?ánh d?u tin nh?n ?ã ??c
        /// </summary>
        public async Task MarkAsRead(long conversationId)
        {
            var user = await GetCurrentUserAsync();
            if (user == null) return;

            var isAdmin = await _userManager.IsInRoleAsync(user, "Admin");

            await _chatService.MarkMessagesAsReadAsync(conversationId, user.Id, isAdmin);

            var groupName = $"Conversation_{conversationId}";
            await Clients.OthersInGroup(groupName).SendAsync("MessagesRead", new
            {
                ConversationId = conversationId,
                ReadByUserId = user.Id,
                ReadByRole = isAdmin ? "Admin" : "User"
            });
        }

        // ==================== HELPER ====================

        private async Task<AppUser?> GetCurrentUserAsync()
        {
            return await _userManager.GetUserAsync(Context.User!);
        }
    }
}
