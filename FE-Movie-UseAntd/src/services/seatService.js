import { http } from "../api/http";
import { getShowtimeById } from "./showtimeService";
export const DEFAULT_SEAT_TIERS = ["Standard", "VIP", "Deluxe"];

function normalizeSeatStatus(rawStatus, seat = {}) {
  const lowered = typeof rawStatus === "string" ? rawStatus.toLowerCase() : "";

  if (seat.isActive === false || seat.active === false) {
    return "disabled";
  }

  if (
    seat.isBooked ||
    seat.booked ||
    seat.isReserved ||
    seat.reserved ||
    seat.isSold ||
    seat.sold ||
    seat.isUnavailable ||
    seat.unavailable ||
    lowered === "booked" ||
    lowered === "sold" ||
    lowered === "reserved" ||
    lowered === "occupied" ||
    lowered === "unavailable"
  ) {
    return "booked";
  }

  if (
    seat.isHolding ||
    seat.holding ||
    seat.onHold ||
    seat.hold ||
    lowered === "holding" ||
    lowered === "held" ||
    lowered === "pending"
  ) {
    return "held";
  }

  if (
    seat.isAvailable === false ||
    seat.available === false ||
    lowered === "disabled"
  ) {
    return "disabled";
  }

  return "available";
}

function extractRowColFromLabel(label) {
  if (typeof label !== "string") {
    return { row: null, col: null };
  }

  const trimmed = label.trim();
  if (!trimmed) return { row: null, col: null };

  const match = trimmed.match(/([A-Z]+)(\d+)/i);
  if (match) {
    const rowLetters = match[1].toUpperCase();
    const rowIndex = rowLetters.charCodeAt(0) - "A".charCodeAt(0) + 1;
    const colIndex = Number(match[2]);
    return {
      row: Number.isFinite(rowIndex) ? rowIndex : null,
      col: Number.isFinite(colIndex) ? colIndex : null,
    };
  }

  return { row: null, col: null };
}

function normalizeSeatItem(seat, fallback = {}) {
  if (!seat || typeof seat !== "object") return null;

  const id =
    seat.id ||
    seat.seatId ||
    seat.SeatId ||
    seat.showtimeSeatId ||
    seat.showTimeSeatId ||
    seat.ShowtimeSeatId ||
    seat.code ||
    seat.key ||
    null;

  const label =
    seat.label ||
    seat.name ||
    seat.code ||
    seat.seatNumber ||
    seat.seatLabel ||
    seat.seatName ||
    (typeof seat.row === "number" && typeof seat.col === "number"
      ? `${String.fromCharCode("A".charCodeAt(0) + seat.row - 1)}${seat.col}`
      : null) ||
    seat.ticketCode ||
    seat.position ||
    (fallback.row && fallback.col
      ? `${String.fromCharCode("A".charCodeAt(0) + fallback.row - 1)}${
          fallback.col
        }`
      : null) ||
    null;

  const { row: parsedRow, col: parsedCol } = extractRowColFromLabel(label);

  const row =
    seat.row ||
    seat.rowIndex ||
    seat.rowNumber ||
    seat.rowOrder ||
    parsedRow ||
    fallback.row ||
    null;

  const col =
    seat.col ||
    seat.columnIndex ||
    seat.colNumber ||
    seat.column ||
    seat.seatColumn ||
    parsedCol ||
    fallback.col ||
    null;

  const tierRaw =
    seat.tier ||
    seat.type ||
    seat.class ||
    seat.category ||
    seat.level ||
    (seat.isVip || seat.vip ? "VIP" : null) ||
    (seat.isDeluxe || seat.deluxe ? "Deluxe" : null) ||
    (seat.isSweetbox ? "Sweetbox" : null);

  const tier = typeof tierRaw === "string" ? tierRaw : null;

  const status = normalizeSeatStatus(
    seat.status || seat.state || seat.bookingStatus,
    seat
  );

  const priceRaw =
    seat.price ||
    seat.cost ||
    seat.amount ||
    seat.ticketPrice ||
    seat.priceInVnd ||
    seat.finalPrice ||
    seat.salePrice ||
    null;

  return {
    id,
    label: label || `Ghế ${row ?? ""}${col ?? ""}`,
    row: Number.isFinite(Number(row)) ? Number(row) : null,
    col: Number.isFinite(Number(col)) ? Number(col) : null,
    tier: tier || "Standard",
    status,
    price: Number(priceRaw) || null,
    isActive: seat.isActive !== undefined ? seat.isActive : true,
  };
}

function normalizeSeatLayout(raw, fallbackRows = null, fallbackCols = null) {
  if (!raw) return null;

  const layout = {
    rows: raw.rows || raw.totalRows || fallbackRows || null,
    cols: raw.cols || raw.totalCols || raw.columns || fallbackCols || null,
    seats: [],
  };

  const rawSeats = Array.isArray(raw.seats)
    ? raw.seats
    : Array.isArray(raw.items)
    ? raw.items
    : Array.isArray(raw.data)
    ? raw.data
    : Array.isArray(raw.list)
    ? raw.list
    : Array.isArray(raw)
    ? raw
    : [];

  rawSeats.forEach((seat) => {
    const normalized = normalizeSeatItem(seat);
    if (normalized) {
      layout.seats.push(normalized);
    }
  });

  if (!layout.rows && layout.seats.length) {
    layout.rows = layout.seats.reduce(
      (max, seat) => (seat.row && seat.row > max ? seat.row : max),
      0
    );
  }

  if (!layout.cols && layout.seats.length) {
    layout.cols = layout.seats.reduce(
      (max, seat) => (seat.col && seat.col > max ? seat.col : max),
      0
    );
  }

  return layout.seats.length ? layout : null;
}

export async function getSeatLayout(roomId, opts = {}) {
  if (roomId == null || roomId === "") {
    throw new Error("Room id is required to fetch seat layout");
  }

  const res = await http.get(`/Seat/layout/${roomId}`, {
    signal: opts.signal,
  });

  return normalizeSeatLayout(res.data || {}, opts.rows, opts.cols);
}

export async function getSeatsByRoom(roomId, opts = {}) {
  if (roomId == null || roomId === "") {
    throw new Error("Room id is required to fetch seats by room");
  }

  const res = await http.get(`/Seat/by-room/${roomId}`, {
    signal: opts.signal,
  });

  const items = Array.isArray(res.data) ? res.data : [];
  return items
    .map((seat) => normalizeSeatItem(seat))
    .filter(Boolean)
    .sort((a, b) => {
      const rowDiff = (a.row ?? 0) - (b.row ?? 0);
      if (rowDiff !== 0) return rowDiff;
      return (a.col ?? 0) - (b.col ?? 0);
    });
}

export async function updateSeatTier(seatId, tier, opts = {}) {
  if (seatId == null || seatId === "") {
    throw new Error("Seat id is required to update tier");
  }

  if (!tier) {
    throw new Error("Tier value is required");
  }

  const payload = { tier };
  const res = await http.put(`/Seat/${seatId}/tier`, payload, {
    signal: opts.signal,
  });

  return res.data;
}

export async function toggleSeatActive(seatId, opts = {}) {
  if (seatId == null || seatId === "") {
    throw new Error("Seat id is required to toggle status");
  }

  await http.post(`/Seat/${seatId}/toggle-active`, null, {
    signal: opts.signal,
  });
}

export async function bulkUpdateSeats(roomId, updates, opts = {}) {
  if (roomId == null || roomId === "") {
    throw new Error("Room id is required for bulk seat update");
  }

  if (!Array.isArray(updates) || updates.length === 0) {
    throw new Error("At least one seat update is required");
  }

  const payload = updates.map((item) => ({
    seatId: item.seatId,
    tier: item.tier,
    isActive: item.isActive,
  }));

  const res = await http.put(`/Seat/bulk-update/${roomId}`, payload, {
    signal: opts.signal,
  });

  return res.data;
}

async function tryFetchShowtimeEndpoint(showtimeId, endpoint, opts) {
  try {
    const res = await http.get(endpoint, { signal: opts.signal });
    return res.data;
  } catch (error) {
    if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
      throw error;
    }
    if (error?.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function getShowtimeSeatLayout(showtimeId, opts = {}) {
  if (showtimeId == null || showtimeId === "") {
    throw new Error("Showtime id is required to fetch seat layout");
  }

  const candidates = [
    `/Showtime/${showtimeId}/seats`,
    `/Showtime/${showtimeId}/seat-map`,
    `/Showtime/${showtimeId}/seatmap`,
    `/Showtime/${showtimeId}/seat-layout`,
  ];

  for (const endpoint of candidates) {
    const data = await tryFetchShowtimeEndpoint(showtimeId, endpoint, opts);
    if (data) {
      const layout = normalizeSeatLayout(data);
      if (layout) return layout;
    }
  }

  const detail = await getShowtimeById(showtimeId, { signal: opts.signal });

  if (detail) {
    const possibleLayouts = [
      detail.seatLayout,
      detail.seatMap,
      detail.seats,
      detail.showtimeSeats,
      detail.room?.seats,
    ];

    for (const option of possibleLayouts) {
      const layout = normalizeSeatLayout(
        option,
        detail.room?.rows,
        detail.room?.cols
      );
      if (layout) return layout;
    }

    const fallback = normalizeSeatLayout(
      detail,
      detail.room?.rows,
      detail.room?.cols
    );
    if (fallback) return fallback;

    if (detail.roomId || detail.room?.id) {
      return getSeatLayout(detail.roomId || detail.room?.id, opts);
    }
  }

  return null;
}

export default {
  getSeatLayout,
  getSeatsByRoom,
  getShowtimeSeatLayout,
  updateSeatTier,
  toggleSeatActive,
  bulkUpdateSeats,
};
