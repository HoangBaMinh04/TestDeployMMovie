import { http } from "../api/http";

export async function getShowtimeById(id, opts = {}) {
  if (id == null || id === "") {
    throw new Error("Showtime id is required");
  }

  const res = await http.get(`/Showtime/${id}`, {
    signal: opts.signal,
  });

  return res.data;
}

export async function getShowtimesByMovie(movieId, opts = {}) {
  if (movieId == null || movieId === "") {
    throw new Error("Movie id is required to fetch showtimes");
  }

  const params = {};
  if (opts.date) {
    params.date = opts.date;
  }

  const res = await http.get(`/Showtime/by-movie/${movieId}`, {
    params,
    signal: opts.signal,
  });

  return res.data;
}

export async function getShowtimesByCinema(cinemaId, opts = {}) {
  if (cinemaId == null || cinemaId === "") {
    throw new Error("Cinema id is required to fetch showtimes");
  }

  const params = {};
  if (opts.date) {
    params.date = opts.date;
  }

  const res = await http.get(`/Showtime/by-cinema/${cinemaId}`, {
    params,
    signal: opts.signal,
  });

  return res.data;
}

function normalizeDateTime(input) {
  if (!input) {
    return null;
  }

  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) {
      return null;
    }
    return input.toISOString();
  }

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) {
      return null;
    }

    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date.toISOString();
  }

  return null;
}

export async function getPagedShowtimes(params = {}, opts = {}) {
  const query = {
    pageNumber: params.pageNumber ?? 1,
    pageSize: params.pageSize ?? 10,
    searchTerm: params.searchTerm ?? "",
    sortBy: params.sortBy ?? "startAt",
    sortDescending: params.sortDescending ?? false,
  };

  if (params.movieId != null && params.movieId !== "") {
    query.movieId = params.movieId;
  }

  if (params.cinemaId != null && params.cinemaId !== "") {
    query.cinemaId = params.cinemaId;
  }

  if (params.date) {
    query.date = params.date;
  }

  const res = await http.get(`/Showtime/paged`, {
    params: query,
    signal: opts.signal,
  });

  return res.data;
}

function sanitizeShowtimePayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Showtime payload must be an object");
  }

  const body = { ...payload };

  if (body.movieId != null) {
    body.movieId = Number(body.movieId);
  }

  if (body.cinemaId != null) {
    body.cinemaId = Number(body.cinemaId);
  }

  if (body.roomId != null) {
    body.roomId = Number(body.roomId);
  }

  if (body.basePrice != null) {
    const numericPrice = Number(body.basePrice);
    body.basePrice = Number.isFinite(numericPrice) ? numericPrice : 0;
  }

  body.startAt = normalizeDateTime(body.startAt);
  body.endAt = normalizeDateTime(body.endAt);

  if (typeof body.format === "string") {
    body.format = body.format.trim() || "2D";
  }

  if (typeof body.language === "string") {
    body.language = body.language.trim() || "VI";
  }

  if (typeof body.subtitle === "string") {
    body.subtitle = body.subtitle.trim() || "VI";
  }

  return body;
}

export async function createShowtime(payload, opts = {}) {
  const body = sanitizeShowtimePayload(payload);
  const res = await http.post(`/Showtime`, body, { signal: opts.signal });
  return res.data;
}

export async function updateShowtime(id, payload, opts = {}) {
  if (id == null || id === "") {
    throw new Error("Showtime id is required");
  }

  const body = sanitizeShowtimePayload({ ...(payload || {}), id });
  const res = await http.put(`/Showtime/${id}`, body, { signal: opts.signal });
  return res.data;
}

export async function deleteShowtime(id, opts = {}) {
  if (id == null || id === "") {
    throw new Error("Showtime id is required");
  }

  await http.delete(`/Showtime/${id}`, { signal: opts.signal });
}

export default {
  getShowtimeById,
  getShowtimesByMovie,
  getShowtimesByCinema,
  getPagedShowtimes,
  createShowtime,
  updateShowtime,
  deleteShowtime,
};
