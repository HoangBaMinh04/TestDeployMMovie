import { http } from "../api/http";

const BASE_PATH = "/PriceRule";

export async function getPriceRuleById(id, opts = {}) {
  if (id == null) {
    throw new Error("Price rule id is required");
  }

  const response = await http.get(`${BASE_PATH}/${id}`, {
    signal: opts.signal,
  });

  return response.data;
}

export async function getPriceRulesByCinema(cinemaId, opts = {}) {
  if (cinemaId == null) {
    throw new Error("Cinema id is required to load price rules");
  }

  const response = await http.get(`${BASE_PATH}/by-cinema/${cinemaId}`, {
    signal: opts.signal,
  });

  const data = Array.isArray(response.data) ? response.data : [];
  return data;
}

export async function getActivePriceRules(cinemaId, opts = {}) {
  if (cinemaId == null) {
    throw new Error("Cinema id is required to load active rules");
  }

  const response = await http.get(`${BASE_PATH}/active/${cinemaId}`, {
    signal: opts.signal,
  });

  const data = Array.isArray(response.data) ? response.data : [];
  return data;
}

export async function getPagedPriceRules(params = {}, opts = {}) {
  const query = {
    pageNumber: params.pageNumber ?? 1,
    pageSize: params.pageSize ?? 10,
    searchTerm: params.searchTerm ?? "",
    sortBy: params.sortBy ?? "priority",
    sortDescending: params.sortDescending ?? false,
  };

  if (params.cinemaId != null && params.cinemaId !== "") {
    query.cinemaId = params.cinemaId;
  }

  if (params.isActive !== undefined && params.isActive !== null) {
    query.isActive = params.isActive;
  }

  if (params.tier) {
    query.tier = params.tier;
  }

  const response = await http.get(`${BASE_PATH}/paged`, {
    params: query,
    signal: opts.signal,
  });

  return response.data;
}

export async function createPriceRule(payload, opts = {}) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Price rule payload must be an object");
  }

  const response = await http.post(BASE_PATH, payload, {
    signal: opts.signal,
  });

  return response.data;
}

export async function updatePriceRule(id, payload, opts = {}) {
  if (id == null) {
    throw new Error("Price rule id is required");
  }

  const body = { ...(payload || {}), id };

  const response = await http.put(`${BASE_PATH}/${id}`, body, {
    signal: opts.signal,
  });

  return response.data;
}

export async function deletePriceRule(id, opts = {}) {
  if (id == null) {
    throw new Error("Price rule id is required");
  }

  await http.delete(`${BASE_PATH}/${id}`, { signal: opts.signal });
}

export async function togglePriceRuleActive(id, opts = {}) {
  if (id == null) {
    throw new Error("Price rule id is required");
  }

  await http.post(`${BASE_PATH}/${id}/toggle-active`, null, {
    signal: opts.signal,
  });
}

export async function calculatePriceWithRules(payload, opts = {}) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Payload is required to calculate price");
  }

  const response = await http.post(`${BASE_PATH}/calculate`, payload, {
    signal: opts.signal,
  });

  return response.data;
}

export default {
  getPagedPriceRules,
  getPriceRuleById,
  getPriceRulesByCinema,
  getActivePriceRules,
  createPriceRule,
  updatePriceRule,
  deletePriceRule,
  togglePriceRuleActive,
  calculatePriceWithRules,
};
