import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  formatCurrency,
  formatDateLabel,
} from "../../services/movieDetailService";

import { toLocalDayjs, fmtLocalTime } from "../../utils/datetime.js";

import {
  getSeatLayout,
  getShowtimeSeatLayout,
} from "../../services/seatService";
import {
  getActivePromotions,
  validatePromotionCode,
} from "../../services/promotionService";
import { createOrder } from "../../services/orderService";
import {
  createPaymentSession,
  fetchPaymentUrl,
  extractPaymentId,
  extractPaymentUrl,
} from "../../services/paymentService";
import "../../css/SeatSelectionModal.css";

import {
  PAYMENT_GATEWAY_WINDOW_NAME,
  PAYMENT_GATEWAY_WINDOW_REF,
} from "../payment/paymentIntegration";

const STATUS_LABELS = [
  { key: "available", label: "Ghế trống" },
  { key: "selected", label: "Ghế bạn chọn" },
  { key: "held", label: "Đang giữ" },
  { key: "booked", label: "Đã đặt" },
  { key: "disabled", label: "Không khả dụng" },
];

const TIER_LABELS = [
  { key: "standard", label: "Ghế thường" },
  { key: "vip", label: "Ghế VIP" },
  { key: "deluxe", label: "Ghế Deluxe" },
];

function pickMovieTitle(movie) {
  if (!movie) return "";
  return movie.name || "";
}

function buildShowtimeDateText(showtime) {
  if (!showtime) return "";

  const startLocal =
    toLocalDayjs(showtime.startDate) ||
    toLocalDayjs(showtime.startTime) ||
    toLocalDayjs(showtime.startAt) ||
    toLocalDayjs(showtime.showTime) ||
    toLocalDayjs(showtime.beginTime) ||
    toLocalDayjs(showtime.time);

  if (startLocal) {
    const weekday = startLocal.locale("vi").format("ddd").replace(".", "");
    const day = startLocal.format("DD");
    const month = startLocal.format("MM");
    const time = fmtLocalTime(startLocal, "HH:mm");
    return `${weekday} ${day}/${month} • ${time}`;
  }

  if (showtime.dateKey) {
    const { label } = formatDateLabel(showtime.dateKey);
    if (label) {
      return `${label} • ${showtime.timeLabel || "--:--"}`;
    }
  }

  return showtime.timeLabel || "";
}

function normalizeSeatKey(seat) {
  if (!seat) return "";
  return String(seat.id ?? seat.label ?? "").trim();
}

function summarizeSeats(seats) {
  if (!Array.isArray(seats) || seats.length === 0) return "Chưa chọn";
  return seats
    .map((seat) => seat.label)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "vi"))
    .join(", ");
}

function parseErrorMessage(
  error,
  fallback = "Có lỗi xảy ra. Vui lòng thử lại."
) {
  if (!error) return fallback;

  const responseData = error?.response?.data;

  if (typeof responseData === "string" && responseData.trim()) {
    return responseData.trim();
  }

  if (responseData && typeof responseData === "object") {
    const candidates = [
      responseData.errorMessage,
      responseData.message,
      responseData.error,
      responseData.title,
      responseData.detail,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }

    if (responseData.errors && typeof responseData.errors === "object") {
      const firstKey = Object.keys(responseData.errors)[0];
      if (firstKey) {
        const value = responseData.errors[firstKey];
        if (Array.isArray(value) && value.length) {
          return value[0];
        }
        if (typeof value === "string" && value.trim()) {
          return value.trim();
        }
      }
    }
  }

  if (typeof error.message === "string" && error.message.trim()) {
    return error.message.trim();
  }

  return fallback;
}

export default function SeatSelectionModal({
  isOpen,
  onClose,
  showtime,
  movie,
}) {
  const [loading, setLoading] = useState(false);
  const [layout, setLayout] = useState(null);
  const [layoutError, setLayoutError] = useState("");
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [promotionId, setPromotionId] = useState("");
  const [promotionCode, setPromotionCode] = useState("");
  const [promotionLoading, setPromotionLoading] = useState(false);
  const [promotionError, setPromotionError] = useState("");
  const [promotionResult, setPromotionResult] = useState(null);
  const [checkoutStep, setCheckoutStep] = useState("seats");
  const [paymentProvider, setPaymentProvider] = useState("VNPay");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [paymentUrlLoading, setPaymentUrlLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutNotice, setCheckoutNotice] = useState("");
  const [createdOrder, setCreatedOrder] = useState(null);
  const [createdOrderId, setCreatedOrderId] = useState(null);
  const [paymentId, setPaymentId] = useState(null);
  const [paymentUrl, setPaymentUrl] = useState("");

  const showtimeId =
    showtime?.id ?? showtime?.showtimeId ?? showtime?.showTimeId;
  const roomId = showtime?.roomId || showtime?.room?.id || showtime?.roomID;

  const pickNumber = (...candidates) => {
    for (const candidate of candidates) {
      if (candidate == null || candidate === "") continue;
      const numeric = Number(candidate);
      if (Number.isFinite(numeric)) {
        return numeric;
      }
    }
    return null;
  };
  const movieTitle = useMemo(() => pickMovieTitle(movie), [movie]);
  const showtimeDateText = useMemo(
    () => buildShowtimeDateText(showtime),
    [showtime]
  );

  const sortedSeats = useMemo(() => {
    if (!layout?.seats?.length) return [];
    return layout.seats
      .slice()
      .sort((a, b) => {
        if (a.row === b.row) {
          return (a.col ?? 0) - (b.col ?? 0);
        }
        return (a.row ?? 0) - (b.row ?? 0);
      })
      .map((seat) => ({
        ...seat,
        tier: seat.tier || "Standard",
        status: seat.status || "available",
      }));
  }, [layout]);

  const seatColumns = useMemo(() => {
    if (layout?.cols) return layout.cols;
    if (!sortedSeats.length) return 0;
    return sortedSeats.reduce(
      (max, seat) => (seat.col && seat.col > max ? seat.col : max),
      0
    );
  }, [layout, sortedSeats]);

  const selectedSeatKeys = useMemo(() => {
    return new Set(selectedSeats.map((seat) => normalizeSeatKey(seat)));
  }, [selectedSeats]);

  const seatSummary = useMemo(
    () => summarizeSeats(selectedSeats),
    [selectedSeats]
  );

  const baseSeatPrice = useMemo(() => {
    if (showtime?.price != null) {
      const numeric = Number(showtime.price);
      if (Number.isFinite(numeric)) return numeric;
    }
    return null;
  }, [showtime]);

  const getSeatPrice = useCallback(
    (seat) => {
      if (!seat) return 0;

      const explicitPrice = Number(seat.price);
      if (Number.isFinite(explicitPrice) && explicitPrice > 0) {
        return explicitPrice;
      }

      if (!Number.isFinite(baseSeatPrice) || baseSeatPrice <= 0) {
        return 0;
      }

      return Math.round(baseSeatPrice);
    },
    [baseSeatPrice]
  );

  const subtotal = useMemo(() => {
    if (!selectedSeats.length) return 0;
    return selectedSeats.reduce((sum, seat) => {
      const price = Number.isFinite(Number(seat.price))
        ? Number(seat.price)
        : baseSeatPrice;
      if (Number.isFinite(price)) {
        return sum + price;
      }
      return sum;
    }, 0);
  }, [selectedSeats, baseSeatPrice]);

  const discountAmount = useMemo(() => {
    if (!promotionResult?.isValid) return 0;
    const discount = Number(promotionResult.discountAmount);
    if (!Number.isFinite(discount)) return 0;
    return Math.min(discount, subtotal);
  }, [promotionResult, subtotal]);

  const totalAmount = Math.max(subtotal - discountAmount, 0);

  const backendSubtotal = useMemo(() => {
    if (!createdOrder || typeof createdOrder !== "object") return null;
    return pickNumber(
      createdOrder.subTotal,
      createdOrder.subtotal,
      createdOrder.totalBeforeDiscount,
      createdOrder.totalAmountBeforeDiscount,
      createdOrder.originalAmount,
      createdOrder.baseAmount,
      createdOrder.totalAmount,
      createdOrder.amountBeforeDiscount
    );
  }, [createdOrder]);

  const backendDiscount = useMemo(() => {
    if (!createdOrder || typeof createdOrder !== "object") return null;
    return pickNumber(
      createdOrder.discountAmount,
      createdOrder.discount,
      createdOrder.promotionDiscount,
      createdOrder.voucherDiscount,
      createdOrder.totalDiscount
    );
  }, [createdOrder]);

  const backendTotal = useMemo(() => {
    if (!createdOrder || typeof createdOrder !== "object") return null;
    return pickNumber(
      createdOrder.finalAmount,
      createdOrder.totalAmount,
      createdOrder.amount,
      createdOrder.total,
      createdOrder.finalPrice,
      createdOrder.payableAmount
    );
  }, [createdOrder]);

  const effectiveSubtotal = backendSubtotal ?? subtotal;
  const effectiveDiscount = backendDiscount ?? discountAmount;
  const effectiveTotal = Math.max(backendTotal ?? totalAmount, 0);

  const orderCode = useMemo(() => {
    if (typeof createdOrderId === "string" && createdOrderId.trim()) {
      return createdOrderId.trim();
    }

    if (createdOrder && typeof createdOrder === "object") {
      const candidates = [
        createdOrder.orderCode,
        createdOrder.code,
        createdOrder.reference,
        createdOrder.id,
        createdOrder.orderId,
        createdOrderId,
      ];

      for (const candidate of candidates) {
        if (candidate == null || candidate === "") continue;
        if (typeof candidate === "string" && candidate.trim()) {
          return candidate.trim();
        }
        if (typeof candidate === "number" && Number.isFinite(candidate)) {
          return String(candidate);
        }
      }
    }

    if (
      (typeof createdOrderId === "number" ||
        typeof createdOrderId === "bigint") &&
      Number.isFinite(Number(createdOrderId))
    ) {
      return String(createdOrderId);
    }

    return "";
  }, [createdOrder, createdOrderId]);

  const paymentQrSrc = useMemo(() => {
    if (!paymentUrl) return "";
    const encoded = encodeURIComponent(paymentUrl);
    return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encoded}`;
  }, [paymentUrl]);

  useEffect(() => {
    if (!isOpen) {
      setLayout(null);
      setLayoutError("");
      setSelectedSeats([]);
      setPromotionId("");
      setPromotionCode("");
      setPromotionError("");
      setPromotionResult(null);
      setCheckoutStep("seats");
      setPaymentProvider("VNPay");
      setCheckoutLoading(false);
      setPaymentUrlLoading(false);
      setCheckoutError("");
      setCheckoutNotice("");
      setCreatedOrder(null);
      setCreatedOrderId(null);
      setPaymentId(null);
      setPaymentUrl("");
      return;
    }

    if (typeof document !== "undefined") {
      const { body } = document;
      const previousOverflow = body.style.overflow;
      body.style.overflow = "hidden";
      return () => {
        body.style.overflow = previousOverflow;
      };
    }
    return undefined;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const controller = new AbortController();
    setLoading(true);
    setLayout(null);
    setLayoutError("");
    setSelectedSeats([]);

    async function loadLayout() {
      try {
        let resolvedLayout = null;

        if (showtimeId) {
          resolvedLayout = await getShowtimeSeatLayout(showtimeId, {
            signal: controller.signal,
          });
        }

        if (!resolvedLayout && roomId) {
          resolvedLayout = await getSeatLayout(roomId, {
            signal: controller.signal,
          });
        }

        if (!controller.signal.aborted) {
          if (resolvedLayout?.seats?.length) {
            setLayout(resolvedLayout);
          } else {
            setLayoutError("Không tìm thấy sơ đồ ghế cho lịch chiếu này.");
          }
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Fetch seat layout error", error);
        setLayoutError("Không tải được sơ đồ ghế. Vui lòng thử lại sau.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadLayout();

    return () => {
      controller.abort();
    };
  }, [isOpen, showtimeId, roomId]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const controller = new AbortController();
    setPromotions([]);

    getActivePromotions({ signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        if (Array.isArray(data)) {
          setPromotions(data);
        }
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.error("Fetch promotions error", error);
      });

    return () => {
      controller.abort();
    };
  }, [isOpen]);

  useEffect(() => {
    setPromotionResult(null);
    setPromotionError("");
  }, [promotionCode, selectedSeats.length, subtotal]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  };

  const handleSeatToggle = (seat) => {
    if (checkoutStep !== "seats" || checkoutLoading) {
      return;
    }
    const key = normalizeSeatKey(seat);
    if (!key) return;

    if (seat.status !== "available" && seat.status !== "held") {
      return;
    }

    setSelectedSeats((prev) => {
      const exists = prev.some((item) => normalizeSeatKey(item) === key);
      if (exists) {
        return prev.filter((item) => normalizeSeatKey(item) !== key);
      }
      return [...prev, seat];
    });
  };

  const handleSelectPromotion = (event) => {
    const value = event.target.value;
    setPromotionId(value);
    setCheckoutError("");
    setCheckoutNotice("");
    const promo = promotions.find((item) => String(item.id) === value);
    if (promo) {
      setPromotionCode(promo.code || "");
    } else {
      setPromotionCode("");
    }
  };

  const handlePromotionInput = (event) => {
    setPromotionCode(event.target.value);
    setCheckoutError("");
    setCheckoutNotice("");
  };

  const resolveReturnUrl = useCallback((orderRef) => {
    if (typeof window === "undefined" || !window?.location) {
      return undefined;
    }

    try {
      const url = new URL("/payment/result", window.location.origin);
      if (orderRef != null && orderRef !== "") {
        url.searchParams.set("order", String(orderRef));
      }
      return url.toString();
    } catch (error) {
      console.warn("Build return url error", error);
      return undefined;
    }
  }, []);

  const portalTarget = typeof document !== "undefined" ? document.body : null;
  if (!isOpen || !portalTarget) return null;

  const handlePaymentProviderChange = (event) => {
    setPaymentProvider(event.target.value);
    setCheckoutError("");
    setCheckoutNotice("");
  };

  const handleApplyPromotion = async (event) => {
    event.preventDefault();
    const code = promotionCode.trim();
    if (!code) {
      setPromotionError("Vui lòng nhập mã khuyến mãi.");
      setPromotionResult(null);
      setCheckoutError("");
      setCheckoutNotice("");
      return;
    }

    if (!Number.isFinite(subtotal) || subtotal <= 0) {
      setPromotionError("Vui lòng chọn ghế trước khi áp dụng mã giảm giá.");
      setPromotionResult(null);
      return;
    }

    setPromotionLoading(true);
    setPromotionError("");

    try {
      const orderAmount = Number(subtotal);
      if (!Number.isFinite(orderAmount) || orderAmount <= 0) {
        throw new Error("Giá trị đơn hàng không hợp lệ");
      }
      const result = await validatePromotionCode(
        {
          code,
          orderAmount,
        },
        {}
      );

      if (result?.isValid) {
        setPromotionResult(result);
        setPromotionError("");
      } else {
        setPromotionResult(result || null);
        setPromotionError(
          result?.errorMessage || "Mã khuyến mãi không hợp lệ hoặc đã hết hạn."
        );
      }
    } catch (error) {
      console.error("Validate promotion error", error);
      const message =
        error?.response?.data?.errorMessage ||
        error?.response?.data?.message ||
        error?.response?.data ||
        error?.message ||
        "Không áp dụng được mã khuyến mãi. Vui lòng thử lại.";
      setPromotionResult(null);
      setPromotionError(message);
    } finally {
      setPromotionLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!selectedSeats.length) {
      setCheckoutError("Vui lòng chọn ghế trước khi thanh toán.");
      setCheckoutNotice("");
      return;
    }

    if (!showtimeId) {
      setCheckoutError("Không xác định được lịch chiếu để tạo đơn hàng.");
      setCheckoutNotice("");
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError("");
    setCheckoutNotice("");
    setCreatedOrder(null);
    setCreatedOrderId(null);
    setPaymentId(null);
    setPaymentUrl("");

    try {
      const seatIds = Array.from(
        new Set(
          selectedSeats
            .map(
              (seat) =>
                seat?.id ??
                seat?.seatId ??
                seat?.seatID ??
                seat?.SeatId ??
                seat?.showtimeSeatId ??
                seat?.showTimeSeatId ??
                seat?.ShowtimeSeatId ??
                seat?.code ??
                seat?.label ??
                null
            )
            .map((value) => {
              if (value == null || value === "") return null;
              const numeric = Number(value);
              return Number.isFinite(numeric) ? numeric : value;
            })
            .filter((value) => value !== null)
        )
      );

      if (!seatIds.length) {
        throw new Error("Không xác định được ghế để tạo đơn hàng.");
      }

      const seatCodes = selectedSeats
        .map((seat) => seat?.label)
        .filter((label) => typeof label === "string" && label.trim());

      const tickets = selectedSeats.map((seat) => {
        const seatIdentifier =
          seat?.id ??
          seat?.seatId ??
          seat?.seatID ??
          seat?.SeatId ??
          seat?.showtimeSeatId ??
          seat?.showTimeSeatId ??
          seat?.ShowtimeSeatId ??
          null;
        const price = getSeatPrice(seat);

        return {
          seatId: seatIdentifier,
          seatID: seatIdentifier,
          seatCode: seat?.label,
          seatLabel: seat?.label,
          label: seat?.label,
          code: seat?.label,
          tier: seat?.tier,
          type: seat?.tier,
          ticketType: seat?.tier,
          price,
          amount: price,
          total: price,
          quantity: 1,
        };
      });

      const promotionCodeValue =
        promotionResult?.isValid && promotionCode.trim()
          ? promotionCode.trim()
          : undefined;
      const promotionIdValue =
        promotionResult?.promotionId ??
        (promotionId ? Number(promotionId) || promotionId : undefined);

      const orderPayload = {
        showtimeId,
        showTimeId: showtimeId,
        seatIds,
        seats: seatIds,
        seatIdList: seatIds,
        seatCodes,
        tickets,
        items: tickets,
        promotionCode: promotionCodeValue,
        promotionId: promotionIdValue,
        discountAmount: discountAmount || undefined,
        discount: discountAmount || undefined,
        subTotal: subtotal,
        subtotal,
        totalAmount,
        total: totalAmount,
        finalAmount: totalAmount,
        amount: totalAmount,
        orderAmount: totalAmount,
        paymentMethod: paymentProvider,
        paymentProvider,
        provider: paymentProvider,
      };

      const orderResult = await createOrder(orderPayload);
      const rawOrderData = orderResult?.data ?? null;

      const unwrapOrder = (value) => {
        if (!value || typeof value !== "object") return value;
        if (value.data && typeof value.data === "object") {
          return unwrapOrder(value.data);
        }
        if (value.result && typeof value.result === "object") {
          return unwrapOrder(value.result);
        }
        if (value.value && typeof value.value === "object") {
          return unwrapOrder(value.value);
        }
        return value;
      };

      const normalizedOrder = unwrapOrder(rawOrderData);

      const orderIdCandidates = [orderResult?.orderId, normalizedOrder];

      if (normalizedOrder && typeof normalizedOrder === "object") {
        orderIdCandidates.push(
          normalizedOrder.id,
          normalizedOrder.orderId,
          normalizedOrder.orderID,
          normalizedOrder.orderCode,
          normalizedOrder.code,
          normalizedOrder.reference
        );
      }

      let finalOrderId = null;
      for (const candidate of orderIdCandidates) {
        if (candidate == null || candidate === "") continue;
        if (typeof candidate === "number" || typeof candidate === "bigint") {
          finalOrderId = Number(candidate);
          break;
        }
        if (typeof candidate === "string") {
          const trimmed = candidate.trim();
          if (!trimmed) continue;
          const numeric = Number(trimmed);
          finalOrderId = Number.isFinite(numeric) ? numeric : trimmed;
          break;
        }
        if (
          typeof candidate === "object" &&
          candidate !== null &&
          typeof candidate.id !== "undefined"
        ) {
          const numeric = Number(candidate.id);
          if (Number.isFinite(numeric)) {
            finalOrderId = numeric;
            break;
          }
        }
      }

      if (
        finalOrderId == null ||
        (typeof finalOrderId === "number" && Number.isNaN(finalOrderId))
      ) {
        throw new Error("Không xác định được mã đơn hàng từ phản hồi.");
      }

      setCreatedOrder(
        normalizedOrder && typeof normalizedOrder === "object"
          ? normalizedOrder
          : rawOrderData
      );
      setCreatedOrderId(finalOrderId);

      const payableAmount = (() => {
        if (normalizedOrder && typeof normalizedOrder === "object") {
          const value = pickNumber(
            normalizedOrder.finalAmount,
            normalizedOrder.totalAmount,
            normalizedOrder.amount,
            normalizedOrder.finalPrice,
            normalizedOrder.payableAmount,
            normalizedOrder.total
          );
          if (value != null) {
            return Math.max(value, 0);
          }
        }
        return Math.max(totalAmount, 0);
      })();

      const returnUrl = resolveReturnUrl(finalOrderId);

      const paymentResult = await createPaymentSession({
        orderId: finalOrderId,
        provider: paymentProvider,
        returnUrl,
        paymentProvider,
        paymentMethod: paymentProvider,
        amount: payableAmount,
        totalAmount: payableAmount,
        finalAmount: payableAmount,
        orderAmount: payableAmount,
      });

      const paymentData = paymentResult?.data ?? null;
      let resolvedPaymentId =
        paymentResult?.paymentId ?? extractPaymentId(paymentData);

      if (
        !resolvedPaymentId &&
        paymentData &&
        typeof paymentData === "object"
      ) {
        const candidate =
          paymentData.id ||
          paymentData.paymentId ||
          paymentData.paymentID ||
          paymentData.transactionId ||
          paymentData.result ||
          paymentData.value;

        if (candidate != null && candidate !== "") {
          if (typeof candidate === "number" || typeof candidate === "bigint") {
            resolvedPaymentId = Number(candidate);
          } else if (typeof candidate === "string") {
            const numeric = Number(candidate);
            resolvedPaymentId = Number.isFinite(numeric) ? numeric : candidate;
          }
        }
      }

      if (
        resolvedPaymentId == null ||
        (typeof resolvedPaymentId === "number" &&
          Number.isNaN(resolvedPaymentId))
      ) {
        throw new Error("Không xác định được mã thanh toán từ phản hồi.");
      }

      setPaymentId(resolvedPaymentId);
      setCheckoutStep("payment");
      setCheckoutError("");

      setPaymentUrlLoading(true);
      try {
        const urlResult = await fetchPaymentUrl(resolvedPaymentId, {
          returnUrl: returnUrl || undefined,
        });
        const resolvedUrl =
          urlResult?.url || extractPaymentUrl(urlResult?.data);

        if (!resolvedUrl) {
          throw new Error("Không nhận được URL thanh toán từ máy chủ.");
        }

        setPaymentUrl(resolvedUrl);
        setCheckoutNotice(
          "Quét mã QR bằng ứng dụng ngân hàng hoặc VNPay để hoàn tất thanh toán."
        );
      } catch (error) {
        console.error("Fetch payment URL error", error);
        setPaymentUrl("");
        setCheckoutError(
          parseErrorMessage(
            error,
            "Không lấy được URL thanh toán. Vui lòng thử lại."
          )
        );
      } finally {
        setPaymentUrlLoading(false);
      }
    } catch (error) {
      console.error("Checkout error", error);
      setCheckoutStep("seats");
      setCreatedOrder(null);
      setCreatedOrderId(null);
      setPaymentId(null);
      setPaymentUrl("");
      setCheckoutNotice("");
      setCheckoutError(
        parseErrorMessage(error, "Không tạo được đơn hàng. Vui lòng thử lại.")
      );
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleBackToSelection = () => {
    setCheckoutStep("seats");
    setCheckoutError("");
    setCheckoutNotice("");
    setCreatedOrder(null);
    setCreatedOrderId(null);
    setPaymentId(null);
    setPaymentUrl("");
  };

  const handleRefreshPayment = async () => {
    if (!paymentId) return;

    setPaymentUrlLoading(true);
    setCheckoutError("");

    try {
      const urlResult = await fetchPaymentUrl(paymentId, {
        returnUrl: resolveReturnUrl(orderCode || createdOrderId) || undefined,
      });
      const resolvedUrl = urlResult?.url || extractPaymentUrl(urlResult?.data);

      if (!resolvedUrl) {
        throw new Error("Không nhận được URL thanh toán mới.");
      }

      setPaymentUrl(resolvedUrl);
      setCheckoutNotice("Đã làm mới mã QR thanh toán.");
    } catch (error) {
      console.error("Refresh payment URL error", error);
      setCheckoutError(
        parseErrorMessage(error, "Không làm mới được mã QR. Vui lòng thử lại.")
      );
      setCheckoutNotice("");
    } finally {
      setPaymentUrlLoading(false);
    }
  };

  const handleCopyPaymentLink = async () => {
    if (
      !paymentUrl ||
      typeof navigator === "undefined" ||
      !navigator.clipboard
    ) {
      return;
    }

    try {
      await navigator.clipboard.writeText(paymentUrl);
      setCheckoutNotice("Đã sao chép liên kết thanh toán vào bộ nhớ tạm.");
    } catch (error) {
      console.error("Copy payment link error", error);
      setCheckoutError(
        parseErrorMessage(error, "Không sao chép được liên kết thanh toán.")
      );
      setCheckoutNotice("");
    }
  };

  const handleOpenPaymentGateway = () => {
    if (!paymentUrl) return;

    try {
      if (typeof window === "undefined" || typeof window.open !== "function") {
        return;
      }

      const existingWindow = window[PAYMENT_GATEWAY_WINDOW_REF];
      if (existingWindow && !existingWindow.closed) {
        try {
          existingWindow.close();
        } catch (closeError) {
          console.warn("Không đóng được cửa sổ thanh toán cũ", closeError);
        }
      }

      window[PAYMENT_GATEWAY_WINDOW_REF] = null;

      const newWindow = window.open(
        "",
        PAYMENT_GATEWAY_WINDOW_NAME,
        "noopener,noreferrer"
      );

      if (newWindow) {
        window[PAYMENT_GATEWAY_WINDOW_REF] = newWindow;

        try {
          newWindow.location = paymentUrl;
        } catch (assignError) {
          console.warn("Không đặt được URL cho cửa sổ thanh toán", assignError);
          newWindow.document.location.href = paymentUrl;
        }

        newWindow.focus?.();
      } else {
        window.location.href = paymentUrl;
        window[PAYMENT_GATEWAY_WINDOW_REF] = null;
      }
    } catch (error) {
      console.error("Open payment url error", error);
      setCheckoutError(
        parseErrorMessage(
          error,
          "Không mở được cổng thanh toán. Vui lòng thử lại hoặc sao chép liên kết."
        )
      );
      setCheckoutNotice("");
    }
  };

  return createPortal(
    <div className="seat-modal-overlay" onMouseDown={handleOverlayClick}>
      <div className="seat-modal" role="dialog" aria-modal="true">
        <button type="button" className="seat-modal__close" onClick={onClose}>
          ×
        </button>

        <header className="seat-modal__header">
          <div className="seat-modal__title-group">
            <h2>Mua vé xem phim</h2>
            <p className="seat-modal__movie">{movieTitle || "Phim chưa rõ"}</p>
            {showtime?.format ? (
              <span className="seat-modal__format">{showtime.format}</span>
            ) : null}
          </div>
          <div className="seat-modal__showtime-info">
            {showtimeDateText ? (
              <div className="seat-modal__showtime-time">
                {showtimeDateText}
              </div>
            ) : null}
            {showtime?.cinemaName ? (
              <div className="seat-modal__showtime-cinema">
                {showtime.cinemaName}
              </div>
            ) : null}
            {showtime?.cinemaAddress ? (
              <div className="seat-modal__showtime-address">
                {showtime.cinemaAddress}
              </div>
            ) : null}
          </div>
        </header>

        {(checkoutLoading || paymentUrlLoading) && (
          <div className="seat-modal__processing" role="status">
            <div className="seat-modal__spinner" />
            <p>
              {checkoutLoading
                ? "Đang tạo đơn hàng và phiên thanh toán..."
                : "Đang làm mới mã QR thanh toán..."}
            </p>
          </div>
        )}

        <div
          className={`seat-modal__content ${
            checkoutStep === "payment" ? "seat-modal__content--payment" : ""
          }`}
        >
          {checkoutStep === "payment" ? (
            <section className="seat-modal__payment">
              <div className="seat-modal__payment-summary">
                <h3>Chi tiết thanh toán</h3>
                <div className="seat-modal__summary-row">
                  <span>Suất chiếu</span>
                  <strong>{showtimeDateText || "--"}</strong>
                </div>
                <div className="seat-modal__summary-row">
                  <span>Rạp</span>
                  <strong>{showtime?.cinemaName || "--"}</strong>
                </div>
                {showtime?.roomName ? (
                  <div className="seat-modal__summary-row">
                    <span>Phòng</span>
                    <strong>{showtime.roomName}</strong>
                  </div>
                ) : null}
                <div className="seat-modal__summary-row">
                  <span>Ghế</span>
                  <strong>{seatSummary}</strong>
                </div>
                <div className="seat-modal__summary-row">
                  <span>Số lượng</span>
                  <strong>{selectedSeats.length}</strong>
                </div>
                <div className="seat-modal__summary-row">
                  <span>Tạm tính</span>
                  <strong>{formatCurrency(effectiveSubtotal)} đ</strong>
                </div>
                <div className="seat-modal__summary-row">
                  <span>Giảm giá</span>
                  <strong>-{formatCurrency(effectiveDiscount)} đ</strong>
                </div>
                <div className="seat-modal__summary-row seat-modal__summary-row--highlight">
                  <span>Thanh toán</span>
                  <strong>{formatCurrency(effectiveTotal)} đ</strong>
                </div>
                {promotionResult?.isValid && promotionCode.trim() ? (
                  <div className="seat-modal__summary-row">
                    <span>Mã áp dụng</span>
                    <strong>{promotionCode.trim()}</strong>
                  </div>
                ) : null}
              </div>

              <div className="seat-modal__payment-panel">
                <div className="seat-modal__qr-card">
                  <div className="seat-modal__qr-header">
                    <span className="seat-modal__qr-provider">
                      {paymentProvider}
                    </span>
                    {orderCode ? (
                      <span className="seat-modal__qr-order">
                        Mã đơn: {orderCode}
                      </span>
                    ) : null}
                  </div>
                  {paymentUrl ? (
                    <img
                      src={paymentQrSrc}
                      alt="Mã QR thanh toán"
                      className="seat-modal__qr-image"
                    />
                  ) : (
                    <div className="seat-modal__qr-placeholder">
                      <p>
                        {checkoutError ||
                          "Không có mã QR khả dụng. Vui lòng làm mới để thử lại."}
                      </p>
                    </div>
                  )}

                  <div className="seat-modal__payment-actions">
                    <button
                      type="button"
                      className="seat-modal__payment-button"
                      onClick={handleOpenPaymentGateway}
                      disabled={!paymentUrl}
                    >
                      Mở cổng thanh toán
                    </button>
                    <button
                      type="button"
                      className="seat-modal__payment-button"
                      onClick={handleCopyPaymentLink}
                      disabled={!paymentUrl}
                    >
                      Sao chép liên kết
                    </button>
                    <button
                      type="button"
                      className="seat-modal__payment-button"
                      onClick={handleRefreshPayment}
                      disabled={!paymentId || paymentUrlLoading}
                    >
                      Làm mới mã QR
                    </button>
                    <button
                      type="button"
                      className="seat-modal__payment-button seat-modal__payment-button--ghost"
                      onClick={handleBackToSelection}
                    >
                      Quay lại chọn ghế
                    </button>
                  </div>
                </div>

                {checkoutError ? (
                  <p className="seat-modal__checkout-error seat-modal__checkout-error--payment">
                    {checkoutError}
                  </p>
                ) : null}
                {checkoutNotice ? (
                  <p className="seat-modal__checkout-notice">
                    {checkoutNotice}
                  </p>
                ) : null}
              </div>
            </section>
          ) : (
            <>
              <section className="seat-modal__layout">
                <div className="seat-modal__screen">Màn hình</div>

                {loading ? (
                  <div className="seat-modal__state">Đang tải sơ đồ ghế...</div>
                ) : layoutError ? (
                  <div className="seat-modal__state seat-modal__state--error">
                    {layoutError}
                  </div>
                ) : !sortedSeats.length ? (
                  <div className="seat-modal__state">
                    Không có dữ liệu ghế cho lịch chiếu này.
                  </div>
                ) : (
                  <div
                    className="seat-modal__grid"
                    style={{ "--seat-columns": seatColumns || 1 }}
                  >
                    {sortedSeats.map((seat) => {
                      const key = normalizeSeatKey(seat);
                      const isSelected = selectedSeatKeys.has(key);
                      const tierClass = `seat-tier-${seat.tier
                        .toLowerCase()
                        .replace(/\s+/g, "-")}`;
                      const statusClass = `seat-status-${
                        isSelected ? "selected" : seat.status
                      }`;
                      const isClickable =
                        seat.status === "available" || seat.status === "held";

                      return (
                        <button
                          key={key || `${seat.row}-${seat.col}`}
                          type="button"
                          className={`seat-tile ${tierClass} ${statusClass} ${
                            isClickable ? "seat-interactive" : ""
                          }`}
                          onClick={() => handleSeatToggle(seat)}
                          disabled={!isClickable}
                          title={seat.label || "Ghế"}
                        >
                          {seat.label || "--"}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="seat-modal__legend">
                  <div className="seat-modal__legend-group">
                    {STATUS_LABELS.map((item) => (
                      <div key={item.key} className="seat-modal__legend-item">
                        <span
                          className={`seat-legend seat-status-${item.key}`}
                        />
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="seat-modal__legend-group">
                    {TIER_LABELS.map((item) => (
                      <div key={item.key} className="seat-modal__legend-item">
                        <span className={`seat-legend seat-tier-${item.key}`} />
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <aside className="seat-modal__sidebar">
                <div className="seat-modal__summary">
                  <h3>Thông tin vé</h3>
                  <div className="seat-modal__summary-row">
                    <span>Ghế đã chọn</span>
                    <strong>{seatSummary}</strong>
                  </div>
                  <div className="seat-modal__summary-row">
                    <span>Số lượng</span>
                    <strong>{selectedSeats.length}</strong>
                  </div>
                  <div className="seat-modal__summary-row">
                    <span>Tạm tính</span>
                    <strong>{formatCurrency(subtotal)} đ</strong>
                  </div>
                </div>

                <form
                  className="seat-modal__promotion"
                  onSubmit={handleApplyPromotion}
                >
                  <h3>Phiếu giảm giá</h3>
                  <label className="seat-modal__field">
                    <span>Chọn phiếu có sẵn</span>
                    <select
                      value={promotionId}
                      onChange={handleSelectPromotion}
                    >
                      <option value="">-- Chọn phiếu --</option>
                      {promotions.map((promo) => (
                        <option key={promo.id ?? promo.code} value={promo.id}>
                          {promo.code}
                          {promo.name ? ` - ${promo.name}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="seat-modal__field">
                    <span>Nhập mã khuyến mãi</span>
                    <div className="seat-modal__promo-input">
                      <input
                        type="text"
                        value={promotionCode}
                        onChange={handlePromotionInput}
                        placeholder="Nhập mã giảm giá"
                      />
                      <button
                        type="submit"
                        className="seat-modal__apply"
                        disabled={promotionLoading}
                      >
                        {promotionLoading ? "Đang kiểm tra..." : "Áp dụng"}
                      </button>
                    </div>
                  </label>

                  {promotionError ? (
                    <p className="seat-modal__promo-error">{promotionError}</p>
                  ) : null}

                  {promotionResult?.isValid ? (
                    <p className="seat-modal__promo-success">
                      Mã hợp lệ! Giảm {formatCurrency(discountAmount)} đ.
                    </p>
                  ) : null}
                </form>

                <label className="seat-modal__field">
                  <span>Phương thức thanh toán</span>
                  <select
                    value={paymentProvider}
                    onChange={handlePaymentProviderChange}
                    disabled={checkoutLoading}
                  >
                    <option value="VNPay">VNPay QR</option>
                    <option value="MoMo" disabled>
                      MoMo (sắp có)
                    </option>
                    <option value="ZaloPay" disabled>
                      ZaloPay (sắp có)
                    </option>
                    <option value="Cash" disabled>
                      Thanh toán tại quầy
                    </option>
                  </select>
                </label>

                <div className="seat-modal__total">
                  <div className="seat-modal__summary-row">
                    <span>Giảm giá</span>
                    <strong>-{formatCurrency(discountAmount)} đ</strong>
                  </div>
                  <div className="seat-modal__summary-row seat-modal__summary-row--highlight">
                    <span>Thành tiền</span>
                    <strong>{formatCurrency(totalAmount)} đ</strong>
                  </div>
                </div>

                {checkoutError ? (
                  <p className="seat-modal__checkout-error">{checkoutError}</p>
                ) : null}
                {checkoutNotice ? (
                  <p className="seat-modal__checkout-notice">
                    {checkoutNotice}
                  </p>
                ) : null}

                <button
                  type="button"
                  className="seat-modal__checkout"
                  onClick={handleCheckout}
                  disabled={checkoutLoading || !selectedSeats.length}
                >
                  {checkoutLoading ? "Đang xử lý..." : "Tiếp tục thanh toán"}
                </button>
              </aside>
            </>
          )}
        </div>
      </div>
    </div>,
    portalTarget
  );
}
