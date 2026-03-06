import { http } from "../api/http";

const BASE_PATH = "/room";

export async function getAllRooms(opts = {}) {
  const res = await http.get(BASE_PATH, { signal: opts.signal });
  const data = Array.isArray(res.data) ? res.data : [];
  return data;
}

export async function getRoom(id, opts = {}) {
  if (id == null) {
    throw new Error("Room id is required");
  }

  const res = await http.get(`${BASE_PATH}/${id}`, { signal: opts.signal });
  return res.data;
}

export async function getRoomsByCinema(cinemaId, opts = {}) {
  if (cinemaId == null) {
    throw new Error("Cinema id is required to filter rooms");
  }

  const res = await http.get(`${BASE_PATH}/by-cinema/${cinemaId}`, {
    signal: opts.signal,
  });

  const data = Array.isArray(res.data) ? res.data : [];
  return data;
}

export async function getPagedRooms(params = {}, opts = {}) {
  const query = {
    pageNumber: params.pageNumber ?? 1,
    pageSize: params.pageSize ?? 10,
    searchTerm: params.searchTerm ?? "",
    sortBy: params.sortBy ?? "name",
    sortDescending: params.sortDescending ?? false,
  };

  if (params.cinemaId != null && params.cinemaId !== "") {
    query.cinemaId = params.cinemaId;
  }

  const res = await http.get(`${BASE_PATH}/paged`, {
    params: query,
    signal: opts.signal,
  });

  return res.data;
}

export async function createRoom(payload, opts = {}) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Room payload must be an object");
  }

  const res = await http.post(BASE_PATH, payload, { signal: opts.signal });
  return res.data;
}

export async function updateRoom(id, payload, opts = {}) {
  if (id == null) {
    throw new Error("Room id is required");
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

export async function deleteRoom(id, opts = {}) {
  if (id == null) {
    throw new Error("Room id is required");
  }

  await http.delete(`${BASE_PATH}/${id}`, { signal: opts.signal });
}

export async function toggleRoomActive(id, opts = {}) {
  if (id == null) {
    throw new Error("Room id is required");
  }

  await http.post(`${BASE_PATH}/${id}/toggle-active`, null, {
    signal: opts.signal,
  });
}

export default {
  getAllRooms,
  getPagedRooms,
  getRoom,
  getRoomsByCinema,
  createRoom,
  updateRoom,
  deleteRoom,
  toggleRoomActive,
};
