import { useCallback, useEffect, useRef, useState } from "react";
import useSupportChat from "../../hooks/useSupportChat";
import {
  createConversation,
  getOpenConversation,
  sendMessageREST,
  markAsRead as markAsReadREST,
} from "../../services/supportChatService";
import "../../css/SupportChatWidget.css";

/**
 * Widget chat hỗ trợ cho khách hàng.
 * Hiển thị dưới dạng nút nổi (floating) + cửa sổ chat.
 */
export default function SupportChatWidget({ isLoggedIn }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [conversationStatus, setConversationStatus] = useState(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const listRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimerRef = useRef(null);
  const conversationIdRef = useRef(null);

  // Keep ref in sync
  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  // ========== SignalR callbacks ==========

  const handleReceiveMessage = useCallback(
    (event) => {
      if (event?.conversationId !== conversationIdRef.current) return;

      const msg = event?.message;
      if (!msg) return;

      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });

      // Nếu widget đang mở → đánh dấu đọc
      if (!open) {
        setUnreadCount((c) => c + 1);
      }
    },
    [open],
  );

  const handleConversationAssigned = useCallback((event) => {
    if (event?.conversationId === conversationIdRef.current) {
      setConversationStatus("Active");
    }
  }, []);

  const handleConversationClosed = useCallback((event) => {
    if (event?.conversationId === conversationIdRef.current) {
      setConversationStatus("Closed");
    }
  }, []);

  const handleUserTyping = useCallback((event) => {
    if (event?.conversationId !== conversationIdRef.current) return;
    if (event.isTyping) {
      setTypingUser(event.userName || "Admin");
      // Auto clear sau 3s
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => setTypingUser(null), 3000);
    } else {
      setTypingUser(null);
    }
  }, []);

  const handleMessagesRead = useCallback((event) => {
    if (event?.conversationId !== conversationIdRef.current) return;
    if (event.readByRole === "Admin") {
      setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })));
    }
  }, []);

  // ========== SignalR hook ==========

  const {
    connected,
    joinConversation,
    leaveConversation,
    sendMessage: sendViaHub,
    sendTyping,
    markAsRead: markReadHub,
  } = useSupportChat({
    enabled: isLoggedIn && open,
    onReceiveMessage: handleReceiveMessage,
    onConversationAssigned: handleConversationAssigned,
    onConversationClosed: handleConversationClosed,
    onUserTyping: handleUserTyping,
    onMessagesRead: handleMessagesRead,
  });

  // ========== Load open conversation khi mở widget ==========

  useEffect(() => {
    if (!open || !isLoggedIn) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await getOpenConversation();
        if (cancelled) return;
        if (data) {
          setConversationId(data.id);
          setConversationStatus(data.status);
          setMessages(data.messages || []);
        }
      } catch (err) {
        // 404 = no open conversation → OK, sẽ tạo khi gửi tin nhắn đầu
        if (err?.response?.status !== 404) {
          console.error("Failed to load open conversation", err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [open, isLoggedIn]);

  // ========== Join / leave conversation room khi có conversationId ==========

  useEffect(() => {
    if (!connected || !conversationId) return;

    joinConversation(conversationId);
    markReadHub(conversationId).catch(() => {});

    return () => {
      leaveConversation(conversationId).catch(() => {});
    };
  }, [
    connected,
    conversationId,
    joinConversation,
    leaveConversation,
    markReadHub,
  ]);

  // ========== Auto scroll & focus ==========

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typingUser]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
      setUnreadCount(0);
      // Đánh dấu đọc khi mở
      if (conversationId) {
        markAsReadREST(conversationId).catch(() => {});
      }
    }
  }, [open, conversationId]);

  // ========== Gửi tin nhắn ==========

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    setDraft("");

    try {
      // Nếu chưa có conversation → tạo mới
      if (!conversationId) {
        const result = await createConversation({
          subject: "Hỗ trợ khách hàng",
          message: text,
        });
        setConversationId(result.id);
        setConversationStatus(result.status);
        setMessages(result.messages || []);
        return;
      }

      // Gửi qua SignalR nếu kết nối, fallback sang REST
      const sentViaHub = connected
        ? await sendViaHub(conversationId, text)
        : false;

      if (!sentViaHub) {
        const msg = await sendMessageREST(conversationId, text);
        if (msg) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      }
    } catch (err) {
      console.error("Failed to send message", err);
      setDraft(text); // restore draft
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // ========== Typing indicator ==========

  const handleInputChange = (e) => {
    setDraft(e.target.value);
    if (connected && conversationId) {
      sendTyping(conversationId, true).catch(() => {});
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        sendTyping(conversationId, false).catch(() => {});
      }, 2000);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ========== Render ==========

  const isClosed = conversationStatus === "Closed";

  return (
    <div className="support-chat">
      {/* Floating button */}
      <button
        className="support-chat__fab"
        onClick={() => setOpen((v) => !v)}
        title="Chat hỗ trợ"
      >
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
          </svg>
        )}
        {!open && unreadCount > 0 && (
          <span className="support-chat__badge">{unreadCount}</span>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className="support-chat__window">
          <div className="support-chat__header">
            <div className="support-chat__header-info">
              <span className="support-chat__header-title">
                Hỗ trợ trực tuyến
              </span>
              <span
                className={`support-chat__status support-chat__status--${
                  connected ? "online" : "offline"
                }`}
              >
                {connected ? "Đang kết nối" : "Đang kết nối lại..."}
              </span>
            </div>
            <button
              className="support-chat__close"
              onClick={() => setOpen(false)}
              title="Đóng"
            >
              ✕
            </button>
          </div>

          <div className="support-chat__messages" ref={listRef}>
            {loading && (
              <div className="support-chat__loading">Đang tải tin nhắn...</div>
            )}

            {!loading && messages.length === 0 && (
              <div className="support-chat__empty">
                Xin chào! Hãy gửi tin nhắn để bắt đầu cuộc trò chuyện với bộ
                phận hỗ trợ.
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`support-chat__msg support-chat__msg--${
                  msg.senderRole === "User" ? "user" : "admin"
                }`}
              >
                <div className="support-chat__msg-bubble">
                  <div className="support-chat__msg-content">{msg.content}</div>
                  <div className="support-chat__msg-meta">
                    <span className="support-chat__msg-time">
                      {formatTime(msg.createdAt)}
                    </span>
                    {msg.senderRole === "User" && msg.isRead && (
                      <span className="support-chat__msg-read">✓✓</span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {typingUser && (
              <div className="support-chat__typing">
                <span className="support-chat__typing-dot" />
                <span className="support-chat__typing-dot" />
                <span className="support-chat__typing-dot" />
                <span className="support-chat__typing-label">
                  {typingUser} đang nhập...
                </span>
              </div>
            )}
          </div>

          {isClosed && (
            <div className="support-chat__closed-banner">
              Cuộc hội thoại đã kết thúc. Gửi tin nhắn mới để tạo cuộc trò
              chuyện mới.
            </div>
          )}

          <div className="support-chat__input-area">
            <textarea
              ref={inputRef}
              className="support-chat__input"
              placeholder={
                isClosed
                  ? "Gửi tin nhắn để tạo cuộc trò chuyện mới..."
                  : "Nhập tin nhắn..."
              }
              value={draft}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={sending}
            />
            <button
              className="support-chat__send"
              onClick={() => {
                if (isClosed) {
                  // Reset → tạo conversation mới
                  setConversationId(null);
                  setConversationStatus(null);
                  setMessages([]);
                }
                handleSend();
              }}
              disabled={!draft.trim() || sending}
              title="Gửi"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== Helpers ==========

function formatTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
