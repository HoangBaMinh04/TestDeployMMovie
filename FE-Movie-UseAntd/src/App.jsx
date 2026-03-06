import { useCallback, useEffect, useRef, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import "./App.css";
import MovieBrowser from "./components/movie-browser/MovieBrowser";
import MovieDetailPage from "./components/movie-detail/MovieDetailPage";
import PaymentResultPage from "./components/payment/PaymentResultPage";
import PaymentStatusBanner from "./components/payment/PaymentStatusBanner";
import {
  PAYMENT_GATEWAY_WINDOW_REF,
  PAYMENT_RESULT_CHANNEL,
  PAYMENT_RESULT_STORAGE_KEY,
} from "./components/payment/paymentIntegration";
import ContactPage from "./components/contact/ContactPage";
import AdminDashboard from "./components/admin/AdminDashboard";
import CountryAdminPage from "./components/admin/CountryManagementPanel";

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [paymentAlert, setPaymentAlert] = useState(null);
  const lastPaymentEventRef = useRef(null);

  const showPaymentOutcome = useCallback(
    (status) => {
      if (!status) {
        return;
      }

      if (status === "success") {
        setPaymentAlert({
          status: "success",
          message: "Thanh toán thành công! Cảm ơn bạn đã đặt vé.",
        });
      } else {
        setPaymentAlert({
          status: "error",
          message: "Thanh toán không thành công. Vui lòng thử lại.",
        });
      }

      if (location.pathname !== "/") {
        navigate("/", { replace: false });
      }

      if (typeof window !== "undefined") {
        try {
          const paymentWindow = window[PAYMENT_GATEWAY_WINDOW_REF];
          if (paymentWindow && !paymentWindow.closed) {
            paymentWindow.close();
          }
        } catch (error) {
          console.warn("Không đóng được cửa sổ thanh toán", error);
        } finally {
          window[PAYMENT_GATEWAY_WINDOW_REF] = null;
        }

        window.focus?.();
      }
    },
    [location.pathname, navigate]
  );

  const handleIncomingPaymentResult = useCallback(
    (payload) => {
      if (!payload || typeof payload !== "object") {
        return;
      }

      const normalizedStatus =
        payload.status === "success" ? "success" : "failure";
      const eventId =
        payload.id || `${normalizedStatus}:${payload.timestamp || Date.now()}`;

      if (lastPaymentEventRef.current === eventId) {
        return;
      }

      lastPaymentEventRef.current = eventId;

      if (typeof window !== "undefined") {
        try {
          window.localStorage?.removeItem(PAYMENT_RESULT_STORAGE_KEY);
        } catch (error) {
          console.warn(
            "Không xóa được trạng thái thanh toán khỏi bộ nhớ",
            error
          );
        }
      }

      showPaymentOutcome(normalizedStatus);
    },
    [showPaymentOutcome]
  );

  useEffect(() => {
    const paymentStatus = location.state?.paymentStatus;
    if (!paymentStatus) {
      return;
    }

    handleIncomingPaymentResult({
      status: paymentStatus,
      id: location.state?.paymentEventId,
    });

    navigate(location.pathname, {
      replace: true,
      state: { ...(location.state ?? {}), paymentStatus: undefined },
    });
  }, [handleIncomingPaymentResult, location, navigate]);

  useEffect(() => {
    const handlePaymentMessage = (event) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      const data = event.data;
      if (!data || data.type !== "payment_result") {
        return;
      }

      handleIncomingPaymentResult(data);
    };

    window.addEventListener("message", handlePaymentMessage);
    return () => window.removeEventListener("message", handlePaymentMessage);
  }, [handleIncomingPaymentResult]);

  useEffect(() => {
    const handleStorage = (event) => {
      if (
        event.storageArea !== window.localStorage ||
        event.key !== PAYMENT_RESULT_STORAGE_KEY ||
        !event.newValue
      ) {
        return;
      }

      try {
        const parsed = JSON.parse(event.newValue);
        handleIncomingPaymentResult(parsed);
      } catch (error) {
        console.warn("Không đọc được kết quả thanh toán từ storage", error);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [handleIncomingPaymentResult]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") {
      return undefined;
    }

    let channel;

    try {
      channel = new BroadcastChannel(PAYMENT_RESULT_CHANNEL);
    } catch (error) {
      console.warn("Không tạo được broadcast channel thanh toán", error);
      return undefined;
    }

    const handleChannelMessage = (event) => {
      handleIncomingPaymentResult(event.data);
    };

    channel.onmessage = handleChannelMessage;

    return () => {
      channel.onmessage = null;
      channel.close();
    };
  }, [handleIncomingPaymentResult]);

  useEffect(() => {
    try {
      const raw = window.localStorage?.getItem(PAYMENT_RESULT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        handleIncomingPaymentResult(parsed);
      }
    } catch (error) {
      console.warn("Không tải được kết quả thanh toán từ bộ nhớ", error);
    }
  }, [handleIncomingPaymentResult]);

  useEffect(() => {
    if (!paymentAlert) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setPaymentAlert(null);
    }, 6000);

    return () => clearTimeout(timer);
  }, [paymentAlert]);

  return (
    <>
      <PaymentStatusBanner
        status={paymentAlert?.status}
        message={paymentAlert?.message}
        onClose={() => setPaymentAlert(null)}
      />
      <Routes>
        <Route path="/" element={<MovieBrowser />} />
    
        <Route path="/:slug1" element={<MovieBrowser />} />

        <Route path="/:slug1/:slug2" element={<MovieBrowser />} />

        <Route path="/movies/:movieSlug" element={<MovieDetailPage />} />

        <Route path="/payment/result" element={<PaymentResultPage />} />
        <Route path="/payment-result" element={<PaymentResultPage />} />
        <Route path="/contact" element={<ContactPage />} />

        <Route
          path="/admin"
          element={<Navigate to="/admin/dashboard" replace />}
        />
        <Route path="/admin/dashboard/*" element={<AdminDashboard />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
