import { http } from "../api/http";

const BASE_PATH = "/users";

export async function getPagedUsers(params = {}, opts = {}) {
  const query = {
    pageNumber: params.pageNumber ?? 1,
    pageSize: params.pageSize ?? 10,
    searchTerm: params.searchTerm ?? "",
    sortBy: params.sortBy ?? "createdAt",
    sortDescending: params.sortDescending ?? true,
  };

  if (typeof params.isActive === "boolean") {
    query.isActive = params.isActive;
  }

  if (typeof params.role === "string" && params.role.trim()) {
    query.role = params.role.trim();
  }

  const res = await http.get(BASE_PATH, {
    params: query,
    signal: opts.signal,
  });

  return res.data;
}

export async function getUserDetail(id, opts = {}) {
  if (id == null) {
    throw new Error("User id is required");
  }

  const res = await http.get(`${BASE_PATH}/${id}`, { signal: opts.signal });
  return res.data;
}

export async function createUser(payload, opts = {}) {
  if (!payload || typeof payload !== "object") {
    throw new Error("User payload must be an object");
  }

  const res = await http.post(BASE_PATH, payload, { signal: opts.signal });
  return res.data;
}

export async function updateUser(id, payload, opts = {}) {
  if (id == null) {
    throw new Error("User id is required");
  }

  const body = {
    ...(payload || {}),
    id,
  };

  const res = await http.put(`${BASE_PATH}/${id}`, body, {
    signal: opts.signal,
  });

  return res.data;
}

export async function setUserStatus(id, isActive, opts = {}) {
  if (id == null) {
    throw new Error("User id is required");
  }

  await http.patch(
    `${BASE_PATH}/${id}/status`,
    { isActive: Boolean(isActive) },
    { signal: opts.signal }
  );
}

export async function resetUserPassword(id, payload, opts = {}) {
  if (id == null) {
    throw new Error("User id is required");
  }

  const body = {
    ...(payload || {}),
  };

  await http.post(`${BASE_PATH}/${id}/reset-password`, body, {
    signal: opts.signal,
  });
}

export default {
  getPagedUsers,
  getUserDetail,
  createUser,
  updateUser,
  setUserStatus,
  resetUserPassword,
};