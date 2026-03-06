import { useEffect, useRef, useState } from "react";
import { Form, Input, Button, Typography, Alert } from "antd";
import { MailOutlined, LockOutlined } from "@ant-design/icons";
import { register as registerAccount } from "../../services/authService";

const { Title, Text, Link } = Typography;

export default function RegisterForm({ goLogin }) {
  const [feedback, setFeedback] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const redirectTimeoutRef = useRef();

  const showFeedback = (text, type = "info") => {
    setFeedback({ text, type });
  };

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  async function onFinish(values) {
    setFeedback({ text: "", type: "" });

    try {
      setLoading(true);
      const data = await registerAccount(values.email, values.password, values.confirm);
      const successMessage = data?.message || "Đăng ký thành công!";
      showFeedback(`${successMessage} Đang chuyển đến đăng nhập...`, "success");
      redirectTimeoutRef.current = setTimeout(() => {
        goLogin?.();
      }, 1500);
    } catch (ex) {
      showFeedback(
        ex.response?.data?.message ||
          ex.response?.data?.title ||
          ex.message ||
          "Đăng ký thất bại.",
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
          Tạo tài khoản mới
        </Title>
        <Text type="secondary">
          Đăng ký để lưu danh sách phim yêu thích và nhận các gợi ý dành riêng cho bạn.
        </Text>
      </div>

      {feedback.text && (
        <Alert
          message={feedback.text}
          type={feedback.type === "error" ? "error" : "success"}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Form
        form={form}
        name="register"
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
          rules={[
            { required: true, message: "Vui lòng nhập mật khẩu!" },
            { min: 6, message: "Mật khẩu tối thiểu 6 ký tự!" },
          ]}
          extra="Mật khẩu nên có tối thiểu 6 ký tự và kết hợp chữ, số."
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="••••••••"
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="confirm"
          label="Xác nhận mật khẩu"
          dependencies={["password"]}
          rules={[
            { required: true, message: "Vui lòng xác nhận mật khẩu!" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("password") === value) {
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
            Tạo tài khoản
          </Button>
        </Form.Item>
      </Form>

      <div style={{ textAlign: "center" }}>
        <Link onClick={goLogin}>Đã có tài khoản? Đăng nhập</Link>
      </div>
    </div>
  );
}
