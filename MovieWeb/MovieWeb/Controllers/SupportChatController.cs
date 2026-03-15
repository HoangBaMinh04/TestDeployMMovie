using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using MovieWeb.Entities;
using MovieWeb.Hubs;
using MovieWeb.Service.SupportChat;

namespace MovieWeb.Controllers
{
    /// <summary>
    /// REST API cho h? th?ng chat h? tr? gi?a khách hàng và admin.
    /// S? d?ng k?t h?p v?i SignalR Hub (SupportChatHub) cho realtime.
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class SupportChatController : ControllerBase
    {
        private readonly ISupportChatAppService _chatService;
        private readonly UserManager<AppUser> _userManager;
        private readonly IHubContext<SupportChatHub> _hubContext;
        private readonly ILogger<SupportChatController> _logger;

        public SupportChatController(
            ISupportChatAppService chatService,
            UserManager<AppUser> userManager,
            IHubContext<SupportChatHub> hubContext,
            ILogger<SupportChatController> logger)
        {
            _chatService = chatService;
            _userManager = userManager;
            _hubContext = hubContext;
            _logger = logger;
        }

        // ==================== CUSTOMER APIs ====================

        /// <summary>
        /// [Customer] T?o cu?c h?i tho?i m?i ho?c ti?p t?c cu?c h?i tho?i ?ang m?
        /// </summary>
        [HttpPost("conversations")]
        public async Task<ActionResult<ConversationDetailDto>> CreateConversation([FromBody] CreateConversationRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = await GetUserIdAsync();
            if (userId == null) return Unauthorized();

            try
            {
                var result = await _chatService.CreateConversationAsync(userId.Value, request);

                // Thông báo cho t?t c? admin qua SignalR
                if (result.Messages.Count == 1) // Cu?c h?i tho?i m?i
                {
                    await _hubContext.Clients.Group("SupportAdmins").SendAsync("NewConversation", new NewConversationEvent
                    {
                        Conversation = new ConversationDto
                        {
                            Id = result.Id,
                            CustomerId = result.CustomerId,
                            CustomerName = result.CustomerName,
                            CustomerEmail = result.CustomerEmail,
                            Subject = result.Subject,
                            Status = result.Status,
                            LastMessagePreview = result.LastMessagePreview,
                            LastMessageAt = result.LastMessageAt,
                            UnreadByAdminCount = result.UnreadByAdminCount,
                            CreatedAt = result.CreatedAt
                        },
                        FirstMessage = result.Messages.First()
                    });
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating conversation for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to create conversation" });
            }
        }

        /// <summary>
        /// [Customer] L?y cu?c h?i tho?i ?ang m? c?a khách hàng
        /// </summary>
        [HttpGet("conversations/open")]
        public async Task<ActionResult<ConversationDetailDto>> GetOpenConversation()
        {
            var userId = await GetUserIdAsync();
            if (userId == null) return Unauthorized();

            var result = await _chatService.GetOpenConversationForCustomerAsync(userId.Value);
            if (result == null)
                return NotFound(new { message = "No open conversation found" });

            return Ok(result);
        }

        /// <summary>
        /// [Customer] L?y danh sách t?t c? cu?c h?i tho?i c?a khách hàng
        /// </summary>
        [HttpGet("conversations/my")]
        public async Task<ActionResult<List<ConversationDto>>> GetMyConversations()
        {
            var userId = await GetUserIdAsync();
            if (userId == null) return Unauthorized();

            var result = await _chatService.GetCustomerConversationsAsync(userId.Value);
            return Ok(result);
        }

        // ==================== ADMIN APIs ====================

        /// <summary>
        /// [Admin] L?y danh sách t?t c? cu?c h?i tho?i (phân trang, filter theo status)
        /// </summary>
        [HttpGet("admin/conversations")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<ConversationListDto>> GetAllConversations(
            [FromQuery] ConversationStatus? status = null,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 20)
        {
            if (pageNumber < 1) return BadRequest(new { error = "Page number must be >= 1" });
            if (pageSize < 1 || pageSize > 100) return BadRequest(new { error = "Page size must be between 1 and 100" });

            var result = await _chatService.GetAllConversationsAsync(status, pageNumber, pageSize);
            return Ok(result);
        }

        /// <summary>
        /// [Admin] Nh?n x? lý cu?c h?i tho?i (assign admin)
        /// </summary>
        [HttpPost("admin/conversations/{conversationId}/assign")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<ConversationDetailDto>> AssignConversation(long conversationId)
        {
            var userId = await GetUserIdAsync();
            if (userId == null) return Unauthorized();

            var result = await _chatService.AssignAdminToConversationAsync(conversationId, userId.Value);
            if (result == null) return NotFound(new { error = "Conversation not found" });

            var user = await _userManager.GetUserAsync(User);

            // Thông báo cho customer qua SignalR
            await _hubContext.Clients.Group($"User_{result.CustomerId}").SendAsync("ConversationAssigned", new ConversationAssignedEvent
            {
                ConversationId = conversationId,
                AdminId = userId.Value,
                AdminName = user?.FullName ?? user?.UserName ?? "Admin"
            });

            // Thông báo cho admin group
            await _hubContext.Clients.Group("SupportAdmins").SendAsync("ConversationAssigned", new ConversationAssignedEvent
            {
                ConversationId = conversationId,
                AdminId = userId.Value,
                AdminName = user?.FullName ?? user?.UserName ?? "Admin"
            });

            return Ok(result);
        }

        /// <summary>
        /// [Admin] ?óng cu?c h?i tho?i
        /// </summary>
        [HttpPost("admin/conversations/{conversationId}/close")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<ConversationDto>> CloseConversation(long conversationId)
        {
            var userId = await GetUserIdAsync();
            if (userId == null) return Unauthorized();

            var result = await _chatService.CloseConversationAsync(conversationId, userId.Value);
            if (result == null) return NotFound(new { error = "Conversation not found" });

            var closedEvent = new ConversationClosedEvent
            {
                ConversationId = conversationId,
                ClosedAt = result.ClosedAt ?? DateTime.UtcNow
            };

            // Thông báo cho c? 2 phía
            await _hubContext.Clients.Group($"Conversation_{conversationId}").SendAsync("ConversationClosed", closedEvent);
            await _hubContext.Clients.Group($"User_{result.CustomerId}").SendAsync("ConversationClosed", closedEvent);
            await _hubContext.Clients.Group("SupportAdmins").SendAsync("ConversationClosed", closedEvent);

            return Ok(result);
        }

        /// <summary>
        /// [Admin] L?y t?ng s? tin nh?n ch?a ??c
        /// </summary>
        [HttpGet("admin/unread-count")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<int>> GetUnreadCount()
        {
            var count = await _chatService.GetUnreadCountForAdminAsync();
            return Ok(new { unreadCount = count });
        }

        // ==================== COMMON APIs ====================

        /// <summary>
        /// L?y chi ti?t cu?c h?i tho?i (bao g?m tin nh?n)
        /// </summary>
        [HttpGet("conversations/{conversationId}")]
        public async Task<ActionResult<ConversationDetailDto>> GetConversation(long conversationId)
        {
            var userId = await GetUserIdAsync();
            if (userId == null) return Unauthorized();

            var isAdmin = await IsAdminAsync();

            var result = await _chatService.GetConversationAsync(conversationId, userId.Value, isAdmin);
            if (result == null) return NotFound(new { error = "Conversation not found or access denied" });

            return Ok(result);
        }

        /// <summary>
        /// G?i tin nh?n qua REST API (alternative cho SignalR)
        /// </summary>
        [HttpPost("conversations/{conversationId}/messages")]
        public async Task<ActionResult<ConversationMessageDto>> SendMessage(long conversationId, [FromBody] SendMessageRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = await GetUserIdAsync();
            if (userId == null) return Unauthorized();

            var isAdmin = await IsAdminAsync();
            var senderRole = isAdmin ? "Admin" : "User";

            var result = await _chatService.SendMessageAsync(conversationId, userId.Value, senderRole, request.Message);
            if (result == null)
                return BadRequest(new { error = "Failed to send message. Conversation may be closed or not found." });

            // Broadcast qua SignalR
            var messageEvent = new NewMessageEvent
            {
                ConversationId = conversationId,
                Message = result
            };

            await _hubContext.Clients.Group($"Conversation_{conversationId}").SendAsync("ReceiveMessage", messageEvent);

            if (senderRole == "User")
            {
                await _hubContext.Clients.Group("SupportAdmins").SendAsync("ReceiveMessage", messageEvent);
            }
            else
            {
                var conversation = await _chatService.GetConversationAsync(conversationId, userId.Value, true);
                if (conversation != null)
                {
                    await _hubContext.Clients.Group($"User_{conversation.CustomerId}").SendAsync("ReceiveMessage", messageEvent);
                }
            }

            return Ok(result);
        }

        /// <summary>
        /// ?ánh d?u tin nh?n ?ã ??c
        /// </summary>
        [HttpPost("conversations/{conversationId}/read")]
        public async Task<IActionResult> MarkAsRead(long conversationId)
        {
            var userId = await GetUserIdAsync();
            if (userId == null) return Unauthorized();

            var isAdmin = await IsAdminAsync();

            await _chatService.MarkMessagesAsReadAsync(conversationId, userId.Value, isAdmin);

            // Thông báo cho ??i ph??ng
            await _hubContext.Clients.Group($"Conversation_{conversationId}").SendAsync("MessagesRead", new
            {
                ConversationId = conversationId,
                ReadByUserId = userId.Value,
                ReadByRole = isAdmin ? "Admin" : "User"
            });

            return NoContent();
        }

        // ==================== HELPERS ====================

        private async Task<long?> GetUserIdAsync()
        {
            var user = await _userManager.GetUserAsync(User);
            return user?.Id;
        }

        private async Task<bool> IsAdminAsync()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return false;
            return await _userManager.IsInRoleAsync(user, "Admin");
        }
    }
}
