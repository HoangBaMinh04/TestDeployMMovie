using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MovieWeb.DTOs.Common;
using MovieWeb.Service.UserManagement;

namespace MovieWeb.Controllers
{
    [Authorize(Roles = "Admin")]
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly IUserManagementAppService _service;

        public UsersController(IUserManagementAppService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<PagedResultDto<UserListItemDto>>> GetPaged([FromQuery] UserPagedRequestDto input)
        {
            input ??= new UserPagedRequestDto();
            var result = await _service.GetPagedAsync(input);
            return Ok(result);
        }

        [HttpGet("{id:long}")]
        public async Task<ActionResult<UserDetailDto>> Get(long id)
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

        [HttpPost]
        public async Task<ActionResult<long>> Create([FromBody] CreateUserDto dto)
        {
            if (dto is null)
            {
                return BadRequest("Body is required");
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var id = await _service.CreateAsync(dto);
                return CreatedAtAction(nameof(Get), new { id }, id);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPut("{id:long}")]
        public async Task<IActionResult> Update(long id, [FromBody] UpdateUserDto dto)
        {
            if (dto is null)
            {
                return BadRequest("Body is required");
            }

            if (id != dto.Id)
            {
                return BadRequest("Mismatched id");
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                await _service.UpdateAsync(dto);
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
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPatch("{id:long}/status")]
        public async Task<IActionResult> SetStatus(long id, [FromBody] UpdateUserStatusDto dto)
        {
            if (dto is null)
            {
                return BadRequest("Body is required");
            }

            try
            {
                await _service.SetActiveAsync(id, dto.IsActive);
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
        }

        [HttpPost("{id:long}/reset-password")]
        public async Task<IActionResult> ResetPassword(long id, [FromBody] ResetUserPasswordDto dto)
        {
            if (dto is null)
            {
                return BadRequest("Body is required");
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                await _service.ResetPasswordAsync(id, dto);
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
        }
    }
}