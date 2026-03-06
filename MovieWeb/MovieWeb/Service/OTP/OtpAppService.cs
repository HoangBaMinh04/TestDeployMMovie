using Microsoft.Extensions.Caching.Memory;
using System.Security.Cryptography;

namespace MovieWeb.Service.OTP
{
    public interface IOtpAppService
    {
        string GenerateAndStore(string email, TimeSpan? ttl = null);
        bool Verify(string email, string code);
    }
    public class OtpAppService : IOtpAppService
    {
        private readonly IMemoryCache _cache;
        private const string Prefix = "OTP_";
        public OtpAppService(IMemoryCache cache) => _cache = cache;

        // tạo ra mã 6 số và lưu cache 5 phút
        public string GenerateAndStore(string email, TimeSpan? ttl = null)
        {
            string code = GenerateDigits(6);
            _cache.Set(Prefix + email, code, ttl ?? TimeSpan.FromMinutes(5));
            return code;
        }

        // xác thực mã otp
        public bool Verify(string email, string code)
        {
            if (_cache.TryGetValue(Prefix + email, out string? saved) && saved == code)
            {
                _cache.Remove(Prefix + email); // one-time
                return true;
            }
            return false;
        }

        // sinh ra mã từ 0 - 10
        private static string GenerateDigits(int len)
        {
            var chars = new char[len];
            for (int i = 0; i < len; i++)
            {
                int d = RandomNumberGenerator.GetInt32(0, 10);
                chars[i] = (char)('0' + d);
            }
            return new string(chars);
        }
    }
}
