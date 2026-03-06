import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Layout,
  Typography,
  Card,
  Row,
  Col,
  Space,
  message,
} from "antd";
import {
  EnvironmentOutlined,
  PhoneOutlined,
  MailOutlined,
} from "@ant-design/icons";
import HeaderBar from "../header/HeaderBar";
import AuthModal from "../auth/AuthModal";
import OrdersModal from "../order/OrdersModal";
import ChatWidget from "../chat-bot/ChatWidget";
import AppFooter from "../footer/AppFooter";
import UserProfileModal from "../profile/UserProfileModal";
import { useOrders } from "../../hooks/useOrders";
import useUserProfile from "../../hooks/useUserProfile";
import { logout as logoutApi } from "../../services/authService";
import { getAccessToken, logout as clearTokens } from "../../api/http";
import {
  clearStoredRoles,
  extractNormalizedRoles,
  hasAdminRole,
  storeUserRoles,
} from "../../utils/auth";
import "../../css/MovieBrowser.css";

const { Content } = Layout;
const { Title, Paragraph, Text, Link } = Typography;

const CONTACT_ADDRESS = "298 Đường Cầu Diễn, Bắc Từ Liêm, Hà Nội";
const CONTACT_PHONE = "0914433666";
const CONTACT_EMAIL = "hoangbaminh889@gmail.com";

const pageStyle = {
  minHeight: "100vh",
  background: "#141414",
};

const contentStyle = {
  padding: "24px",
  maxWidth: 1200,
  margin: "0 auto",
};

const cardStyle = {
  background: "rgba(255, 255, 255, 0.95)",
  borderRadius: 16,
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
};

const mapStyle = {
  width: "100%",
  height: 400,
  border: 0,
  borderRadius: 12,
};

const contactItemStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: 16,
  padding: "16px 0",
  borderBottom: "1px solid #f0f0f0",
};

const iconContainerStyle = {
  width: 48,
  height: 48,
  borderRadius: "50%",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

export default function ContactPage() {
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalView, setAuthModalView] = useState("login");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [showChatWidget, setShowChatWidget] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const {
    orders,
    loading: loadingOrders,
    error: ordersError,
    fetchOrders,
    cancel: cancelOrders,
    reset: resetOrders,
  } = useOrders({ enabled: isLoggedIn });

  const {
    data: profile,
    loading: loadingProfile,
    updating: updatingProfile,
    error: profileError,
    refetch: refetchProfile,
    update: updateProfile,
    reset: resetProfile,
  } = useUserProfile({ enabled: isLoggedIn });

  useEffect(() => {
    const token = getAccessToken();
    const loggedIn = Boolean(token);
    setIsLoggedIn(loggedIn);

    if (loggedIn) {
      refetchProfile().catch(() => {});
    }
  }, [refetchProfile]);

  useEffect(() => {
    if (!isLoggedIn) {
      resetProfile();
      setShowProfileModal(false);
    }
  }, [isLoggedIn, resetProfile]);

  const openAuthModal = useCallback((view = "login") => {
    setAuthModalView(view);
    setShowAuthModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowAuthModal(false);
  }, []);

  const handleOpenProfileModal = useCallback(() => {
    if (!isLoggedIn) {
      openAuthModal("login");
      return;
    }
    setShowProfileModal(true);
  }, [isLoggedIn, openAuthModal]);

  const handleCloseProfileModal = useCallback(() => {
    setShowProfileModal(false);
  }, []);

  const handleProfileSubmit = useCallback(
    (values) => {
      const payload = {
        FullName: values.fullName?.trim() || null,
        PhoneNumber: values.phoneNumber?.trim() || null,
        DateOfBirth: values.dateOfBirth || null,
      };

      return updateProfile(payload);
    },
    [updateProfile]
  );

  const handleLoginSuccess = useCallback(
    async (authPayload) => {
      setShowAuthModal(false);
      setIsLoggedIn(true);

      let profileData = null;
      try {
        profileData = await refetchProfile();
      } catch (error) {
        console.warn("Không tải được hồ sơ sau khi đăng nhập", error);
      }

      const roles = extractNormalizedRoles(authPayload, profileData);
      storeUserRoles(roles);

      if (hasAdminRole(roles)) {
        navigate("/admin/dashboard", { replace: true });
      }
    },
    [navigate, refetchProfile]
  );

  const handleChangePasswordSuccess = useCallback(() => {
    clearTokens();
    setIsLoggedIn(false);
    setShowAuthModal(false);
    clearStoredRoles();
    resetProfile();
    setShowProfileModal(false);
  }, [resetProfile]);

  const handleLogout = useCallback(async () => {
    try {
      await logoutApi();
      message.success("Đăng xuất thành công!");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      clearTokens();
      clearStoredRoles();
      setIsLoggedIn(false);
      setShowChatWidget(false);
      setShowProfileModal(false);
      resetProfile();
    }
  }, [resetProfile]);

  const handleOrdersClick = useCallback(() => {
    if (!isLoggedIn) {
      message.warning("Bạn cần đăng nhập để sử dụng tính năng Đơn hàng.");
      openAuthModal("login");
      return;
    }

    setShowOrdersModal(true);
  }, [isLoggedIn, openAuthModal]);

  const handleCloseOrders = useCallback(() => {
    setShowOrdersModal(false);
    cancelOrders();
  }, [cancelOrders]);

  const handleChatClick = useCallback(() => {
    if (!isLoggedIn) {
      message.warning("Bạn cần đăng nhập để trò chuyện với trợ lý AI.");
      openAuthModal("login");
      return;
    }

    setShowOrdersModal(false);
    setShowChatWidget(true);
  }, [isLoggedIn, openAuthModal]);

  const handleCloseChat = useCallback(() => {
    setShowChatWidget(false);
  }, []);

  useEffect(() => {
    if (!showOrdersModal || !isLoggedIn) {
      return;
    }

    fetchOrders();

    return () => {
      cancelOrders();
    };
  }, [showOrdersModal, isLoggedIn, fetchOrders, cancelOrders]);

  useEffect(() => {
    if (!isLoggedIn) {
      setShowOrdersModal(false);
      resetOrders();
      setShowChatWidget(false);
    }
  }, [isLoggedIn, resetOrders]);

  const handleReloadOrders = useCallback(() => {
    if (!isLoggedIn) return;
    fetchOrders();
  }, [isLoggedIn, fetchOrders]);

  const contactDetails = useMemo(
    () => [
      {
        title: "Địa chỉ",
        content: CONTACT_ADDRESS,
        icon: <EnvironmentOutlined style={{ fontSize: 24, color: "#fff" }} />,
      },
      {
        title: "Điện thoại",
        content: CONTACT_PHONE,
        href: `tel:${CONTACT_PHONE.replace(/[^0-9+]/g, "")}`,
        icon: <PhoneOutlined style={{ fontSize: 24, color: "#fff" }} />,
      },
      {
        title: "Email",
        content: CONTACT_EMAIL,
        href: `mailto:${CONTACT_EMAIL}`,
        icon: <MailOutlined style={{ fontSize: 24, color: "#fff" }} />,
      },
    ],
    []
  );

  const handleBackClick = useCallback(() => {
    if (typeof window !== "undefined" && window.history?.state?.idx > 0) {
      navigate(-1);
      return;
    }

    navigate("/", { replace: true });
  }, [navigate]);

  return (
    <Layout style={pageStyle}>
      <HeaderBar
        showSearch={false}
        onLogin={() => openAuthModal("login")}
        onLogout={handleLogout}
        onChangePassword={() => openAuthModal("changePassword")}
        onOrders={handleOrdersClick}
        onChat={handleChatClick}
        onProfile={handleOpenProfileModal}
        fullName={profile?.fullName}
        isLoggedIn={isLoggedIn}
      />

      {/* Navigation Bar */}
      <header className="header">
        <div className="header-content">
          <nav className="nav-menu">
            <RouterLink to="/" className="nav-item">
              PHIM CHIẾU
            </RouterLink>
            <span className="nav-item">
              THẾ LOẠI ▼
            </span>
            <span className="nav-item">
              QUỐC GIA ▼
            </span>
            <RouterLink to="/contact" className="nav-item active">
              LIÊN HỆ
            </RouterLink>
          </nav>
        </div>
      </header>

      <Content style={contentStyle}>

        <Row gutter={[24, 24]}>
          {/* Contact Info Card */}
          <Col xs={24} lg={12}>
            <Card style={cardStyle} bordered={false}>
              <Title level={2} style={{ marginBottom: 8 }}>
                📞 Liên hệ M-Movie
              </Title>
              <Paragraph type="secondary" style={{ marginBottom: 32, fontSize: 16 }}>
                Rất hân hạnh được hỗ trợ bạn. Nếu có bất kỳ thắc mắc nào về dịch vụ,
                vui lòng liên hệ với chúng tôi qua các thông tin dưới đây.
              </Paragraph>

              <Space direction="vertical" style={{ width: "100%" }} size={0}>
                {contactDetails.map((item, index) => (
                  <div
                    key={item.title}
                    style={{
                      ...contactItemStyle,
                      borderBottom:
                        index === contactDetails.length - 1
                          ? "none"
                          : contactItemStyle.borderBottom,
                    }}
                  >
                    <div style={iconContainerStyle}>{item.icon}</div>
                    <div>
                      <Text strong style={{ fontSize: 16, display: "block" }}>
                        {item.title}
                      </Text>
                      {item.href ? (
                        <Link
                          href={item.href}
                          style={{ fontSize: 15, color: "#1890ff" }}
                        >
                          {item.content}
                        </Link>
                      ) : (
                        <Text style={{ fontSize: 15, color: "#666" }}>
                          {item.content}
                        </Text>
                      )}
                    </div>
                  </div>
                ))}
              </Space>
            </Card>
          </Col>

          {/* Map Card */}
          <Col xs={24} lg={12}>
            <Card
              style={cardStyle}
              bordered={false}
              title={
                <Title level={4} style={{ margin: 0 }}>
                  🗺️ Bản đồ đến M-Movie
                </Title>
              }
            >
              <iframe
                title="Bản đồ Đại học Công nghiệp Hà Nội"
                src="https://www.google.com/maps?q=%C4%90%E1%BA%A1i%20h%E1%BB%8Dc%20C%C3%B4ng%20nghi%E1%BB%87p%20H%C3%A0%20N%E1%BB%99i&output=embed"
                loading="lazy"
                allowFullScreen
                style={mapStyle}
              />
            </Card>
          </Col>
        </Row>
      </Content>

      {showOrdersModal && (
        <OrdersModal
          onClose={handleCloseOrders}
          onReload={handleReloadOrders}
          orders={orders}
          loading={loadingOrders}
          error={ordersError}
          isLoggedIn={isLoggedIn}
        />
      )}

      {showAuthModal && (
        <AuthModal
          onClose={handleCloseModal}
          onLoginSuccess={handleLoginSuccess}
          onChangePasswordSuccess={handleChangePasswordSuccess}
          initialView={authModalView}
        />
      )}

      {showProfileModal && (
        <UserProfileModal
          open={showProfileModal}
          onClose={handleCloseProfileModal}
          profile={profile}
          loading={loadingProfile}
          updating={updatingProfile}
          error={profileError}
          onSubmit={handleProfileSubmit}
        />
      )}

      {showChatWidget && (
        <ChatWidget
          isOpen={showChatWidget}
          onClose={handleCloseChat}
          isLoggedIn={isLoggedIn}
        />
      )}

      <AppFooter />
    </Layout>
  );
}
