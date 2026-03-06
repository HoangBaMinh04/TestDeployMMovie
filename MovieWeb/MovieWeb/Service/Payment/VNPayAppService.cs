using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Web;

namespace MovieWeb.Service.Payment
{
    public interface IVNPayAppService
    {
        string CreatePaymentUrl(long orderId, string orderCode, decimal amount, string transactionId, string ipAddress, string returnUrl);
        bool ValidateSignature(Dictionary<string, string> queryParams, string secureHash);
        VNPayCallbackResponse ProcessCallback(Dictionary<string, string> queryParams);
    }

    public class VNPayCallbackResponse
    {
        public bool IsSuccess { get; set; }
        public string Message { get; set; } = "";
        public string? TransactionId { get; set; }
        public string? GatewayTransactionId { get; set; }
        public decimal Amount { get; set; }
        public string? ResponseCode { get; set; }
    }

    public class VNPayAppService : IVNPayAppService
    {
        private readonly IConfiguration _cfg;
        private readonly ILogger<VNPayAppService> _log;

        public VNPayAppService(IConfiguration cfg, ILogger<VNPayAppService> log)
        {
            _cfg = cfg;
            _log = log;
        }

        // Helper Methods
        private static string UrlEncode(string input)
        {
            var s = HttpUtility.UrlEncode(input, Encoding.UTF8) ?? "";

            // theo form-urlencoded
            s = s.Replace("%20", "+");

            // UPPERCASE cho mọi %xx
            var sb = new StringBuilder(s.Length);
            for (int i = 0; i < s.Length; i++)
            {
                if (s[i] == '%' && i + 2 < s.Length)
                {
                    sb.Append('%');
                    sb.Append(char.ToUpperInvariant(s[i + 1]));
                    sb.Append(char.ToUpperInvariant(s[i + 2]));
                    i += 2;
                }
                else
                {
                    sb.Append(s[i]);
                }
            }
            return sb.ToString();
        }


        private static string BuildQueryString(IDictionary<string, string> inputs)
        {
            return string.Join("&",
                inputs
                    .Where(kv => !string.IsNullOrEmpty(kv.Value))
                    .OrderBy(kv => kv.Key, StringComparer.Ordinal)
                    .Select(kv => $"{kv.Key}={UrlEncode(kv.Value)}"));
        }

        private static string HmacSHA512(string key, string data)
        {
            using var hmac = new HMACSHA512(Encoding.UTF8.GetBytes(key));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
            var sb = new StringBuilder(hash.Length * 2);
            foreach (var b in hash)
                sb.Append(b.ToString("X2"));
            return sb.ToString();
        }


        public string CreatePaymentUrl(long orderId, string orderCode, decimal amount, string transactionId, string ipAddress, string returnUrl)
        {
            var vnpUrl = _cfg["VNPay:Url"] ?? "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
            var tmnCode = _cfg["VNPay:TmnCode"] ?? throw new InvalidOperationException("VNPay:TmnCode missing");
            var secretKey = _cfg["VNPay:HashSecret"] ?? throw new InvalidOperationException("VNPay:HashSecret missing");

            // Số tiền * 100, không chứa dấu thập phân
            var amount100 = ((long)Math.Round(amount * 100, 0, MidpointRounding.AwayFromZero)).ToString(CultureInfo.InvariantCulture);

            var locale = "vn";
            var orderInfo = $"Thanh toan don hang {orderCode}";

            // Lấy giờ Việt Nam (chuẩn VNPay)
            var nowVN = TimeZoneInfo.ConvertTime(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time"));
            var vnpCreateDate = nowVN.ToString("yyyyMMddHHmmss");

            // Dùng ReturnUrl từ CONFIG (ngrok BE)
            var backendReturnUrl = _cfg["VNPay:ReturnUrl"] ?? throw new InvalidOperationException("VNPay:ReturnUrl missing");

            // Dữ liệu gửi lên VNPay
            var vnp = new Dictionary<string, string>
            {
                ["vnp_Version"] = "2.1.0",
                ["vnp_Command"] = "pay",
                ["vnp_TmnCode"] = tmnCode,
                ["vnp_Amount"] = amount100,
                ["vnp_CurrCode"] = "VND",
                ["vnp_TxnRef"] = transactionId,
                ["vnp_OrderInfo"] = orderInfo,
                ["vnp_OrderType"] = "other",
                ["vnp_Locale"] = locale,
                ["vnp_IpAddr"] = string.IsNullOrWhiteSpace(ipAddress) || ipAddress.Contains(":") ? "127.0.0.1" : ipAddress,
                ["vnp_CreateDate"] = vnpCreateDate,
                ["vnp_ReturnUrl"] = backendReturnUrl  // ⚠️ Phải là BE URL (ngrok)
            };

            // Build chuỗi để ký (đã encode)
            var signData = BuildQueryString(vnp);

            // Sinh hash
            var secureHash = HmacSHA512(secretKey, signData);

            // Tạo URL cuối
            var finalQuery = signData + "&vnp_SecureHash=" + secureHash;
            var payUrl = vnpUrl + "?" + finalQuery;

            _log.LogInformation("=== VNPay SIGN OUT ===\nSignData: {sign}\nSecureHash: {hash}\nPayUrl: {url}",
                signData, secureHash, payUrl);

            return payUrl;
        }


        public bool ValidateSignature(Dictionary<string, string> queryParams, string secureHash)
        {
            var secretKey = _cfg["VNPay:HashSecret"] ?? throw new InvalidOperationException("VNPay:HashSecret missing");

            // Bỏ các key hash ra
            var data = queryParams
                .Where(kv => kv.Key != "vnp_SecureHash" && kv.Key != "vnp_SecureHashType")
                .ToDictionary(k => k.Key, v => v.Value);

            // Build theo đúng chuẩn encode khi tạo URL
            var signData = BuildQueryString(data);
            var computed = HmacSHA512(secretKey, signData);

            Console.WriteLine("=== VNPay SIGN IN ===");
            Console.WriteLine("SignData: " + signData);
            Console.WriteLine("SecureHash From VNPay: " + secureHash);
            Console.WriteLine("SecureHash Computed: " + computed);

            return string.Equals(computed, secureHash, StringComparison.OrdinalIgnoreCase);
        }


        public VNPayCallbackResponse ProcessCallback(Dictionary<string, string> queryParams)
        {
            queryParams.TryGetValue("vnp_ResponseCode", out var rsp);
            queryParams.TryGetValue("vnp_TxnRef", out var txnRef);
            queryParams.TryGetValue("vnp_TransactionNo", out var txnNo);
            queryParams.TryGetValue("vnp_Amount", out var amountStr);

            var amount = 0m;
            if (long.TryParse(amountStr, out var a))
                amount = a / 100m;

            return new VNPayCallbackResponse
            {
                IsSuccess = rsp == "00",
                Message = rsp == "00" ? "Thanh toán thành công" : $"Thanh toán thất bại (Mã lỗi: {rsp})",
                TransactionId = txnRef,
                GatewayTransactionId = txnNo,
                Amount = amount,
                ResponseCode = rsp
            };
        }
    }
}