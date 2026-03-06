using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using MovieWeb.Entities;

namespace MovieWeb.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RolesController : ControllerBase
    {
        private readonly RoleManager<IdentityRole<int>> _roleMgr;
        private readonly UserManager<AppUser> _userMgr;
        public RolesController(RoleManager<IdentityRole<int>> r, UserManager<AppUser> u) { _roleMgr = r; _userMgr = u; }

        public record AssignDto(string Email, string Role);

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] string roleName)
        {
            if (string.IsNullOrWhiteSpace(roleName)) return BadRequest("Role name required.");
            if (await _roleMgr.RoleExistsAsync(roleName)) return Ok("Exists");
            var res = await _roleMgr.CreateAsync(new IdentityRole<int>(roleName));
            return res.Succeeded ? Ok("Created") : BadRequest(res.Errors);
        }

        [HttpPost("assign")]
        public async Task<IActionResult> Assign([FromBody] AssignDto dto)
        {
            var user = await _userMgr.FindByEmailAsync(dto.Email);
            if (user is null) return NotFound("User not found.");
            if (!await _roleMgr.RoleExistsAsync(dto.Role)) return NotFound("Role not found.");
            var res = await _userMgr.AddToRoleAsync(user, dto.Role);
            return res.Succeeded ? Ok("Assigned") : BadRequest(res.Errors);
        }

        [HttpPost("remove")]
        public async Task<IActionResult> Remove([FromBody] AssignDto dto)
        {
            var user = await _userMgr.FindByEmailAsync(dto.Email);
            if (user is null) return NotFound("User not found.");
            var res = await _userMgr.RemoveFromRoleAsync(user, dto.Role);
            return res.Succeeded ? Ok("Removed") : BadRequest(res.Errors);
        }
    }

}
