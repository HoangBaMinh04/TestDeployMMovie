+11 - 0;

import { http } from "../api/http";

export async function getProfile(opts = {}) {
  const res = await http.get("/profile", { signal: opts.signal });
  return res.data;
}

export async function updateProfile(payload, opts = {}) {
  const res = await http.put("/profile", payload, { signal: opts.signal });
  return res.data;
}
