using Microsoft.EntityFrameworkCore;
using MovieWeb.Entities;

namespace MovieWeb.Service.Dashboard
{
    public interface IDashboardAppService
    {
        Task<DashboardSummaryDto> GetSummaryAsync();
        Task<DashboardSalesTrendDto> GetSalesTrendAsync(DashboardRange range);
        Task<MovieCreationStatsDto> GetMovieCreationStatsAsync();

        Task<MovieCreationTrendDto> GetMovieCreationTrendAsync(DashboardRange range);
        Task<SalesDistributionDto> GetSalesDistributionAsync(SalesDistributionDimension dimension, int top);
    }

    public class DashboardAppService : IDashboardAppService
    {
        private static readonly OrderStatus[] _paidStatuses =
        {
            OrderStatus.Paid,
            OrderStatus.PartiallyPaid
        };

        private readonly MyDbContext _db;

        public DashboardAppService(MyDbContext db)
        {
            _db = db;
        }

        public async Task<DashboardSummaryDto> GetSummaryAsync()
        {
            var summary = new DashboardSummaryDto();

            summary.TotalRevenue = await _db.Orders
                .Where(o => _paidStatuses.Contains(o.Status))
                .SumAsync(o => (decimal?)o.FinalAmount) ?? 0m;

            summary.TicketsSold = await _db.Tickets
                .Where(t => _paidStatuses.Contains(t.Order.Status))
                .CountAsync();

            summary.MovieCount = await _db.Movies
                .Where(m => !m.IsDeleted)
                .CountAsync();

            summary.CinemaCount = await _db.Cinemas
                .Where(c => !c.IsDeleted && c.IsActive)
                .CountAsync();

            summary.ShowtimeCount = await _db.Showtimes
                .Where(st => st.IsActive)
                .CountAsync();

            summary.RoomCount = await _db.Rooms
                .Where(r => !r.IsDeleted)
                .CountAsync();

            summary.CustomerCount = await _db.Users.CountAsync();

            return summary;
        }

        public async Task<DashboardSalesTrendDto> GetSalesTrendAsync(DashboardRange range)
        {
            var now = DateTime.UtcNow;
            DateTime start;
            DateTime endExclusive;

            switch (range)
            {
                case DashboardRange.Today:
                    start = now.Date;
                    endExclusive = start.AddDays(1);
                    break;
                case DashboardRange.Week:
                    start = now.Date.AddDays(-6);
                    endExclusive = now.Date.AddDays(1);
                    break;
                case DashboardRange.Month:
                    start = now.Date.AddDays(-29);
                    endExclusive = now.Date.AddDays(1);
                    break;
                default:
                    throw new ArgumentOutOfRangeException(nameof(range), range, null);
            }

            var orderSnapshots = await _db.Orders
                .Where(o => _paidStatuses.Contains(o.Status)
                            && o.CreatedAt >= start
                            && o.CreatedAt < endExclusive)
                .Select(o => new OrderSnapshot(o.CreatedAt, o.FinalAmount))
                .ToListAsync();

            var result = new DashboardSalesTrendDto
            {
                Range = range,
                TotalRevenue = Math.Round(orderSnapshots.Sum(o => o.FinalAmount), 2, MidpointRounding.AwayFromZero),
                Points = BuildSalesSeries(range, start, orderSnapshots)
            };

            return result;
        }

        public async Task<MovieCreationStatsDto> GetMovieCreationStatsAsync()
        {
            var now = DateTime.UtcNow;
            var todayStart = now.Date;
            var weekStart = todayStart.AddDays(-6);
            var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            var query = _db.Movies.Where(m => !m.IsDeleted && m.IsPublished);

            var total = await query.CountAsync();
            var today = await query.Where(m => m.CreatedAt >= todayStart).CountAsync();
            var week = await query.Where(m => m.CreatedAt >= weekStart).CountAsync();
            var month = await query.Where(m => m.CreatedAt >= monthStart).CountAsync();

            return new MovieCreationStatsDto
            {
                TotalPublished = total,
                Today = today,
                ThisWeek = week,
                ThisMonth = month
            };
        }

        public async Task<MovieCreationTrendDto> GetMovieCreationTrendAsync(DashboardRange range)
        {
            var (start, endExclusive) = GetRangeWindow(range);

            var timestamps = await _db.Movies
                .Where(m => !m.IsDeleted && m.IsPublished && m.CreatedAt >= start && m.CreatedAt < endExclusive)
                .Select(m => m.CreatedAt)
                .ToListAsync();

            return new MovieCreationTrendDto
            {
                Range = range,
                TotalCreated = timestamps.Count,
                Points = BuildCountSeries(range, start, timestamps)
            };
        }

        public async Task<SalesDistributionDto> GetSalesDistributionAsync(SalesDistributionDimension dimension, int top)
        {
            var clampedTop = Math.Clamp(top, 1, 20);

            var items = dimension switch
            {
                SalesDistributionDimension.Cinema => await BuildCinemaDistributionAsync(clampedTop),
                SalesDistributionDimension.Movie => await BuildMovieDistributionAsync(clampedTop),
                SalesDistributionDimension.Category => await BuildCategoryDistributionAsync(clampedTop),
                _ => throw new ArgumentOutOfRangeException(nameof(dimension), dimension, null)
            };

            var totalRevenue = items.Sum(i => i.Revenue);
            var totalTickets = items.Sum(i => i.Tickets);

            foreach (var item in items)
            {
                var originalRevenue = item.Revenue;
                item.Revenue = Math.Round(originalRevenue, 2, MidpointRounding.AwayFromZero);
                item.RevenueShare = totalRevenue == 0
                    ? 0
                    : Math.Round(originalRevenue / totalRevenue * 100m, 2, MidpointRounding.AwayFromZero);
            }

            return new SalesDistributionDto
            {
                Dimension = dimension,
                TotalRevenue = Math.Round(totalRevenue, 2, MidpointRounding.AwayFromZero),
                TotalTickets = totalTickets,
                Items = items
            };
        }

        private static IReadOnlyList<TimeSeriesPointDto> BuildSalesSeries(
            DashboardRange range,
            DateTime start,
            IReadOnlyCollection<OrderSnapshot> orders)
        {
            return range switch
            {
                DashboardRange.Today => BuildHourlySeries(start, orders),
                DashboardRange.Week => BuildDailySeries(start, 7, orders),
                DashboardRange.Month => BuildDailySeries(start, 30, orders),
                _ => throw new ArgumentOutOfRangeException(nameof(range), range, null)
            };
        }

        private static IReadOnlyList<TimeSeriesPointDto> BuildHourlySeries(
            DateTime start,
            IReadOnlyCollection<OrderSnapshot> orders)
        {
            var buckets = new decimal[24];

            foreach (var order in orders)
            {
                var index = (int)Math.Floor((order.CreatedAt - start).TotalHours);
                if (index >= 0 && index < buckets.Length)
                {
                    buckets[index] += order.FinalAmount;
                }
            }

            var points = new List<TimeSeriesPointDto>(24);
            for (var hour = 0; hour < buckets.Length; hour++)
            {
                points.Add(new TimeSeriesPointDto
                {
                    Label = $"{hour:00}:00",
                    Value = Math.Round(buckets[hour], 2, MidpointRounding.AwayFromZero)
                });
            }

            return points;
        }

        private static IReadOnlyList<TimeSeriesPointDto> BuildDailySeries(
            DateTime start,
            int days,
            IReadOnlyCollection<OrderSnapshot> orders)
        {
            var buckets = new decimal[days];

            foreach (var order in orders)
            {
                var index = (int)Math.Floor((order.CreatedAt.Date - start.Date).TotalDays);
                if (index >= 0 && index < buckets.Length)
                {
                    buckets[index] += order.FinalAmount;
                }
            }

            var points = new List<TimeSeriesPointDto>(days);
            for (var i = 0; i < days; i++)
            {
                var day = start.AddDays(i);
                points.Add(new TimeSeriesPointDto
                {
                    Label = day.ToString("dd/MM"),
                    Value = Math.Round(buckets[i], 2, MidpointRounding.AwayFromZero)
                });
            }

            return points;
        }
        private static IReadOnlyList<TimeSeriesPointDto> BuildCountSeries(
                    DashboardRange range,
                    DateTime start,
                    IReadOnlyCollection<DateTime> timestamps)
        {
            return range switch
            {
                DashboardRange.Today => BuildHourlyCountSeries(start, timestamps),
                DashboardRange.Week => BuildDailyCountSeries(start, 7, timestamps),
                DashboardRange.Month => BuildDailyCountSeries(start, 30, timestamps),
                _ => throw new ArgumentOutOfRangeException(nameof(range), range, null)
            };
        }

        private static IReadOnlyList<TimeSeriesPointDto> BuildHourlyCountSeries(
            DateTime start,
            IReadOnlyCollection<DateTime> timestamps)
        {
            var buckets = new int[24];

            foreach (var timestamp in timestamps)
            {
                var index = (int)Math.Floor((timestamp - start).TotalHours);
                if (index >= 0 && index < buckets.Length)
                {
                    buckets[index]++;
                }
            }

            var points = new List<TimeSeriesPointDto>(24);
            for (var hour = 0; hour < buckets.Length; hour++)
            {
                points.Add(new TimeSeriesPointDto
                {
                    Label = $"{hour:00}:00",
                    Value = buckets[hour]
                });
            }

            return points;
        }

        private static IReadOnlyList<TimeSeriesPointDto> BuildDailyCountSeries(
            DateTime start,
            int days,
            IReadOnlyCollection<DateTime> timestamps)
        {
            var buckets = new int[days];

            foreach (var timestamp in timestamps)
            {
                var index = (int)Math.Floor((timestamp.Date - start.Date).TotalDays);
                if (index >= 0 && index < buckets.Length)
                {
                    buckets[index]++;
                }
            }

            var points = new List<TimeSeriesPointDto>(days);
            for (var i = 0; i < days; i++)
            {
                var day = start.AddDays(i);
                points.Add(new TimeSeriesPointDto
                {
                    Label = day.ToString("dd/MM"),
                    Value = buckets[i]
                });
            }

            return points;
        }

        private (DateTime Start, DateTime EndExclusive) GetRangeWindow(DashboardRange range)
        {
            var now = DateTime.UtcNow;
            return range switch
            {
                DashboardRange.Today => (now.Date, now.Date.AddDays(1)),
                DashboardRange.Week => (now.Date.AddDays(-6), now.Date.AddDays(1)),
                DashboardRange.Month => (now.Date.AddDays(-29), now.Date.AddDays(1)),
                _ => throw new ArgumentOutOfRangeException(nameof(range), range, null)
            };
        }

        private async Task<List<SalesDistributionItemDto>> BuildCinemaDistributionAsync(int top)
        {
            var rawItems = await _db.Orders
                .Where(o => _paidStatuses.Contains(o.Status))
                .GroupBy(o => new { o.Showtime.CinemaId, o.Showtime.Cinema.Name })
                .Select(g => new
                {
                    g.Key.Name,
                    Revenue = g.Sum(o => o.FinalAmount),
                    Tickets = g.Sum(o => o.Tickets.Count)
                })
                .OrderByDescending(x => x.Revenue)
                .ThenBy(x => x.Name)
                .Take(top)
                .ToListAsync();

            return rawItems
                .Select(x => new SalesDistributionItemDto
                {
                    Label = x.Name,
                    Revenue = x.Revenue,
                    Tickets = x.Tickets
                })
                .ToList();
        }

        private async Task<List<SalesDistributionItemDto>> BuildMovieDistributionAsync(int top)
        {
            var rawItems = await _db.Orders
                .Where(o => _paidStatuses.Contains(o.Status))
                .GroupBy(o => new { o.Showtime.MovieId, o.Showtime.Movie.Name })
                .Select(g => new
                {
                    g.Key.Name,
                    Revenue = g.Sum(o => o.FinalAmount),
                    Tickets = g.Sum(o => o.Tickets.Count)
                })
                .OrderByDescending(x => x.Revenue)
                .ThenBy(x => x.Name)
                .Take(top)
                .ToListAsync();

            return rawItems
                .Select(x => new SalesDistributionItemDto
                {
                    Label = x.Name,
                    Revenue = x.Revenue,
                    Tickets = x.Tickets
                })
                .ToList();
        }

        private async Task<List<SalesDistributionItemDto>> BuildCategoryDistributionAsync(int top)
        {
            var rawItems = await _db.Orders
                .Where(o => _paidStatuses.Contains(o.Status))
                .SelectMany(o => o.Showtime.Movie.MovieCategories
                    .Where(mc => !mc.Category.IsDeleted)
                    .Select(mc => new
                    {
                        mc.Category.Name,
                        Revenue = o.FinalAmount,
                        Tickets = o.Tickets.Count
                    }))
                .GroupBy(x => x.Name)
                .Select(g => new
                {
                    Name = g.Key,
                    Revenue = g.Sum(x => x.Revenue),
                    Tickets = g.Sum(x => x.Tickets)
                })
                .OrderByDescending(x => x.Revenue)
                .ThenBy(x => x.Name)
                .Take(top)
                .ToListAsync();

            return rawItems
                .Select(x => new SalesDistributionItemDto
                {
                    Label = x.Name,
                    Revenue = x.Revenue,
                    Tickets = x.Tickets
                })
                .ToList();
        }


        private readonly record struct OrderSnapshot(DateTime CreatedAt, decimal FinalAmount);
    }
}