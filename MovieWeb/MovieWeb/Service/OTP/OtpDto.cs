namespace MovieWeb.Service.OTP
{
    public class OtpDto
    {
        public record SendOtpRequest(string Email);
        public record VerifyOtpRequest(string Email, string Code);
    }
}
