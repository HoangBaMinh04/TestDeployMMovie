import { http } from "../api/http";

const ORDER_BASE_ENDPOINT = "/Order";
const ORDER_MY_ENDPOINT = `${ORDER_BASE_ENDPOINT}/my-orders`;

function buildOrderPayload(basePayload = {}) {
  if (!basePayload || typeof basePayload !== "object") {
    return {};
  }

  const {
    showtimeId,
    seatIds = [],
    promotionCode,
    promotionId,
    subtotal,
    discount,
    total,
    tickets = [],
    userName,
    userEmail,
    userPhone,
  } = basePayload;

  const normalizedSeatIds = Array.from(
    new Set(
      (seatIds || [])
        .map((item) =>
          item == null || item === ""
            ? null
            : Number.isFinite(Number(item))
            ? Number(item)
            : item
        )
        .filter((item) => item !== null)
    )
  );

  const payload = {
    showtimeId:
      showtimeId ?? basePayload.showTimeId ?? basePayload.showtimeID ?? null,
    showTimeId: showtimeId ?? basePayload.showTimeId ?? null,
    showtimeID: showtimeId ?? basePayload.showtimeID ?? null,
    showTimeID: showtimeId ?? basePayload.showTimeID ?? null,
    seatIds: normalizedSeatIds,
    seats: normalizedSeatIds,
    seatIdList: normalizedSeatIds,
    showtimeSeatIds: normalizedSeatIds,
    showTimeSeatIds: normalizedSeatIds,
    seatCodes: basePayload.seatCodes || basePayload.seats || [],
    tickets: Array.isArray(tickets) ? tickets : [],
    items: Array.isArray(tickets) ? tickets : [],
    promotionCode: promotionCode || basePayload.promotionCode || null,
    promotionId: promotionId ?? basePayload.promotionId ?? null,
    discountAmount: discount ?? basePayload.discountAmount ?? null,
    totalAmount: total ?? basePayload.totalAmount ?? basePayload.amount ?? null,
    subTotal: subtotal ?? basePayload.subTotal ?? subtotal,
    orderAmount: total ?? basePayload.orderAmount ?? null,
    finalAmount: total ?? basePayload.finalAmount ?? null,
    userName: userName ?? basePayload.userName ?? basePayload.name ?? null,
    userEmail: userEmail ?? basePayload.userEmail ?? basePayload.email ?? null,
    userPhone: userPhone ?? basePayload.userPhone ?? basePayload.phone ?? null,
  };

  return {
    ...basePayload,
    ...payload,
  };
}

function extractOrderId(data) {
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
    data.orderId,
    data.orderID,
    data.orderCode,
    data.value,
    data.result,
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

export function extractOrdersList(data) {
  if (!data) return [];

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.orders)) return data.orders;
  if (Array.isArray(data?.orderList)) return data.orderList;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.value)) return data.value;
  if (Array.isArray(data?.list)) return data.list;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.results)) return data.data.results;
  if (Array.isArray(data?.payload)) return data.payload;
  if (Array.isArray(data?.payload?.items)) return data.payload.items;

  return [];
}

export async function getMyOrders(opts = {}) {
  const response = await http.get(ORDER_MY_ENDPOINT, { signal: opts.signal });
  return response?.data ?? [];
}

export async function createOrder(basePayload = {}, opts = {}) {
  const payload = buildOrderPayload(basePayload);
  const response = await http.post(ORDER_BASE_ENDPOINT, payload, {
    signal: opts.signal,
  });

  const data = response?.data ?? null;

  return {
    data,
    orderId: extractOrderId(data),
    endpoint: ORDER_BASE_ENDPOINT,
  };
}
export async function getOrderById(orderId, opts = {}) {
  if (orderId == null) throw new Error("orderId is required");
  const response = await http.get(`${ORDER_BASE_ENDPOINT}/${orderId}`, {
    signal: opts.signal,
  });
  return response?.data ?? null;
}

export async function getOrderDetail(orderId, opts = {}) {
  if (orderId == null) throw new Error("orderId is required");
  const response = await http.get(`${ORDER_BASE_ENDPOINT}/${orderId}/detail`, {
    signal: opts.signal,
  });
  return response?.data ?? null;
}

export async function getOrderByCode(orderCode, opts = {}) {
  if (!orderCode) throw new Error("orderCode is required");
  const encoded = encodeURIComponent(orderCode);
  const response = await http.get(`${ORDER_BASE_ENDPOINT}/by-code/${encoded}`, {
    signal: opts.signal,
  });
  return response?.data ?? null;
}
export async function getPendingOrders(opts = {}) {
  const response = await http.get(`${ORDER_BASE_ENDPOINT}/pending`, {
    signal: opts.signal,
  });
  return response?.data ?? [];
}

function buildQueryParams(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;

    if (typeof value === "boolean") {
      query.set(key, value ? "true" : "false");
      return;
    }
    query.set(key, value);
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

export async function getPagedOrders(request = {}, opts = {}) {
  const {
    pageNumber,
    pageSize,
    searchTerm,
    sortBy,
    sortDescending,
    userId,
    status,
  } = request || {};

  const query = buildQueryParams({
    pageNumber,
    pageSize,
    searchTerm,
    sortBy,
    sortDescending,
    userId,
    status,
  });

  const response = await http.get(`${ORDER_BASE_ENDPOINT}/paged${query}`, {
    signal: opts.signal,
  });

  return response?.data ?? { items: [], totalCount: 0 };
}

export async function cancelOrder(orderId, reason, opts = {}) {
  if (orderId == null) throw new Error("orderId is required");
  const payload = { reason: reason || null };
  await http.post(`${ORDER_BASE_ENDPOINT}/${orderId}/cancel`, payload, {
    signal: opts.signal,
  });
}

export async function expireOrder(orderId, opts = {}) {
  if (orderId == null) throw new Error("orderId is required");
  await http.post(`${ORDER_BASE_ENDPOINT}/${orderId}/expire`, null, {
    signal: opts.signal,
  });
}
export async function processExpiredOrders(opts = {}) {
  await http.post(`${ORDER_BASE_ENDPOINT}/process-expired`, null, {
    signal: opts.signal,
  });
}

const orderService = {
  getMyOrders,
  createOrder,
  getOrderById,
  getOrderDetail,
  getOrderByCode,
  getPendingOrders,
  getPagedOrders,
  cancelOrder,
  expireOrder,
  processExpiredOrders,
};

export default orderService;
