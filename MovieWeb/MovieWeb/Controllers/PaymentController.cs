using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MovieWeb.DTOs.Common;
using MovieWeb.Entities;
using MovieWeb.Service.Payment;

namespace MovieWeb.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PaymentController : ControllerBase
    {
        private readonly IPaymentAppService _service;
        private readonly IVNPayAppService _vnPayAppService;
        private readonly IConfiguration _configuration;

        public PaymentController(IPaymentAppService service, IVNPayAppService vnPayAppService, IConfiguration configuration)
        {
            _service = service;
            _vnPayAppService = vnPayAppService;
            _configuration = configuration;
        }

        // GET /api/Payment/5
        [HttpGet("{id:long}")]
        [Authorize]
        public async Task<ActionResult<PaymentDto>> GetById(long id)
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

        // GET /api/Payment/by-transaction/PAY-20241014-ABC123
        [HttpGet("by-transaction/{transactionId}")]
        [Authorize]
        public async Task<ActionResult<PaymentDto>> GetByTransactionId(string transactionId)
        {
            try
            {
                var item = await _service.GetByTransactionIdAsync(transactionId);
                return Ok(item);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        // GET /api/Payment/by-order/5
        [HttpGet("by-order/{orderId:long}")]
        [Authorize]
        public async Task<ActionResult<List<PaymentDto>>> GetByOrder(long orderId)
        {
            var items = await _service.GetByOrderAsync(orderId);
            return Ok(items);
        }

        // GET /api/Payment/paged
        [HttpGet("paged")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<PagedResultDto<PaymentDto>>> GetPaged(
            [FromQuery] PagedRequestDto input,
            [FromQuery] long? orderId,
            [FromQuery] PaymentStatus? status)
        {
            var result = await _service.GetPagedAsync(input, orderId, status);
            return Ok(result);
        }

        // POST /api/Payment
        [HttpPost]
        [Authorize]
        public async Task<ActionResult<long>> Create([FromBody] CreatePaymentDto input)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                // Lấy IP Address từ request
                var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

                // Truyền IP vào CreateAsync
                var id = await _service.CreateAsync(input, ipAddress);
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

        // GET /api/Payment/5/payment-url
        [HttpGet("{id:long}/payment-url")]
        [Authorize]
        public async Task<ActionResult<PaymentUrlResponse>> GetPaymentUrl(long id, [FromQuery] string returnUrl)
        {
            try
            {
                var url = await _service.GeneratePaymentUrlAsync(id, returnUrl);
                return Ok(new PaymentUrlResponse { PaymentUrl = url });
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (NotImplementedException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // GET /api/Payment/vnpay-return (User được redirect về đây sau khi thanh toán)
        [HttpGet("vnpay-return")]
        [AllowAnonymous]
        public async Task<IActionResult> VNPayReturn()
        {
            try
            {
                // LOG toàn bộ query string
                var fullQuery = Request.QueryString.Value;
                Console.WriteLine("======================================");
                Console.WriteLine("=== VNPay Return Callback Received ===");
                Console.WriteLine($"Full QueryString: {fullQuery}");

                // Lấy tất cả query parameters từ VNPay
                var queryParams = Request.Query.ToDictionary(k => k.Key, v => v.Value.ToString());

                Console.WriteLine("\n=== All Parameters Received ===");
                foreach (var param in queryParams)
                {
                    Console.WriteLine($"{param.Key} = {param.Value}");
                }
                Console.WriteLine("================================");

                if (!queryParams.ContainsKey("vnp_SecureHash"))
                {
                    Console.WriteLine("\n❌ ERROR: Missing vnp_SecureHash parameter!");
                    Console.WriteLine($"Received {queryParams.Count} parameters but vnp_SecureHash is missing");

                    // Redirect về FE với error
                    var errorUrl = BuildFrontendReturnUrl(
                        status: "error",
                        message: "Invalid callback data"
                    );
                    Console.WriteLine($"🔄 Error redirect to: {errorUrl}");
                    return Redirect(errorUrl);
                }

                var secureHash = queryParams["vnp_SecureHash"];
                Console.WriteLine($"\n✓ vnp_SecureHash found: {secureHash.Substring(0, Math.Min(20, secureHash.Length))}...");

                // Validate chữ ký
                Console.WriteLine("\n🔐 Validating signature...");
                var isValidSignature = _vnPayAppService.ValidateSignature(queryParams, secureHash);

                if (!isValidSignature)
                {
                    Console.WriteLine("❌ Signature validation FAILED!");

                    var errorUrl = BuildFrontendReturnUrl(
                        status: "error",
                        message: "Invalid signature"
                    );
                    Console.WriteLine($"🔄 Error redirect to: {errorUrl}");
                    return Redirect(errorUrl);
                }

                Console.WriteLine("✓ Signature validation PASSED!");

                // Xử lý callback
                Console.WriteLine("\n📝 Processing callback...");
                var callbackResponse = _vnPayAppService.ProcessCallback(queryParams);

                var callback = new PaymentCallbackDto
                {
                    TransactionId = callbackResponse.TransactionId,
                    GatewayTransactionId = callbackResponse.GatewayTransactionId,
                    ResponseCode = callbackResponse.ResponseCode,
                    RawData = queryParams
                };

                await _service.ProcessCallbackAsync(callback);

                Console.WriteLine($"✓ Payment processed: {(callbackResponse.IsSuccess ? "SUCCESS" : "FAILED")}");
                Console.WriteLine($"TransactionId: {callbackResponse.TransactionId}");
                Console.WriteLine($"Amount: {callbackResponse.Amount:N0} VND");

                // REDIRECT về FE payment result page
                var redirectUrl = BuildFrontendReturnUrl(
                    status: callbackResponse.IsSuccess ? "success" : "failure"
                );

                Console.WriteLine($"🔄 Redirecting to: {redirectUrl}");
                Console.WriteLine("======================================\n");

                return Redirect(redirectUrl);
            }
            catch (KeyNotFoundException ex)
            {
                Console.WriteLine($"\n❌ ERROR: {ex.Message}");

                var errorUrl = BuildFrontendReturnUrl(
                    status: "error",
                    message: ex.Message
                );
                Console.WriteLine($"🔄 Error redirect to: {errorUrl}");
                return Redirect(errorUrl);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"\n❌ EXCEPTION: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");

                var errorUrl = BuildFrontendReturnUrl(
                    status: "error",
                    message: "Payment processing failed"
                );
                Console.WriteLine($"🔄 Error redirect to: {errorUrl}");
                return Redirect(errorUrl);
            }
        }

        // GET /api/Payment/vnpay-ipn (VNPay server gọi callback - IPN)
        [HttpGet("vnpay-ipn")]
        [AllowAnonymous]
        public async Task<IActionResult> VNPayIPN()
        {
            try
            {
                Console.WriteLine("======================================");
                Console.WriteLine("=== VNPay IPN Callback Received ===");

                var queryParams = Request.Query.ToDictionary(k => k.Key, v => v.Value.ToString());

                Console.WriteLine($"Received {queryParams.Count} parameters");
                foreach (var param in queryParams)
                {
                    Console.WriteLine($"{param.Key} = {param.Value}");
                }

                if (!queryParams.ContainsKey("vnp_SecureHash"))
                {
                    Console.WriteLine("❌ Missing vnp_SecureHash");
                    return Ok(new { RspCode = "97", Message = "Invalid signature" });
                }

                var secureHash = queryParams["vnp_SecureHash"];

                // Validate chữ ký
                var isValidSignature = _vnPayAppService.ValidateSignature(queryParams, secureHash);

                if (!isValidSignature)
                {
                    Console.WriteLine("❌ Signature validation FAILED");
                    return Ok(new { RspCode = "97", Message = "Invalid signature" });
                }

                Console.WriteLine("✓ Signature validation PASSED");

                // Xử lý callback
                var callbackResponse = _vnPayAppService.ProcessCallback(queryParams);

                var callback = new PaymentCallbackDto
                {
                    TransactionId = callbackResponse.TransactionId,
                    GatewayTransactionId = callbackResponse.GatewayTransactionId,
                    ResponseCode = callbackResponse.ResponseCode,
                    RawData = queryParams
                };

                await _service.ProcessCallbackAsync(callback);

                Console.WriteLine($"✓ IPN processed successfully");
                Console.WriteLine("======================================\n");

                // Trả response về VNPay
                return Ok(new { RspCode = "00", Message = "Confirm Success" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ EXCEPTION: {ex.Message}");
                return Ok(new { RspCode = "99", Message = "Unknown error" });
            }
        }

        // POST /api/Payment/callback (Generic callback cho các provider khác)
        [HttpPost("callback")]
        [AllowAnonymous]
        public async Task<IActionResult> ProcessCallback([FromBody] PaymentCallbackDto callback)
        {
            try
            {
                await _service.ProcessCallbackAsync(callback);
                return Ok(new { success = true });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
        }

        // POST /api/Payment/refund
        [HttpPost("refund")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Refund([FromBody] RefundRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                await _service.RefundAsync(request.OrderId, request.Amount, request.Reason);
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


        /// Build URL redirect về FE payment result page với query params
        private string BuildFrontendReturnUrl(
            string status,
            string? orderRef = null,
            string? message = null,
            string? vnpResponseCode = null,
            string? vnpTransactionNo = null,
            string? amount = null)
        {
            // Lấy base URL từ config
            var frontendBaseUrl = _configuration["Frontend:BaseUrl"] ?? "http://localhost:5173";
            var resultPath = _configuration["Frontend:PaymentResultPath"] ?? "/payment-result";

            var queryParams = new List<string>
            {
                $"status={Uri.EscapeDataString(status)}"
            };

            if (!string.IsNullOrEmpty(orderRef))
                queryParams.Add($"orderRef={Uri.EscapeDataString(orderRef)}");

            if (!string.IsNullOrEmpty(message))
                queryParams.Add($"message={Uri.EscapeDataString(message)}");

            if (!string.IsNullOrEmpty(vnpResponseCode))
                queryParams.Add($"vnp_ResponseCode={Uri.EscapeDataString(vnpResponseCode)}");

            if (!string.IsNullOrEmpty(vnpTransactionNo))
                queryParams.Add($"vnp_TransactionNo={Uri.EscapeDataString(vnpTransactionNo)}");

            if (!string.IsNullOrEmpty(amount))
                queryParams.Add($"amount={Uri.EscapeDataString(amount)}");

            var queryString = string.Join("&", queryParams);
            return $"{frontendBaseUrl}{resultPath}?{queryString}";
        }
    }

    public class PaymentUrlResponse
    {
        public string PaymentUrl { get; set; } = string.Empty;
    }

    public class RefundRequest
    {
        public long OrderId { get; set; }
        public decimal Amount { get; set; }
        public string Reason { get; set; } = string.Empty;
    }
}