using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MovieWeb.Service.Seat;

namespace MovieWeb.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SeatController : ControllerBase
    {
        private readonly ISeatService _service;

        public SeatController(ISeatService service)
        {
            _service = service;
        }

        // GET /api/Seat/5
        [HttpGet("{id:int}")]
        public async Task<ActionResult<SeatDto>> GetById(int id)
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

        // GET /api/Seat/by-room/5
        [HttpGet("by-room/{roomId:int}")]
        public async Task<ActionResult<List<SeatDto>>> GetByRoom(int roomId)
        {
            var items = await _service.GetByRoomAsync(roomId);
            return Ok(items);
        }

        // GET /api/Seat/layout/5
        [HttpGet("layout/{roomId:int}")]
        public async Task<ActionResult<SeatLayoutDto>> GetRoomLayout(int roomId)
        {
            try
            {
                var layout = await _service.GetRoomLayoutAsync(roomId);
                return Ok(layout);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        // PUT /api/Seat/5/tier
        [HttpPut("{id:int}/tier")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateTier(int id, [FromBody] UpdateTierRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                await _service.UpdateSeatTierAsync(id, request.Tier);
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

        // POST /api/Seat/5/toggle-active
        [HttpPost("{id:int}/toggle-active")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ToggleActive(int id)
        {
            try
            {
                await _service.ToggleSeatActiveAsync(id);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // PUT /api/Seat/bulk-update/5
        [HttpPut("bulk-update/{roomId:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> BulkUpdate(int roomId, [FromBody] List<UpdateSeatDto> updates)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                await _service.BulkUpdateSeatsAsync(roomId, updates);
                return NoContent();
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
    }

    public class UpdateTierRequest
    {
        public string Tier { get; set; } = string.Empty;
    }
}
