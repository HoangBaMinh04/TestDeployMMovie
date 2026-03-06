import { http } from "../api/http";

// coi "", "null", "undefined" là null
function toNullOrValue(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (s.toLowerCase() === "null" || s.toLowerCase() === "undefined")
    return null;
  return s;
}

// ép number hoặc null
function toNumberOrNull(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// chuẩn hoá ISO cho date input "YYYY-MM-DD"
function toIsoOrNull(dateStr) {
  const s = typeof dateStr === "string" ? dateStr.trim() : "";
  if (!s) return null;
  // nếu đã là ISO thì giữ nguyên
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s))
    return new Date(`${s}T00:00:00Z`).toISOString();
  return null;
}

// làm sạch payload trước khi gửi lên BE
function sanitizeMoviePayload(input) {
  const p = { ...(input || {}) };

  // các field text có thể rỗng -> null
  p.slug = toNullOrValue(p.slug);
  p.description = toNullOrValue(p.description);
  p.trailerUrl = toNullOrValue(p.trailerUrl);
  p.thumbnailUrl = toNullOrValue(p.thumbnailUrl);
  p.posterUrl = toNullOrValue(p.posterUrl);

  // chuẩn hoá số
  p.year = toNumberOrNull(p.year);
  p.duration = toNumberOrNull(p.duration);
  p.countryId = toNumberOrNull(p.countryId);

  // enum có thể là số hoặc chuỗi số -> ép số nếu có thể
  if (p.quality != null && /^\d+$/.test(String(p.quality)))
    p.quality = Number(p.quality);
  if (p.ageRating != null && /^\d+$/.test(String(p.ageRating)))
    p.ageRating = Number(p.ageRating);

  // ngày
  p.releaseDate = toIsoOrNull(p.releaseDate);

  // categories: đảm bảo đúng shape
  if (Array.isArray(p.categories)) {
    p.categories = p.categories
      .map((c) => ({
        categoryId: toNumberOrNull(c && c.categoryId),
        isPrimary: Boolean(c && c.isPrimary),
        displayOrder: toNumberOrNull(c && c.displayOrder) ?? 0,
      }))
      .filter((c) => c.categoryId != null);
  }

  // bỏ key = null để payload gọn
  Object.keys(p).forEach((k) => {
    if (p[k] === null) delete p[k];
  });

  return p;
}

export async function getMovies(opts = {}) {
  const res = await http.get("/Movie", { signal: opts.signal });
  return res.data;
}

function normalizeIdentifier(value) {
  if (value == null) return null;
  const raw = typeof value === "string" ? value.trim() : value;
  if (raw === "") return null;
  return raw;
}

function isNumericId(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0;
  }
  if (typeof value === "string") {
    return /^\d+$/.test(value);
  }
  return false;
}

async function fetchMovieBySlug(slug, opts = {}) {
  const searchTerm = String(slug);

  const res = await http.get("/Movie/paged", {
    params: { pageNumber: 1, pageSize: 1, searchTerm },
    signal: opts.signal,
  });

  const items = (res && res.data && (res.data.items ?? res.data.Items)) || [];
  if (Array.isArray(items) && items.length > 0) return items[0];

  const error = new Error("Movie not found");
  error.status = 404;
  throw error;
}

export async function getAllMoviesIncludingDeleted(opts = {}) {
  const res = await http.get("/Movie/all-including-deleted", {
    signal: opts.signal,
  });
  return res.data;
}

export async function getMovieBySlug(slug, opts = {}) {
  const identifier = normalizeIdentifier(slug);
  if (identifier == null) throw new Error("Movie slug is required");
  return fetchMovieBySlug(identifier, opts);
}

export async function getMovieById(idOrSlug, opts = {}) {
  const identifier = normalizeIdentifier(idOrSlug);
  if (identifier == null) throw new Error("Movie id is required");

  if (isNumericId(identifier)) {
    const numericId = Number(identifier);
    const res = await http.get(`/Movie/${numericId}`, { signal: opts.signal });
    return res.data;
  }
  return fetchMovieBySlug(identifier, opts);
}

export async function getMoviesByCategory(categoryId, opts = {}) {
  const res = await http.get(`/Movie/by-category/${categoryId}`, {
    signal: opts.signal,
  });
  return res.data;
}

export async function getNowShowingMovies(opts = {}) {
  const res = await http.get("/Movie/now-showing", { signal: opts.signal });
  return res.data;
}

export async function getComingSoonMovies(opts = {}) {
  const res = await http.get("/Movie/coming-soon", { signal: opts.signal });
  return res.data;
}

export async function getMoviesByCountry(countryId, opts = {}) {
  const res = await http.get(`/Movie/by-country/${countryId}`, {
    signal: opts.signal,
  });
  return res.data;
}

export async function getMoviesByCinema(cinemaId, opts = {}) {
  const res = await http.get(`/Movie/by-cinema/${cinemaId}`, {
    signal: opts.signal,
  });
  return res.data;
}

export async function searchMoviesByName(name, opts = {}) {
  const res = await http.get(`/Movie/by-name/${encodeURIComponent(name)}`, {
    signal: opts.signal,
  });
  return res.data;
}

export async function getMoviesFiltered(
  { categoryId, countryId, cinemaId, q },
  opts = {}
) {
  const params = {};
  if (categoryId != null) params.categoryId = categoryId;
  if (countryId != null) params.countryId = countryId;
  if (cinemaId != null) params.cinemaId = cinemaId;
  if (q && q.trim()) params.q = q.trim();

  const res = await http.get("/Movie/filter", { params, signal: opts.signal });
  return res.data;
}

export async function getMoviesPaged(
  {
    pageNumber = 1,
    pageSize = 12,
    searchTerm = "",
    sortBy = "name",
    sortDescending = false,
    categoryId,
    countryId,
  },
  opts = {}
) {
  const params = { pageNumber, pageSize, sortBy, sortDescending };
  if (searchTerm && searchTerm.trim()) params.searchTerm = searchTerm.trim();
  if (categoryId != null) params.categoryId = categoryId;
  if (countryId != null) params.countryId = countryId;

  const res = await http.get("/Movie/paged", { params, signal: opts.signal });
  return res.data;
}

export async function getMoviesPagedAdmin(
  {
    pageNumber = 1,
    pageSize = 20,
    searchTerm = "",
    sortBy = "name",
    sortDescending = false,
    categoryId,
    countryId,
    includeDeleted = true,
  },
  opts = {}
) {
  const params = { pageNumber, pageSize, sortBy, sortDescending };
  if (searchTerm?.trim()) params.searchTerm = searchTerm.trim();
  if (categoryId != null) params.categoryId = categoryId;
  if (countryId != null) params.countryId = countryId;
  if (includeDeleted) params.includeDeleted = true;

  const res = await http.get("/Movie/paged-admin", {
    params,
    signal: opts.signal,
  });
  return res.data;
}

export async function createMovie(payload, opts = {}) {
  if (!payload || typeof payload !== "object")
    throw new Error("Movie payload must be an object");
  const body = sanitizeMoviePayload(payload);
  const res = await http.post("/Movie", body, {
    signal: opts.signal,
    headers: { "Content-Type": "application/json" },
  });
  return res.data;
}

export async function updateMovie(id, payload, opts = {}) {
  if (id == null) throw new Error("Movie id is required");
  const body = sanitizeMoviePayload({ ...(payload || {}), id });
  const res = await http.put(`/Movie/${id}`, body, {
    signal: opts.signal,
    headers: { "Content-Type": "application/json" },
  });
  return res.data;
}

export async function deleteMovie(id, opts = {}) {
  if (id == null) throw new Error("Movie id is required");
  await http.delete(`/Movie/${id}`, { signal: opts.signal });
}

export async function toggleMovieDelete(id, opts = {}) {
  if (id == null) throw new Error("Movie id is required");
  const res = await http.patch(`/Movie/${id}/toggle-delete`, null, {
    signal: opts.signal,
  });
  return res.data;
}
