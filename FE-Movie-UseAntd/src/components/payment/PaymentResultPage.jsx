import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  PAYMENT_RESULT_CHANNEL,
  PAYMENT_RESULT_STORAGE_KEY,
} from "./paymentIntegration";

const SUCCESS_CODES = new Set([
  "0",
  "00",
  "success",
  "successful",
  "completed",
  "true",
]);

function detectSuccess(params) {
  const normalized = (value) =>
    value == null ? "" : String(value).trim().toLowerCase();

  const directKeys = [
    "success",
    "status",
    "state",
    "result",
    "paymentStatus",
    "payment_status",
    "transactionStatus",
    "transaction_status",
    "code",
    "message",
  ];

  for (const key of directKeys) {
    const value = normalized(params.get(key));
    if (!value) continue;
    if (SUCCESS_CODES.has(value)) {
      return true;
    }
  }

  const vnPayCode = normalized(params.get("vnp_ResponseCode"));
  if (vnPayCode && SUCCESS_CODES.has(vnPayCode)) {
    return true;
  }

  const vnPayStatus = normalized(params.get("vnp_TransactionStatus"));
  if (vnPayStatus && SUCCESS_CODES.has(vnPayStatus)) {
    return true;
  }

  return false;
}

function extractOrderRef(params) {
  const keys = [
    "order",
    "orderCode",
    "orderId",
    "orderID",
    "order_id",
    "txnRef",
    "vnp_TxnRef",
    "transaction",
  ];

  for (const key of keys) {
    const value = params.get(key);
    if (value != null && value !== "") {
      return value;
    }
  }

  return null;
}

export default function PaymentResultPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const query = useMemo(
    () => new URLSearchParams(location.search || ""),
    [location.search]
  );

  useEffect(() => {
    const paymentSuccess = detectSuccess(query);
    const orderRef = extractOrderRef(query);

    const eventId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const payload = {
      type: "payment_result",
      status: paymentSuccess ? "success" : "failure",
      orderRef,
      timestamp: Date.now(),
      id: eventId,
    };

    const targetOrigin = window.location.origin;

    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(payload, targetOrigin);
        window.opener.focus?.();
      }
    } catch (error) {
      console.warn("Không gửi được thông báo kết quả thanh toán", error);
    }

    

    const closeWindow = () => {
      try {
        window.close();
      } catch (error) {
        console.warn("Không tự đóng được cửa sổ thanh toán", error);
      }
    };

    const timer = setTimeout(closeWindow, 400);

    if (!window.opener || window.opener.closed) {
      if (paymentSuccess) {
        navigate("/", { replace: true, state: { paymentStatus: "success" } });
      } else {
        navigate("/", { replace: true, state: { paymentStatus: "failure" } });
      }
    }

    return () => {
      clearTimeout(timer);
    };
  }, [navigate, query]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        padding: "24px",
        gap: "16px",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Đang xử lý thanh toán</h1>
      <p style={{ maxWidth: 420, color: "#475569" }}>
        Cổng thanh toán đã gửi phản hồi. Nếu cửa sổ này không tự đóng, vui lòng
        đóng thủ công và quay lại trang mua vé.
      </p>
    </main>
  );
}
