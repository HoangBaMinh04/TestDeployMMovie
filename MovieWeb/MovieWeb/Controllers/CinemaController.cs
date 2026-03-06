using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MovieWeb.DTOs.Common;
using MovieWeb.Service.Cinema;

namespace MovieWeb.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CinemaController : ControllerBase
    {
        private readonly ICinemaService _service;

        public CinemaController(ICinemaService service)
        {
            _service = service;
        }

        // GET /api/Cinema
        [HttpGet]
        public async Task<ActionResult<List<CinemaDto>>> GetAll()
        {
            var items = await _service.GetAllAsync();
            return Ok(items);
        }

        // GET /api/Cinema/active
        [HttpGet("active")]
        public async Task<ActionResult<List<CinemaDto>>> GetActive()
        {
            var items = await _service.GetActiveAsync();
            return Ok(items);
        }

        // GET /api/Cinema/5
        [HttpGet("{id:int}")]
        public async Task<ActionResult<CinemaDto>> GetById(int id)
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

        // GET /api/Cinema/by-address/abc
        [HttpGet("by-address/{name}")]
        public async Task<ActionResult<List<CinemaDto>>> GetByAddress(string address)
        {
            var items = await _service.GetByAddressAsync(address);
            return Ok(items);
        }

        // GET /api/Cinema/paged
        [HttpGet("paged")]
        public async Task<ActionResult<PagedResultDto<CinemaDto>>> GetPaged(
            [FromQuery] PagedRequestDto input,
            [FromQuery] bool? isActive)
        {
            var result = await _service.GetPagedAsync(input, isActive);
            return Ok(result);
        }

        // POST /api/Cinema
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<int>> Create([FromBody] CreateCinemaDto input)
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

        // PUT /api/Cinema/5
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateCinemaDto input)
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

        // GET /api/Cinema/by-name/abc
        [HttpGet("by-name/{name}")]
        public async Task<ActionResult<List<CinemaDto>>> GetByName(string name)
        {
            var items = await _service.GetByNameAsync(name);
            //if (items == null || items.Count == 0) return NotFound();
            return Ok(items);
        }

        // DELETE /api/Cinema/5
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

        // POST /api/Cinema/5/toggle-active
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
