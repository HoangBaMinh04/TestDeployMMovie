import { useCallback, useEffect, useRef, useState } from "react";
import { extractOrdersList, getMyOrders } from "../services/orderService";

export function useOrders({ enabled = true } = {}) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort?.();
    abortRef.current = null;
  }, []);

  const reset = useCallback(() => {
    cancel();
    setOrders([]);
    setError("");
    setLoading(false);
  }, [cancel]);

  const fetchOrders = useCallback(async () => {
    if (!enabled) {
      reset();
      return;
    }

    cancel();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError("");

    try {
      const data = await getMyOrders({ signal: controller.signal });
      if (controller.signal.aborted) return;

      const list = extractOrdersList(data);
      setOrders(list);
    } catch (err) {
      if (controller.signal.aborted) return;

      const message =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        err?.message ||
        "Không tải được danh sách đơn hàng.";

      setError(message);
      setOrders([]);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
      abortRef.current = null;
    }
  }, [cancel, enabled, reset]);

  useEffect(() => {
    if (!enabled) {
      reset();
    }
  }, [enabled, reset]);

  useEffect(() => () => cancel(), [cancel]);

  return {
    orders,
    loading,
    error,
    fetchOrders,
    cancel,
    reset,
  };
}

export default useOrders;
