using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using MovieWeb.DTOs.Common;
using MovieWeb.Entities;
using MovieWeb.Service.Review;

namespace MovieWeb.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReviewController : ControllerBase
    {
        private readonly IReviewAppService _service;
        private readonly UserManager<AppUser> _userManager;

        public ReviewController(IReviewAppService service, UserManager<AppUser> userManager)
        {
            _service = service;
            _userManager = userManager;
        }

        [HttpGet("movie/{movieId:long}")]
        public async Task<ActionResult<PagedResultDto<ReviewDto>>> GetByMovie(long movieId, [FromQuery] ReviewQueryDto input)
        {
            var currentUserId = await GetUserIdAsync();
            var result = await _service.GetByMovieAsync(movieId, input, currentUserId);
            return Ok(result);
        }

        [HttpGet("movie/{movieId:long}/stats")]
        public async Task<ActionResult<ReviewStatsDto>> GetStats(long movieId)
        {
            var result = await _service.GetStatsAsync(movieId);
            return Ok(result);
        }

        [HttpGet("{id:long}")]
        public async Task<ActionResult<ReviewDto>> GetById(long id)
        {
            var currentUserId = await GetUserIdAsync();
            try
            {
                var review = await _service.GetByIdAsync(id, currentUserId);
                return Ok(review);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpGet("my-reviews")]
        [Authorize]
        public async Task<ActionResult<List<ReviewDto>>> GetMyReviews()
        {
            var userId = await GetUserIdAsync();
            if (userId == null)
                return Unauthorized();

            var items = await _service.GetMyReviewsAsync(userId.Value);
            return Ok(items);
        }

        [HttpGet("can-review/{movieId:long}")]
        [Authorize]
        public async Task<ActionResult<CanReviewDto>> CanReview(long movieId)
        {
            var userId = await GetUserIdAsync();
            if (userId == null)
                return Unauthorized();

            var result = await _service.CanUserReviewAsync(userId.Value, movieId);
            return Ok(result);
        }

        [HttpPost]
        [Authorize]
        public async Task<ActionResult<long>> Create([FromBody] CreateReviewDto input)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = await GetUserIdAsync();
            if (userId == null)
                return Unauthorized();

            try
            {
                var id = await _service.CreateAsync(input, userId.Value);
                return CreatedAtAction(nameof(GetById), new { id }, id);
            }
            catch (InvalidOperationException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { error = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPut("{id:long}")]
        [Authorize]
        public async Task<IActionResult> Update(long id, [FromBody] UpdateReviewDto input)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (id != input.Id)
                return BadRequest(new { error = "Mismatched id" });

            var userId = await GetUserIdAsync();
            if (userId == null)
                return Unauthorized();

            try
            {
                await _service.UpdateAsync(input, userId.Value);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpDelete("{id:long}")]
        [Authorize]
        public async Task<IActionResult> Delete(long id)
        {
            var userId = await GetUserIdAsync();
            if (userId == null)
                return Unauthorized();

            try
            {
                await _service.DeleteAsync(id, userId.Value);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpPost("{id:long}/helpful")]
        [Authorize]
        public async Task<IActionResult> VoteHelpful(long id, [FromBody] VoteReviewDto input)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = await GetUserIdAsync();
            if (userId == null)
                return Unauthorized();

            try
            {
                await _service.VoteAsync(id, userId.Value, input.IsHelpful);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpPost("{id:long}/report")]
        [Authorize]
        public async Task<IActionResult> Report(long id, [FromBody] ReportReviewDto input)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = await GetUserIdAsync();
            if (userId == null)
                return Unauthorized();

            try
            {
                await _service.ReportAsync(id, userId.Value, input);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpGet("paged")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<PagedResultDto<ReviewDto>>> GetPaged([FromQuery] ReviewAdminQueryDto input)
        {
            var result = await _service.GetPagedAsync(input);
            return Ok(result);
        }

        [HttpGet("reports")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<List<ReviewReportDto>>> GetReports([FromQuery] bool includeResolved = false)
        {
            var items = await _service.GetReportsAsync(includeResolved);
            return Ok(items);
        }

        [HttpPost("{id:long}/hide")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Hide(long id)
        {
            try
            {
                await _service.HideAsync(id);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpPost("{id:long}/show")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Show(long id)
        {
            try
            {
                await _service.ShowAsync(id);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpDelete("{id:long}/admin-delete")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> AdminDelete(long id)
        {
            try
            {
                await _service.AdminDeleteAsync(id);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpPost("report/{reportId:long}/resolve")]
        [HttpPost("~/api/ReviewReport/{reportId:long}/resolve")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ResolveReport(long reportId, [FromBody] ResolveReviewReportDto input)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                await _service.ResolveReportAsync(reportId, input);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        private async Task<long?> GetUserIdAsync()
        {
            var user = await _userManager.GetUserAsync(User);
            return user?.Id;
        }
    }
}