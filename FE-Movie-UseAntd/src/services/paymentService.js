import { http } from "../api/http";

const PAYMENT_CREATE_ENDPOINTS = [
  "/Payment",
  "/Payments",
  "/Payment/create",
  "/Payments/create",
];

const PAYMENT_URL_ENDPOINTS = [
  (id) => `/Payment/${id}/payment-url`,
  (id) => `/Payments/${id}/payment-url`,
  (id) => `/Payment/payment-url/${id}`,
  (id) => `/Payments/payment-url/${id}`,
];

export function extractPaymentId(data) {
  if (data == null) return null;

  if (typeof data === "number" || typeof data === "bigint") {
    return Number(data);
  }

  if (typeof data === "string") {
    const numeric = Number(data);
    return Number.isFinite(numeric) ? numeric : data;
  }

  const candidates = [
    data.id,
    data.paymentId,
    data.paymentID,
    data.transactionId,
    data.result,
    data.value,
    data.data,
  ];

  for (const candidate of candidates) {
    if (candidate == null || candidate === "") continue;
    if (typeof candidate === "number" || typeof candidate === "bigint") {
      return Number(candidate);
    }
    if (typeof candidate === "string") {
      const numeric = Number(candidate);
      return Number.isFinite(numeric) ? numeric : candidate;
    }
  }

  return null;
}

export function extractPaymentUrl(data) {
  if (!data) return "";

  if (typeof data === "string") {
    return data;
  }

  if (typeof data.paymentUrl === "string") {
    return data.paymentUrl;
  }

  if (typeof data.url === "string") {
    return data.url;
  }

  if (typeof data.redirectUrl === "string") {
    return data.redirectUrl;
  }

  if (typeof data.data === "string") {
    return data.data;
  }

  if (data.data && typeof data.data.paymentUrl === "string") {
    return data.data.paymentUrl;
  }

  return "";
}

export async function createPaymentSession(payload = {}, opts = {}) {
  const requestPayload = {
    orderId:
      payload.orderId ??
      payload.OrderId ??
      payload.orderID ??
      payload.OrderID ??
      payload.orderCode ??
      null,
    provider: payload.provider || payload.Provider || "VNPay",
    returnUrl: payload.returnUrl || payload.ReturnUrl || payload.returnURL,
  };

  const extraFields = {
    OrderId: requestPayload.orderId,
    Provider: requestPayload.provider,
    ReturnUrl: requestPayload.returnUrl,
    returnURL: requestPayload.returnUrl,
  };

  const body = {
    ...payload,
    ...extraFields,
    ...requestPayload,
  };

  let lastError = null;

  for (const endpoint of PAYMENT_CREATE_ENDPOINTS) {
    try {
      const response = await http.post(endpoint, body, {
        signal: opts.signal,
      });

      const data = response?.data ?? null;

      return {
        data,
        paymentId: extractPaymentId(data),
        endpoint,
      };
    } catch (error) {
      if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
        throw error;
      }

      if (error?.response?.status === 404 || error?.response?.status === 405) {
        lastError = error;
        continue;
      }

      lastError = error;
      break;
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error("Không tạo được phiên thanh toán. Vui lòng thử lại sau.");
}

export async function fetchPaymentUrl(paymentId, opts = {}) {
  if (paymentId == null || paymentId === "") {
    throw new Error("PaymentId không hợp lệ");
  }

  const params = { ...(opts.params || {}) };
  if (opts.returnUrl) {
    params.returnUrl = opts.returnUrl;
  }

  let lastError = null;

  for (const buildEndpoint of PAYMENT_URL_ENDPOINTS) {
    const endpoint = buildEndpoint(paymentId);
    try {
      const response = await http.get(endpoint, {
        params,
        signal: opts.signal,
      });

      const data = response?.data ?? null;
      const url = extractPaymentUrl(data);

      if (url) {
        return {
          data,
          url,
          endpoint,
        };
      }

      lastError = new Error("Không nhận được URL thanh toán hợp lệ.");
    } catch (error) {
      if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
        throw error;
      }

      if (error?.response?.status === 404 || error?.response?.status === 405) {
        lastError = error;
        continue;
      }

      lastError = error;
      break;
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error("Không lấy được URL thanh toán. Vui lòng thử lại.");
}

export default {
  createPaymentSession,
  fetchPaymentUrl,
  extractPaymentId,
  extractPaymentUrl,
};
