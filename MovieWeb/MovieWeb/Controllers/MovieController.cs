using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MovieWeb.DTOs.Common;
using MovieWeb.Service.Movie;

namespace MovieWeb.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MovieController : ControllerBase
    {
        private readonly IMovieAppService _service;

        public MovieController(IMovieAppService service)
        {
            _service = service;
        }

        // GET /api/Movie
        [HttpGet]
        public async Task<ActionResult<List<MovieDto>>> GetAll()
        {
            var items = await _service.GetAllAsync();
            return Ok(items);
        }

        [HttpGet("all-including-deleted")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAllIsDelete([FromQuery] bool includeDeleted = true)
        {
            var result = await _service.GetAllIsDeleteAsync(includeDeleted);
            return Ok(result);
        }


        // GET /api/Movie/5
        [HttpGet("{id:long}")]
        public async Task<ActionResult<MovieDto>> GetById(long id)
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

        // GET /api/Movie/by-name/abc
        [HttpGet("by-name/{name}")]
        public async Task<ActionResult<List<MovieDto>>> GetByName(string name)
        {
            var items = await _service.GetByNameAsync(name);
            //if (items == null || items.Count == 0) return NotFound();
            return Ok(items);
        }

        // POST /api/Movie
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<long>> Create([FromBody] CreateMovieDto input)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var id = await _service.CreateAsync(input);
            // Trả về 201 + Location header tới GetById
            return CreatedAtAction(nameof(GetById), new { id }, id);
        }

        // PUT /api/Movie/5
        [HttpPut("{id:long}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(long id, [FromBody] UpdateMovieDto input)
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
        }

        // DELETE /api/Movie/{id}  => hard delete
        [HttpDelete("{id:long}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(long id)
        {
            await _service.DeleteAsync(id);
            return NoContent();
        }

        public record ToggleMovieDeleteResult(long Id, bool IsDeleted);
        // PATCH /api/Movie/5/toggle-delete
        [HttpPatch("{id:long}/toggle-delete")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<ToggleMovieDeleteResult>> ToggleDelete(long id)
        {
            try
            {
                var isDeleted = await _service.ToggleDeleteAsync(id);
                return Ok(new ToggleMovieDeleteResult(id, isDeleted));
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }


        [HttpGet("paged")]  // route sẽ là: /api/Movie/paged
        public async Task<ActionResult<PagedResultDto<MovieDto>>> GetPaged(
            [FromQuery] PagedRequestDto input,
            [FromQuery] long? categoryId,
            [FromQuery] long? countryId)
        {
            var result = await _service.GetPagedAsync(input, categoryId, countryId);
            return Ok(result);
        }

        // GET /api/Movie/by-category/5
        [HttpGet("by-category/{categoryId:long}")]
        public async Task<ActionResult<List<MovieDto>>> GetByCategory(long categoryId)
        {
            var items = await _service.GetByCategoryAsync(categoryId);
            return Ok(items);
        }

        // GET /api/Movie/by-slug/abc
        [HttpGet("by-slug/{slug}")]
        public async Task<ActionResult<List<MovieDto>>> GetBySlug(string slug)
        {
            var items = await _service.GetBySlugAsync(slug);
            //if (items == null || items.Count == 0) return NotFound();
            return Ok(items);
        }

        // GET /api/Movie/by-cinema/3
        [HttpGet("by-cinema/{cinemaId:int}")]
        public async Task<ActionResult<List<MovieDto>>> GetByCinema(int cinemaId)
        {
            var items = await _service.GetByCinemaAsync(cinemaId);
            return Ok(items);
        }

        // GET /api/Movie/by-country/5
        [HttpGet("by-country/{countryId:long}")]
        public async Task<ActionResult<List<MovieDto>>> GetByCountry(long countryId)
        {
            var items = await _service.GetByCountryAsync(countryId);
            return Ok(items);
        }

        // GET /api/Movie/filter?categoryId=1&countryId=2&q=man
        [HttpGet("filter")]
        public async Task<ActionResult<List<MovieDto>>> Filter(
            [FromQuery] long? categoryId,
            [FromQuery] long? countryId,
            [FromQuery] int? cinemaId,
            [FromQuery] string? q)
        {
            var items = await _service.GetFilteredAsync(categoryId, countryId, cinemaId, q);
            return Ok(items);
        }

        // GET /api/Movie/paged-admin
        [HttpGet("paged-admin")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<PagedResultDto<MovieDto>>> GetPagedAdmin(
            [FromQuery] PagedRequestDto input,
            [FromQuery] long? categoryId,
            [FromQuery] long? countryId,
            [FromQuery] bool includeDeleted = true)
        {
            var result = await _service.GetPagedAdminAsync(
                input, categoryId, countryId, includeDeleted);
            return Ok(result);
        }


        [HttpGet("now-showing")]
        public async Task<IActionResult> GetNowShowing()
        {
            var data = await _service.GetNowShowingAsync();
            return Ok(data);
        }

        [HttpGet("coming-soon")]
        public async Task<IActionResult> GetComingSoon()
        {
            var data = await _service.GetComingSoonAsync();
            return Ok(data);
        }

    }
}
