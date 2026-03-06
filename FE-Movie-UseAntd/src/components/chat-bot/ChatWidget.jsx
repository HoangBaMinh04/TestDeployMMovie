import { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Button,
  Input,
  Typography,
  Space,
  Spin,
  Alert,
  Avatar,
  Tooltip,
  Flex,
} from "antd";
import {
  SendOutlined,
  ReloadOutlined,
  DeleteOutlined,
  RobotOutlined,
  UserOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import useChatbot from "../../hooks/useChatbot";
import { fmtLocal, fmtLocalTime, toLocalDayjs } from "../../utils/datetime.js";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function ChatWidget({ isOpen, onClose, isLoggedIn }) {
  const [draft, setDraft] = useState("");
  const messageListRef = useRef(null);
  const inputRef = useRef(null);

  const {
    messages,
    hasMessages,
    loadingHistory,
    sending,
    error,
    statistics,
    sendMessage,
    clearHistory,
    refreshHistory,
  } = useChatbot({ enabled: isOpen && isLoggedIn });

  useEffect(() => {
    if (!isOpen) {
      setDraft("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const container = messageListRef.current;
    if (!container) return;

    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      inputRef.current?.focus?.();
    }, 150);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const statisticsSummary = useMemo(() => {
    if (!statistics) return null;

    const total =
      statistics.totalMessages ||
      statistics.totalInteractions ||
      statistics.count ||
      0;
    const lastInteractionRaw =
      statistics.lastInteraction ||
      statistics.lastMessageAt ||
      statistics.updatedAt;

    const lastInteraction = lastInteractionRaw
      ? toLocalDayjs(lastInteractionRaw)
      : null;

    return { total, lastInteraction };
  }, [statistics]);

  const handleSubmit = async () => {
    if (!draft.trim() || sending) {
      return;
    }

    const currentDraft = draft;
    setDraft("");
    const result = await sendMessage(currentDraft);
    if (!result?.success) {
      setDraft((prev) => (prev ? prev : currentDraft));
      inputRef.current?.focus?.();
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const handleClear = async () => {
    Modal.confirm({
      title: "Xác nhận xóa",
      icon: <ExclamationCircleOutlined />,
      content: "Bạn có chắc muốn xóa toàn bộ lịch sử chat?",
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        await clearHistory();
      },
    });
  };

  const getAvatarConfig = (role) => {
    switch (role) {
      case "user":
        return {
          icon: <UserOutlined />,
          style: { backgroundColor: "#1890ff" },
        };
      case "system":
        return {
          icon: <ExclamationCircleOutlined />,
          style: { backgroundColor: "#faad14" },
        };
      default:
        return {
          icon: <RobotOutlined />,
          style: { backgroundColor: "#52c41a" },
        };
    }
  };

  const modalStyles = {
    header: {
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      borderRadius: "8px 8px 0 0",
      padding: "16px 24px",
    },
    body: {
      padding: 0,
      display: "flex",
      flexDirection: "column",
      height: "500px",
    },
    content: {
      borderRadius: "8px",
      overflow: "hidden",
    },
  };

  const messageContainerStyle = {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
    background: "#f5f5f5",
  };

  const messageBubbleStyle = (role) => ({
    maxWidth: "80%",
    padding: "12px 16px",
    borderRadius: role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
    background: role === "user" ? "#1890ff" : "#fff",
    color: role === "user" ? "#fff" : "#000",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
  });

  const formStyle = {
    padding: "16px",
    borderTop: "1px solid #f0f0f0",
    background: "#fff",
  };

  return (
    <Modal
      title={
        <Flex justify="space-between" align="center" style={{ width: "100%" }}>
          <div>
            <Title level={4} style={{ margin: 0, color: "#fff" }}>
              🤖 Trợ lý AI
            </Title>
            {statisticsSummary ? (
              <Text style={{ color: "rgba(255, 255, 255, 0.85)", fontSize: 12 }}>
                Tổng tin nhắn: {statisticsSummary.total}
                {statisticsSummary.lastInteraction && (
                  <>
                    {" "}| Lần cuối:{" "}
                    {fmtLocal(statisticsSummary.lastInteraction, "DD/MM/YYYY HH:mm")}
                  </>
                )}
              </Text>
            ) : (
              <Text style={{ color: "rgba(255, 255, 255, 0.85)", fontSize: 12 }}>
                Hỏi tôi về lịch chiếu, phim và nhiều hơn nữa.
              </Text>
            )}
          </div>
          <Space>
            <Tooltip title="Tải lại lịch sử">
              <Button
                type="text"
                icon={<ReloadOutlined spin={loadingHistory} />}
                onClick={refreshHistory}
                disabled={loadingHistory}
                style={{ color: "#fff" }}
              />
            </Tooltip>
            <Tooltip title="Xóa lịch sử">
              <Button
                type="text"
                icon={<DeleteOutlined />}
                onClick={handleClear}
                disabled={loadingHistory || sending}
                style={{ color: "#fff" }}
              />
            </Tooltip>
          </Space>
        </Flex>
      }
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={600}
      styles={modalStyles}
      centered
      destroyOnClose
    >
      <div style={messageContainerStyle} ref={messageListRef}>
        {loadingHistory ? (
          <Flex justify="center" align="center" style={{ height: "100%" }}>
            <Spin tip="Đang tải lịch sử trò chuyện..." />
          </Flex>
        ) : !hasMessages ? (
          <Flex justify="center" align="center" style={{ height: "100%" }}>
            <Paragraph type="secondary" style={{ textAlign: "center" }}>
              💬 Hãy bắt đầu cuộc trò chuyện bằng cách nhập câu hỏi bên dưới.
            </Paragraph>
          </Flex>
        ) : null}

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Space direction="vertical" style={{ width: "100%" }} size={16}>
          {messages.map((item) => {
            const avatarConfig = getAvatarConfig(item.role);
            const isUser = item.role === "user";

            return (
              <Flex
                key={item.id}
                justify={isUser ? "flex-end" : "flex-start"}
                align="flex-start"
                gap={8}
              >
                {!isUser && (
                  <Avatar
                    size={36}
                    icon={avatarConfig.icon}
                    style={avatarConfig.style}
                  />
                )}
                <div>
                  <div style={messageBubbleStyle(item.role)}>
                    <Text style={{ color: isUser ? "#fff" : "#000" }}>
                      {item.content}
                    </Text>
                  </div>
                  {item.timestamp && (
                    <Text
                      type="secondary"
                      style={{
                        fontSize: 11,
                        display: "block",
                        textAlign: isUser ? "right" : "left",
                        marginTop: 4,
                      }}
                    >
                      {fmtLocalTime(item.timestamp, "HH:mm")}
                    </Text>
                  )}
                </div>
                {isUser && (
                  <Avatar
                    size={36}
                    icon={avatarConfig.icon}
                    style={avatarConfig.style}
                  />
                )}
              </Flex>
            );
          })}
        </Space>
      </div>

      <div style={formStyle}>
        <Space.Compact style={{ width: "100%" }}>
          <TextArea
            ref={inputRef}
            placeholder="Nhập câu hỏi của bạn..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            autoSize={{ minRows: 2, maxRows: 4 }}
            style={{ borderRadius: "8px 0 0 8px" }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSubmit}
            loading={sending}
            disabled={!draft.trim()}
            style={{
              height: "auto",
              borderRadius: "0 8px 8px 0",
              minHeight: 54,
            }}
          >
            {sending ? "Đang gửi" : "Gửi"}
          </Button>
        </Space.Compact>
      </div>
    </Modal>
  );
}
