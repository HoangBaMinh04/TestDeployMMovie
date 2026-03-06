import { Link } from "react-router-dom";
import { Layout, Row, Col, Typography, Space, Input, Button, Divider } from "antd";
import {
  FacebookOutlined,
  InstagramOutlined,
  YoutubeOutlined,
  PhoneOutlined,
  MailOutlined,
  SendOutlined,
} from "@ant-design/icons";

const { Footer } = Layout;
const { Title, Text, Paragraph } = Typography;

const currentYear = new Date().getFullYear();

const quickLinks = [
  { label: "Trang chủ", to: "/" },
  { label: "Phim đang chiếu", to: "#now-showing" },
  { label: "Phim sắp chiếu", to: "#coming-soon" },
  { label: "Khuyến mãi", to: "#promotions" },
];

const supportLinks = [
  { label: "Liên hệ", href: "mailto:support@moviemate.vn" },
  { label: "Hướng dẫn đặt vé", href: "#booking-guide" },
  { label: "Điều khoản sử dụng", href: "#terms" },
  { label: "Chính sách bảo mật", href: "#privacy" },
];

const socialLinks = [
  { label: "Facebook", href: "https://www.facebook.com", icon: <FacebookOutlined /> },
  { label: "Instagram", href: "https://www.instagram.com", icon: <InstagramOutlined /> },
  { label: "YouTube", href: "https://www.youtube.com", icon: <YoutubeOutlined /> },
];

const footerStyle = {
  background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
  padding: "48px 24px 24px",
  color: "#fff",
};

const linkStyle = {
  color: "rgba(255, 255, 255, 0.75)",
  transition: "color 0.3s ease",
};

const linkHoverStyle = {
  color: "#1890ff",
};

const containerStyle = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "0 24px",
};

const footerWrapperStyle = {
  maxWidth: 1200,
  margin: "24px auto 0",
  padding: "0 24px",
};

const footerInnerStyle = {
  background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
  padding: "48px 32px 24px",
  borderRadius: 16,
  color: "#fff",
};

export default function AppFooter() {
  return (
    <div style={footerWrapperStyle}>
      <Footer style={footerInnerStyle}>
      <Row gutter={[32, 32]} justify="space-between">
        {/* Brand Column */}
        <Col xs={24} sm={12} md={6}>
          <Title level={3} style={{ color: "#fff", marginBottom: 16 }}>
            🎬 MovieMate
          </Title>
          <Paragraph style={{ color: "rgba(255, 255, 255, 0.75)", marginBottom: 16 }}>
            Nơi kết nối bạn với những trải nghiệm điện ảnh đỉnh cao.
          </Paragraph>
          <Space direction="vertical" size={8}>
            <a href="tel:+842812345678" style={linkStyle}>
              <PhoneOutlined style={{ marginRight: 8 }} />
              Hotline: 0914433666
            </a>
            <a href="mailto:hoangbaminh889@gmail.com" style={linkStyle}>
              <MailOutlined style={{ marginRight: 8 }} />
              hoangbaminh889@gmail.com
            </a>
          </Space>
          <Space size={16} style={{ marginTop: 16 }}>
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: 24,
                  color: "rgba(255, 255, 255, 0.75)",
                  transition: "color 0.3s, transform 0.3s",
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = "#1890ff";
                  e.target.style.transform = "scale(1.2)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = "rgba(255, 255, 255, 0.75)";
                  e.target.style.transform = "scale(1)";
                }}
              >
                {social.icon}
              </a>
            ))}
          </Space>
        </Col>

        {/* Quick Links Column */}
        <Col xs={24} sm={12} md={5}>
          <Title level={5} style={{ color: "#fff", marginBottom: 16 }}>
            Khám phá
          </Title>
          <Space direction="vertical" size={12}>
            {quickLinks.map((link) =>
              link.to.startsWith("#") ? (
                <a
                  key={link.label}
                  href={link.to}
                  style={linkStyle}
                  onMouseEnter={(e) => (e.target.style.color = linkHoverStyle.color)}
                  onMouseLeave={(e) => (e.target.style.color = linkStyle.color)}
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.label}
                  to={link.to}
                  style={linkStyle}
                  onMouseEnter={(e) => (e.target.style.color = linkHoverStyle.color)}
                  onMouseLeave={(e) => (e.target.style.color = linkStyle.color)}
                >
                  {link.label}
                </Link>
              )
            )}
          </Space>
        </Col>

        {/* Support Links Column */}
        <Col xs={24} sm={12} md={5}>
          <Title level={5} style={{ color: "#fff", marginBottom: 16 }}>
            Hỗ trợ
          </Title>
          <Space direction="vertical" size={12}>
            {supportLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                style={linkStyle}
                onMouseEnter={(e) => (e.target.style.color = linkHoverStyle.color)}
                onMouseLeave={(e) => (e.target.style.color = linkStyle.color)}
              >
                {link.label}
              </a>
            ))}
          </Space>
        </Col>

        {/* Newsletter Column */}
        <Col xs={24} sm={12} md={8}>
          <Title level={5} style={{ color: "#fff", marginBottom: 16 }}>
            Nhận bản tin
          </Title>
          <Paragraph style={{ color: "rgba(255, 255, 255, 0.75)", marginBottom: 16 }}>
            Cập nhật sớm nhất các suất chiếu đặc biệt và ưu đãi dành riêng cho bạn.
          </Paragraph>
          <Space.Compact style={{ width: "100%" }}>
            <Input
              placeholder="Nhập email của bạn"
              type="email"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                borderColor: "rgba(255, 255, 255, 0.2)",
                color: "#fff",
              }}
            />
            <Button type="primary" icon={<SendOutlined />}>
              Đăng ký
            </Button>
          </Space.Compact>
        </Col>
      </Row>

      <Divider style={{ borderColor: "rgba(255, 255, 255, 0.15)", margin: "32px 0 16px" }} />

      {/* Footer Bottom */}
      <Row justify="space-between" align="middle">
        <Col>
          <Text style={{ color: "rgba(255, 255, 255, 0.6)" }}>
            © {currentYear} MovieMate. Tất cả quyền được bảo lưu.
          </Text>
        </Col>
        <Col>
          <Text style={{ color: "rgba(255, 255, 255, 0.6)" }}>
            Thiết kế bởi{" "}
            <Text strong style={{ color: "#1890ff" }}>
              MINHHB
            </Text>
          </Text>
        </Col>
      </Row>
      </Footer>
    </div>
  );
}
