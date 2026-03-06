import {
  http,
  setAccessToken,
  setRefreshToken,
  logout as clearTokens,
} from "../api/http";

/**
 * AuthService: các API liên quan đến xác thực người dùng.
 * Tất cả hàm đều cho phép truyền { signal } để abort khi cần.
 */
export async function login(email, password, opts = {}) {
  const res = await http.post(
    "/auth/login",
    { email, password },
    { signal: opts.signal }
  );

  // Nếu BE trả token thì lưu
  if (res?.data?.accessToken) setAccessToken(res.data.accessToken);
  if (res?.data?.refreshToken) setRefreshToken(res.data.refreshToken);

  return res.data;
}

export async function logout(opts = {}) {
  try {
    // Gọi API logout trên backend (nếu có)
    await http.post("/auth/logout", {}, { signal: opts.signal });
  } catch (error) {
    // Vẫn xóa token local dù API fail
    console.warn("Logout API failed, but clearing local tokens:", error);
  } finally {
    // Xóa token ở client
    clearTokens();
  }
}

export async function refresh(opts = {}) {
  const res = await http.post("/auth/refresh", {}, { signal: opts.signal });
  return res.data;
}

// ===== Auth =====

export async function register(email, password, confirm, opts = {}) {
  const res = await http.post(
    "/auth/register",
    {
      Email: email,
      Password: password,
      ConfirmPassword: confirm,
    },
    { signal: opts.signal }
  );
  return res.data;
}

export async function requestReset(email, opts = {}) {
  const res = await http.post(
    "/auth/request-reset",
    { Email: email },
    { signal: opts.signal }
  );
  return res.data;
}

export async function resetWithOtp(email, otp, newPwd, confirm, opts = {}) {
  const res = await http.post(
    "/auth/reset-password",
    {
      Email: email,
      OtpCode: otp,
      NewPassword: newPwd,
      ConfirmNewPassword: confirm,
    },
    { signal: opts.signal }
  );
  return res.data;
}

export async function changePassword(currentPwd, newPwd, confirm, opts = {}) {
  const res = await http.post(
    "/auth/change-password",
    {
      CurrentPassword: currentPwd,
      NewPassword: newPwd,
      ConfirmNewPassword: confirm,
    },
    { signal: opts.signal }
  );
  return res.data;
}
