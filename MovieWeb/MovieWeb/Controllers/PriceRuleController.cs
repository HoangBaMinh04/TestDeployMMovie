using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MovieWeb.DTOs.Common;
using MovieWeb.Service.PriceRule;

namespace MovieWeb.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PriceRuleController : ControllerBase
    {
        private readonly IPriceRuleService _service;

        public PriceRuleController(IPriceRuleService service)
        {
            _service = service;
        }

        // GET /api/PriceRule/5
        [HttpGet("{id:int}")]
        public async Task<ActionResult<PriceRuleDto>> GetById(int id)
        {
            try
            {
                var item = await _service.GetByIdAsync(id);
                return Ok(item);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        // GET /api/PriceRule/by-cinema/5
        [HttpGet("by-cinema/{cinemaId:int}")]
        public async Task<ActionResult<List<PriceRuleDto>>> GetByCinema(int cinemaId)
        {
            var items = await _service.GetByCinemaAsync(cinemaId);
            return Ok(items);
        }

        // GET /api/PriceRule/active/5
        [HttpGet("active/{cinemaId:int}")]
        public async Task<ActionResult<List<PriceRuleDto>>> GetActiveRules(int cinemaId)
        {
            var items = await _service.GetActiveRulesAsync(cinemaId);
            return Ok(items);
        }

        // GET /api/PriceRule/paged
        [HttpGet("paged")]
        public async Task<ActionResult<PagedResultDto<PriceRuleDto>>> GetPaged(
            [FromQuery] PagedRequestDto input,
            [FromQuery] int? cinemaId,
            [FromQuery] bool? isActive,
            [FromQuery] string? tier)
        {
            var result = await _service.GetPagedAsync(input, cinemaId, isActive, tier);
            return Ok(result);
        }

        // POST /api/PriceRule/calculate
        [HttpPost("calculate")]
        public async Task<ActionResult<CalculatePriceResponse>> CalculatePrice([FromBody] CalculatePriceRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var price = await _service.CalculatePriceAsync(
                    request.CinemaId,
                    request.Tier,
                    request.Showtime,
                    request.BasePrice
                );

                return Ok(new CalculatePriceResponse { FinalPrice = price });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // POST /api/PriceRule
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<int>> Create([FromBody] CreatePriceRuleDto input)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var id = await _service.CreateAsync(input);
                return CreatedAtAction(nameof(GetById), new { id }, id);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // PUT /api/PriceRule/5
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdatePriceRuleDto input)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (id != input.Id) return BadRequest("Mismatched id");

            try
            {
                await _service.UpdateAsync(input);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // DELETE /api/PriceRule/5
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            await _service.DeleteAsync(id);
            return NoContent();
        }

        // POST /api/PriceRule/5/toggle-active
        [HttpPost("{id:int}/toggle-active")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ToggleActive(int id)
        {
            try
            {
                await _service.ToggleActiveAsync(id);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }
    }

    public class CalculatePriceRequest
    {
        public int CinemaId { get; set; }
        public string Tier { get; set; } = string.Empty;
        public DateTime Showtime { get; set; }
        public decimal BasePrice { get; set; }
    }

    public class CalculatePriceResponse
    {
        public decimal FinalPrice { get; set; }
    }
}
