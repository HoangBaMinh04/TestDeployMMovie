import { useState } from "react";
import { Form, Input, Button, Typography, Alert } from "antd";
import { LockOutlined } from "@ant-design/icons";
import { changePassword as changePasswordApi } from "../../services/authService";

const { Title, Text, Link } = Typography;

export default function ChangePasswordForm({ goLogin, onSuccess }) {
  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const showMessage = (text, type = "info") => {
    setMessage({ text, type });
  };

  async function handleFinish(values) {
    setMessage({ text: "", type: "" });

    try {
      setLoading(true);
      const data = await changePasswordApi(
        values.currentPassword,
        values.newPassword,
        values.confirmPassword
      );

      showMessage(
        data?.message || "Đổi mật khẩu thành công. Vui lòng đăng nhập lại.",
        "success"
      );

      setTimeout(() => {
        onSuccess?.();
      }, 2000);
    } catch (error) {
      showMessage(
        error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          "Đổi mật khẩu thất bại.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <Title level={3} style={{ marginBottom: 8 }}>
          Đổi mật khẩu
        </Title>
        <Text type="secondary">
          Tăng cường bảo mật tài khoản của bạn với mật khẩu mới mạnh mẽ hơn.
        </Text>
      </div>

      {message.text && (
        <Alert
          message={message.text}
          type={message.type === "error" ? "error" : "success"}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Form
        form={form}
        name="changePassword"
        onFinish={handleFinish}
        layout="vertical"
        requiredMark={false}
      >
        <Form.Item
          name="currentPassword"
          label="Mật khẩu hiện tại"
          rules={[{ required: true, message: "Vui lòng nhập mật khẩu hiện tại!" }]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="••••••••"
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="newPassword"
          label="Mật khẩu mới"
          rules={[
            { required: true, message: "Vui lòng nhập mật khẩu mới!" },
            { min: 6, message: "Mật khẩu mới phải có ít nhất 6 ký tự!" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("currentPassword") !== value) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error("Mật khẩu mới phải khác mật khẩu hiện tại!")
                );
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="••••••••"
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="Xác nhận mật khẩu mới"
          dependencies={["newPassword"]}
          rules={[
            { required: true, message: "Vui lòng xác nhận mật khẩu!" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("newPassword") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("Mật khẩu xác nhận chưa khớp!"));
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="••••••••"
            size="large"
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            size="large"
          >
            Đổi mật khẩu
          </Button>
        </Form.Item>
      </Form>

      <div style={{ textAlign: "center" }}>
        <Link onClick={goLogin}>Hủy</Link>
      </div>
    </div>
  );
}
