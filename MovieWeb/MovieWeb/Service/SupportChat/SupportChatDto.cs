using System.ComponentModel.DataAnnotations;
using MovieWeb.Entities;

namespace MovieWeb.Service.SupportChat
{
    // ==================== Request DTOs ====================

    public class CreateConversationRequest
    {
        [MaxLength(200)]
        public string? Subject { get; set; }

        [Required(ErrorMessage = "Message is required")]
        [StringLength(4000, ErrorMessage = "Message cannot exceed 4000 characters")]
        public string Message { get; set; } = string.Empty;
    }

    public class SendMessageRequest
    {
        [Required(ErrorMessage = "Message is required")]
        [StringLength(4000, ErrorMessage = "Message cannot exceed 4000 characters")]
        public string Message { get; set; } = string.Empty;
    }

    // ==================== Response DTOs ====================

    public class ConversationDto
    {
        public long Id { get; set; }
        public long CustomerId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string? CustomerEmail { get; set; }
        public long? AssignedAdminId { get; set; }
        public string? AssignedAdminName { get; set; }
        public string? Subject { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? LastMessagePreview { get; set; }
        public DateTime? LastMessageAt { get; set; }
        public int UnreadByAdminCount { get; set; }
        public int UnreadByCustomerCount { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ClosedAt { get; set; }
    }

    public class ConversationDetailDto : ConversationDto
    {
        public List<ConversationMessageDto> Messages { get; set; } = new();
    }

    public class ConversationMessageDto
    {
        public long Id { get; set; }
        public long ConversationId { get; set; }
        public long SenderId { get; set; }
        public string SenderName { get; set; } = string.Empty;
        public string SenderRole { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class ConversationListDto
    {
        public List<ConversationDto> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    }

    // ==================== SignalR Event DTOs ====================

    /// <summary>
    /// Event g?i qua SignalR khi có tin nh?n m?i
    /// </summary>
    public class NewMessageEvent
    {
        public long ConversationId { get; set; }
        public ConversationMessageDto Message { get; set; } = default!;
    }

    /// <summary>
    /// Event g?i qua SignalR khi có cu?c h?i tho?i m?i (thông báo cho admin)
    /// </summary>
    public class NewConversationEvent
    {
        public ConversationDto Conversation { get; set; } = default!;
        public ConversationMessageDto FirstMessage { get; set; } = default!;
    }

    /// <summary>
    /// Event khi admin join/assign cu?c h?i tho?i
    /// </summary>
    public class ConversationAssignedEvent
    {
        public long ConversationId { get; set; }
        public long AdminId { get; set; }
        public string AdminName { get; set; } = string.Empty;
    }

    /// <summary>
    /// Event khi cu?c h?i tho?i ???c ?óng
    /// </summary>
    public class ConversationClosedEvent
    {
        public long ConversationId { get; set; }
        public DateTime ClosedAt { get; set; }
    }

    /// <summary>
    /// Event typing indicator
    /// </summary>
    public class TypingEvent
    {
        public long ConversationId { get; set; }
        public long UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public bool IsTyping { get; set; }
    }
}
