import { Alert } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";

const STATUS_ICONS = {
  success: <CheckCircleOutlined />,
  error: <CloseCircleOutlined />,
  info: <InfoCircleOutlined />,
};

const STATUS_TYPES = {
  success: "success",
  error: "error",
  info: "info",
};

export default function PaymentStatusBanner({
  status = "info",
  message = "",
  onClose,
}) {
  if (!message) {
    return null;
  }

  return (
    <Alert
      message={message}
      type={STATUS_TYPES[status] || "info"}
      showIcon
      icon={STATUS_ICONS[status] || STATUS_ICONS.info}
      closable
      onClose={onClose}
      style={{ marginBottom: 16 }}
    />
  );
}
