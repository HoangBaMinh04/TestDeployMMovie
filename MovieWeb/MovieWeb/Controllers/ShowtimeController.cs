using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MovieWeb.DTOs.Common;
using MovieWeb.Service.Showtime;

namespace MovieWeb.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ShowtimeController : ControllerBase
    {
        private readonly IShowtimeService _service;

        public ShowtimeController(IShowtimeService service)
        {
            _service = service;
        }

        // GET /api/Showtime/5
        [HttpGet("{id:long}")]
        public async Task<ActionResult<ShowtimeDto>> GetById(long id)
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

        // GET /api/Showtime/by-movie/5
        [HttpGet("by-movie/{movieId:long}")]
        public async Task<ActionResult<List<ShowtimeDto>>> GetByMovie(
            long movieId,
            [FromQuery] DateTime? date)
        {
            var items = await _service.GetByMovieAsync(movieId, date);
            return Ok(items);
        }

        // GET /api/Showtime/by-cinema/5
        [HttpGet("by-cinema/{cinemaId:int}")]
        public async Task<ActionResult<List<ShowtimeDto>>> GetByCinema(
            int cinemaId,
            [FromQuery] DateTime? date)
        {
            var items = await _service.GetByCinemaAsync(cinemaId, date);
            return Ok(items);
        }

        // GET /api/Showtime/5/seats
        [HttpGet("{id:long}/seats")]
        public async Task<ActionResult<List<ShowtimeSeatDto>>> GetAvailableSeats(long id)
        {
            try
            {
                var seats = await _service.GetAvailableSeatsAsync(id);
                return Ok(seats);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        // GET /api/Showtime/paged
        [HttpGet("paged")]
        public async Task<ActionResult<PagedResultDto<ShowtimeDto>>> GetPaged(
            [FromQuery] PagedRequestDto input,
            [FromQuery] long? movieId,
            [FromQuery] int? cinemaId,
            [FromQuery] DateTime? date)
        {
            var result = await _service.GetPagedAsync(input, movieId, cinemaId, date);
            return Ok(result);
        }

        // POST /api/Showtime
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<long>> Create([FromBody] CreateShowtimeDto input)
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

        // PUT /api/Showtime/5
        [HttpPut("{id:long}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(long id, [FromBody] UpdateShowtimeDto input)
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

        // DELETE /api/Showtime/5
        [HttpDelete("{id:long}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(long id)
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
    }
}
