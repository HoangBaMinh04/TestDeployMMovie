import { useCallback, useEffect, useRef, useState } from "react";
import { getProfile, updateProfile as updateProfileApi } from "../services/profileService";

function extractErrorMessage(error) {
  if (!error) {
    return "Đã xảy ra lỗi không xác định.";
  }

  const response = error.response;
  if (response) {
    const { data, status } = response;

    if (typeof data === "string" && data.trim().length > 0) {
      return data;
    }

    const messages = [];
    if (data?.message) messages.push(data.message);
    if (data?.error) messages.push(data.error);
    if (data?.title) messages.push(data.title);

    if (Array.isArray(data?.errors)) {
      messages.push(data.errors.filter(Boolean).join("; "));
    } else if (data?.errors && typeof data.errors === "object") {
      messages.push(
        Object.values(data.errors)
          .flat()
          .filter(Boolean)
          .join("; ")
      );
    }

    const merged = messages.filter(Boolean).join("; ");
    if (merged) {
      return merged;
    }

    if (status === 401) {
      return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    }
  }

  if (error?.message) {
    return error.message;
  }

  return "Đã xảy ra lỗi không xác định.";
}

export function useUserProfile({ enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef(null);

  const refetch = useCallback(async () => {
    if (!enabled) {
      setData(null);
      setLoading(false);
      return null;
    }

    abortRef.current?.abort?.();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError("");

    try {
      const result = await getProfile({ signal: controller.signal });
      if (controller.signal.aborted) {
        return null;
      }

      setData(result ?? null);
      return result ?? null;
    } catch (err) {
      if (controller.signal.aborted) {
        return null;
      }

      const message = extractErrorMessage(err);
      setError(message);

      if (err?.response?.status === 401) {
        setData(null);
      }

      throw err;
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [enabled]);

  const update = useCallback(async (payload) => {
    setUpdating(true);
    setError("");

    try {
      const result = await updateProfileApi(payload);
      setData(result ?? null);
      return result ?? null;
    } catch (err) {
      const message = extractErrorMessage(err);
      setError(message);
      throw err;
    } finally {
      setUpdating(false);
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort?.();
    setData(null);
    setError("");
    setLoading(false);
    setUpdating(false);
  }, []);

  useEffect(() => {
    if (!enabled) {
      abortRef.current?.abort?.();
      setData(null);
      setLoading(false);
      return () => {};
    }

    refetch();

    return () => {
      abortRef.current?.abort?.();
    };
  }, [enabled, refetch]);

  return {
    data,
    loading,
    updating,
    error,
    refetch,
    update,
    reset,
  };
}

export default useUserProfile;