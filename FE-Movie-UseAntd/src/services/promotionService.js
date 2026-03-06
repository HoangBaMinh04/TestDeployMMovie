import { http } from "../api/http";
const BASE_PATH = "/Promotion";

export async function getActivePromotions(opts = {}) {
  const res = await http.get(`${BASE_PATH}/active`, {
    signal: opts.signal,
  });

  const data = Array.isArray(res.data) ? res.data : res.data?.items || [];
  return data;
}

export async function getAllPromotions(opts = {}) {
  const res = await http.get(BASE_PATH, { signal: opts.signal });
  const data = Array.isArray(res.data) ? res.data : [];
  return data;
}

export async function getPromotion(id, opts = {}) {
  if (id == null) {
    throw new Error("Promotion id is required");
  }

  const res = await http.get(`${BASE_PATH}/${id}`, {
    signal: opts.signal,
  });

  return res.data;
}

export async function getPromotionByCode(code, opts = {}) {
  const trimmed = typeof code === "string" ? code.trim() : "";
  if (!trimmed) {
    throw new Error("Promotion code is required");
  }

  const res = await http.get(
    `${BASE_PATH}/by-code/${encodeURIComponent(trimmed)}`,
    {
      signal: opts.signal,
    }
  );

  return res.data;
}

export async function getPagedPromotions(params = {}, opts = {}) {
  const query = {
    pageNumber: params.pageNumber ?? 1,
    pageSize: params.pageSize ?? 10,
    searchTerm: params.searchTerm ?? "",
    sortBy: params.sortBy ?? "name",
    sortDescending: params.sortDescending ?? false,
  };

  if (params.isActive !== undefined && params.isActive !== null) {
    query.isActive = params.isActive;
  }

  const res = await http.get(`${BASE_PATH}/paged`, {
    params: query,
    signal: opts.signal,
  });

  return res.data;
}

export async function createPromotion(payload, opts = {}) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Promotion payload must be an object");
  }

  const res = await http.post(BASE_PATH, payload, {
    signal: opts.signal,
  });

  return res.data;
}

export async function updatePromotion(id, payload, opts = {}) {
  if (id == null) {
    throw new Error("Promotion id is required");
  }

  const body = { ...(payload || {}), id };

  const res = await http.put(`${BASE_PATH}/${id}`, body, {
    signal: opts.signal,
  });

  return res.data;
}

export async function deletePromotion(id, opts = {}) {
  if (id == null) {
    throw new Error("Promotion id is required");
  }

  await http.delete(`${BASE_PATH}/${id}`, { signal: opts.signal });
}

export async function togglePromotionActive(id, opts = {}) {
  if (id == null) {
    throw new Error("Promotion id is required");
  }

  await http.post(`${BASE_PATH}/${id}/toggle-active`, null, {
    signal: opts.signal,
  });
}

export async function validatePromotionCode(payload, opts = {}) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Payload is required to validate promotion code");
  }

  const rawAmount =
    payload.orderAmount != null ? payload.orderAmount : payload.amount;

  let numericAmount = 0;
  if (typeof rawAmount === "number") {
    numericAmount = rawAmount;
  } else if (typeof rawAmount === "string") {
    const cleaned = rawAmount.replace(/[^0-9.,-]/g, "");
    // Dấu phẩy thường được dùng làm phân cách thập phân ở VN
    const normalized = cleaned.replace(/,/g, "");
    numericAmount = Number(normalized);
  }

  if (!Number.isFinite(numericAmount) || numericAmount < 0) {
    numericAmount = 0;
  }

  const body = {
    code: (payload.code || payload.promotionCode || "").trim(),
    orderAmount: numericAmount,
    userId: payload.userId ?? payload.customerId ?? null,
  };

  const res = await http.post(`${BASE_PATH}/validate`, body, {
    signal: opts.signal,
  });

  return res.data;
}

export default {
  getAllPromotions,
  getPagedPromotions,
  getPromotion,
  getPromotionByCode,
  createPromotion,
  updatePromotion,
  deletePromotion,
  togglePromotionActive,
  getActivePromotions,
  validatePromotionCode,
};
