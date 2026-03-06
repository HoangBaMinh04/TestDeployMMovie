using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MovieWeb.DTOs.Common;
using MovieWeb.Service.Promotion;

namespace MovieWeb.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PromotionController : ControllerBase
    {
        private readonly IPromotionService _service;

        public PromotionController(IPromotionService service)
        {
            _service = service;
        }

        // GET /api/Promotion
        [HttpGet]
        public async Task<ActionResult<List<PromotionDto>>> GetAll()
        {
            var items = await _service.GetAllAsync();
            return Ok(items);
        }

        // GET /api/Promotion/active
        [HttpGet("active")]
        public async Task<ActionResult<List<PromotionDto>>> GetActive()
        {
            var items = await _service.GetActiveAsync();
            return Ok(items);
        }

        // GET /api/Promotion/5
        [HttpGet("{id:int}")]
        public async Task<ActionResult<PromotionDto>> GetById(int id)
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

        // GET /api/Promotion/by-code/SUMMER2024
        [HttpGet("by-code/{code}")]
        public async Task<ActionResult<PromotionDto>> GetByCode(string code)
        {
            try
            {
                var item = await _service.GetByCodeAsync(code);
                return Ok(item);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        // GET /api/Promotion/paged
        [HttpGet("paged")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<PagedResultDto<PromotionDto>>> GetPaged(
            [FromQuery] PagedRequestDto input,
            [FromQuery] bool? isActive)
        {
            var result = await _service.GetPagedAsync(input, isActive);
            return Ok(result);
        }

        // POST /api/Promotion/validate
        [HttpPost("validate")]
        [Authorize]
        public async Task<ActionResult<PromotionResultDto>> Validate([FromBody] ValidatePromotionDto input)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var result = await _service.ValidateAsync(input);
            return Ok(result);
        }

        // POST /api/Promotion
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<int>> Create([FromBody] CreatePromotionDto input)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var id = await _service.CreateAsync(input);
                return CreatedAtAction(nameof(GetById), new { id }, id);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // PUT /api/Promotion/5
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdatePromotionDto input)
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
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // DELETE /api/Promotion/5
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                await _service.DeleteAsync(id);
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // POST /api/Promotion/5/toggle-active
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
}
