import { useState } from "react";
import { Form, Input, Button, Typography, Alert } from "antd";
import { MailOutlined, LockOutlined, SafetyOutlined } from "@ant-design/icons";
import {
  requestReset,
  resetWithOtp as resetWithOtpApi,
} from "../../services/authService";

const { Title, Text, Link } = Typography;

export default function ForgotForm({ goLogin }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const showFeedback = (text, type = "info") => {
    setFeedback({ text, type });
  };

  async function requestOtp(values) {
    setFeedback({ text: "", type: "" });
    try {
      setLoading(true);
      setEmail(values.email);
      const data = await requestReset(values.email);
      showFeedback(
        data?.message || "Nếu email tồn tại, OTP đã được gửi.",
        "success"
      );
      setStep(2);
    } catch (ex) {
      showFeedback(
        ex.response?.data?.message ||
          ex.response?.data?.title ||
          ex.message ||
          "Gửi OTP thất bại.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  async function resetWithOtp(values) {
    setFeedback({ text: "", type: "" });
    try {
      setLoading(true);
      const data = await resetWithOtpApi(email, values.otp, values.newPassword, values.confirm);
      showFeedback(
        data?.message || "Đổi mật khẩu thành công. Vui lòng đăng nhập.",
        "success"
      );
    } catch (ex) {
      showFeedback(
        ex.response?.data?.message ||
          ex.response?.data?.title ||
          ex.message ||
          "Đổi mật khẩu thất bại.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  const isOtpStep = step === 2;

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <Title level={3} style={{ marginBottom: 8 }}>
          {isOtpStep ? "Đặt lại mật khẩu" : "Quên mật khẩu"}
        </Title>
        <Text type="secondary">
          {isOtpStep
            ? "Nhập mã OTP đã gửi tới email và tạo mật khẩu mới an toàn."
            : "Nhập email của bạn để nhận mã OTP đặt lại mật khẩu."}
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

      {isOtpStep ? (
        <Form
          form={form}
          name="resetPassword"
          onFinish={resetWithOtp}
          layout="vertical"
          requiredMark={false}
        >
          <Alert
            message={<>Nhập OTP đã gửi tới email: <strong>{email}</strong></>}
            type="info"
            style={{ marginBottom: 16 }}
          />

          <Form.Item
            name="otp"
            label="Mã OTP"
            rules={[{ required: true, message: "Vui lòng nhập mã OTP!" }]}
          >
            <Input
              prefix={<SafetyOutlined />}
              placeholder="6 số"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="Mật khẩu mới"
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu mới!" },
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
      ) : (
        <Form
          name="requestOtp"
          onFinish={requestOtp}
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

          <Form.Item style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
            >
              Gửi OTP
            </Button>
          </Form.Item>
        </Form>
      )}

      <div style={{ textAlign: "center" }}>
        <Link onClick={goLogin}>Quay về đăng nhập</Link>
      </div>
    </div>
  );
}
