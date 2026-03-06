export const ROLE_STORAGE_KEY = "mmovie_user_roles";

function isBrowser() {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

function normalizeRole(value) {
  if (value == null) {
    return null;
  }

  const str = String(value).trim();
  if (!str) {
    return null;
  }

  return str.toLowerCase();
}

function decodeBase64UrlSegment(segment) {
  if (!segment || typeof segment !== "string") {
    return null;
  }

  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const paddingLength = (4 - (normalized.length % 4 || 4)) % 4;
  const padded = normalized + "=".repeat(paddingLength);

  try {
    if (typeof atob === "function") {
      return atob(padded);
    }
  } catch {
    // ignore decoding failures, we will try other strategies
  }

  try {
    const globalBuffer =
      typeof globalThis !== "undefined" ? globalThis.Buffer : undefined;
    if (globalBuffer && typeof globalBuffer.from === "function") {
      return globalBuffer.from(padded, "base64").toString("utf-8");
    }
  } catch {
    // ignore decoding failures
  }

  return null;
}

function decodeJwtPayload(token) {
  if (typeof token !== "string") {
    return null;
  }

  const trimmed = token.trim();
  if (!trimmed) {
    return null;
  }

  const parts = trimmed.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const payloadSegment = parts[1];
  const decoded = decodeBase64UrlSegment(payloadSegment);
  if (!decoded) {
    return null;
  }

  try {
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function isTruthyLike(value) {
  if (value === true) {
    return true;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) && value === 1;
  }

  if (typeof value === "bigint") {
    return value === 1n;
  }

  return false;
}



function collectRoles(sources) {
  const results = new Set();
  const stack = [...sources];
  const visited = new WeakSet();

  while (stack.length > 0) {
    const current = stack.pop();

    if (current == null) {
      continue;
    }

    if (typeof current === "string") {
      const trimmed = current.trim();
      if (!trimmed) {
        continue;
      }

      const parts = trimmed.split(".");
      if (
        parts.length === 3 &&
        /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(trimmed)
      ) {
        const payload = decodeJwtPayload(trimmed);
        if (payload && typeof payload === "object") {
          stack.push(payload);
        }
        continue;
      }

      const normalized = normalizeRole(trimmed);
      if (normalized) {
        results.add(normalized);
      }
      continue;
    }

    if (typeof current === "number" || typeof current === "bigint") {
      const normalized = normalizeRole(current);
      if (normalized) {
        results.add(normalized);
      }
      continue;
    }

    if (Array.isArray(current)) {
      stack.push(...current);
      continue;
    }

    if (typeof current !== "object") {
      continue;
    }

    if (visited.has(current)) {
      continue;
    }

    visited.add(current);

    for (const [key, value] of Object.entries(current)) {
      if (/is[_-]?admin/i.test(key) && isTruthyLike(value)) {
        results.add("admin");
      }

      if (typeof value === "string" && /token|jwt/i.test(key)) {
        stack.push(value);
        continue;
      }

      if (
        /role/i.test(key) ||
        /permission/i.test(key) ||
        /authorit/i.test(key)
      ) {
        stack.push(value);
        continue;
      }

      if (value && typeof value === "object") {
        stack.push(value);
      }
    }
  }

  return Array.from(results);
}

export function extractNormalizedRoles(...sources) {
  return collectRoles(sources);
}

export function hasAdminRole(...sources) {
  return extractNormalizedRoles(...sources).some((role) =>
    role.includes("admin")
  );
}

export function storeUserRoles(roles) {
  if (!isBrowser()) {
    return;
  }

  const normalized = Array.isArray(roles)
    ? Array.from(
        new Set(roles.map((role) => normalizeRole(role)).filter(Boolean))
      )
    : [];

  if (!normalized.length) {
    window.localStorage.removeItem(ROLE_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(ROLE_STORAGE_KEY, JSON.stringify(normalized));
}



export function loadUserRoles() {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(ROLE_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((item) => normalizeRole(item)).filter(Boolean);
  } catch (error) {
    console.warn("Failed to load roles from storage", error);
    return [];
  }
}

export function clearStoredRoles() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(ROLE_STORAGE_KEY);
}
