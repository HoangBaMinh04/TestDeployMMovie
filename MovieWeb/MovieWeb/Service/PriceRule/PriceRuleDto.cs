namespace MovieWeb.Service.PriceRule
{
    public class PriceRuleDto
    {
        public int Id { get; set; }
        public int CinemaId { get; set; }
        public string CinemaName { get; set; } = default!;
        public string Name { get; set; } = default!;
        public string? Tier { get; set; }
        public DayOfWeek? DayOfWeek { get; set; }
        public TimeOnly? TimeFrom { get; set; }
        public TimeOnly? TimeTo { get; set; }
        public decimal PriceModifier { get; set; }
        public bool IsPercentage { get; set; }
        public bool IsActive { get; set; }
        public int Priority { get; set; }
    }

    public class CreatePriceRuleDto
    {
        public int CinemaId { get; set; }
        public string Name { get; set; } = default!;
        public string? Tier { get; set; }
        public DayOfWeek? DayOfWeek { get; set; }
        public TimeOnly? TimeFrom { get; set; }
        public TimeOnly? TimeTo { get; set; }
        public decimal PriceModifier { get; set; }
        public bool IsPercentage { get; set; }
        public int Priority { get; set; } = 1;
    }

    public class UpdatePriceRuleDto
    {
        public int Id { get; set; }
        public int CinemaId { get; set; }
        public string Name { get; set; } = default!;
        public string? Tier { get; set; }
        public DayOfWeek? DayOfWeek { get; set; }
        public TimeOnly? TimeFrom { get; set; }
        public TimeOnly? TimeTo { get; set; }
        public decimal PriceModifier { get; set; }
        public bool IsPercentage { get; set; }
        public int Priority { get; set; } = 1;
        public bool IsActive { get; set; }
    }
}
