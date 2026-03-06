import { Link } from "react-router-dom";
import { Layout, Input, Button, Dropdown, Space, Avatar } from "antd";
import {
  SearchOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  RobotOutlined,
  LogoutOutlined,
  LockOutlined,
  DownOutlined,
} from "@ant-design/icons";
import logo from "../../assets/Images/Logo/Logo_M_Movie.png";

const { Header } = Layout;

const headerOuterStyle = {
  background: "#1a1a1a",
  position: "sticky",
  top: 0,
  zIndex: 1000,
  width: "100%",
};

const headerInnerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  height: 64,
  maxWidth: 1200,
  margin: "0 auto",
  padding: "0 24px",
};

const logoStyle = {
  height: 40,
};

const searchContainerStyle = {
  flex: 1,
  display: "flex",
  justifyContent: "center",
  maxWidth: 400,
  margin: "0 24px",
};

const actionsStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const linkButtonStyle = {
  color: "rgba(255, 255, 255, 0.85)",
  fontWeight: 500,
};

export default function HeaderBar({
  query,
  onQueryChange,
  onLogin,
  onLogout,
  onChangePassword,
  onOrders,
  onProfile,
  fullName,
  onChat,
  isLoggedIn,
  showSearch = true,
}) {
  const displayName = fullName?.trim() ? fullName.trim() : "bạn";

  const userMenuItems = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Thông tin cá nhân",
      onClick: onProfile,
    },
    {
      key: "changePassword",
      icon: <LockOutlined />,
      label: "Đổi mật khẩu",
      onClick: onChangePassword,
    },
  ];

  return (
    <Header style={headerOuterStyle}>
      <div style={headerInnerStyle}>
        <Link to="/">
          <img src={logo} alt="M-Movie" style={logoStyle} />
        </Link>

      {showSearch ? (
        <div style={searchContainerStyle}>
          <Input
            placeholder="Nhập tên phim bạn muốn tìm kiếm..."
            prefix={<SearchOutlined style={{ color: "rgba(255,255,255,0.5)" }} />}
            value={query}
            onChange={(e) => onQueryChange?.(e.target.value)}
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              borderColor: "rgba(255, 255, 255, 0.2)",
              color: "#fff",
              borderRadius: 20,
            }}
            allowClear
          />
        </div>
      ) : (
        <div style={{ flex: 1 }} />
      )}

      <Space style={actionsStyle}>
        {isLoggedIn ? (
          <>
            <Dropdown
              menu={{ items: userMenuItems }}
              trigger={["click"]}
              placement="bottomRight"
            >
              <Button type="text" style={linkButtonStyle}>
                <Space>
                  <Avatar size="small" icon={<UserOutlined />} />
                  Hi, {displayName}
                  <DownOutlined style={{ fontSize: 10 }} />
                </Space>
              </Button>
            </Dropdown>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={onLogout}
              style={linkButtonStyle}
            >
              Đăng xuất
            </Button>
          </>
        ) : (
          <Button type="text" onClick={onLogin} style={linkButtonStyle}>
            Đăng nhập
          </Button>
        )}

        <Button
          type="text"
          icon={<ShoppingCartOutlined />}
          onClick={onOrders}
          style={linkButtonStyle}
        >
          Đơn hàng
        </Button>

        <Button
          type="primary"
          icon={<RobotOutlined />}
          onClick={onChat}
          style={{ borderRadius: 16 }}
        >
          Chat AI
        </Button>
      </Space>
      </div>
    </Header> 
  );
}
