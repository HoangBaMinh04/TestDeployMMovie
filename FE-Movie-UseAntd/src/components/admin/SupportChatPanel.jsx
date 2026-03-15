import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Empty,
  Input,
  List,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
  message as antMsg,
} from "antd";
import {
  MessageOutlined,
  SendOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import useSupportChat from "../../hooks/useSupportChat";
import {
  getAllConversations,
  getConversation,
  assignConversation,
  closeConversation,
  sendMessageREST,
  markAsRead as markAsReadREST,
  getAdminUnreadCount,
} from "../../services/supportChatService";
import "../../css/adminCss/SupportChatPanel.css";

const { Text, Title } = Typography;
const { TextArea } = Input;

const STATUS_OPTIONS = [
  { label: "Tất cả", value: "" },
  { label: "Đang mở", value: "0" },
  { label: "Đang xử lý", value: "1" },
  { label: "Đã đóng", value: "2" },
];

const STATUS_MAP = {
  Open: { color: "orange", label: "Đang mở" },
  Active: { color: "blue", label: "Đang xử lý" },
  Closed: { color: "default", label: "Đã đóng" },
};

export default function SupportChatPanel() {
  // ---------- State ----------
  const [conversations, setConversations] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState("");
  const [loadingList, setLoadingList] = useState(false);

  const [activeConv, setActiveConv] = useState(null); // ConversationDetailDto
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const [typingUser, setTypingUser] = useState(null);
  const [totalUnread, setTotalUnread] = useState(0);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimerRef = useRef(null);
  const activeConvIdRef = useRef(null);

  useEffect(() => {
    activeConvIdRef.current = activeConv?.id ?? null;
  }, [activeConv]);

  // ---------- SignalR callbacks ----------

  const handleReceiveMessage = useCallback((event) => {
    const msg = event?.message;
    if (!msg) return;

    // Cập nhật conversation list
    setConversations((prev) =>
      prev.map((c) =>
        c.id === event.conversationId
          ? {
              ...c,
              lastMessagePreview: msg.content?.slice(0, 100),
              lastMessageAt: msg.createdAt,
              unreadByAdminCount:
                msg.senderRole === "User"
                  ? c.unreadByAdminCount + 1
                  : c.unreadByAdminCount,
            }
          : c,
      ),
    );

    // Cập nhật detail nếu đang xem
    if (event.conversationId === activeConvIdRef.current) {
      setActiveConv((prev) => {
        if (!prev) return prev;
        const already = prev.messages?.some((m) => m.id === msg.id);
        if (already) return prev;
        return { ...prev, messages: [...(prev.messages || []), msg] };
      });
    }
  }, []);

  const handleNewConversation = useCallback((event) => {
    const conv = event?.conversation;
    if (conv) {
      setConversations((prev) => [conv, ...prev]);
      setTotalCount((c) => c + 1);
      setTotalUnread((c) => c + 1);
    }
  }, []);

  const handleConversationAssigned = useCallback((event) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === event.conversationId
          ? {
              ...c,
              status: "Active",
              assignedAdminId: event.adminId,
              assignedAdminName: event.adminName,
            }
          : c,
      ),
    );
    if (event.conversationId === activeConvIdRef.current) {
      setActiveConv((prev) =>
        prev
          ? {
              ...prev,
              status: "Active",
              assignedAdminId: event.adminId,
              assignedAdminName: event.adminName,
            }
          : prev,
      );
    }
  }, []);

  const handleConversationClosed = useCallback((event) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === event.conversationId
          ? { ...c, status: "Closed", closedAt: event.closedAt }
          : c,
      ),
    );
    if (event.conversationId === activeConvIdRef.current) {
      setActiveConv((prev) =>
        prev ? { ...prev, status: "Closed", closedAt: event.closedAt } : prev,
      );
    }
  }, []);

  const handleUserTyping = useCallback((event) => {
    if (event?.conversationId !== activeConvIdRef.current) return;
    if (event.isTyping) {
      setTypingUser(event.userName || "Khách hàng");
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => setTypingUser(null), 3000);
    } else {
      setTypingUser(null);
    }
  }, []);

  const handleMessagesRead = useCallback((event) => {
    if (event?.conversationId !== activeConvIdRef.current) return;
    if (event.readByRole === "User") {
      setActiveConv((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages?.map((m) => ({ ...m, isRead: true })),
        };
      });
    }
  }, []);

  // ---------- SignalR hook ----------

  const {
    connected,
    joinConversation,
    leaveConversation,
    sendMessage: sendViaHub,
    sendTyping,
    markAsRead: markReadHub,
  } = useSupportChat({
    enabled: true,
    onReceiveMessage: handleReceiveMessage,
    onNewConversation: handleNewConversation,
    onConversationAssigned: handleConversationAssigned,
    onConversationClosed: handleConversationClosed,
    onUserTyping: handleUserTyping,
    onMessagesRead: handleMessagesRead,
  });

  // ---------- Load conversations ----------

  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = { pageNumber: page, pageSize };
      if (statusFilter) params.status = statusFilter;
      const result = await getAllConversations(params);
      setConversations(result.items || []);
      setTotalCount(result.totalCount || 0);
    } catch (err) {
      console.error("Failed to load conversations", err);
      antMsg.error("Không thể tải danh sách hội thoại");
    } finally {
      setLoadingList(false);
    }
  }, [page, pageSize, statusFilter]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load unread count
  useEffect(() => {
    getAdminUnreadCount()
      .then((r) => setTotalUnread(r?.unreadCount ?? 0))
      .catch(() => {});
  }, []);

  // ---------- Select conversation ----------

  const handleSelectConversation = useCallback(
    async (convId) => {
      if (activeConv?.id === convId) return;

      // Leave previous
      if (activeConv?.id) {
        leaveConversation(activeConv.id).catch(() => {});
      }

      setLoadingDetail(true);
      setDraft("");
      setTypingUser(null);

      try {
        const detail = await getConversation(convId);
        setActiveConv(detail);

        // Mark as read
        await markAsReadREST(convId).catch(() => {});
        markReadHub(convId).catch(() => {});
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId ? { ...c, unreadByAdminCount: 0 } : c,
          ),
        );

        // Join room
        if (connected) {
          joinConversation(convId).catch(() => {});
        }
      } catch (err) {
        console.error("Failed to load conversation", err);
        antMsg.error("Không thể tải cuộc hội thoại");
      } finally {
        setLoadingDetail(false);
      }
    },
    [
      activeConv?.id,
      connected,
      joinConversation,
      leaveConversation,
      markReadHub,
    ],
  );

  // Join room when connected changes
  useEffect(() => {
    if (connected && activeConv?.id) {
      joinConversation(activeConv.id).catch(() => {});
    }
  }, [connected, activeConv?.id, joinConversation]);

  // ---------- Auto scroll ----------

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages, typingUser]);

  // ---------- Send message ----------

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending || !activeConv?.id) return;
    if (activeConv.status === "Closed") {
      antMsg.warning("Cuộc hội thoại đã đóng, không thể gửi tin nhắn");
      return;
    }

    setSending(true);
    setDraft("");

    try {
      const sent = connected ? await sendViaHub(activeConv.id, text) : false;

      if (!sent) {
        const msg = await sendMessageREST(activeConv.id, text);
        if (msg) {
          setActiveConv((prev) => {
            if (!prev) return prev;
            const exists = prev.messages?.some((m) => m.id === msg.id);
            if (exists) return prev;
            return { ...prev, messages: [...(prev.messages || []), msg] };
          });
        }
      }
    } catch (err) {
      console.error("Failed to send message", err);
      antMsg.error("Gửi tin nhắn thất bại");
      setDraft(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // ---------- Assign / Close ----------

  const handleAssign = async () => {
    if (!activeConv?.id) return;
    try {
      const result = await assignConversation(activeConv.id);
      setActiveConv(result);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConv.id
            ? {
                ...c,
                status: result.status,
                assignedAdminId: result.assignedAdminId,
                assignedAdminName: result.assignedAdminName,
              }
            : c,
        ),
      );
      antMsg.success("Đã nhận xử lý cuộc hội thoại");
    } catch (err) {
      console.error("Failed to assign conversation", err);
      antMsg.error("Không thể nhận xử lý");
    }
  };

  const handleClose = () => {
    if (!activeConv?.id) return;
    Modal.confirm({
      title: "Đóng cuộc hội thoại?",
      content: "Cuộc hội thoại sẽ được đánh dấu là đã giải quyết.",
      okText: "Đóng",
      cancelText: "Huỷ",
      onOk: async () => {
        try {
          const result = await closeConversation(activeConv.id);
          setActiveConv((prev) =>
            prev
              ? { ...prev, status: "Closed", closedAt: result.closedAt }
              : prev,
          );
          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeConv.id
                ? { ...c, status: "Closed", closedAt: result.closedAt }
                : c,
            ),
          );
          antMsg.success("Đã đóng cuộc hội thoại");
        } catch (err) {
          console.error("Failed to close conversation", err);
          antMsg.error("Không thể đóng cuộc hội thoại");
        }
      },
    });
  };

  // ---------- Typing ----------

  const handleInputChange = (e) => {
    setDraft(e.target.value);
    if (connected && activeConv?.id) {
      sendTyping(activeConv.id, true).catch(() => {});
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        sendTyping(activeConv.id, false).catch(() => {});
      }, 2000);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ---------- Render helpers ----------

  const statusTag = (status) => {
    const info = STATUS_MAP[status] || { color: "default", label: status };
    return <Tag color={info.color}>{info.label}</Tag>;
  };

  const isClosed = activeConv?.status === "Closed";

  return (
    <div className="scp">
      {/* ===== Left: Conversation List ===== */}
      <div className="scp__sidebar">
        <div className="scp__sidebar-header">
          <Space>
            <Title level={5} style={{ margin: 0 }}>
              Hội thoại
            </Title>
            <Badge count={totalUnread} size="small" />
          </Space>
          <Space size="small">
            <Select
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
              options={STATUS_OPTIONS}
              size="small"
              style={{ width: 120 }}
            />
            <Tooltip title="Làm mới">
              <Button
                icon={<ReloadOutlined />}
                size="small"
                onClick={loadConversations}
                loading={loadingList}
              />
            </Tooltip>
          </Space>
        </div>

        <div className="scp__conv-list">
          {loadingList && !conversations.length ? (
            <div className="scp__center">
              <Spin />
            </div>
          ) : conversations.length === 0 ? (
            <Empty description="Không có cuộc hội thoại" />
          ) : (
            <List
              pagination={{
                current: page,
                pageSize,
                total: totalCount,
                onChange: setPage,
                size: "small",
              }}
              dataSource={conversations}
              renderItem={(conv) => (
                <List.Item
                  className={`scp__conv-item ${
                    activeConv?.id === conv.id ? "scp__conv-item--active" : ""
                  }`}
                  onClick={() => handleSelectConversation(conv.id)}
                >
                  <div className="scp__conv-item-content">
                    <div className="scp__conv-item-top">
                      <Text strong ellipsis style={{ maxWidth: 140 }}>
                        {conv.customerName || "Khách hàng"}
                      </Text>
                      {statusTag(conv.status)}
                    </div>
                    {conv.subject && (
                      <Text type="secondary" ellipsis style={{ fontSize: 12 }}>
                        {conv.subject}
                      </Text>
                    )}
                    <Text
                      type="secondary"
                      ellipsis
                      style={{ fontSize: 12, marginTop: 2 }}
                    >
                      {conv.lastMessagePreview || "Chưa có tin nhắn"}
                    </Text>
                    <div className="scp__conv-item-bottom">
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {formatTime(conv.lastMessageAt || conv.createdAt)}
                      </Text>
                      {conv.unreadByAdminCount > 0 && (
                        <Badge
                          count={conv.unreadByAdminCount}
                          size="small"
                          style={{ marginLeft: 8 }}
                        />
                      )}
                    </div>
                  </div>
                </List.Item>
              )}
              size="small"
              split={false}
            />
          )}
        </div>
      </div>

      {/* ===== Right: Chat Detail ===== */}
      <div className="scp__main">
        {!activeConv ? (
          <div className="scp__center">
            <Empty
              image={
                <MessageOutlined style={{ fontSize: 48, color: "#bbb" }} />
              }
              description="Chọn một cuộc hội thoại để xem chi tiết"
            />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="scp__chat-header">
              <div className="scp__chat-header-info">
                <Space>
                  <UserOutlined />
                  <Text strong>{activeConv.customerName}</Text>
                  {statusTag(activeConv.status)}
                </Space>
                {activeConv.customerEmail && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {activeConv.customerEmail}
                  </Text>
                )}
                {activeConv.assignedAdminName && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Xử lý bởi: {activeConv.assignedAdminName}
                  </Text>
                )}
              </div>
              <Space>
                {activeConv.status === "Open" && (
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    size="small"
                    onClick={handleAssign}
                  >
                    Nhận xử lý
                  </Button>
                )}
                {activeConv.status !== "Closed" && (
                  <Button
                    danger
                    icon={<CloseCircleOutlined />}
                    size="small"
                    onClick={handleClose}
                  >
                    Đóng
                  </Button>
                )}
              </Space>
            </div>

            {/* Messages */}
            <div className="scp__messages">
              {loadingDetail ? (
                <div className="scp__center">
                  <Spin tip="Đang tải tin nhắn..." />
                </div>
              ) : (
                <>
                  {(activeConv.messages || []).map((msg) => (
                    <div
                      key={msg.id}
                      className={`scp__msg scp__msg--${
                        msg.senderRole === "Admin" ? "admin" : "user"
                      }`}
                    >
                      <div className="scp__msg-bubble">
                        <Text
                          className="scp__msg-sender"
                          type="secondary"
                          style={{ fontSize: 11 }}
                        >
                          {msg.senderName}
                        </Text>
                        <div className="scp__msg-content">{msg.content}</div>
                        <div className="scp__msg-meta">
                          <span>{formatTime(msg.createdAt)}</span>
                          {msg.senderRole === "Admin" && msg.isRead && (
                            <span className="scp__msg-read">✓✓</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {typingUser && (
                    <div className="scp__typing">
                      <span className="scp__typing-dot" />
                      <span className="scp__typing-dot" />
                      <span className="scp__typing-dot" />
                      <Text
                        type="secondary"
                        style={{ fontSize: 12, marginLeft: 4 }}
                      >
                        {typingUser} đang nhập...
                      </Text>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input area */}
            {isClosed ? (
              <div className="scp__closed-banner">Cuộc hội thoại đã đóng</div>
            ) : (
              <div className="scp__input-area">
                <TextArea
                  ref={inputRef}
                  value={draft}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Nhập tin nhắn..."
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  disabled={sending}
                  style={{ flex: 1 }}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSend}
                  loading={sending}
                  disabled={!draft.trim()}
                >
                  Gửi
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ========== Helpers ==========

function formatTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
