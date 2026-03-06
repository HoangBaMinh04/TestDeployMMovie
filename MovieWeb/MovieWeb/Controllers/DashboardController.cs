using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MovieWeb.Service.Dashboard;

namespace MovieWeb.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class DashboardController : ControllerBase
    {
        private readonly IDashboardAppService _dashboardService;

        public DashboardController(IDashboardAppService dashboardService)
        {
            _dashboardService = dashboardService;
        }

        [HttpGet("summary")]
        public async Task<ActionResult<DashboardSummaryDto>> GetSummaryAsync()
        {
            var summary = await _dashboardService.GetSummaryAsync();
            return Ok(summary);
        }

        [HttpGet("sales")]
        public async Task<ActionResult<DashboardSalesTrendDto>> GetSalesAsync([FromQuery] string range = "week")
        {
            if (!Enum.TryParse<DashboardRange>(range, true, out var parsedRange))
            {
                return BadRequest("Invalid range. Allowed values: today, week, month.");
            }

            var result = await _dashboardService.GetSalesTrendAsync(parsedRange);
            return Ok(result);
        }

        [HttpGet("movies")]
        public async Task<ActionResult<MovieCreationStatsDto>> GetMovieStatsAsync()
        {
            var stats = await _dashboardService.GetMovieCreationStatsAsync();
            return Ok(stats);
        }

        [HttpGet("movie-trend")]
        public async Task<ActionResult<MovieCreationTrendDto>> GetMovieCreationTrendAsync([FromQuery] string range = "month")
        {
            if (!Enum.TryParse<DashboardRange>(range, true, out var parsedRange))
            {
                return BadRequest("Invalid range. Allowed values: today, week, month.");
            }

            var result = await _dashboardService.GetMovieCreationTrendAsync(parsedRange);
            return Ok(result);
        }

        [HttpGet("sales-distribution")]
        public async Task<ActionResult<SalesDistributionDto>> GetSalesDistributionAsync(
            [FromQuery] string dimension = "cinema",
            [FromQuery] int top = 5)
        {
            if (!Enum.TryParse<SalesDistributionDimension>(dimension, true, out var parsedDimension))
            {
                return BadRequest("Invalid dimension. Allowed values: cinema, movie, category.");
            }

            if (top <= 0)
            {
                return BadRequest("Top must be a positive number.");
            }

            var result = await _dashboardService.GetSalesDistributionAsync(parsedDimension, top);
            return Ok(result);
        }
    }
}
