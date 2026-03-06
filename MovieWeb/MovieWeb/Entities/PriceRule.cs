using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MovieWeb.Entities
{
    [Table("PriceRules")]
    [Index(nameof(CinemaId), nameof(IsActive))]
    public class PriceRule
    {
        public int Id { get; set; }
        public int CinemaId { get; set; }

        [MaxLength(50)]
        public string Name { get; set; } = default!; // "Giá cuối tuần", "Giá VIP"...

        [MaxLength(20)]
        public string? Tier { get; set; } // Standard/VIP/Couple - null = áp dụng tất cả

        public DayOfWeek? DayOfWeek { get; set; } // null = áp dụng tất cả

        public TimeOnly? TimeFrom { get; set; }
        public TimeOnly? TimeTo { get; set; }

        [Range(0, 1000000)]
        public decimal PriceModifier { get; set; } // Nhân với BasePrice hoặc cộng thêm

        public bool IsPercentage { get; set; } // true = %, false = fixed amount

        public bool IsActive { get; set; } = true;
        public int Priority { get; set; } // Rule có priority cao hơn áp dụng trước

        // Navigation
        public Cinema Cinema { get; set; } = default!;
    }
}
