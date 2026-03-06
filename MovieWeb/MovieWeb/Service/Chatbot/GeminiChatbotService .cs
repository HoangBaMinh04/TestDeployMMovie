using Microsoft.EntityFrameworkCore;
using MovieWeb.Entities;
using System.Text.Json;

namespace MovieWeb.Service.Chatbot
{
    public interface IChatbotService
    {
        Task<ChatResponse> SendMessageAsync(long userId, string message);
        Task<List<ChatHistoryDto>> GetChatHistoryAsync(long userId);
        Task<ChatHistoryPagedDto> GetChatHistoryPagedAsync(long userId, int pageNumber, int pageSize);
        Task ClearHistoryAsync(long userId);
        Task<ChatStatisticsDto> GetStatisticsAsync(long userId);
    }

    public class GeminiChatbotService : IChatbotService
    {
        private readonly IConfiguration _configuration;
        private readonly MyDbContext _db;
        private readonly ILogger<GeminiChatbotService> _logger;
        private readonly string _apiKey;
        private readonly HttpClient _httpClient;

        private const string GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

        public GeminiChatbotService(
            IConfiguration configuration,
            MyDbContext db,
            HttpClient httpClient,
            ILogger<GeminiChatbotService> logger)
        {
            _configuration = configuration;
            _db = db;
            _httpClient = httpClient;
            _logger = logger;

            _apiKey = configuration["Gemini:ApiKey"]
                ?? throw new InvalidOperationException("Gemini API key not configured");

            _logger.LogInformation("GeminiChatbotService initialized successfully");
        }

        public async Task<ChatResponse> SendMessageAsync(long userId, string message)
        {
            try
            {
                _logger.LogInformation("User {UserId} sent message: {Message}", userId, message);

                // Lấy lịch sử chat (10 tin nhắn gần nhất)
                var history = await GetRecentChatHistoryAsync(userId, 10);

                // Chuẩn bị context từ database
                var contextData = await BuildContextDataAsync(userId);

                // Build conversation
                var geminiRequest = BuildGeminiRequest(history, contextData, message);

                // Gọi Gemini API
                var botResponse = await CallGeminiAPIAsync(geminiRequest);

                // Lưu chat history
                await SaveChatMessageAsync(userId, message, "user");
                await SaveChatMessageAsync(userId, botResponse, "assistant");

                _logger.LogInformation("Bot responded successfully to user {UserId}", userId);

                return new ChatResponse
                {
                    Message = botResponse,
                    Timestamp = DateTime.UtcNow,
                    Success = true
                };
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "Gemini API request failed for user {UserId}", userId);
                return new ChatResponse
                {
                    Message = "Xin lỗi, tôi đang gặp sự cố kết nối với AI. Vui lòng thử lại sau.",
                    Timestamp = DateTime.UtcNow,
                    Success = false,
                    Error = "API_CONNECTION_ERROR"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in chatbot for user {UserId}", userId);
                return new ChatResponse
                {
                    Message = "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.",
                    Timestamp = DateTime.UtcNow,
                    Success = false,
                    Error = ex.Message
                };
            }
        }

        private async Task<string> CallGeminiAPIAsync(GeminiRequest request)
        {
            var url = $"{GEMINI_API_URL}?key={_apiKey}";

            var jsonContent = JsonSerializer.Serialize(request, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = false
            });

            _logger.LogDebug("Calling Gemini API at {Url}", GEMINI_API_URL);

            var content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(url, content);
            var responseContent = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Gemini API error: {StatusCode} - {Content}", response.StatusCode, responseContent);
                throw new HttpRequestException($"Gemini API returned {response.StatusCode}");
            }

            var geminiResponse = JsonSerializer.Deserialize<GeminiResponse>(responseContent, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });

            if (geminiResponse?.Candidates == null || !geminiResponse.Candidates.Any())
            {
                _logger.LogWarning("No candidates in Gemini response");
                throw new InvalidOperationException("No response from Gemini API");
            }

            var candidate = geminiResponse.Candidates
                .FirstOrDefault(c => c?.Content?.Parts != null && c.Content.Parts.Count > 0);

            var text = candidate?.Content?.Parts
                .Select(p => p?.Text)
                .FirstOrDefault(t => !string.IsNullOrWhiteSpace(t));

            if (string.IsNullOrWhiteSpace(text))
            {
                _logger.LogWarning("Gemini response did not contain any text parts");
                throw new InvalidOperationException("Empty response from Gemini API");
            }

            // Loại bỏ markdown formatting
            return RemoveMarkdownFormatting(text);
        }

        private static string RemoveMarkdownFormatting(string text)
        {
            if (string.IsNullOrEmpty(text))
                return text;

            // Loại bỏ bold ** (đơn giản nhất, xóa tất cả **)
            text = text.Replace("**", "");

            // Loại bỏ __text__ 
            text = System.Text.RegularExpressions.Regex.Replace(text, @"__([^_]+)__", "$1");

            // Loại bỏ strikethrough (~~text~~)
            text = System.Text.RegularExpressions.Regex.Replace(text, @"~~([^~]+)~~", "$1");

            // Loại bỏ inline code (`text`)
            text = System.Text.RegularExpressions.Regex.Replace(text, @"`([^`]+)`", "$1");

            // Loại bỏ headers (# ## ### etc.) ở đầu dòng
            text = System.Text.RegularExpressions.Regex.Replace(text, @"^#{1,6}\s*", "", System.Text.RegularExpressions.RegexOptions.Multiline);

            // Loại bỏ link markdown [text](url) -> text
            text = System.Text.RegularExpressions.Regex.Replace(text, @"\[([^\]]+)\]\([^)]+\)", "$1");

            return text;
        }

        private GeminiRequest BuildGeminiRequest(List<ChatHistoryDto> history, string contextData, string userMessage)
        {
            var contents = new List<GeminiContent>();

            // System instruction (first user message)
            var systemPrompt = GetSystemPrompt(contextData);
            contents.Add(new GeminiContent
            {
                Role = "user",
                Parts = new List<GeminiPart> { new GeminiPart { Text = systemPrompt } }
            });

            // Bot acknowledgment
            contents.Add(new GeminiContent
            {
                Role = "model",
                Parts = new List<GeminiPart>
                {
                    new GeminiPart { Text = "Chào bạn! Tôi là trợ lý AI của MovieWeb. Tôi sẵn sàng giúp bạn tìm phim hay và đặt vé. Bạn cần hỗ trợ gì? 🎬" }
                }
            });

            // Add chat history
            foreach (var msg in history)
            {
                var role = msg.Role == "user" ? "user" : "model";
                contents.Add(new GeminiContent
                {
                    Role = role,
                    Parts = new List<GeminiPart> { new GeminiPart { Text = msg.Content } }
                });
            }

            // Add current user message
            contents.Add(new GeminiContent
            {
                Role = "user",
                Parts = new List<GeminiPart> { new GeminiPart { Text = userMessage } }
            });

            return new GeminiRequest
            {
                Contents = contents,
                GenerationConfig = new GeminiGenerationConfig
                {
                    Temperature = 0.7,
                    TopK = 40,
                    TopP = 0.95,
                    MaxOutputTokens = 1024
                },
                SafetySettings = new List<GeminiSafetySetting>
                {
                    new GeminiSafetySetting { Category = "HARM_CATEGORY_HARASSMENT", Threshold = "BLOCK_MEDIUM_AND_ABOVE" },
                    new GeminiSafetySetting { Category = "HARM_CATEGORY_HATE_SPEECH", Threshold = "BLOCK_MEDIUM_AND_ABOVE" },
                    new GeminiSafetySetting { Category = "HARM_CATEGORY_SEXUALLY_EXPLICIT", Threshold = "BLOCK_MEDIUM_AND_ABOVE" },
                    new GeminiSafetySetting { Category = "HARM_CATEGORY_DANGEROUS_CONTENT", Threshold = "BLOCK_MEDIUM_AND_ABOVE" }
                }
            };
        }

        private string GetSystemPrompt(string contextData)
        {
            return $@"Bạn là trợ lý AI thông minh của hệ thống đặt vé xem phim MovieWeb.

🎯 NHIỆM VỤ CỦA BẠN:
- Tư vấn phim đang chiếu, suất chiếu, rạp chiếu
- Hỗ trợ tìm kiếm phim theo thể loại, tên, đạo diễn, diễn viên
- Trả lời về giá vé, thời gian chiếu, địa điểm
- Hướng dẫn cách đặt vé online
- Kiểm tra đơn hàng của khách hàng
- Giải đáp thắc mắc về dịch vụ

💬 PHONG CÁCH GIAO TIẾP:
- Thân thiện, nhiệt tình, chuyên nghiệp
- Trả lời ngắn gọn, dễ hiểu, có cấu trúc rõ ràng
- Sử dụng emoji phù hợp để tạo sự thân thiện 😊🎬🎭🎫
- Hỏi lại nếu thông tin chưa rõ ràng
- Luôn gợi ý phim hay dựa trên sở thích khách hàng
- Ưu tiên phim có rating cao và đang hot

⚠️ QUAN TRỌNG - ĐỊNH DẠNG VĂN BẢN:
- KHÔNG sử dụng markdown formatting (không dùng **, *, __, _, ~~, `, #)
- KHÔNG in đậm, in nghiêng hay định dạng đặc biệt
- Chỉ dùng văn bản thuần (plain text) và emoji
- Dùng dấu gạch đầu dòng (-) hoặc số (1. 2. 3.) để liệt kê

📊 DỮ LIỆU HỆ THỐNG HIỆN TẠI:
{contextData}

⚠️ NGUYÊN TẮC:
- CHỈ trả lời về phim, rạp chiếu và dịch vụ đặt vé của MovieWeb
- KHÔNG trả lời câu hỏi ngoài phạm vi điện ảnh
- Nếu KHÔNG có thông tin chính xác, hãy thành thật nói không biết
- LUÔN kiểm tra dữ liệu trong phần ""DỮ LIỆU HỆ THỐNG"" trước khi trả lời
- Nếu khách hỏi về phim không có trong hệ thống, gợi ý các phim tương tự đang có

📝 MẪU TRẢ LỜI:
- Khi giới thiệu phim: Tên, thể loại, rating, thời lượng, đạo diễn
- Khi nói về suất chiếu: Rạp, giờ chiếu, giá vé
- Khi hướng dẫn đặt vé: Các bước rõ ràng, dễ thực hiện

Hãy trả lời bằng tiếng Việt và luôn giữ phong cách thân thiện, chuyên nghiệp!";
        }

        private async Task<string> BuildContextDataAsync(long userId)
        {
            // Lấy phim đang chiếu
            //var nowShowingMovies = await _db.Movies
            //    .Select(m => new
            //    {
            //        m.Id,
            //        m.Name,
            //        m.AgeRating,
            //        m.Duration,
            //        m.ReleaseDate,
            //        Description = m.Description.Length > 100 ? m.Description.Substring(0, 100) + "..." : m.Description
            //    })
            //    .ToListAsync();


            var now = DateTime.UtcNow;
            var jsonOptions = new JsonSerializerOptions { WriteIndented = true };
            // Lấy phim đang chiếu (top 10) kèm đầy đủ thông tin cần thiết cho chatbot
            var nowShowingMovies = await _db.Movies
                .Where(m => m.ReleaseDate <= now && m.IsPublished && !m.IsDeleted)
                .OrderByDescending(m => m.ReleaseDate)
                .Take(10)
                .Select(m => new
                {
                    m.Id,
                    m.Name,
                    m.Description,
                    m.Slug,
                    m.Quality,
                    m.Year,
                    m.Duration,
                    m.ReleaseDate,
                    m.AgeRating,
                    m.TrailerUrl,
                    m.ThumbnailUrl,
                    m.PosterUrl,
                    m.AverageRating,
                    m.TotalReviews,
                    m.TotalRating1Star,
                    m.TotalRating2Star,
                    m.TotalRating3Star,
                    m.TotalRating4Star,
                    m.TotalRating5Star,
                    Country = new
                    {
                        m.Country.Id,
                        m.Country.Name,
                        m.Country.Code
                    },
                    Categories = m.MovieCategories
                        .Select(mc => new
                        {
                            mc.Category.Id,
                            mc.Category.Name,
                            mc.Category.Slug
                        })
                        .ToList(),
                    UpcomingShowtimes = m.Showtimes
                        .Where(st => st.StartAt >= now && st.IsActive)
                        .OrderBy(st => st.StartAt)
                        .Take(10)
                        .Select(st => new
                        {
                            st.Id,
                            st.StartAt,
                            st.EndAt,
                            st.Format,
                            st.Language,
                            st.Subtitle,
                            st.BasePrice,
                            Cinema = new
                            {
                                st.Cinema.Id,
                                st.Cinema.Name,
                                st.Cinema.Address,
                                st.Cinema.PhoneNumber
                            },
                            Room = new
                            {
                                st.Room.Id,
                                st.Room.Name
                            }
                        })
                        .ToList()
                })
                .ToListAsync();

            // Lấy phim sắp chiếu (trong 30 ngày tới)
            var upcomingMovies = await _db.Movies
                .Where(m => m.ReleaseDate > now && m.ReleaseDate <= now.AddDays(30) && m.IsPublished && !m.IsDeleted)
                .OrderBy(m => m.ReleaseDate)
                .Take(10)
                .Select(m => new
                {
                    m.Id,
                    m.Name,
                    m.Description,
                    m.Slug,
                    m.Quality,
                    m.Year,
                    m.Duration,
                    m.ReleaseDate,
                    m.AgeRating,
                    m.TrailerUrl,
                    m.ThumbnailUrl,
                    m.PosterUrl,
                    m.AverageRating,
                    m.TotalReviews,
                    Country = new
                    {
                        m.Country.Id,
                        m.Country.Name,
                        m.Country.Code
                    },
                    Categories = m.MovieCategories
                        .Select(mc => new
                        {
                            mc.Category.Id,
                            mc.Category.Name,
                            mc.Category.Slug
                        })
                        .ToList(),
                    EarliestShowtime = m.Showtimes
                        .Where(st => st.StartAt >= now && st.IsActive)
                        .OrderBy(st => st.StartAt)
                        .Select(st => new
                        {
                            st.Id,
                            st.StartAt,
                            st.Format,
                            st.Language,
                            st.Subtitle,
                            Cinema = new
                            {
                                st.Cinema.Id,
                                st.Cinema.Name,
                                st.Cinema.Address
                            }
                        })
                        .FirstOrDefault()
                })
                .ToListAsync();

            // Lấy phim nổi bật (top rating)
            var trendingMovies = await _db.Movies
                .Where(m => m.IsPublished && !m.IsDeleted && m.TotalReviews > 0)
                .OrderByDescending(m => m.AverageRating)
                .ThenByDescending(m => m.TotalReviews)
                .Take(10)
                .Select(m => new
                {
                    m.Id,
                    m.Name,
                    m.AverageRating,
                    m.TotalReviews,
                    m.ReleaseDate,
                    Categories = m.MovieCategories
                        .Select(mc => mc.Category.Name)
                        .ToList()
                })
                .ToListAsync();


            // Lấy rạp chiếu
            var cinemas = await _db.Cinemas
                .Take(5)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Address,
                    c.PhoneNumber
                })
                .ToListAsync();

            // Lấy đơn hàng gần nhất của user (3 đơn)
            var recentOrders = await _db.Orders
                .Where(o => o.UserId == userId)
                .OrderByDescending(o => o.CreatedAt)
                .Take(3)
                .Include(o => o.Showtime)
                    .ThenInclude(s => s.Movie)
                .Include(o => o.Showtime)
                    .ThenInclude(s => s.Cinema)
                .Select(o => new
                {
                    o.OrderCode,
                    MovieName = o.Showtime.Movie.Name,
                    CinemaName = o.Showtime.Cinema.Name,
                    ShowtimeStart = o.Showtime.StartAt,
                    o.Status,
                    o.TotalAmount,
                    o.CreatedAt
                })
                .ToListAsync();

            var context = $@"
📽️ PHIM ĐANG CHIẾU (Top 10):
{JsonSerializer.Serialize(nowShowingMovies, jsonOptions)}

🎬 PHIM SẮP CHIẾU (30 ngày tới):
{JsonSerializer.Serialize(upcomingMovies, jsonOptions)}

🔥 PHIM XU HƯỚNG:
{JsonSerializer.Serialize(trendingMovies, jsonOptions)}

🏢 RẠP CHIẾU:
{JsonSerializer.Serialize(cinemas, jsonOptions)}

🎫 ĐƠN HÀNG GẦN NHẤT CỦA KHÁCH:
{JsonSerializer.Serialize(recentOrders, jsonOptions)}

📅 NGÀY HÔM NAY: {DateTime.Now:dd/MM/yyyy}
";

            return context;
        }

        private async Task<List<ChatHistoryDto>> GetRecentChatHistoryAsync(long userId, int count)
        {
            return await _db.ChatHistories
                .Where(c => c.UserId == userId)
                .OrderByDescending(c => c.CreatedAt)
                .Take(count)
                .OrderBy(c => c.CreatedAt)
                .Select(c => new ChatHistoryDto
                {
                    Id = c.Id,
                    Role = c.Role,
                    Content = c.Content,
                    CreatedAt = c.CreatedAt
                })
                .ToListAsync();
        }

        public async Task<List<ChatHistoryDto>> GetChatHistoryAsync(long userId)
        {
            var history = await _db.ChatHistories
                .Where(c => c.UserId == userId)
                .OrderBy(c => c.CreatedAt)
                .Select(c => new ChatHistoryDto
                {
                    Id = c.Id,
                    Role = c.Role,
                    Content = c.Content,
                    CreatedAt = c.CreatedAt
                })
                .ToListAsync();

            // Loại bỏ markdown từ history cũ khi hiển thị
            foreach (var item in history)
            {
                if (item.Role == "assistant")
                    item.Content = RemoveMarkdownFormatting(item.Content);
            }

            return history;
        }

        public async Task<ChatHistoryPagedDto> GetChatHistoryPagedAsync(long userId, int pageNumber, int pageSize)
        {
            var query = _db.ChatHistories
                .Where(c => c.UserId == userId)
                .OrderByDescending(c => c.CreatedAt);

            var totalCount = await query.CountAsync();

            var items = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .OrderBy(c => c.CreatedAt)
                .Select(c => new ChatHistoryDto
                {
                    Id = c.Id,
                    Role = c.Role,
                    Content = c.Content,
                    CreatedAt = c.CreatedAt
                })
                .ToListAsync();

            // Loại bỏ markdown từ history cũ khi hiển thị
            foreach (var item in items)
            {
                if (item.Role == "assistant")
                    item.Content = RemoveMarkdownFormatting(item.Content);
            }

            return new ChatHistoryPagedDto
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize
            };
        }

        private async Task SaveChatMessageAsync(long userId, string content, string role)
        {
            var chatHistory = new ChatHistory
            {
                UserId = userId,
                Role = role,
                Content = content,
                CreatedAt = DateTime.UtcNow
            };

            _db.ChatHistories.Add(chatHistory);
            await _db.SaveChangesAsync();
        }

        public async Task ClearHistoryAsync(long userId)
        {
            var histories = await _db.ChatHistories
                .Where(c => c.UserId == userId)
                .ToListAsync();

            _db.ChatHistories.RemoveRange(histories);
            await _db.SaveChangesAsync();

            _logger.LogInformation("Cleared chat history for user {UserId}", userId);
        }

        public async Task<ChatStatisticsDto> GetStatisticsAsync(long userId)
        {
            var messages = await _db.ChatHistories
                .Where(c => c.UserId == userId)
                .ToListAsync();

            return new ChatStatisticsDto
            {
                TotalMessages = messages.Count,
                UserMessages = messages.Count(m => m.Role == "user"),
                BotMessages = messages.Count(m => m.Role == "assistant"),
                FirstMessageAt = messages.MinBy(m => m.CreatedAt)?.CreatedAt,
                LastMessageAt = messages.MaxBy(m => m.CreatedAt)?.CreatedAt
            };
        }

    }
}