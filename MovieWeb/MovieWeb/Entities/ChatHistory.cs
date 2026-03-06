using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MovieWeb.Entities
{
    [Table("ChatHistories")]
    public class ChatHistory
    {
        [Key]
        public long Id { get; set; }

        [Required]
        public long UserId { get; set; }

        [ForeignKey(nameof(UserId))]
        public AppUser User { get; set; } = default!;

        [Required]
        [MaxLength(20)]
        public string Role { get; set; } = default!; // "user" or "assistant"

        [Required]
        [MaxLength(2000)]
        public string Content { get; set; } = default!;

        [Required]
        public DateTime CreatedAt { get; set; }

        // Optional: Metadata
        public string? Metadata { get; set; } // JSON string for additional data
    }
}
