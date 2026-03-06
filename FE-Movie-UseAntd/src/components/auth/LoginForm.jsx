import { useState } from "react";
import { Form, Input, Button, Typography, Alert, Space } from "antd";
import { MailOutlined, LockOutlined } from "@ant-design/icons";
import { login } from "../../services/authService";

const { Title, Text, Link } = Typography;

export default function LoginForm({ onDone, goRegister, goForgot }) {
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  function pickErrorMessage(ex) {
    if (!ex.response)
      return "Không kết nối được máy chủ. Kiểm tra URL/CORS/HTTPS.";

    const { status, data } = ex.response;

    if (status === 400 || status === 401) {
      const msg =
        data?.detail ||
        data?.message ||
        data?.title ||
        (Array.isArray(data?.errors) ? data.errors.join("; ") : null) ||
        (data?.errors ? Object.values(data.errors).flat().join("; ") : null);

      return msg || "Email hoặc mật khẩu không đúng.";
    }

    const generic = data?.detail || data?.message || data?.title || ex.message;
    return generic || `Lỗi ${status}.`;
  }

  async function onFinish(values) {
    setMsg("");
    setError("");

    try {
      setLoading(true);
      const data = await login(values.email, values.password);
      setMsg("Đăng nhập thành công!");
      setTimeout(() => onDone?.(data), 400);
    } catch (ex) {
      console.log("AXIOS ERROR >>>", ex?.code, ex?.message, ex?.response);
      setError(pickErrorMessage(ex));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <Title level={3} style={{ marginBottom: 8 }}>
          Chào mừng trở lại
        </Title>
        <Text type="secondary">
          Đăng nhập để tiếp tục khám phá kho phim yêu thích của bạn.
        </Text>
      </div>

      {msg && (
        <Alert
          message={msg}
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Form
        form={form}
        name="login"
        onFinish={onFinish}
        layout="vertical"
        requiredMark={false}
      >
        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: "Vui lòng nhập email!" },
            { type: "email", message: "Email không hợp lệ!" },
          ]}
        >
          <Input
            prefix={<MailOutlined />}
            placeholder="you@example.com"
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label="Mật khẩu"
          rules={[{ required: true, message: "Vui lòng nhập mật khẩu!" }]}
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
            Đăng nhập
          </Button>
        </Form.Item>
      </Form>

      <Space style={{ width: "100%", justifyContent: "space-between" }}>
        <Link onClick={goRegister}>Tạo tài khoản</Link>
        <Link onClick={goForgot}>Quên mật khẩu?</Link>
      </Space>
    </div>
  );
}
