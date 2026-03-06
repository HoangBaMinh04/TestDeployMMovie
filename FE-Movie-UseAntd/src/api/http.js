import axios from "axios";

// ==================== Config ====================
const BASE_URL =
  (import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "") + "/api";
const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";

// ==================== Token helpers ====================
let accessToken = localStorage.getItem(ACCESS_KEY) || null;
let refreshToken = localStorage.getItem(REFRESH_KEY) || null;

export function setAccessToken(t) {
  accessToken = t || null;
  if (t) localStorage.setItem(ACCESS_KEY, t);
  else localStorage.removeItem(ACCESS_KEY);
}

export function setRefreshToken(t) {
  refreshToken = t || null;
  if (t) localStorage.setItem(REFRESH_KEY, t);
  else localStorage.removeItem(REFRESH_KEY);
}

export function getAccessToken() {
  return accessToken;
}

export function logout() {
  setAccessToken(null);
  setRefreshToken(null);
}

// ==================== Axios instances ====================
const api = axios.create({ baseURL: BASE_URL });
const refreshClient = axios.create({ baseURL: BASE_URL });

// ==================== Request interceptor ====================
// Gắn Bearer cho tất cả trừ các route auth (login/refresh/forgot/reset)
api.interceptors.request.use((cfg) => {
  const url = (cfg.url || "").toLowerCase();
  const isRefresh =
    url.includes("/auth/refresh") || url.includes("/auth/refresh");
  const isLogin = url.includes("/login");
  const isForgot =
    url.includes("/forgot") ||
    url.includes("/request-reset") ||
    url.includes("/reset");
  if (accessToken && !isRefresh && !isLogin && !isForgot) {
    cfg.headers = {
      ...(cfg.headers || {}),
      Authorization: `Bearer ${accessToken}`,
    };
  }
  return cfg;
});

// ==================== Response interceptor (auto refresh) ====================
let isRefreshing = false;
let queue = []; // các callback chờ token mới: (t) => void

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    if (
      axios.isCancel(err) ||
      err?.code === "ERR_CANCELED" ||
      err?.name === "CanceledError" ||
      err?.name === "AbortError" ||
      err?.message === "canceled"
    ) {
      return Promise.reject(err);
    }
    const original = err.config || {};
    const status = err.response?.status;

    // Các flow auth không auto-refresh
    const url = (original.url || "").toLowerCase();
    const isAuthFlow =
      url.includes("/login") ||
      url.includes("/register") ||
      url.includes("/forgot") ||
      url.includes("/request-reset") ||
      url.includes("/reset");

    if (status === 401 && !original._retry && !isAuthFlow) {
      original._retry = true;

      if (!refreshToken) {
        logout();
        return Promise.reject(err);
      }

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          // BE yêu cầu body { refreshToken }
          const { data } = await refreshClient.post("/auth/refresh", {
            refreshToken,
          });

          if (data?.accessToken) setAccessToken(data.accessToken);
          if (data?.refreshToken) setRefreshToken(data.refreshToken);

          // đánh thức các request đang chờ
          queue.forEach((cb) => cb(data?.accessToken || null));
          queue = [];

          // retry request gốc
          original.headers = {
            ...(original.headers || {}),
            Authorization: `Bearer ${getAccessToken()}`,
          };
          return api.request(original);
        } catch (refreshError) {
          // báo thất bại cho tất cả request đang chờ
          queue.forEach((cb) => cb(null));
          queue = [];
          console.error("Refresh token error", refreshError);
          logout();
          return Promise.reject(err);
        } finally {
          isRefreshing = false;
        }
      }

      // Nếu đang refresh → đưa vào hàng đợi & đợi xong rồi retry
      return new Promise((resolve, reject) => {
        queue.push((token) => {
          if (!token) return reject(err);
          original.headers = {
            ...(original.headers || {}),
            Authorization: `Bearer ${token}`,
          };
          resolve(api.request(original));
        });
      });
    }

    // Log lỗi mặc định (giữ behavior cũ)
    console.error("API error", err?.response || err);
    return Promise.reject(err);
  }
);

// ==================== Exports ====================
// GIỮ named export `http` để không phải sửa các service hiện có
export const http = api;
// (tuỳ thích) export default cho linh hoạt
export default api;
