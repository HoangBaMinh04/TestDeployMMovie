using System.Text.Json.Serialization;

namespace MovieWeb.Service.Dashboard
{
    public class DashboardSummaryDto
    {
        public decimal TotalRevenue { get; set; }
        public int TicketsSold { get; set; }
        public int MovieCount { get; set; }
        public int CinemaCount { get; set; }
        public int ShowtimeCount { get; set; }
        public int RoomCount { get; set; }
        public int CustomerCount { get; set; }
    }

    public class TimeSeriesPointDto
    {
        public string Label { get; set; } = string.Empty;
        public decimal Value { get; set; }
    }

    public class DashboardSalesTrendDto
    {
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public DashboardRange Range { get; set; }
        public decimal TotalRevenue { get; set; }
        public IReadOnlyList<TimeSeriesPointDto> Points { get; set; } = Array.Empty<TimeSeriesPointDto>();
    }

    public class MovieCreationStatsDto
    {
        public int TotalPublished { get; set; }
        public int Today { get; set; }
        public int ThisWeek { get; set; }
        public int ThisMonth { get; set; }
    }

    public class MovieCreationTrendDto
    {
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public DashboardRange Range { get; set; }
        public int TotalCreated { get; set; }
        public IReadOnlyList<TimeSeriesPointDto> Points { get; set; } = Array.Empty<TimeSeriesPointDto>();
    }

    public class SalesDistributionDto
    {
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public SalesDistributionDimension Dimension { get; set; }
        public decimal TotalRevenue { get; set; }
        public int TotalTickets { get; set; }
        public IReadOnlyList<SalesDistributionItemDto> Items { get; set; } = Array.Empty<SalesDistributionItemDto>();
    }

    public class SalesDistributionItemDto
    {
        public string Label { get; set; } = string.Empty;
        public decimal Revenue { get; set; }
        public decimal RevenueShare { get; set; }
        public int Tickets { get; set; }
    }

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum SalesDistributionDimension
    {
        Cinema,
        Movie,
        Category
    }

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum DashboardRange
    {
        Today,
        Week,
        Month
    }
}