using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MovieWeb.DTOs.Common;
using MovieWeb.Entities;
using MovieWeb.Service.Order;
using System.Security.Claims;

namespace MovieWeb.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class OrderController : ControllerBase
    {
        private readonly IOrderService _service;

        public OrderController(IOrderService service)
        {
            _service = service;
        }

        // GET /api/Order/5
        [HttpGet("{id:long}")]
        [Authorize]
        public async Task<ActionResult<OrderDto>> GetById(long id)
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

        // GET /api/Order/5/detail
        [HttpGet("{id:long}/detail")]
        [Authorize]
        public async Task<ActionResult<OrderDetailDto>> GetDetail(long id)
        {
            try
            {
                var item = await _service.GetDetailAsync(id);
                return Ok(item);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        // GET /api/Order/by-code/ORD-20241014-ABC123
        [HttpGet("by-code/{orderCode}")]
        [Authorize]
        public async Task<ActionResult<OrderDto>> GetByCode(string orderCode)
        {
            try
            {
                var item = await _service.GetByCodeAsync(orderCode);
                return Ok(item);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        // GET /api/Order/my-orders
        [HttpGet("my-orders")]
        [Authorize]
        public async Task<ActionResult<List<OrderDto>>> GetMyOrders()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !long.TryParse(userIdClaim, out long userId))
            {
                return Unauthorized();
            }

            var items = await _service.GetByUserAsync(userId);
            return Ok(items);
        }

        // GET /api/Order/pending
        [HttpGet("pending")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<List<OrderDto>>> GetPending()
        {
            var items = await _service.GetPendingOrdersAsync();
            return Ok(items);
        }

        // GET /api/Order/paged
        [HttpGet("paged")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<PagedResultDto<OrderDto>>> GetPaged(
            [FromQuery] PagedRequestDto input,
            [FromQuery] long? userId,
            [FromQuery] OrderStatus? status)
        {
            var result = await _service.GetPagedAsync(input, userId, status);
            return Ok(result);
        }

        // POST /api/Order
        [HttpPost]
        [Authorize]
        public async Task<ActionResult<long>> Create([FromBody] CreateOrderDto input)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                long? userId = null;
                if (!string.IsNullOrEmpty(userIdClaim) && long.TryParse(userIdClaim, out long uid))
                {
                    userId = uid;
                }

                var id = await _service.CreateAsync(input, userId);
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

        // POST /api/Order/5/cancel
        [HttpPost("{id:long}/cancel")]
        [Authorize]
        public async Task<IActionResult> Cancel(long id, [FromBody] CancelOrderRequest request)
        {
            try
            {
                await _service.CancelOrderAsync(id, request.Reason ?? "Cancelled by user");
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

        // POST /api/Order/5/expire
        [HttpPost("{id:long}/expire")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Expire(long id)
        {
            await _service.ExpireOrderAsync(id);
            return NoContent();
        }

        // POST /api/Order/process-expired
        [HttpPost("process-expired")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ProcessExpired()
        {
            await _service.ProcessExpiredOrdersAsync();
            return NoContent();
        }
    }

    public class CancelOrderRequest
    {
        public string? Reason { get; set; }
    }
}
