import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clearChatHistory,
  extractChatList,
  getChatHistory,
  getChatStatistics,
  normalizeChatEntry,
  sendChatMessage,
} from "../services/chatService";

export function useChatbot({ enabled = false } = {}) {
  const [messages, setMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [statistics, setStatistics] = useState(null);

  const historyAbortRef = useRef(null);
  const sendAbortRef = useRef(null);
  const statsAbortRef = useRef(null);

  const reset = useCallback(() => {
    historyAbortRef.current?.abort?.();
    sendAbortRef.current?.abort?.();
    statsAbortRef.current?.abort?.();
    historyAbortRef.current = null;
    sendAbortRef.current = null;
    statsAbortRef.current = null;
    setMessages([]);
    setLoadingHistory(false);
    setSending(false);
    setError("");
    setStatistics(null);
  }, []);

  const fetchHistory = useCallback(async () => {
    if (!enabled) {
      return;
    }

    historyAbortRef.current?.abort?.();
    const controller = new AbortController();
    historyAbortRef.current = controller;

    setLoadingHistory(true);
    setError("");

    try {
      const data = await getChatHistory({ signal: controller.signal });
      if (controller.signal.aborted) return;

      const raw = extractChatList(data);
      const normalized = raw
        .map((entry, index) => normalizeChatEntry(entry, index))
        .filter(Boolean);
      setMessages(normalized);
    } catch (err) {
      if (controller.signal.aborted) return;
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Không tải được lịch sử trò chuyện.";
      setError(message);
      setMessages([]);
    } finally {
      if (!controller.signal.aborted) {
        setLoadingHistory(false);
      }
      historyAbortRef.current = null;
    }
  }, [enabled]);

  const fetchStatistics = useCallback(async () => {
    if (!enabled) {
      return;
    }

    statsAbortRef.current?.abort?.();
    const controller = new AbortController();
    statsAbortRef.current = controller;

    try {
      const data = await getChatStatistics({ signal: controller.signal });
      if (controller.signal.aborted) return;
      setStatistics(data || null);
    } catch (err) {
      if (controller.signal.aborted) return;
      // Không chặn UI nếu thống kê lỗi, chỉ log console
      console.warn("Không lấy được thống kê chatbot", err);
    } finally {
      statsAbortRef.current = null;
    }
  }, [enabled]);

  const appendMessage = useCallback((message) => {
    if (!message) return;
    setMessages((prev) => [...prev, message]);
  }, []);

  const send = useCallback(
    async (content) => {
      if (!enabled) {
        return { success: false, error: "Chatbot chưa sẵn sàng." };
      }

      const trimmed = content?.trim();
      if (!trimmed) {
        return {
          success: false,
          error: "Vui lòng nhập nội dung trước khi gửi.",
        };
      }

      sendAbortRef.current?.abort?.();
      const controller = new AbortController();
      sendAbortRef.current = controller;

      const optimisticMessage = normalizeChatEntry(
        {
          id: `local-${Date.now()}`,
          role: "user",
          message: trimmed,
          timestamp: new Date().toISOString(),
        },
        Date.now()
      );

      appendMessage(optimisticMessage);
      setSending(true);
      setError("");

      try {
        const data = await sendChatMessage(trimmed, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) {
          return { success: false, aborted: true };
        }

        const assistantEntry = normalizeChatEntry(data, Date.now());
        if (assistantEntry) {
          appendMessage(assistantEntry);
        }

        fetchStatistics();

        return { success: true, data };
      } catch (err) {
        if (controller.signal.aborted) {
          return { success: false, aborted: true };
        }

        const message =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Không gửi được tin nhắn. Vui lòng thử lại.";

        setError(message);
        appendMessage(
          normalizeChatEntry(
            {
              id: `error-${Date.now()}`,
              role: "system",
              message,
              timestamp: new Date().toISOString(),
            },
            Date.now()
          )
        );

        return { success: false, error: message };
      } finally {
        if (!controller.signal.aborted) {
          setSending(false);
        }
        sendAbortRef.current = null;
      }
    },
    [appendMessage, enabled, fetchStatistics]
  );

  const clearHistoryHandler = useCallback(async () => {
    if (!enabled) {
      return { success: false };
    }

    try {
      await clearChatHistory();
      setMessages([]);
      setError("");
      await fetchStatistics();
      return { success: true };
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Không thể xóa lịch sử chat.";
      setError(message);
      return { success: false, error: message };
    }
  }, [enabled, fetchStatistics]);

  useEffect(() => {
    if (!enabled) {
      reset();
      return () => undefined;
    }

    fetchHistory();
    fetchStatistics();

    return () => {
      historyAbortRef.current?.abort?.();
      sendAbortRef.current?.abort?.();
      statsAbortRef.current?.abort?.();
    };
  }, [enabled, fetchHistory, fetchStatistics, reset]);

  const hasMessages = useMemo(() => messages.length > 0, [messages]);

  return {
    messages,
    hasMessages,
    loadingHistory,
    sending,
    error,
    statistics,
    sendMessage: send,
    refreshHistory: fetchHistory,
    clearHistory: clearHistoryHandler,
  };
}

export default useChatbot;
