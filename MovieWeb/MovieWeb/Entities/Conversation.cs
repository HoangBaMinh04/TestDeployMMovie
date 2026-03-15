using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MovieWeb.Entities
{
    /// <summary>
    /// Cu?c h?i tho?i h? tr? gi?a khách hàng và admin
    /// </summary>
    [Table("Conversations")]
    public class Conversation
    {
        [Key]
        public long Id { get; set; }

        /// <summary>
        /// Khách hàng t?o cu?c h?i tho?i
        /// </summary>
        [Required]
        public long CustomerId { get; set; }

        [ForeignKey(nameof(CustomerId))]
        public AppUser Customer { get; set; } = default!;

        /// <summary>
        /// Admin ???c assign x? lý (null n?u ch?a có admin nh?n)
        /// </summary>
        public long? AssignedAdminId { get; set; }

        [ForeignKey(nameof(AssignedAdminId))]
        public AppUser? AssignedAdmin { get; set; }

        /// <summary>
        /// Tiêu ?? / ch? ?? cu?c h?i tho?i
        /// </summary>
        [MaxLength(200)]
        public string? Subject { get; set; }

        /// <summary>
        /// Tr?ng thái cu?c h?i tho?i
        /// </summary>
        [Required]
        public ConversationStatus Status { get; set; } = ConversationStatus.Open;

        /// <summary>
        /// Tin nh?n cu?i cùng (preview)
        /// </summary>
        [MaxLength(500)]
        public string? LastMessagePreview { get; set; }

        /// <summary>
        /// Th?i gian tin nh?n cu?i
        /// </summary>
        public DateTime? LastMessageAt { get; set; }

        /// <summary>
        /// S? tin nh?n ch?a ??c b?i admin
        /// </summary>
        public int UnreadByAdminCount { get; set; } = 0;

        /// <summary>
        /// S? tin nh?n ch?a ??c b?i khách hàng
        /// </summary>
        public int UnreadByCustomerCount { get; set; } = 0;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ClosedAt { get; set; }

        // Navigation
        public ICollection<ConversationMessage> Messages { get; set; } = new List<ConversationMessage>();
    }

    public enum ConversationStatus
    {
        /// <summary>?ang m?, ch? admin x? lý</summary>
        Open = 0,

        /// <summary>Admin ?ã nh?n và ?ang x? lý</summary>
        Active = 1,

        /// <summary>?ã ?óng / gi?i quy?t xong</summary>
        Closed = 2
    }
}
