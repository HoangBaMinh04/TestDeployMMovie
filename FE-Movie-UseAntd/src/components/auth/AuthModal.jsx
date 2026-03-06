import { useCallback, useEffect, useState } from "react";
import { Modal } from "antd";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import ForgotForm from "./ForgotForm";
import ChangePasswordForm from "./ChangePasswordForm";

const VIEWS = {
  LOGIN: "login",
  REGISTER: "register",
  FORGOT: "forgot",
  CHANGE_PASSWORD: "changePassword",
};

const modalStyles = {
  content: {
    padding: 0,
    borderRadius: 12,
    overflow: "hidden",
  },
  body: {
    padding: "32px 24px",
  },
};

export default function AuthModal({
  onClose,
  onLoginSuccess,
  onChangePasswordSuccess,
  initialView = VIEWS.LOGIN,
}) {
  const [view, setView] = useState(initialView);

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const handleLoginSuccess = useCallback(
    (payload) => {
      onLoginSuccess?.(payload);
    },
    [onLoginSuccess]
  );

  const handleChangePasswordSuccess = useCallback(() => {
    onChangePasswordSuccess?.();
    handleClose();
  }, [onChangePasswordSuccess, handleClose]);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  const getTitle = () => {
    switch (view) {
      case VIEWS.LOGIN:
        return "Đăng nhập";
      case VIEWS.REGISTER:
        return "Đăng ký tài khoản";
      case VIEWS.FORGOT:
        return "Quên mật khẩu";
      case VIEWS.CHANGE_PASSWORD:
        return "Đổi mật khẩu";
      default:
        return "";
    }
  };

  return (
    <Modal
      open={true}
      onCancel={handleClose}
      footer={null}
      title={getTitle()}
      centered
      width={420}
      styles={modalStyles}
      destroyOnClose
    >
      {view === VIEWS.LOGIN && (
        <LoginForm
          onDone={handleLoginSuccess}
          goRegister={() => setView(VIEWS.REGISTER)}
          goForgot={() => setView(VIEWS.FORGOT)}
        />
      )}

      {view === VIEWS.REGISTER && (
        <RegisterForm goLogin={() => setView(VIEWS.LOGIN)} />
      )}

      {view === VIEWS.FORGOT && (
        <ForgotForm goLogin={() => setView(VIEWS.LOGIN)} />
      )}

      {view === VIEWS.CHANGE_PASSWORD && (
        <ChangePasswordForm
          goLogin={() => setView(VIEWS.LOGIN)}
          onSuccess={handleChangePasswordSuccess}
        />
      )}
    </Modal>
  );
}
