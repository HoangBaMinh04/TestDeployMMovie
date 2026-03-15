import { http } from "../api/http";

const ROOT = "/SupportChat";

// ==================== CUSTOMER APIs ====================

/** Tạo hoặc tiếp tục cuộc hội thoại */
export async function createConversation(data, config = {}) {
  const { data: result } = await http.post(
    `${ROOT}/conversations`,
    data,
    config,
  );
  return result;
}

/** Lấy cuộc hội thoại đang mở của customer */
export async function getOpenConversation(config = {}) {
  const { data: result } = await http.get(`${ROOT}/conversations/open`, config);
  return result;
}

/** Lấy danh sách tất cả cuộc hội thoại của customer */
export async function getMyConversations(config = {}) {
  const { data: result } = await http.get(`${ROOT}/conversations/my`, config);
  return result;
}

// ==================== ADMIN APIs ====================

/** Lấy danh sách tất cả cuộc hội thoại (phân trang, filter) */
export async function getAllConversations(params = {}, config = {}) {
  const { data: result } = await http.get(`${ROOT}/admin/conversations`, {
    ...config,
    params,
  });
  return result;
}

/** Admin nhận xử lý cuộc hội thoại */
export async function assignConversation(conversationId, config = {}) {
  const { data: result } = await http.post(
    `${ROOT}/admin/conversations/${conversationId}/assign`,
    null,
    config,
  );
  return result;
}

/** Admin đóng cuộc hội thoại */
export async function closeConversation(conversationId, config = {}) {
  const { data: result } = await http.post(
    `${ROOT}/admin/conversations/${conversationId}/close`,
    null,
    config,
  );
  return result;
}

/** Tổng số tin nhắn chưa đọc (admin) */
export async function getAdminUnreadCount(config = {}) {
  const { data: result } = await http.get(`${ROOT}/admin/unread-count`, config);
  return result;
}

// ==================== COMMON APIs ====================

/** Lấy chi tiết cuộc hội thoại */
export async function getConversation(conversationId, config = {}) {
  const { data: result } = await http.get(
    `${ROOT}/conversations/${conversationId}`,
    config,
  );
  return result;
}

/** Gửi tin nhắn qua REST (fallback khi SignalR không khả dụng) */
export async function sendMessageREST(conversationId, message, config = {}) {
  const { data: result } = await http.post(
    `${ROOT}/conversations/${conversationId}/messages`,
    { message },
    config,
  );
  return result;
}

/** Đánh dấu đã đọc */
export async function markAsRead(conversationId, config = {}) {
  await http.post(`${ROOT}/conversations/${conversationId}/read`, null, config);
}
