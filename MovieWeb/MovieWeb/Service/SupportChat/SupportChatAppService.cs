using Microsoft.EntityFrameworkCore;
using MovieWeb.Entities;

namespace MovieWeb.Service.SupportChat
{
    public interface ISupportChatAppService
    {
        // Customer
        Task<ConversationDetailDto> CreateConversationAsync(long customerId, CreateConversationRequest request);
        Task<ConversationDetailDto?> GetOpenConversationForCustomerAsync(long customerId);
        Task<List<ConversationDto>> GetCustomerConversationsAsync(long customerId);

        // Admin
        Task<ConversationListDto> GetAllConversationsAsync(ConversationStatus? status, int pageNumber, int pageSize);
        Task<ConversationDetailDto?> AssignAdminToConversationAsync(long conversationId, long adminId);
        Task<ConversationDto?> CloseConversationAsync(long conversationId, long adminId);
        Task<int> GetUnreadCountForAdminAsync();

        // Common
        Task<ConversationDetailDto?> GetConversationAsync(long conversationId, long userId, bool isAdmin);
        Task<ConversationMessageDto?> SendMessageAsync(long conversationId, long senderId, string senderRole, string content);
        Task MarkMessagesAsReadAsync(long conversationId, long userId, bool isAdmin);
        Task<ConversationListDto> GetConversationMessagesPagedAsync(long conversationId, int pageNumber, int pageSize);
    }

    public class SupportChatAppService : ISupportChatAppService
    {
        private readonly MyDbContext _db;
        private readonly ILogger<SupportChatAppService> _logger;

        public SupportChatAppService(MyDbContext db, ILogger<SupportChatAppService> logger)
        {
            _db = db;
            _logger = logger;
        }

        // ==================== CUSTOMER ====================

        public async Task<ConversationDetailDto> CreateConversationAsync(long customerId, CreateConversationRequest request)
        {
            // Ki?m tra xem ?ã có conversation Open ch?a ? dùng l?i
            var existing = await _db.Conversations
                .Include(c => c.Customer)
                .Include(c => c.Messages.OrderBy(m => m.CreatedAt))
                    .ThenInclude(m => m.Sender)
                .Where(c => c.CustomerId == customerId && c.Status != ConversationStatus.Closed)
                .FirstOrDefaultAsync();

            if (existing != null)
            {
                // N?u ?ã có conversation ?ang m?, thêm tin nh?n vào ?ó
                var msg = new ConversationMessage
                {
                    ConversationId = existing.Id,
                    SenderId = customerId,
                    SenderRole = "User",
                    Content = request.Message,
                    CreatedAt = DateTime.UtcNow
                };
                _db.ConversationMessages.Add(msg);

                existing.LastMessagePreview = Truncate(request.Message, 500);
                existing.LastMessageAt = msg.CreatedAt;
                existing.UnreadByAdminCount++;

                await _db.SaveChangesAsync();

                return await GetConversationDetailDtoAsync(existing.Id);
            }

            // T?o conversation m?i
            var conversation = new Conversation
            {
                CustomerId = customerId,
                Subject = request.Subject,
                Status = ConversationStatus.Open,
                CreatedAt = DateTime.UtcNow,
                LastMessagePreview = Truncate(request.Message, 500),
                LastMessageAt = DateTime.UtcNow,
                UnreadByAdminCount = 1
            };
            _db.Conversations.Add(conversation);
            await _db.SaveChangesAsync();

            // Thêm tin nh?n ??u tiên
            var firstMessage = new ConversationMessage
            {
                ConversationId = conversation.Id,
                SenderId = customerId,
                SenderRole = "User",
                Content = request.Message,
                CreatedAt = DateTime.UtcNow
            };
            _db.ConversationMessages.Add(firstMessage);
            await _db.SaveChangesAsync();

            _logger.LogInformation("Customer {CustomerId} created conversation {ConversationId}", customerId, conversation.Id);

            return await GetConversationDetailDtoAsync(conversation.Id);
        }

        public async Task<ConversationDetailDto?> GetOpenConversationForCustomerAsync(long customerId)
        {
            var conversation = await _db.Conversations
                .Where(c => c.CustomerId == customerId && c.Status != ConversationStatus.Closed)
                .OrderByDescending(c => c.LastMessageAt)
                .Select(c => c.Id)
                .FirstOrDefaultAsync();

            if (conversation == 0)
                return null;

            return await GetConversationDetailDtoAsync(conversation);
        }

        public async Task<List<ConversationDto>> GetCustomerConversationsAsync(long customerId)
        {
            return await _db.Conversations
                .Include(c => c.Customer)
                .Include(c => c.AssignedAdmin)
                .Where(c => c.CustomerId == customerId)
                .OrderByDescending(c => c.LastMessageAt ?? c.CreatedAt)
                .Select(c => MapToDto(c))
                .ToListAsync();
        }

        // ==================== ADMIN ====================

        public async Task<ConversationListDto> GetAllConversationsAsync(ConversationStatus? status, int pageNumber, int pageSize)
        {
            var query = _db.Conversations
                .Include(c => c.Customer)
                .Include(c => c.AssignedAdmin)
                .AsQueryable();

            if (status.HasValue)
                query = query.Where(c => c.Status == status.Value);

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(c => c.Status == ConversationStatus.Open ? 0 : 1) // Open lên ??u
                .ThenByDescending(c => c.LastMessageAt ?? c.CreatedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .Select(c => MapToDto(c))
                .ToListAsync();

            return new ConversationListDto
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize
            };
        }

        public async Task<ConversationDetailDto?> AssignAdminToConversationAsync(long conversationId, long adminId)
        {
            var conversation = await _db.Conversations.FindAsync(conversationId);
            if (conversation == null) return null;

            conversation.AssignedAdminId = adminId;
            if (conversation.Status == ConversationStatus.Open)
                conversation.Status = ConversationStatus.Active;

            await _db.SaveChangesAsync();

            _logger.LogInformation("Admin {AdminId} assigned to conversation {ConversationId}", adminId, conversationId);

            return await GetConversationDetailDtoAsync(conversationId);
        }

        public async Task<ConversationDto?> CloseConversationAsync(long conversationId, long adminId)
        {
            var conversation = await _db.Conversations
                .Include(c => c.Customer)
                .Include(c => c.AssignedAdmin)
                .FirstOrDefaultAsync(c => c.Id == conversationId);

            if (conversation == null) return null;

            conversation.Status = ConversationStatus.Closed;
            conversation.ClosedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            _logger.LogInformation("Admin {AdminId} closed conversation {ConversationId}", adminId, conversationId);

            return MapToDto(conversation);
        }

        public async Task<int> GetUnreadCountForAdminAsync()
        {
            return await _db.Conversations
                .Where(c => c.Status != ConversationStatus.Closed && c.UnreadByAdminCount > 0)
                .SumAsync(c => c.UnreadByAdminCount);
        }

        // ==================== COMMON ====================

        public async Task<ConversationDetailDto?> GetConversationAsync(long conversationId, long userId, bool isAdmin)
        {
            var conversation = await _db.Conversations
                .Where(c => c.Id == conversationId)
                .FirstOrDefaultAsync();

            if (conversation == null) return null;

            // Ki?m tra quy?n truy c?p
            if (!isAdmin && conversation.CustomerId != userId)
                return null;

            return await GetConversationDetailDtoAsync(conversationId);
        }

        public async Task<ConversationMessageDto?> SendMessageAsync(long conversationId, long senderId, string senderRole, string content)
        {
            var conversation = await _db.Conversations.FindAsync(conversationId);
            if (conversation == null) return null;

            // Ki?m tra conversation ch?a ?óng
            if (conversation.Status == ConversationStatus.Closed)
                return null;

            var message = new ConversationMessage
            {
                ConversationId = conversationId,
                SenderId = senderId,
                SenderRole = senderRole,
                Content = content,
                CreatedAt = DateTime.UtcNow
            };
            _db.ConversationMessages.Add(message);

            // Update conversation metadata
            conversation.LastMessagePreview = Truncate(content, 500);
            conversation.LastMessageAt = message.CreatedAt;

            if (senderRole == "User")
                conversation.UnreadByAdminCount++;
            else
                conversation.UnreadByCustomerCount++;

            await _db.SaveChangesAsync();

            // Load sender info
            var sender = await _db.Users.FindAsync(senderId);

            return new ConversationMessageDto
            {
                Id = message.Id,
                ConversationId = message.ConversationId,
                SenderId = message.SenderId,
                SenderName = sender?.FullName ?? sender?.UserName ?? "Unknown",
                SenderRole = message.SenderRole,
                Content = message.Content,
                IsRead = message.IsRead,
                CreatedAt = message.CreatedAt
            };
        }

        public async Task MarkMessagesAsReadAsync(long conversationId, long userId, bool isAdmin)
        {
            var conversation = await _db.Conversations.FindAsync(conversationId);
            if (conversation == null) return;

            if (isAdmin)
            {
                // Admin ??c ? mark tin nh?n c?a User là ?ã ??c
                var unreadMessages = await _db.ConversationMessages
                    .Where(m => m.ConversationId == conversationId
                                && m.SenderRole == "User"
                                && !m.IsRead)
                    .ToListAsync();

                foreach (var msg in unreadMessages)
                    msg.IsRead = true;

                conversation.UnreadByAdminCount = 0;
            }
            else
            {
                // User ??c ? mark tin nh?n c?a Admin là ?ã ??c
                var unreadMessages = await _db.ConversationMessages
                    .Where(m => m.ConversationId == conversationId
                                && m.SenderRole == "Admin"
                                && !m.IsRead)
                    .ToListAsync();

                foreach (var msg in unreadMessages)
                    msg.IsRead = true;

                conversation.UnreadByCustomerCount = 0;
            }

            await _db.SaveChangesAsync();
        }

        public async Task<ConversationListDto> GetConversationMessagesPagedAsync(long conversationId, int pageNumber, int pageSize)
        {
            var query = _db.ConversationMessages
                .Where(m => m.ConversationId == conversationId)
                .OrderByDescending(m => m.CreatedAt);

            var totalCount = await query.CountAsync();

            // We return them in chronological order after paging
            var items = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .OrderBy(m => m.CreatedAt)
                .Include(m => m.Sender)
                .Select(m => new ConversationMessageDto
                {
                    Id = m.Id,
                    ConversationId = m.ConversationId,
                    SenderId = m.SenderId,
                    SenderName = m.Sender.FullName ?? m.Sender.UserName ?? "Unknown",
                    SenderRole = m.SenderRole,
                    Content = m.Content,
                    IsRead = m.IsRead,
                    CreatedAt = m.CreatedAt
                })
                .ToListAsync();

            // Reusing ConversationListDto structure for paging info
            return new ConversationListDto
            {
                Items = new List<ConversationDto>(), // Not used here
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize
            };
        }

        // ==================== HELPERS ====================

        private async Task<ConversationDetailDto> GetConversationDetailDtoAsync(long conversationId)
        {
            var conversation = await _db.Conversations
                .Include(c => c.Customer)
                .Include(c => c.AssignedAdmin)
                .Include(c => c.Messages.OrderBy(m => m.CreatedAt))
                    .ThenInclude(m => m.Sender)
                .FirstOrDefaultAsync(c => c.Id == conversationId);

            if (conversation == null)
                throw new InvalidOperationException($"Conversation {conversationId} not found");

            return new ConversationDetailDto
            {
                Id = conversation.Id,
                CustomerId = conversation.CustomerId,
                CustomerName = conversation.Customer.FullName ?? conversation.Customer.UserName ?? "Unknown",
                CustomerEmail = conversation.Customer.Email,
                AssignedAdminId = conversation.AssignedAdminId,
                AssignedAdminName = conversation.AssignedAdmin?.FullName ?? conversation.AssignedAdmin?.UserName,
                Subject = conversation.Subject,
                Status = conversation.Status.ToString(),
                LastMessagePreview = conversation.LastMessagePreview,
                LastMessageAt = conversation.LastMessageAt,
                UnreadByAdminCount = conversation.UnreadByAdminCount,
                UnreadByCustomerCount = conversation.UnreadByCustomerCount,
                CreatedAt = conversation.CreatedAt,
                ClosedAt = conversation.ClosedAt,
                Messages = conversation.Messages.Select(m => new ConversationMessageDto
                {
                    Id = m.Id,
                    ConversationId = m.ConversationId,
                    SenderId = m.SenderId,
                    SenderName = m.Sender.FullName ?? m.Sender.UserName ?? "Unknown",
                    SenderRole = m.SenderRole,
                    Content = m.Content,
                    IsRead = m.IsRead,
                    CreatedAt = m.CreatedAt
                }).ToList()
            };
        }

        private static ConversationDto MapToDto(Conversation c)
        {
            return new ConversationDto
            {
                Id = c.Id,
                CustomerId = c.CustomerId,
                CustomerName = c.Customer.FullName ?? c.Customer.UserName ?? "Unknown",
                CustomerEmail = c.Customer.Email,
                AssignedAdminId = c.AssignedAdminId,
                AssignedAdminName = c.AssignedAdmin?.FullName ?? c.AssignedAdmin?.UserName,
                Subject = c.Subject,
                Status = c.Status.ToString(),
                LastMessagePreview = c.LastMessagePreview,
                LastMessageAt = c.LastMessageAt,
                UnreadByAdminCount = c.UnreadByAdminCount,
                UnreadByCustomerCount = c.UnreadByCustomerCount,
                CreatedAt = c.CreatedAt,
                ClosedAt = c.ClosedAt
            };
        }

        private static string Truncate(string value, int maxLength)
        {
            if (string.IsNullOrEmpty(value)) return value;
            return value.Length <= maxLength ? value : value[..maxLength];
        }
    }
}
