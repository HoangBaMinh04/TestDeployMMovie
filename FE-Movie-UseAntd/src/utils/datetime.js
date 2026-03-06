import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import "dayjs/locale/vi";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("vi");

const FALLBACK_TIMEZONE = (() => {
  try {
    return (
      dayjs.tz?.guess?.() ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      "UTC"
    );
  } catch {
    return "UTC";
  }
})();

function normalizeNumericInput(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  if (typeof value === "string" && value.trim() !== String(numeric)) {
    return null;
  }

  if (numeric === 0) {
    return 0;
  }

  const absValue = Math.abs(numeric);
  if (absValue < 1e11) {
    return Math.trunc(numeric) * 1000;
  }

  return Math.trunc(numeric);
}

export function toLocalDayjs(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (dayjs.isDayjs(value)) {
    return value.tz ? value.tz(FALLBACK_TIMEZONE) : dayjs(value.valueOf());
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return dayjs(value).tz(FALLBACK_TIMEZONE);
  }

  if (typeof value === "number") {
    const millis = normalizeNumericInput(value);
    if (millis === null) return null;
    return dayjs(millis).tz(FALLBACK_TIMEZONE);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const numericMillis = normalizeNumericInput(trimmed);
    if (numericMillis !== null) {
      return dayjs(numericMillis).tz(FALLBACK_TIMEZONE);
    }

    const utcCandidate = dayjs.utc(trimmed);
    if (utcCandidate.isValid()) {
      return utcCandidate.tz(FALLBACK_TIMEZONE);
    }

    const parsed = dayjs(trimmed);
    if (parsed.isValid()) {
      return parsed.tz ? parsed.tz(FALLBACK_TIMEZONE) : parsed;
    }

    const native = new Date(trimmed);
    if (!Number.isNaN(native.getTime())) {
      return dayjs(native).tz(FALLBACK_TIMEZONE);
    }

    return null;
  }

  const fallback = dayjs(value);
  if (fallback.isValid()) {
    return fallback.tz ? fallback.tz(FALLBACK_TIMEZONE) : fallback;
  }

  return null;
}

export function toDateInputValue(value) {
  const local = toLocalDayjs(value);
  if (!local) return "";
  return local.format("YYYY-MM-DD");
}

export function toLocalDate(value) {
  const local = toLocalDayjs(value);
  return local ? local.toDate() : null;
}
export function toDateTimeLocalInputValue(value) {
  const local = toLocalDayjs(value);
  if (!local) return "";
  return local.format("YYYY-MM-DDTHH:mm");
}
export function fmtLocal(value, format = "DD/MM/YYYY HH:mm") {
  const local = toLocalDayjs(value);
  if (!local) return "";
  return local.format(format);
}

export function fmtLocalDate(value, format = "DD/MM/YYYY") {
  return fmtLocal(value, format);
}

export function fmtLocalTime(value, format = "HH:mm") {
  return fmtLocal(value, format);
}

export function getLocalTimezone() {
  return FALLBACK_TIMEZONE;
}

export function formatLocalDateParts(value) {
  const local = toLocalDayjs(value);
  if (!local) {
    return { weekday: "", day: "", month: "", label: "" };
  }

  const weekday = local.locale("vi").format("ddd").replace(".", "");
  const day = local.format("DD");
  const month = local.locale("vi").format("MMM").replace(".", "");
  const label = `${weekday} ${local.format("DD/MM")}`;

  return { weekday, day, month, label };
}

export default dayjs;
