using Microsoft.AspNetCore.Mvc;
using MovieWeb.DTOs.Common;
using MovieWeb.Service.Category;

namespace MovieWeb.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CategoryController : ControllerBase
    {
        private readonly ICategoryAppService _service;

        public CategoryController(ICategoryAppService service)
        {
            _service = service;
        }

        // GET /api/Category
        [HttpGet]
        public async Task<ActionResult<List<CategoryDto>>> GetAll()
        {
            var items = await _service.GetAllAsync();
            return Ok(items);
        }

        // GET /api/Category/5
        [HttpGet("{id:long}")]
        public async Task<ActionResult<CategoryDto>> Get(long id)
        {
            try
            {
                var item = await _service.GetAsync(id);
                return Ok(item);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }
        // GET /api/Category/by-name/abc
        [HttpGet("by-name/{name}")]
        public async Task<ActionResult<List<CategoryDto>>> GetByName(string name)
        {
            var items = await _service.GetByNameAsync(name);
            //if (items == null || items.Count == 0) return NotFound();
            return Ok(items);
        }

        // POST /api/Category
        [HttpPost]
        public async Task<ActionResult<long>> Create([FromBody] CreateCategoryDto input)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var id = await _service.CreateAsync(input);
            return CreatedAtAction(nameof(Get), new { id }, id);
        }

        // PUT /api/Category/5
        [HttpPut("{id:long}")]
        public async Task<IActionResult> Update(long id, [FromBody] UpdateCategoryDto input)
        {
            if (id != input.Id) return BadRequest("Mismatched id");
            if (!ModelState.IsValid) return BadRequest(ModelState);

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

        // DELETE /api/Category/5
        [HttpDelete("{id:long}")]
        public async Task<IActionResult> Delete(long id)
        {
            await _service.DeleteAsync(id);
            return NoContent();
        }

        // GET: api/category/paged?pageNumber=1&pageSize=10&searchTerm=action
        [HttpGet("paged")]
        public async Task<ActionResult<PagedResultDto<CategoryDto>>> GetPaged(
            [FromQuery] PagedRequestDto input)
        {
            var result = await _service.GetPagedAsync(input);
            return Ok(result);
        }
    }
}
