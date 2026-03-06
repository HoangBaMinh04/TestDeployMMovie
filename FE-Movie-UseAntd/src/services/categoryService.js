import { http } from "../api/http";

const BASE_PATH = "/category";

export async function getCategories(opts = {}) {
  const res = await http.get(BASE_PATH, { signal: opts.signal });
  if (!Array.isArray(res.data)) {
    console.error("Category API returned non-array:", res.data);
    throw new Error("Category API must return an array");
  }
  return res.data;
}

export async function getCategory(id, opts = {}) {
  if (id == null) {
    throw new Error("Category id is required");
  }

  const res = await http.get(`${BASE_PATH}/${id}`, { signal: opts.signal });
  return res.data;
}

export async function getPagedCategories(params = {}, opts = {}) {
  const query = {
    pageNumber: params.pageNumber ?? 1,
    pageSize: params.pageSize ?? 10,
    searchTerm: params.searchTerm ?? "",
    sortBy: params.sortBy ?? "name",
    sortDescending: params.sortDescending ?? false,
  };

  const res = await http.get(`${BASE_PATH}/paged`, {
    params: query,
    signal: opts.signal,
  });

  return res.data;
}

export async function getCategoriesByName(name, opts = {}) {
  const trimmed = typeof name === "string" ? name.trim() : "";

  if (!trimmed) {
    return [];
  }

  const res = await http.get(
    `${BASE_PATH}/by-name/${encodeURIComponent(trimmed)}`,
    { signal: opts.signal }
  );

  if (!Array.isArray(res.data)) {
    console.error("Category search API returned non-array:", res.data);
    throw new Error("Category search API must return an array");
  }

  return res.data;
}

export async function createCategory(payload, opts = {}) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Category payload must be an object");
  }

  const res = await http.post(BASE_PATH, payload, { signal: opts.signal });
  return res.data;
}

export async function updateCategory(id, payload, opts = {}) {
  if (id == null) {
    throw new Error("Category id is required");
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

export async function deleteCategory(id, opts = {}) {
  if (id == null) {
    throw new Error("Category id is required");
  }

  await http.delete(`${BASE_PATH}/${id}`, { signal: opts.signal });
}
