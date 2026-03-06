using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using MovieWeb.Entities;
using MovieWeb.Service.Chatbot;

namespace MovieWeb.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ChatController : ControllerBase
    {
        private readonly IChatbotService _chatbotService;
        private readonly ILogger<ChatController> _logger;
        private readonly UserManager<AppUser> _userManager;

        public ChatController(
            IChatbotService chatbotService,
            ILogger<ChatController> logger,
            UserManager<AppUser> userManager)
        {
            _chatbotService = chatbotService;
            _logger = logger;
            _userManager = userManager;
        }


        /// Gửi tin nhắn cho chatbot AI
        [HttpPost("message")]
        [Authorize]
        public async Task<ActionResult<ChatResponse>> SendMessage([FromBody] ChatRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (string.IsNullOrWhiteSpace(request.Message))
                return BadRequest(new { error = "Message cannot be empty" });

            // Lấy userId từ JWT token
            var userId = await GetUserIdAsync();
            if (userId == null)
                return Unauthorized(new { error = "Invalid authentication token" });

            try
            {
                var response = await _chatbotService.SendMessageAsync(userId.Value, request.Message);

                if (!response.Success)
                    return StatusCode(500, response);

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing chat message for user {UserId}", userId);
                return StatusCode(500, new ChatResponse
                {
                    Message = "An error occurred while processing your message",
                    Success = false,
                    Error = ex.Message,
                    Timestamp = DateTime.UtcNow
                });
            }
        }


        /// Lấy toàn bộ lịch sử chat
        [HttpGet("history")]
        [Authorize]
        public async Task<ActionResult<List<ChatHistoryDto>>> GetHistory()
        {
            var userId = await GetUserIdAsync();
            if (userId == null)
                return Unauthorized();

            try
            {
                var history = await _chatbotService.GetChatHistoryAsync(userId.Value);
                return Ok(history);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting chat history for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to retrieve chat history" });
            }
        }


        /// Lấy lịch sử chat phân trang
        [HttpGet("history/paged")]
        [Authorize]
        public async Task<ActionResult<ChatHistoryPagedDto>> GetHistoryPaged(
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 20)
        {
            if (pageNumber < 1)
                return BadRequest(new { error = "Page number must be greater than 0" });

            if (pageSize < 1 || pageSize > 100)
                return BadRequest(new { error = "Page size must be between 1 and 100" });

            var userId = await GetUserIdAsync();
            if (userId == null)
                return Unauthorized();

            try
            {
                var history = await _chatbotService.GetChatHistoryPagedAsync(userId.Value, pageNumber, pageSize);
                return Ok(history);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting paged chat history for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to retrieve chat history" });
            }
        }


        /// Xóa toàn bộ lịch sử chat
        [HttpDelete("history")]
        [Authorize]
        public async Task<IActionResult> ClearHistory()
        {
            var userId = await GetUserIdAsync();
            if (userId == null)
                return Unauthorized();

            try
            {
                await _chatbotService.ClearHistoryAsync(userId.Value);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error clearing chat history for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to clear chat history" });
            }
        }


        /// Lấy thống kê chat
        [HttpGet("statistics")]
        [Authorize]
        public async Task<ActionResult<ChatStatisticsDto>> GetStatistics()
        {
            var userId = await GetUserIdAsync();
            if (userId == null)
                return Unauthorized();

            try
            {
                var stats = await _chatbotService.GetStatisticsAsync(userId.Value);
                return Ok(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting chat statistics for user {UserId}", userId);
                return StatusCode(500, new { error = "Failed to retrieve statistics" });
            }
        }


        // Health check cho chatbot
        [HttpGet("health")]
        [AllowAnonymous]
        public IActionResult HealthCheck()
        {
            return Ok(new
            {
                status = "healthy",
                service = "chatbot",
                provider = "Google Gemini 1.5 Flash",
                timestamp = DateTime.UtcNow
            });
        }

        // Helper: Lấy userId từ JWT token sử dụng UserManager
        private async Task<long?> GetUserIdAsync()
        {
            var user = await _userManager.GetUserAsync(User);
            return user?.Id;
        }
    }
}