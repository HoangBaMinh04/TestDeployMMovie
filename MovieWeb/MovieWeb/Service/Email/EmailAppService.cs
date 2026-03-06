using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using MovieWeb.Entities;

namespace MovieWeb.Service.Email
{
    public interface IEmailAppService
    {
        Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct = default);
    }
    public class EmailAppService : IEmailAppService
    {
        private readonly EmailOptions _opt;
        public EmailAppService(IOptions<EmailOptions> opt) => _opt = opt.Value;

        //đọc EmailOptions qua IOptions<EmailOptions>, gửi mail.
        public async Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct = default)
        {
            var msg = new MimeMessage();
            msg.From.Add(new MailboxAddress(_opt.FromName, _opt.FromEmail));
            msg.To.Add(MailboxAddress.Parse(to));
            msg.Subject = subject;

            var body = new BodyBuilder { HtmlBody = htmlBody };
            msg.Body = body.ToMessageBody();

            using var smtp = new SmtpClient();
            await smtp.ConnectAsync(_opt.Host, _opt.Port,
                _opt.UseStartTls ? SecureSocketOptions.StartTls : SecureSocketOptions.Auto, ct);

            await smtp.AuthenticateAsync(_opt.UserName, _opt.Password, ct);
            await smtp.SendAsync(msg, ct);
            await smtp.DisconnectAsync(true, ct);
        }
    }
}
