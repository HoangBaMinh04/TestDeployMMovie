import { useEffect, useMemo } from "react";
import {
  Modal,
  Button,
  Typography,
  Tag,
  Space,
  Spin,
  Alert,
  Card,
  Descriptions,
  List,
  Empty,
} from "antd";
import { ReloadOutlined, CloseOutlined } from "@ant-design/icons";
import { fmtLocal } from "../../utils/datetime.js";

const { Title, Text } = Typography;

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

function getValueAtPath(obj, path) {
  if (!obj || !path) return undefined;
  const segments = path.split(".");
  let current = obj;

  for (const segment of segments) {
    if (current == null) return undefined;

    if (Object.prototype.hasOwnProperty.call(current, segment)) {
      current = current[segment];
      continue;
    }

    const lowerEntries = Object.keys(current).reduce((acc, key) => {
      acc[key.toLowerCase()] = key;
      return acc;
    }, {});
    const mapped = lowerEntries[segment.toLowerCase()];
    if (mapped) {
      current = current[mapped];
    } else {
      return undefined;
    }
  }

  return current;
}

function pickField(order, paths) {
  for (const path of paths) {
    const value = getValueAtPath(order, path);
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return null;
}

function pickArray(order, paths) {
  for (const path of paths) {
    const value = getValueAtPath(order, path);
    if (Array.isArray(value) && value.length) return value;
  }
  for (const path of paths) {
    const value = getValueAtPath(order, path);
    if (Array.isArray(value)) return value;
  }
  return [];
}

function formatCurrency(value) {
  if (value === undefined || value === null || value === "") return "";

  const raw =
    typeof value === "string"
      ? value
          .replace(/[^0-9.,-]/g, "")
          .replace(/(,)(?=.*,)/g, "")
          .replace(/\.(?=.*\.)/g, "")
      : value;

  const number = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(number)) return String(value);

  try {
    return currencyFormatter.format(number);
  } catch (error) {
    console.warn("formatCurrency error", error);
    return String(value);
  }
}

function formatDate(value) {
  if (value === undefined || value === null || value === "") return "";
  const formatted = fmtLocal(value, "DD/MM/YYYY HH:mm");
  if (formatted) return formatted;
  return String(value);
}

function normalizeStatus(status) {
  if (!status) return "";
  const text = String(status).trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getStatusColor(status) {
  if (!status) return "default";
  const normalized = String(status).toLowerCase();
  if (
    normalized.includes("success") ||
    normalized.includes("paid") ||
    normalized.includes("hoàn") ||
    normalized.includes("thanh") ||
    normalized.includes("completed") ||
    normalized.includes("đã thanh toán")
  ) {
    return "success";
  }

  if (
    normalized.includes("pending") ||
    normalized.includes("chờ") ||
    normalized.includes("processing") ||
    normalized.includes("đang")
  ) {
    return "processing";
  }

  if (
    normalized.includes("cancel") ||
    normalized.includes("failed") ||
    normalized.includes("hủy") ||
    normalized.includes("refuse") ||
    normalized.includes("error") ||
    normalized.includes("reject")
  ) {
    return "error";
  }

  return "default";
}

function OrderCard({ order, index }) {
  const orderId =
    pickField(order, ["orderCode", "orderId"]) || `Đơn hàng #${index + 1}`;
  const status = pickField(order, ["status"]);
  const total = pickField(order, ["totalAmount"]);
  const createdAt = pickField(order, ["createdAt"]);
  const movie = pickField(order, ["movieName"]);
  const cinema = pickField(order, ["cinemaName"]);
  const room = pickField(order, ["roomName"]);
  const showTime = pickField(order, ["showTimeStart"]);
  const paymentMethod = pickField(order, ["paymentType"]);
  const quantity = pickField(order, ["quantity"]);
  const buyer = pickField(order, ["userName"]);
  const email = pickField(order, ["userEmail"]);
  const phone = pickField(order, ["phoneNumber"]);

  const items = pickArray(order, ["tickets"]);
  const computedQuantity =
    quantity ?? (Array.isArray(items) ? items.length : undefined);

  return (
    <Card
      title={
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <div>
            <Text strong>{orderId}</Text>
            {createdAt && (
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                {formatDate(createdAt)}
              </Text>
            )}
          </div>
          {status && (
            <Tag color={getStatusColor(status)}>{normalizeStatus(status)}</Tag>
          )}
        </Space>
      }
      style={{ marginBottom: 16 }}
      size="small"
    >
      <Descriptions column={1} size="small">
        <Descriptions.Item label="Số lượng vé">
          {computedQuantity ?? "—"}
        </Descriptions.Item>
        {movie && <Descriptions.Item label="Phim">{movie}</Descriptions.Item>}
        {cinema && <Descriptions.Item label="Rạp">{cinema}</Descriptions.Item>}
        {showTime && (
          <Descriptions.Item label="Suất chiếu">
            {formatDate(showTime) || String(showTime)}
          </Descriptions.Item>
        )}
        {paymentMethod && (
          <Descriptions.Item label="Phương thức">
            {normalizeStatus(paymentMethod) ?? "VNPay"}
          </Descriptions.Item>
        )}
        {buyer && (
          <Descriptions.Item label="Người mua">{buyer}</Descriptions.Item>
        )}
        {email && <Descriptions.Item label="Email">{email}</Descriptions.Item>}
        {phone && (
          <Descriptions.Item label="Điện thoại">{phone}</Descriptions.Item>
        )}
        <Descriptions.Item label="Tổng tiền">
          <Text strong style={{ color: "#1890ff" }}>
            {formatCurrency(total) || (total ? String(total) : "—")}
          </Text>
        </Descriptions.Item>
      </Descriptions>

      {Array.isArray(items) && items.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Text strong style={{ display: "block", marginBottom: 8 }}>
            Vé đã đặt
          </Text>
          <List
            size="small"
            dataSource={items}
            renderItem={(item, idx) => {
              const seat = pickField(item, ["seatLabel"]);
              const ticketType = pickField(item, ["tier"]);
              const price = pickField(item, [
                "price",
                "amount",
                "total",
                "cost",
                "value",
              ]);
              const itemRoom = pickField(item, ["roomName"]) ?? room;

              return (
                <List.Item>
                  <Space style={{ width: "100%", justifyContent: "space-between" }}>
                    <div>
                      <Text>{seat || ticketType || `Vé ${idx + 1}`}</Text>
                      {ticketType && seat && (
                        <Tag style={{ marginLeft: 8 }}>{ticketType}</Tag>
                      )}
                      {itemRoom && (
                        <Tag color="blue" style={{ marginLeft: 4 }}>
                          Phòng: {itemRoom}
                        </Tag>
                      )}
                    </div>
                    {price !== null && price !== undefined && price !== "" && (
                      <Text type="success">
                        {formatCurrency(price) || String(price)}
                      </Text>
                    )}
                  </Space>
                </List.Item>
              );
            }}
          />
        </div>
      )}
    </Card>
  );
}

export default function OrdersModal({
  onClose,
  onReload,
  orders = [],
  loading = false,
  error = "",
  isLoggedIn = false,
}) {
  const hasOrders = Array.isArray(orders) && orders.length > 0;

  const infoMessage = useMemo(() => {
    if (!isLoggedIn) {
      return "Vui lòng đăng nhập để xem thông tin đơn hàng.";
    }
    if (error) {
      return error;
    }
    if (!hasOrders && !loading) {
      return "Bạn chưa có đơn hàng nào được ghi nhận.";
    }
    return "";
  }, [isLoggedIn, loading, error, hasOrders]);

  return (
    <Modal
      open={true}
      onCancel={onClose}
      title={
        <div>
          <Title level={4} style={{ margin: 0 }}>
            🎟️ Đơn hàng của bạn
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Thông tin chi tiết về các đơn hàng của bạn sẽ hiển thị tại đây.
          </Text>
        </div>
      }
      footer={
        <Space>
          {onReload && (
            <Button
              icon={<ReloadOutlined />}
              onClick={onReload}
              loading={loading}
            >
              Tải lại
            </Button>
          )}
          <Button type="primary" onClick={onClose}>
            Đóng
          </Button>
        </Space>
      }
      width={600}
      centered
      styles={{
        body: {
          maxHeight: "60vh",
          overflowY: "auto",
          padding: "16px 24px",
        },
      }}
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin tip="Đang tải dữ liệu đơn hàng..." />
        </div>
      ) : infoMessage ? (
        <Alert
          message={infoMessage}
          type={error ? "error" : "info"}
          showIcon
        />
      ) : hasOrders ? (
        orders.map((order, index) => (
          <OrderCard key={index} order={order} index={index} />
        ))
      ) : (
        <Empty description="Không có đơn hàng" />
      )}
    </Modal>
  );
}
