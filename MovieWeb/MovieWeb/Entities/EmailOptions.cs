namespace MovieWeb.Entities
{
    public class EmailOptions
    {
        public string FromEmail { get; set; } = default!;
        public string FromName { get; set; } = "TestAuth System";
        public string Host { get; set; } = "smtp.gmail.com";
        public int Port { get; set; } = 587;
        public string UserName { get; set; } = default!;
        public string Password { get; set; } = default!;
        public bool UseStartTls { get; set; } = true;
    }
}
