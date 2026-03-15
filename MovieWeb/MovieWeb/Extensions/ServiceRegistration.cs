using MovieWeb.BackgroundServices;
using MovieWeb.Service.Auth;
using MovieWeb.Service.Category;
using MovieWeb.Service.Chatbot;
using MovieWeb.Service.Cinema;
using MovieWeb.Service.Country;
using MovieWeb.Service.Dashboard;
using MovieWeb.Service.Email;
using MovieWeb.Service.Movie;
using MovieWeb.Service.Order;
using MovieWeb.Service.OTP;
using MovieWeb.Service.Payment;
using MovieWeb.Service.PriceRule;
using MovieWeb.Service.Promotion;
using MovieWeb.Service.Realtime;
using MovieWeb.Service.Review;
using MovieWeb.Service.Room;
using MovieWeb.Service.Seat;
using MovieWeb.Service.Showtime;
using MovieWeb.Service.SupportChat;
using MovieWeb.Service.Tmdb;
using MovieWeb.Service.UserManagement;
using MovieWeb.Service.UserProfile;

namespace MovieWeb.Extensions
{
    public static class ServiceRegistration
    {
        public static IServiceCollection AddApplicationServices(this IServiceCollection services)
        {
            // DashboardAdmin
            services.AddScoped<IDashboardAppService, DashboardAppService>();

            services.AddMemoryCache(); // nếu OTP dùng MemoryCache

            services.AddScoped<IAuthAppService, AuthAppService>();
            services.AddScoped<IEmailAppService, EmailAppService>();
            services.AddSingleton<IOtpAppService, OtpAppService>();
            services.AddScoped<IUserProfileAppService, UserProfileAppService>();
            services.AddScoped<IUserManagementAppService, UserManagementAppService>();

            // ==================== CORE SERVICES ====================
            services.AddScoped<IMovieAppService, MovieAppService>();
            services.AddScoped<ICategoryAppService, CategoryAppService>();
            services.AddScoped<ICountryAppService, CountryAppService>();

            // ==================== CINEMA SERVICES ====================
            services.AddScoped<ICinemaService, CinemaService>();
            services.AddScoped<IRoomService, RoomService>();
            services.AddScoped<ISeatService, SeatService>();
            services.AddScoped<IPriceRuleService, PriceRuleService>();

            // ==================== SHOWTIME & BOOKING ====================
            services.AddScoped<IShowtimeService, ShowtimeService>();
            services.AddSingleton<IShowtimeRealtimeAppService, ShowtimeRealtimeAppService>();

            // ==================== ORDER & PAYMENT ====================
            services.AddScoped<IOrderService, OrderService>();
            services.AddScoped<IPaymentAppService, PaymentAppService>();
            services.AddScoped<IVNPayAppService, VNPayAppService>();
            services.AddScoped<IPromotionService, PromotionService>();

            // ==================== BACKGROUND SERVICES ====================

            // ⭐ Register background service
            services.AddHostedService<ExpiredOrderProcessorService>();

            // review 1-5sao
            services.AddScoped<IReviewAppService, ReviewAppService>();

            // Gemini Chatbot
            services.AddHttpClient<IChatbotService, GeminiChatbotService>();

            // Support Chat Realtime (Customer Admin)
            services.AddScoped<ISupportChatAppService, SupportChatAppService>();

            // SignalR
            services.AddSignalR();

            // Tmdb public api để lấy poster chỉ cần nhập tên, số năm và để trống link url nó sẽ tự tìm
            services.AddHttpClient<ITmdbClient, TmdbClient>();


            return services;
        }
    }
}
