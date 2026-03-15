using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MovieWeb.Entities
{
    /// <summary>
    /// Tin nhắn trong cuộc hội thoại hỗ trợ
    /// </summary>
    [Table("ConversationMessages")]
    public class ConversationMessage
    {
        [Key]
        public long Id { get; set; }

        [Required]
        public long ConversationId { get; set; }

        [ForeignKey(nameof(ConversationId))]
        public Conversation Conversation { get; set; } = default!;

        /// <summary>
        /// Người gửi tin nhắn
        /// </summary>
        [Required]
        public long SenderId { get; set; }

        [ForeignKey(nameof(SenderId))]
        public AppUser Sender { get; set; } = default!;

        /// <summary>
        /// Vai trò người gửi: "User" hoặc "Admin"
        /// </summary>
        [Required]
        [MaxLength(20)]
        public string SenderRole { get; set; } = default!;

        /// <summary>
        /// Nội dung tin nhắn
        /// </summary>
        [Required]
        [MaxLength(4000)]
        public string Content { get; set; } = default!;

        /// <summary>
        /// Đã đọc chưa
        /// </summary>
        public bool IsRead { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
