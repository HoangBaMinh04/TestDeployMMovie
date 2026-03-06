import { http } from "../api/http";

const ROOT = "/chat";

export async function sendChatMessage(message, config = {}) {
  const payload = { message };
  const { data } = await http.post(`${ROOT}/message`, payload, config);
  return data;
}

export async function getChatHistory(config = {}) {
  const { data } = await http.get(`${ROOT}/history`, config);
  return data;
}

export async function getChatHistoryPaged(params = {}, config = {}) {
  const { data } = await http.get(`${ROOT}/history/paged`, {
    ...(config || {}),
    params,
  });
  return data;
}

export async function clearChatHistory(config = {}) {
  const { data } = await http.delete(`${ROOT}/history`, config);
  return data;
}

export async function getChatStatistics(config = {}) {
  const { data } = await http.get(`${ROOT}/statistics`, config);
  return data;
}

export function normalizeChatEntry(entry, index = 0) {
  if (!entry) {
    return null;
  }

  const roleValue =
    entry.role || entry.sender || entry.author || entry.type || entry.source;
  const role =
    typeof roleValue === "string" ? roleValue.toLowerCase() : "assistant";

  const content =
    entry.message ||
    entry.content ||
    entry.text ||
    entry.reply ||
    entry.response ||
    "";

  if (!content) {
    return null;
  }

  const timestamp =
    entry.timestamp ||
    entry.createdAt ||
    entry.updatedAt ||
    entry.time ||
    entry.date ||
    null;

  return {
    id:
      entry.id ||
      entry.messageId ||
      entry.chatMessageId ||
      entry.chatId ||
      `message-${Date.now()}-${index}`,
    role: role.includes("user")
      ? "user"
      : role.includes("system")
      ? "system"
      : "assistant",
    content,
    timestamp,
  };
}

export function extractChatList(payload) {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.messages)) {
    return payload.messages;
  }

  if (Array.isArray(payload?.history)) {
    return payload.history;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}
