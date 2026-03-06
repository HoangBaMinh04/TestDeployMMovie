using Microsoft.AspNetCore.Mvc;
using MovieWeb.DTOs.Common;
using MovieWeb.Service.Country;

namespace MovieWeb.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CountryController : ControllerBase
    {
        private readonly ICountryAppService _service;

        public CountryController(ICountryAppService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<List<CountryDto>>> GetAll()
        {
            var result = await _service.GetAllAsync();
            return Ok(result);
        }

        [HttpGet("{id:long}")]
        public async Task<ActionResult<CountryDto>> Get(long id)
        {
            try
            {
                var country = await _service.GetAsync(id);
                return Ok(country);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpPost]
        public async Task<ActionResult<long>> Create([FromBody] CreateCountryDto input)
        {
            var id = await _service.CreateAsync(input);
            return CreatedAtAction(nameof(Get), new { id }, id);
        }

        [HttpPut("{id:long}")]
        public async Task<IActionResult> Update(long id, [FromBody] UpdateCountryDto input)
        {
            if (id != input.Id) return BadRequest("Id mismatch");

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

        // DELETE api/country/5
        [HttpDelete("{id:long}")]
        public async Task<IActionResult> Delete(long id)
        {
            await _service.DeleteAsync(id);
            return NoContent();
        }

        // GET /api/Country/by-name/abc
        [HttpGet("by-name/{name}")]
        public async Task<ActionResult<List<CountryDto>>> GetByName(string name)
        {
            var items = await _service.GetByNameAsync(name);
            return Ok(items);
        }

        [HttpGet("paged")]
        public async Task<ActionResult<PagedResultDto<CountryDto>>> GetPaged(
            [FromQuery] PagedRequestDto input)
        {
            var result = await _service.GetPagedAsync(input);
            return Ok(result);
        }
    }
}
