using MovieWeb.Entities;

namespace MovieWeb.Service.Promotion
{
    public class PromotionDto
    {
        public int Id { get; set; }
        public string Code { get; set; } = default!;
        public string Name { get; set; } = default!;
        public string? Description { get; set; }
        public DiscountType Type { get; set; }
        public decimal Value { get; set; }
        public decimal? MaxDiscountAmount { get; set; }
        public decimal? MinOrderAmount { get; set; }
        public DateTime ValidFrom { get; set; }
        public DateTime ValidTo { get; set; }
        public int? MaxUsage { get; set; }
        public int CurrentUsage { get; set; }
        public bool IsActive { get; set; }
    }

    public class CreatePromotionDto
    {
        public string Code { get; set; } = default!;
        public string Name { get; set; } = default!;
        public string? Description { get; set; }
        public DiscountType Type { get; set; }
        public decimal Value { get; set; }
        public decimal? MaxDiscountAmount { get; set; }
        public decimal? MinOrderAmount { get; set; }
        public DateTime ValidFrom { get; set; }
        public DateTime ValidTo { get; set; }
        public int? MaxUsage { get; set; }
        public int? MaxUsagePerUser { get; set; }
    }

    public class UpdatePromotionDto
    {
        public int Id { get; set; }
        public string Code { get; set; } = default!;
        public string Name { get; set; } = default!;
        public string? Description { get; set; }
        public DiscountType Type { get; set; }
        public decimal Value { get; set; }
        public decimal? MaxDiscountAmount { get; set; }
        public decimal? MinOrderAmount { get; set; }
        public DateTime ValidFrom { get; set; }
        public DateTime ValidTo { get; set; }
        public int? MaxUsage { get; set; }
        public int? MaxUsagePerUser { get; set; }
        public bool IsActive { get; set; }
    }

    public class ValidatePromotionDto
    {
        public string Code { get; set; } = default!;
        public decimal OrderAmount { get; set; }
        public long? UserId { get; set; }
    }

    public class PromotionResultDto
    {
        public bool IsValid { get; set; }
        public string? ErrorMessage { get; set; }
        public decimal DiscountAmount { get; set; }
        public int? PromotionId { get; set; }
    }
}
