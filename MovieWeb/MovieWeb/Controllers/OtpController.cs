using Microsoft.AspNetCore.Mvc;
using MovieWeb.Service.Email;
using MovieWeb.Service.OTP;
using static MovieWeb.Service.OTP.OtpDto;

namespace MovieWeb.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class OtpController : ControllerBase
    {
        private readonly IEmailAppService _email;
        private readonly IOtpAppService _otp;

        public OtpController(IEmailAppService email, IOtpAppService otp)
        {
            _email = email;
            _otp = otp;
        }

        [HttpPost("send")]
        [ProducesResponseType(200)]
        public async Task<IActionResult> Send([FromBody] SendOtpRequest req, CancellationToken ct)
        {
            var code = _otp.GenerateAndStore(req.Email);
            var html = $@"<p>Mã xác thực của bạn là:</p>
                          <h2 style='letter-spacing:4px'>{code}</h2>
                          <p>Hết hạn sau 5 phút.</p>";
            await _email.SendAsync(req.Email, "OTP xác thực", html, ct);
            return Ok(new { message = "OTP sent" });
        }

        [HttpPost("verify")]
        [ProducesResponseType(200)]
        [ProducesResponseType(400)]
        public IActionResult Verify([FromBody] VerifyOtpRequest req)
        {
            return _otp.Verify(req.Email, req.Code)
                ? Ok(new { message = "OTP valid" })
                : BadRequest(new { message = "OTP invalid or expired" });
        }
    }
}
