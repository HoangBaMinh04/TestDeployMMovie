using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MovieWeb.DTOs.Common;
using MovieWeb.Service.Room;

namespace MovieWeb.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RoomController : ControllerBase
    {
        private readonly IRoomService _service;

        public RoomController(IRoomService service)
        {
            _service = service;
        }

        // GET /api/Room
        [HttpGet]
        public async Task<ActionResult<List<RoomDto>>> GetAll()
        {
            var items = await _service.GetAllAsync();
            return Ok(items);
        }

        // GET /api/Room/5
        [HttpGet("{id:int}")]
        public async Task<ActionResult<RoomDto>> GetById(int id)
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

        // GET /api/Room/by-cinema/5
        [HttpGet("by-cinema/{cinemaId:int}")]
        public async Task<ActionResult<List<RoomDto>>> GetByCinema(int cinemaId)
        {
            var items = await _service.GetByCinemaAsync(cinemaId);
            return Ok(items);
        }

        // GET /api/Room/paged
        [HttpGet("paged")]
        public async Task<ActionResult<PagedResultDto<RoomDto>>> GetPaged(
            [FromQuery] PagedRequestDto input,
            [FromQuery] int? cinemaId)
        {
            var result = await _service.GetPagedAsync(input, cinemaId);
            return Ok(result);
        }

        // POST /api/Room
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<int>> Create([FromBody] CreateRoomDto input)
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
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // PUT /api/Room/5
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateRoomDto input)
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

        // DELETE /api/Room/5
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

        // POST /api/Room/5/toggle-active
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
