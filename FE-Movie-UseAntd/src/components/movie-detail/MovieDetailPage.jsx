import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAccessToken, logout as clearTokens } from "../../api/http";
import HeaderBar from "../header/HeaderBar";
import useUserProfile from "../../hooks/useUserProfile";
import AuthModal from "../auth/AuthModal";
import UserProfileModal from "../profile/UserProfileModal";
import OrdersModal from "../order/OrdersModal";
import { useOrders } from "../../hooks/useOrders";
import ChatWidget from "../chat-bot/ChatWidget";
import SupportChatWidget from "../support-chat/SupportChatWidget";

import {
  getComingSoonMovies,
  getMovieById,
  getNowShowingMovies,
} from "../../services/movieService";
import { getShowtimesByMovie } from "../../services/showtimeService";
import {
  createReview,
  deleteReview,
  getMovieReviewStats,
  getReviewById,
  getReviewPermission,
  getReviewsByMovie,
  reportReview,
  updateReview,
  voteReviewHelpful,
} from "../../services/reviewService";
import { logout as logoutApi } from "../../services/authService";
import {
  extractActors,
  extractCountries,
  extractDirectors,
  formatCategories,
  formatReleaseYear,
  formatRuntime,
  getTrailerLink,
  groupShowtimesByCinema,
  pickAverageRating,
  pickReviewCount,
  resolveTrailerEmbedUrl,
  sortDateKeys,
} from "../../services/movieDetailService";
import MovieDetailHero from "./MovieDetailHero";
import MovieShowtimes from "./MovieShowtimes";
import MovieReviews from "./MovieReviews";
import MovieDetailSidebar from "./MovieDetailSidebar";
import MovieTrailerModal from "./MovieTrailerModal";
import "../../css/MovieDetailPage.css";
import SeatSelectionModal from "./SeatSelectionModal";
import AppFooter from "../footer/AppFooter";

import {
  clearStoredRoles,
  extractNormalizedRoles,
  hasAdminRole,
  storeUserRoles,
} from "../../utils/auth";

function extractApiErrorMessage(
  error,
  fallback = "Đã xảy ra lỗi. Vui lòng thử lại.",
) {
  if (!error) {
    return fallback;
  }

  const response = error.response;
  if (response) {
    const { data } = response;

    if (typeof data === "string" && data.trim().length > 0) {
      return data.trim();
    }

    const messages = [];
    if (data?.message) messages.push(data.message);
    if (data?.error) messages.push(data.error);
    if (data?.title) messages.push(data.title);

    if (Array.isArray(data?.errors)) {
      messages.push(data.errors.filter(Boolean).join("; "));
    } else if (data?.errors && typeof data.errors === "object") {
      messages.push(
        Object.values(data.errors).flat().filter(Boolean).join("; "),
      );
    }

    const merged = messages.filter(Boolean).join("; ");
    if (merged) {
      return merged;
    }
  }

  if (error?.message) {
    return error.message;
  }

  return fallback;
}

function resolveReviewId(review) {
  if (!review) return null;
  return (
    review.id ??
    review.Id ??
    review.reviewId ??
    review.reviewID ??
    review.ReviewId ??
    review.ReviewID ??
    null
  );
}

function resolveExistingReviewId(permission) {
  if (!permission) return null;
  return (
    permission.existingReviewId ??
    permission.existingReviewID ??
    permission.ExistingReviewId ??
    permission.ExistingReviewID ??
    null
  );
}

export default function MovieDetailPage() {
  const { movieSlug } = useParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(getAccessToken()));
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalView, setAuthModalView] = useState("login");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [showChatWidget, setShowChatWidget] = useState(false);

  const {
    data: profile,
    loading: loadingProfile,
    updating: updatingProfile,
    error: profileError,
    refetch: refetchProfile,
    update: updateProfile,
    reset: resetProfile,
  } = useUserProfile({ enabled: isLoggedIn });

  const {
    orders,
    loading: loadingOrders,
    error: ordersError,
    fetchOrders,
    cancel: cancelOrders,
    reset: resetOrders,
  } = useOrders({ enabled: isLoggedIn });

  const [movie, setMovie] = useState(null);
  const [movieLoading, setMovieLoading] = useState(true);
  const [movieError, setMovieError] = useState("");

  const [showtimes, setShowtimes] = useState([]);
  const [showtimeLoading, setShowtimeLoading] = useState(true);
  const [showtimeError, setShowtimeError] = useState("");

  const [reviewStats, setReviewStats] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewPageSize] = useState(5);
  const [reviewHasMore, setReviewHasMore] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [reviewError, setReviewError] = useState("");
  const [canReviewInfo, setCanReviewInfo] = useState(null);
  const [canReviewLoading, setCanReviewLoading] = useState(false);
  const [canReviewError, setCanReviewError] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [submitReviewError, setSubmitReviewError] = useState("");
  const [helpfulLoadingId, setHelpfulLoadingId] = useState(null);
  const [helpfulError, setHelpfulError] = useState("");
  const [myReview, setMyReview] = useState(null);
  const [myReviewLoading, setMyReviewLoading] = useState(false);
  const [isDeletingReview, setIsDeletingReview] = useState(false);
  const [deleteReviewError, setDeleteReviewError] = useState("");
  const [reportingReviewId, setReportingReviewId] = useState(null);
  const [reportError, setReportError] = useState("");
  const [reportSuccess, setReportSuccess] = useState("");
  const reviewAbortRef = useRef(null);
  const reviewStatsAbortRef = useRef(null);
  const reviewPermissionAbortRef = useRef(null);
  const myReviewAbortRef = useRef(null);
  const [relatedNowShowing, setRelatedNowShowing] = useState([]);
  const [relatedComingSoon, setRelatedComingSoon] = useState([]);
  const [isTrailerOpen, setTrailerOpen] = useState(false);
  const [isSeatModalOpen, setSeatModalOpen] = useState(false);
  const [selectedShowtime, setSelectedShowtime] = useState(null);

  // cuộn lên đâu trang khi vào trang chi tiết phim
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [movieSlug]);

  const routeParam = useMemo(() => {
    if (!movieSlug) return null;
    const trimmed = String(movieSlug).trim();
    return trimmed.length ? trimmed : null;
  }, [movieSlug]);

  const movieLookupKey = useMemo(() => {
    if (!routeParam) return null;
    const numeric = Number(routeParam);
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }
    return routeParam;
  }, [routeParam]);

  const movieInternalId = useMemo(() => {
    if (!movie) return null;
    const candidates = [movie.id, movie.movieId, movie.movieID];
    const found = candidates.find((value) => value != null && value !== "");
    return found ?? null;
  }, [movie]);

  const movieNumericId = useMemo(() => {
    const candidates = [movieInternalId, movieLookupKey];

    for (const candidate of candidates) {
      if (candidate == null || candidate === "") continue;
      const numeric = Number(candidate);
      if (Number.isFinite(numeric) && numeric > 0) {
        return numeric;
      }
    }

    if (typeof movieLookupKey === "number") {
      return movieLookupKey;
    }

    return null;
  }, [movieInternalId, movieLookupKey]);

  const groupedShowtimes = useMemo(
    () => groupShowtimesByCinema(Array.isArray(showtimes) ? showtimes : []),
    [showtimes],
  );

  const dateOptions = useMemo(
    () => sortDateKeys(Array.from(groupedShowtimes.keys())),
    [groupedShowtimes],
  );

  const [activeDate, setActiveDate] = useState(null);

  useEffect(() => {
    if (dateOptions.length === 0) {
      setActiveDate(null);
    } else if (!activeDate || !dateOptions.includes(activeDate)) {
      setActiveDate(dateOptions[0]);
    }
  }, [dateOptions, activeDate]);

  const showtimesForActiveDate = useMemo(() => {
    if (!activeDate) return [];
    const dateGroup = groupedShowtimes.get(activeDate);
    if (!dateGroup) return [];
    return Array.from(dateGroup.values()).map((cinema) => ({
      ...cinema,
      showtimes: cinema.showtimes.slice().sort((a, b) => {
        if (!a.startDate || !b.startDate) return 0;
        return a.startDate.getTime() - b.startDate.getTime();
      }),
    }));
  }, [groupedShowtimes, activeDate]);

  useEffect(() => {
    const controller = new AbortController();

    if (!movieLookupKey) {
      setMovie(null);
      setMovieError("Không tìm thấy mã phim hợp lệ.");
      setMovieLoading(false);
      return () => controller.abort();
    }

    async function fetchMovieDetails() {
      setMovieLoading(true);
      setMovieError("");
      setMovie(null);

      try {
        const data = await getMovieById(movieLookupKey, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setMovie(data || null);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Fetch movie detail error", error);
          const status = error?.status ?? error?.response?.status;
          if (status === 404) {
            setMovieError("Không tìm thấy phim bạn yêu cầu.");
          } else {
            setMovieError("Không tải được thông tin phim. Vui lòng thử lại.");
          }
          setMovie(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setMovieLoading(false);
        }
      }
    }

    fetchMovieDetails();

    return () => controller.abort();
  }, [movieLookupKey]);

  useEffect(() => {
    const controller = new AbortController();

    if (!movieNumericId) {
      setShowtimeLoading(false);
      setShowtimeError("");
      setShowtimes([]);
      return () => controller.abort();
    }

    async function fetchShowtimes() {
      setShowtimeLoading(true);
      setShowtimeError("");
      try {
        const data = await getShowtimesByMovie(movieNumericId, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setShowtimes(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          const status = error?.status ?? error?.response?.status;
          if (status === 404) {
            setShowtimes([]);
            setShowtimeError("");
          } else {
            console.error("Fetch showtimes error", error);
            setShowtimeError("Không tải được lịch chiếu. Vui lòng thử lại.");
            setShowtimes([]);
          }
        }
      } finally {
        if (!controller.signal.aborted) {
          setShowtimeLoading(false);
        }
      }
    }

    fetchShowtimes();

    return () => controller.abort();
  }, [movieNumericId]);

  const refreshReviewStats = useCallback(
    async (options = {}) => {
      if (!movieInternalId) {
        setReviewStats(null);
        return null;
      }

      try {
        const data = await getMovieReviewStats(movieInternalId, options);
        if (options?.signal?.aborted) {
          return null;
        }
        setReviewStats(data || null);
        return data || null;
      } catch (error) {
        if (options?.signal?.aborted) {
          return null;
        }
        console.error("Fetch review stats error", error);
        setReviewStats(null);
        return null;
      }
    },
    [movieInternalId],
  );

  const refreshReviewPermission = useCallback(async () => {
    reviewPermissionAbortRef.current?.abort?.();

    if (!isLoggedIn || !movieInternalId) {
      setCanReviewInfo(null);
      setCanReviewError("");
      setCanReviewLoading(false);
      reviewPermissionAbortRef.current = null;
      return null;
    }

    const controller = new AbortController();
    reviewPermissionAbortRef.current = controller;

    setCanReviewLoading(true);
    setCanReviewError("");
    try {
      const data = await getReviewPermission(movieInternalId, {
        signal: controller.signal,
      });
      if (controller.signal.aborted) {
        return null;
      }
      setCanReviewInfo(data ?? null);
      return data ?? null;
    } catch (error) {
      if (controller.signal.aborted) {
        return null;
      }
      console.error("Fetch review permission error", error);
      setCanReviewInfo(null);
      setCanReviewError(
        extractApiErrorMessage(
          error,
          "Không kiểm tra được quyền đánh giá. Vui lòng thử lại.",
        ),
      );
      return null;
    } finally {
      if (!controller.signal.aborted) {
        setCanReviewLoading(false);
      }
      if (reviewPermissionAbortRef.current === controller) {
        reviewPermissionAbortRef.current = null;
      }
    }
  }, [isLoggedIn, movieInternalId]);

  const fetchMyReview = useCallback(async (reviewId) => {
    myReviewAbortRef.current?.abort?.();

    if (reviewId == null || reviewId === "") {
      setMyReview(null);
      setMyReviewLoading(false);
      myReviewAbortRef.current = null;
      return null;
    }

    const controller = new AbortController();
    myReviewAbortRef.current = controller;

    setMyReviewLoading(true);

    try {
      const data = await getReviewById(reviewId, { signal: controller.signal });
      if (controller.signal.aborted) {
        return null;
      }
      setMyReview(data ?? null);
      return data ?? null;
    } catch (error) {
      if (controller.signal.aborted) {
        return null;
      }
      console.error("Fetch review detail error", error);
      setMyReview(null);
      return null;
    } finally {
      if (!controller.signal.aborted) {
        setMyReviewLoading(false);
      }
      if (myReviewAbortRef.current === controller) {
        myReviewAbortRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    reviewStatsAbortRef.current?.abort?.();

    if (!movieInternalId) {
      setReviewStats(null);
      return () => {};
    }

    const controller = new AbortController();
    reviewStatsAbortRef.current = controller;

    refreshReviewStats({ signal: controller.signal }).catch(() => {});

    return () => {
      controller.abort();
      if (reviewStatsAbortRef.current === controller) {
        reviewStatsAbortRef.current = null;
      }
    };
  }, [movieInternalId, refreshReviewStats]);

  useEffect(() => {
    refreshReviewPermission().catch(() => {});

    return () => {
      reviewPermissionAbortRef.current?.abort?.();
    };
  }, [refreshReviewPermission]);

  useEffect(() => {
    const reviewId = resolveExistingReviewId(canReviewInfo);

    if (!isLoggedIn || reviewId == null || reviewId === "") {
      myReviewAbortRef.current?.abort?.();
      setMyReview(null);
      setMyReviewLoading(false);
      return () => {};
    }

    fetchMyReview(reviewId).catch(() => {});

    return () => {
      myReviewAbortRef.current?.abort?.();
    };
  }, [canReviewInfo, fetchMyReview, isLoggedIn]);

  useEffect(() => {
    const reviewId = resolveExistingReviewId(canReviewInfo);
    if (reviewId == null || reviewId === "") {
      return;
    }

    const matched = reviews.find((item) => {
      const itemId = resolveReviewId(item);
      return itemId != null && String(itemId) === String(reviewId);
    });

    if (matched) {
      setMyReview((prev) => {
        const prevId = resolveReviewId(prev);
        if (prevId != null && String(prevId) === String(reviewId)) {
          return { ...prev, ...matched };
        }
        return matched;
      });
    }
  }, [reviews, canReviewInfo]);

  useEffect(() => {
    return () => {
      myReviewAbortRef.current?.abort?.();
    };
  }, []);

  useEffect(() => {
    setSubmitReviewError("");
    setHelpfulError("");
    setHelpfulLoadingId(null);
    setDeleteReviewError("");
    setReportError("");
    setReportSuccess("");
    setReportingReviewId(null);
  }, [movieInternalId]);

  const loadReviews = useCallback(
    (pageNumber = 1) => {
      if (!movieInternalId) return;

      reviewAbortRef.current?.abort?.();
      const controller = new AbortController();
      reviewAbortRef.current = controller;

      setReviewLoading(true);
      setReviewError("");

      getReviewsByMovie(
        movieInternalId,
        {
          pageNumber,
          pageSize: reviewPageSize,
        },
        { signal: controller.signal },
      )
        .then((data) => {
          if (controller.signal.aborted) return;

          const items = Array.isArray(data?.items) ? data.items : [];
          setReviews((prev) =>
            pageNumber === 1 ? items : [...prev, ...items],
          );
          setReviewHasMore(
            Boolean(
              data?.hasNextPage ??
              (data?.totalPages
                ? pageNumber < data.totalPages
                : items.length === reviewPageSize),
            ),
          );
          setReviewPage(pageNumber);
        })
        .catch((error) => {
          if (controller.signal.aborted) return;
          console.error("Fetch reviews error", error);
          setReviewError("Không tải được bình luận. Vui lòng thử lại.");
          if (pageNumber === 1) {
            setReviews([]);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setReviewLoading(false);
          }
          if (reviewAbortRef.current === controller) {
            reviewAbortRef.current = null;
          }
        });
    },
    [movieInternalId, reviewPageSize],
  );

  useEffect(() => {
    if (!movieInternalId) {
      setReviews([]);
      setReviewHasMore(false);
      setReviewLoading(false);
      return undefined;
    }
    loadReviews(1);
    return () => {
      reviewAbortRef.current?.abort?.();
    };
  }, [movieInternalId, loadReviews]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchRelated() {
      try {
        const [nowShowing, comingSoon] = await Promise.all([
          getNowShowingMovies({ signal: controller.signal }),
          getComingSoonMovies({ signal: controller.signal }),
        ]);

        if (!controller.signal.aborted) {
          setRelatedNowShowing(
            Array.isArray(nowShowing) ? nowShowing.slice(0, 8) : [],
          );
          setRelatedComingSoon(
            Array.isArray(comingSoon) ? comingSoon.slice(0, 8) : [],
          );
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Fetch related movies error", error);
          setRelatedNowShowing([]);
          setRelatedComingSoon([]);
        }
      }
    }

    fetchRelated();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    const loggedIn = Boolean(token);
    setIsLoggedIn(loggedIn);

    if (loggedIn) {
      refetchProfile().catch(() => {});
    }
  }, [refetchProfile]);

  useEffect(() => {
    if (!isLoggedIn) {
      resetProfile();
      setShowProfileModal(false);
      setShowOrdersModal(false);
      setShowChatWidget(false);
      resetOrders();
      setCanReviewInfo(null);
      setCanReviewError("");
      setCanReviewLoading(false);
      setSubmitReviewError("");
      setHelpfulError("");
    }
  }, [isLoggedIn, resetOrders, resetProfile]);

  useEffect(() => {
    if (!showOrdersModal || !isLoggedIn) {
      return undefined;
    }

    fetchOrders();

    return () => {
      cancelOrders();
    };
  }, [showOrdersModal, isLoggedIn, fetchOrders, cancelOrders]);

  const handleLoadMoreReviews = () => {
    const nextPage = reviewPage + 1;
    loadReviews(nextPage);
  };

  const handleSubmitReview = useCallback(
    async (payload = {}, options = {}) => {
      const mode = options.mode === "edit" ? "edit" : "create";

      const numericRating = Number(payload?.rating ?? payload?.Rating ?? 0);
      if (
        !Number.isFinite(numericRating) ||
        numericRating < 1 ||
        numericRating > 5
      ) {
        setSubmitReviewError("Điểm đánh giá không hợp lệ.");
        return false;
      }

      const trimmedContent = String(
        payload?.content ?? payload?.Content ?? "",
      ).trim();
      if (trimmedContent.length < 20) {
        setSubmitReviewError("Nội dung đánh giá cần ít nhất 20 ký tự.");
        return false;
      }
      const trimmedTitle = payload?.title
        ? String(payload.title).trim()
        : payload?.Title
          ? String(payload.Title).trim()
          : null;

      if (mode === "create" && !movieInternalId) {
        setSubmitReviewError("Không xác định được phim để đánh giá.");
        return false;
      }

      setSubmitReviewError("");
      setDeleteReviewError("");
      setReportError("");
      setReportSuccess("");
      setIsSubmittingReview(true);

      try {
        if (mode === "edit") {
          const targetId =
            options.reviewId ??
            resolveReviewId(options.review) ??
            resolveReviewId(myReview) ??
            resolveExistingReviewId(canReviewInfo);

          if (targetId == null || targetId === "") {
            setSubmitReviewError("Không tìm thấy đánh giá để cập nhật.");
            return false;
          }

          await updateReview({
            id: targetId,
            rating: numericRating,
            title: trimmedTitle,
            content: trimmedContent,
          });

          await fetchMyReview(targetId).catch(() => {});
        } else {
          await createReview({
            movieId: movieInternalId,
            rating: numericRating,
            title: trimmedTitle,
            content: trimmedContent,
          });
        }

        await refreshReviewStats().catch(() => {});
        await refreshReviewPermission().catch(() => {});
        loadReviews(1);

        return true;
      } catch (error) {
        const message = extractApiErrorMessage(
          error,
          mode === "edit"
            ? "Không cập nhật được đánh giá. Vui lòng thử lại."
            : "Không gửi được đánh giá. Vui lòng thử lại.",
        );
        setSubmitReviewError(message);
        return false;
      } finally {
        setIsSubmittingReview(false);
      }
    },
    [
      canReviewInfo,
      fetchMyReview,
      loadReviews,
      movieInternalId,
      myReview,
      refreshReviewPermission,
      refreshReviewStats,
    ],
  );

  const handleVoteHelpful = useCallback(async (review) => {
    if (!review) return;
    const reviewId =
      review.id ?? review.reviewId ?? review.reviewID ?? review.Id ?? null;
    if (reviewId == null || reviewId === "") {
      return;
    }

    setHelpfulError("");
    setHelpfulLoadingId(reviewId);

    try {
      await voteReviewHelpful(reviewId, true);

      setReviews((prev) =>
        prev.map((item) => {
          const itemId =
            item?.id ?? item?.reviewId ?? item?.reviewID ?? item?.Id ?? null;
          if (itemId !== reviewId) {
            return item;
          }

          const currentVote = item?.currentUserVoted ?? null;
          const currentHelpful = Number(item?.helpfulCount ?? 0);
          const currentNotHelpful = Number(item?.notHelpfulCount ?? 0);
          if (currentVote === true) {
            return {
              ...item,
              helpfulCount: Math.max(0, currentHelpful - 1),
              currentUserVoted: null,
            };
          }

          const updated = {
            ...item,
            helpfulCount: currentHelpful + 1,
            currentUserVoted: true,
          };

          if (currentVote === false) {
            updated.notHelpfulCount = Math.max(0, currentNotHelpful - 1);
          }

          return updated;
        }),
      );
    } catch (error) {
      const message = extractApiErrorMessage(
        error,
        "Không thể ghi nhận bình chọn hữu ích. Vui lòng thử lại.",
      );
      setHelpfulError(message);
    } finally {
      setHelpfulLoadingId(null);
    }
  }, []);

  const handleDeleteReview = useCallback(async () => {
    const reviewId =
      resolveReviewId(myReview) ?? resolveExistingReviewId(canReviewInfo);

    if (reviewId == null || reviewId === "") {
      setDeleteReviewError("Không tìm thấy đánh giá để xoá.");
      return false;
    }

    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Bạn có chắc chắn muốn xoá đánh giá này không?",
      );
      if (!confirmed) {
        return false;
      }
    }

    setDeleteReviewError("");
    setReportError("");
    setReportSuccess("");
    setIsDeletingReview(true);

    try {
      await deleteReview(reviewId);
      setMyReview(null);

      await refreshReviewStats().catch(() => {});
      await refreshReviewPermission().catch(() => {});
      loadReviews(1);

      return true;
    } catch (error) {
      const message = extractApiErrorMessage(
        error,
        "Không thể xoá đánh giá. Vui lòng thử lại.",
      );
      setDeleteReviewError(message);
      return false;
    } finally {
      setIsDeletingReview(false);
    }
  }, [
    canReviewInfo,
    loadReviews,
    myReview,
    refreshReviewPermission,
    refreshReviewStats,
  ]);

  const handleReportReview = useCallback(async (review, overrides = {}) => {
    if (!review) {
      return false;
    }

    const reviewId = resolveReviewId(review);
    if (reviewId == null || reviewId === "") {
      setReportError("Không xác định được đánh giá để báo cáo.");
      return false;
    }

    setDeleteReviewError("");

    let reason = overrides.reason;
    if (reason == null && typeof window !== "undefined") {
      reason = window.prompt(
        "Lý do bạn muốn báo cáo bình luận này là gì?",
        "Nội dung không phù hợp",
      );
    }

    if (reason == null) {
      return false;
    }

    reason = String(reason).trim();
    if (!reason) {
      return false;
    }

    let description = overrides.description;
    if (description === undefined && typeof window !== "undefined") {
      description = window.prompt("Mô tả chi tiết (không bắt buộc)", "");
    }

    setReportError("");
    setReportSuccess("");
    setReportingReviewId(reviewId);

    try {
      await reportReview(reviewId, {
        reason,
        description,
      });
      setReportSuccess(
        "Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét đánh giá này.",
      );
      return true;
    } catch (error) {
      const message = extractApiErrorMessage(
        error,
        "Không thể gửi báo cáo. Vui lòng thử lại.",
      );
      setReportError(message);
      return false;
    } finally {
      setReportingReviewId(null);
    }
  }, []);

  const openAuthModal = useCallback((view = "login") => {
    setAuthModalView(view);
    setShowAuthModal(true);
  }, []);

  const handleCloseAuthModal = useCallback(() => {
    setShowAuthModal(false);
  }, []);

  const handleLogin = useCallback(() => {
    openAuthModal("login");
  }, [openAuthModal]);

  const handleLoginSuccess = useCallback(
    async (authPayload) => {
      setShowAuthModal(false);
      setIsLoggedIn(true);

      let profileData = null;
      try {
        profileData = await refetchProfile();
      } catch (error) {
        console.warn("Không tải được hồ sơ sau khi đăng nhập", error);
      }

      const roles = extractNormalizedRoles(authPayload, profileData);
      storeUserRoles(roles);

      if (hasAdminRole(roles)) {
        navigate("/admin/dashboard", { replace: true });
      }

      refreshReviewPermission().catch(() => {});
      loadReviews(1);
    },
    [loadReviews, navigate, refetchProfile, refreshReviewPermission],
  );

  const handleChangePasswordSuccess = useCallback(() => {
    clearTokens();
    setIsLoggedIn(false);
    clearStoredRoles();
    setShowAuthModal(false);
    resetProfile();
    setShowProfileModal(false);
  }, [resetProfile]);

  const handleOpenProfileModal = useCallback(() => {
    if (!isLoggedIn) {
      openAuthModal("login");
      return;
    }

    setShowProfileModal(true);
  }, [isLoggedIn, openAuthModal]);

  const handleCloseProfileModal = useCallback(() => {
    setShowProfileModal(false);
  }, []);

  const handleProfileSubmit = useCallback(
    (values) => {
      const payload = {
        FullName: values.fullName?.trim() || null,
        PhoneNumber: values.phoneNumber?.trim() || null,
        DateOfBirth: values.dateOfBirth || null,
      };

      return updateProfile(payload);
    },
    [updateProfile],
  );

  const handleLogout = useCallback(async () => {
    try {
      await logoutApi();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      clearTokens();
      setIsLoggedIn(false);
      resetProfile();
      clearStoredRoles();
      setShowProfileModal(false);
      setShowChatWidget(false);
      navigate("/");
    }
  }, [navigate, resetProfile]);

  const handleChangePassword = useCallback(() => {
    openAuthModal("changePassword");
  }, [openAuthModal]);

  const handleOrders = useCallback(() => {
    if (!isLoggedIn) {
      alert("Bạn cần đăng nhập để xem đơn hàng.");
      openAuthModal("login");
      return;
    }

    setShowOrdersModal(true);
    setShowChatWidget(false);
  }, [isLoggedIn, openAuthModal]);

  const handleCloseOrders = useCallback(() => {
    setShowOrdersModal(false);
    cancelOrders();
  }, [cancelOrders]);

  const handleReloadOrders = useCallback(() => {
    if (!isLoggedIn) return;
    fetchOrders();
  }, [isLoggedIn, fetchOrders]);

  const handleChat = useCallback(() => {
    if (!isLoggedIn) {
      alert("Bạn cần đăng nhập để sử dụng trợ lý AI.");
      openAuthModal("login");
      return;
    }

    setShowOrdersModal(false);
    setShowChatWidget(true);
  }, [isLoggedIn, openAuthModal]);

  const handleCloseChat = useCallback(() => {
    setShowChatWidget(false);
  }, []);

  const handleSelectShowtime = useCallback((showtime, cinema) => {
    if (!showtime) return;

    const context = {
      ...showtime,
      cinemaId:
        showtime.cinemaId ?? cinema?.cinemaId ?? showtime.cinema?.id ?? null,
      cinemaName:
        showtime.cinemaName ||
        cinema?.cinemaName ||
        showtime.cinema?.name ||
        "Rạp chưa rõ",
      cinemaAddress:
        showtime.cinemaAddress ||
        cinema?.cinemaAddress ||
        showtime.cinema?.address ||
        "",
    };

    setSelectedShowtime(context);
    setSeatModalOpen(true);
  }, []);

  const handleCloseSeatModal = useCallback(() => {
    setSeatModalOpen(false);
    setSelectedShowtime(null);
  }, []);

  const safeMovie = movie || {};
  const averageRating = pickAverageRating(safeMovie, reviewStats);
  const reviewCount = pickReviewCount(safeMovie, reviewStats);
  const runtime = formatRuntime(
    safeMovie?.duration || safeMovie?.runtime || safeMovie?.length,
  );
  const categories = formatCategories(safeMovie);
  const releaseYear = formatReleaseYear(safeMovie);
  const trailerLink = getTrailerLink(safeMovie);
  const trailerEmbedUrl = useMemo(
    () => resolveTrailerEmbedUrl(trailerLink),
    [trailerLink],
  );
  const actors = extractActors(safeMovie);
  const directors = extractDirectors(safeMovie);
  const countries = extractCountries(safeMovie);

  const handleOpenTrailer = useCallback(() => {
    if (trailerEmbedUrl) {
      setTrailerOpen(true);
      return;
    }

    if (trailerLink && typeof window !== "undefined") {
      window.open(trailerLink, "_blank", "noopener,noreferrer");
    }
  }, [trailerEmbedUrl, trailerLink]);

  const handleCloseTrailer = useCallback(() => {
    setTrailerOpen(false);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (!isTrailerOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setTrailerOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isTrailerOpen]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    if (!isTrailerOpen) return undefined;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [isTrailerOpen]);

  useEffect(() => {
    setTrailerOpen(false);
  }, [movieLookupKey]);

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="movie-detail-page">
      <HeaderBar
        query={query}
        onQueryChange={setQuery}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onChangePassword={handleChangePassword}
        onOrders={handleOrders}
        onChat={handleChat}
        onProfile={handleOpenProfileModal}
        fullName={profile?.fullName}
        isLoggedIn={isLoggedIn}
        showSearch={false}
      />

      <main className="movie-detail-content">
        <div className="movie-detail-container">
          <button
            type="button"
            className="movie-detail-back"
            onClick={handleBack}
          >
            ← Quay lại
          </button>

          <MovieDetailHero
            movie={movie}
            loading={movieLoading}
            error={movieError}
            averageRating={averageRating}
            reviewCount={reviewCount}
            releaseYear={releaseYear}
            runtime={runtime}
            categories={categories}
            countries={countries}
            directors={directors}
            actors={actors}
            trailerLink={trailerLink}
            onOpenTrailer={handleOpenTrailer}
          />

          {showOrdersModal && (
            <OrdersModal
              onClose={handleCloseOrders}
              onReload={handleReloadOrders}
              orders={orders}
              loading={loadingOrders}
              error={ordersError}
              isLoggedIn={isLoggedIn}
            />
          )}

          <MovieShowtimes
            movie={movie}
            movieError={movieError}
            showtimeLoading={showtimeLoading}
            showtimeError={showtimeError}
            dateOptions={dateOptions}
            activeDate={activeDate}
            onSelectDate={setActiveDate}
            showtimesForActiveDate={showtimesForActiveDate}
            onSelectShowtime={handleSelectShowtime}
          />

          <MovieReviews
            movie={movie}
            movieError={movieError}
            averageRating={averageRating}
            reviewCount={reviewCount}
            reviewLoading={reviewLoading}
            reviews={reviews}
            reviewHasMore={reviewHasMore}
            onLoadMore={handleLoadMoreReviews}
            reviewError={reviewError}
            isLoggedIn={isLoggedIn}
            canReview={canReviewInfo}
            canReviewLoading={canReviewLoading}
            canReviewError={canReviewError}
            onLogin={handleLogin}
            onSubmitReview={handleSubmitReview}
            submittingReview={isSubmittingReview}
            submitReviewError={submitReviewError}
            helpfulLoadingId={helpfulLoadingId}
            helpfulError={helpfulError}
            onVoteHelpful={handleVoteHelpful}
            existingReview={myReview}
            existingReviewLoading={myReviewLoading}
            onDeleteReview={handleDeleteReview}
            deletingReview={isDeletingReview}
            deleteReviewError={deleteReviewError}
            onReportReview={handleReportReview}
            reportingReviewId={reportingReviewId}
            reportError={reportError}
            reportSuccess={reportSuccess}
          />
        </div>

        <MovieDetailSidebar
          nowShowing={relatedNowShowing}
          comingSoon={relatedComingSoon}
        />
      </main>

      <MovieTrailerModal
        isOpen={isTrailerOpen}
        embedUrl={trailerEmbedUrl}
        title={`Trailer ${movie?.name || movie?.title || "phim"}`}
        onClose={handleCloseTrailer}
      />

      <SeatSelectionModal
        isOpen={isSeatModalOpen}
        onClose={handleCloseSeatModal}
        showtime={selectedShowtime}
        movie={movie}
      />

      {showAuthModal && (
        <AuthModal
          onClose={handleCloseAuthModal}
          onLoginSuccess={handleLoginSuccess}
          onChangePasswordSuccess={handleChangePasswordSuccess}
          initialView={authModalView}
        />
      )}

      {showProfileModal && (
        <UserProfileModal
          open={showProfileModal}
          onClose={handleCloseProfileModal}
          profile={profile}
          loading={loadingProfile}
          updating={updatingProfile}
          error={profileError}
          onSubmit={handleProfileSubmit}
        />
      )}
      {showChatWidget && (
        <ChatWidget
          isOpen={showChatWidget}
          onClose={handleCloseChat}
          isLoggedIn={isLoggedIn}
        />
      )}

      <SupportChatWidget isLoggedIn={isLoggedIn} />

      <AppFooter />
    </div>
  );
}
