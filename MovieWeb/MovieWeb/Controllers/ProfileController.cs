using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MovieWeb.Service.UserProfile;

namespace MovieWeb.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class ProfileController : ControllerBase
    {
        private readonly IUserProfileAppService _profileService;

        public ProfileController(IUserProfileAppService profileService)
        {
            _profileService = profileService;
        }

        [HttpGet]
        public async Task<ActionResult<UserProfileDto>> GetProfile()
        {
            try
            {
                var profile = await _profileService.GetAsync(User);
                return Ok(profile);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { error = ex.Message });
            }
        }

        [HttpPut]
        public async Task<ActionResult<UserProfileDto>> UpdateProfile([FromBody] UpdateUserProfileDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var updated = await _profileService.UpdateAsync(User, dto);
                return Ok(updated);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { error = ex.Message });
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
    }
}