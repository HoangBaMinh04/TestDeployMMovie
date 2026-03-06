using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MovieWeb.Entities
{
    [Table("Promotions")]
    [Index(nameof(Code), IsUnique = true)]
    [Index(nameof(ValidFrom), nameof(ValidTo))]
    public class Promotion
    {
        public int Id { get; set; }

        [Required, MaxLength(50)]
        public string Code { get; set; } = default!; // SUMMER2025

        [Required, MaxLength(200)]
        public string Name { get; set; } = default!;

        [MaxLength(1000)]
        public string? Description { get; set; }

        public DiscountType Type { get; set; }

        [Range(0, 100)]
        public decimal Value { get; set; } // % hoặc số tiền

        [Range(0, 1000000)]
        public decimal? MaxDiscountAmount { get; set; } // Giảm tối đa

        [Range(0, 100000000)]
        public decimal? MinOrderAmount { get; set; } // Đơn tối thiểu

        public DateTime ValidFrom { get; set; }
        public DateTime ValidTo { get; set; }

        public int? MaxUsage { get; set; } // Số lần dùng tối đa
        public int CurrentUsage { get; set; }

        public int? MaxUsagePerUser { get; set; }

        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public ICollection<Order> Orders { get; set; } = new List<Order>();
    }

    public enum DiscountType
    {
        Percentage, // Giảm theo %
        Fixed       // Giảm số tiền cố định
    }
}
