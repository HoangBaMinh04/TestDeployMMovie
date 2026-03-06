using System.ComponentModel.DataAnnotations;

namespace MovieWeb.Service.Chatbot
{
    // Request DTOs
    public class ChatRequest
    {
        [Required(ErrorMessage = "Message is required")]
        [StringLength(2000, ErrorMessage = "Message cannot exceed 2000 characters")]
        public string Message { get; set; } = string.Empty;
    }

    // Response DTOs
    public class ChatResponse
    {
        public string Message { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
        public bool Success { get; set; }
        public string? Error { get; set; }
    }

    public class ChatHistoryDto
    {
        public long Id { get; set; }
        public string Role { get; set; } = string.Empty; // "user" or "assistant"
        public string Content { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class ChatHistoryPagedDto
    {
        public List<ChatHistoryDto> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    }

    // Internal DTOs for Gemini API
    internal class GeminiRequest
    {
        public List<GeminiContent> Contents { get; set; } = new();
        public GeminiGenerationConfig? GenerationConfig { get; set; }
        public List<GeminiSafetySetting>? SafetySettings { get; set; }
    }

    internal class GeminiContent
    {
        public string Role { get; set; } = string.Empty;
        public List<GeminiPart> Parts { get; set; } = new();
    }

    internal class GeminiPart
    {
        public string Text { get; set; } = string.Empty;
    }

    internal class GeminiGenerationConfig
    {
        public double Temperature { get; set; } = 0.7;
        public int TopK { get; set; } = 40;
        public double TopP { get; set; } = 0.95;
        public int MaxOutputTokens { get; set; } = 1024;
    }

    internal class GeminiSafetySetting
    {
        public string Category { get; set; } = string.Empty;
        public string Threshold { get; set; } = string.Empty;
    }

    internal class GeminiResponse
    {
        public List<GeminiCandidate> Candidates { get; set; } = new();
    }

    internal class GeminiCandidate
    {
        public GeminiContent Content { get; set; } = new();
        public string FinishReason { get; set; } = string.Empty;
    }

    // Statistics DTO
    public class ChatStatisticsDto
    {
        public int TotalMessages { get; set; }
        public int UserMessages { get; set; }
        public int BotMessages { get; set; }
        public DateTime? FirstMessageAt { get; set; }
        public DateTime? LastMessageAt { get; set; }
    }
}
