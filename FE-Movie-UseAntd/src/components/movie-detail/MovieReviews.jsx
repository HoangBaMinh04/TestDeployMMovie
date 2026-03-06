import { fmtLocalDate } from "../../utils/datetime.js";
import { useEffect, useMemo, useState } from "react";

const MIN_REVIEW_CONTENT_LENGTH = 20;

// ID resolver: accept common field names
function getReviewId(review) {
  if (!review) return null;
  const candidates = [review.id, review.Id, review.reviewId, review._id];
  for (const c of candidates) {
    if (c != null && String(c).trim() !== "") return c;
  }
  return null;
}

function getReviewerName(review) {
  return review?.userName || review?.user?.name || "Người dùng ẩn danh";
}

function normalizeHelpfulCount(review) {
  const value = review?.helpfulCount ?? review?.likes ?? 0;
  const numeric = Number.isFinite(Number(value)) ? Number(value) : 0;
  return Math.max(0, numeric);
}

function getReviewRating(review) {
  if (!review) return null;
  const candidates = [review.rating, review.Rating, review.score, review.Score];
  for (const candidate of candidates) {
    if (candidate == null) continue;
    const numeric = Number(candidate);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }
  return null;
}

function getReviewTitle(review) {
  if (!review) return "";
  const value = review.title ?? review.Title ?? "";
  return value ? String(value) : "";
}

function getReviewContent(review) {
  if (!review) return "";
  const candidates = [
    review.content,
    review.Content,
    review.comment,
    review.body,
  ];
  for (const candidate of candidates) {
    if (candidate == null) continue;
    const text = String(candidate);
    if (text.trim().length > 0) {
      return text;
    }
  }
  return "";
}

export default function MovieReviews({
  movie,
  movieError,
  averageRating,
  reviewCount,
  reviewLoading,
  reviews,
  reviewHasMore,
  onLoadMore,
  reviewError,
  isLoggedIn,
  canReview,
  canReviewLoading,
  canReviewError,
  onLogin,
  onSubmitReview,
  submittingReview,
  submitReviewError,
  helpfulLoadingId,
  helpfulError,
  onVoteHelpful,
  existingReview,
  existingReviewLoading,
  onDeleteReview,
  deletingReview,
  deleteReviewError,
  onReportReview,
  reportingReviewId,
  reportError,
  reportSuccess,
}) {
  const reviewItems = Array.isArray(reviews) ? reviews : [];
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [localError, setLocalError] = useState("");
  const [mode, setMode] = useState("create");
  const [editingReview, setEditingReview] = useState(null);

  const ratingOptions = useMemo(() => [5, 4, 3, 2, 1], []);
  const existingReviewId = useMemo(
    () => getReviewId(existingReview),
    [existingReview]
  );
  const editingReviewId = useMemo(
    () => getReviewId(editingReview),
    [editingReview]
  );
  const activeReview = useMemo(
    () => editingReview ?? existingReview ?? null,
    [editingReview, existingReview]
  );
  const activeReviewId = useMemo(
    () => getReviewId(activeReview),
    [activeReview]
  );
  const activeReviewTitle = useMemo(
    () => getReviewTitle(activeReview),
    [activeReview]
  );
  const activeReviewRating = useMemo(
    () => getReviewRating(activeReview),
    [activeReview]
  );
  const activeReviewContent = useMemo(
    () => getReviewContent(activeReview),
    [activeReview]
  );

  // Close form if cannot review (in create mode)
  useEffect(() => {
    if (!canReview?.canReview && mode !== "edit") {
      setShowForm(false);
    }
  }, [canReview?.canReview, mode]);

  useEffect(() => {
    if (!showForm) {
      setLocalError("");
    }
  }, [showForm]);

  // Prevent edit mode without a valid id
  useEffect(() => {
    if (mode === "edit" && !activeReviewId) {
      setMode("create");
      setShowForm(false);
    }
  }, [activeReviewId, mode]);

  // Seed form values when entering edit mode
  useEffect(() => {
    if (mode !== "edit" || !showForm || !activeReview) return;

    const numericRating = Number(activeReviewRating ?? ratingOptions[0]);
    if (
      Number.isFinite(numericRating) &&
      numericRating >= 1 &&
      numericRating <= 5
    ) {
      setRating(numericRating);
    }
    setTitle(activeReviewTitle);
    setContent(activeReviewContent || "");
  }, [
    activeReview,
    activeReviewContent,
    activeReviewRating,
    activeReviewTitle,
    mode,
    ratingOptions,
    showForm,
  ]);

  // Keep editingReview in sync if parent updates existingReview (same id)
  useEffect(() => {
    if (!editingReviewId || !existingReview) return;

    const latestId = getReviewId(existingReview);
    if (latestId != null && String(latestId) === String(editingReviewId)) {
      setEditingReview((prev) =>
        !prev ? existingReview : { ...prev, ...existingReview }
      );
    }
  }, [editingReviewId, existingReview]);

  const handleStartCreate = () => {
    if (!isLoggedIn) {
      onLogin?.();
      return;
    }

    if (mode === "create" && showForm) {
      setShowForm(false);
      setLocalError("");
      return;
    }

    if (mode !== "edit" && !canReview?.canReview) {
      setLocalError(canReview?.reason || "Bạn không thể đánh giá phim này.");
      return;
    }
    setMode("create");
    setEditingReview(null);

    setRating(5);
    setTitle("");
    setContent("");
    setLocalError("");
    setShowForm(true);
  };

  const handleStartEdit = () => {
    if (!isLoggedIn) {
      onLogin?.();
      return;
    }

    if (!existingReviewId) {
      setLocalError("Không tìm thấy đánh giá của bạn để chỉnh sửa.");
      return;
    }

    if (mode === "edit" && showForm) {
      setShowForm(false);
      setMode("create");
      setEditingReview(null);
      setLocalError("");
      return;
    }

    setMode("edit");
    setEditingReview(existingReview ?? null);
    setLocalError("");
    setShowForm(true);
  };

  const handleStartEditFromList = (review) => {
    if (!isLoggedIn) {
      onLogin?.();
      return;
    }

    const reviewId = getReviewId(review) ?? existingReviewId;

    if (!reviewId) {
      setLocalError("Không tìm thấy đánh giá của bạn để chỉnh sửa.");
      return;
    }

    setMode("edit");
    setEditingReview(review ?? existingReview ?? null);
    setLocalError("");
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setLocalError("");
    if (mode === "edit") {
      setMode("create");
      setEditingReview(null);
    }
  };

  const handleDeleteClick = async () => {
    if (!isLoggedIn) {
      onLogin?.();
      return;
    }

    const result = await onDeleteReview?.();
    if (result) {
      setMode("create");
      setShowForm(false);
      setEditingReview(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isLoggedIn) {
      onLogin?.();
      return;
    }

    if (mode !== "edit" && !canReview?.canReview) {
      setLocalError(canReview?.reason || "Bạn không thể đánh giá phim này.");
      return;
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length < MIN_REVIEW_CONTENT_LENGTH) {
      setLocalError(
        `Nội dung đánh giá cần ít nhất ${MIN_REVIEW_CONTENT_LENGTH} ký tự.`
      );
      return;
    }

    setLocalError("");

    const trimmedTitle = title.trim();
    const payload = {
      rating,
      title: trimmedTitle.length ? trimmedTitle : null,
      content: trimmedContent,
    };

    try {
      const result = await onSubmitReview?.(payload, {
        mode,
        reviewId: activeReviewId ?? existingReviewId,
        review: activeReview ?? existingReview,
      });
      if (result) {
        setTitle("");
        setContent("");
        setRating(5);
        setShowForm(false);
        setMode("create");
        setEditingReview(null);
      }
    } catch {
      // Error message is handled by parent via submitReviewError state.
    }
  };

  const handleHelpfulClick = (review) => {
    if (!isLoggedIn) {
      onLogin?.();
      return;
    }
    onVoteHelpful?.(review);
  };

  const handleReportClick = (review) => {
    if (!isLoggedIn) {
      onLogin?.();
      return;
    }
    onReportReview?.(review);
  };

  const permissionMessage = useMemo(() => {
    if (existingReviewLoading) return "Đang tải đánh giá của bạn...";
    if (canReviewLoading) return "Đang kiểm tra quyền đánh giá...";

    if (canReview?.canReview === false) {
      const parts = [];
      if (canReview?.reason) parts.push(canReview.reason);
      else if (canReview?.requiresPurchase)
        parts.push("Bạn cần mua vé và xem phim trước khi đánh giá.");
      else parts.push("Bạn không đủ điều kiện để đánh giá phim này.");

      if (canReview?.hasExistingReview)
        parts.push("Bạn có thể chỉnh sửa hoặc xoá đánh giá hiện tại.");
      return parts.filter(Boolean).join(" ");
    }

    if (canReview?.hasExistingReview) {
      const parts = [
        "Bạn đã đánh giá phim này.",
        "Bạn có thể chỉnh sửa hoặc xoá đánh giá hiện tại.",
      ];
      return parts.join(" ");
    }

    return "";
  }, [canReview, canReviewLoading, existingReviewLoading]);

  const renderPermissionNotice = () => {
    if (!isLoggedIn) {
      return (
        <button
          type="button"
          className="movie-detail-action secondary"
          onClick={() => onLogin?.()}
        >
          Đăng nhập để đánh giá
        </button>
      );
    }

    if (existingReviewLoading || canReviewLoading) {
      return (
        <span className="movie-detail-review-permission-info">
          {permissionMessage}
        </span>
      );
    }

    // Relaxed condition: show the create button if logged in and canReview is not determined yet
    if (
      canReview?.canReview ||
      (isLoggedIn && canReview == null && !canReviewLoading)
    ) {
      return (
        <button
          type="button"
          className="movie-detail-action primary"
          onClick={handleStartCreate}
          disabled={submittingReview}
        >
          {mode === "create" && showForm ? "Đóng biểu mẫu" : "Viết đánh giá"}
        </button>
      );
    }

    if (canReviewError) {
      return (
        <span className="movie-detail-review-permission-error">
          {canReviewError}
        </span>
      );
    }

    if (permissionMessage) {
      return (
        <span className="movie-detail-review-permission-info">
          {permissionMessage}
        </span>
      );
    }

    return null;
  };

  return (
    <section className="movie-detail-section" id="reviews">
      <div className="section-header">
        <h2>Bình luận</h2>
        {reviewError ? (
          <span className="section-error">{reviewError}</span>
        ) : null}
      </div>

      {!movie || movieError ? (
        <div className="movie-detail-state">
          Vui lòng chọn phim hợp lệ để xem bình luận.
        </div>
      ) : (
        <>
          <div className="movie-detail-review-summary">
            {averageRating != null ? (
              <div className="movie-detail-review-score">
                <span className="movie-detail-review-score-value">
                  {averageRating}
                </span>
                <span className="movie-detail-review-score-max">/5</span>
              </div>
            ) : (
              <div className="movie-detail-review-score movie-detail-review-score--empty">
                Chưa có đánh giá
              </div>
            )}
            <div className="movie-detail-review-meta">
              {reviewCount != null ? (
                <span>{reviewCount.toLocaleString("vi-VN")} lượt đánh giá</span>
              ) : (
                <span>Hãy là người đầu tiên đánh giá!</span>
              )}
            </div>
          </div>

          <div className="movie-detail-review-cta">
            {renderPermissionNotice()}
          </div>

          {showForm ? (
            <form className="movie-detail-review-form" onSubmit={handleSubmit}>
              <div className="movie-detail-review-form-row">
                <label htmlFor="review-rating">Đánh giá</label>
                <select
                  id="review-rating"
                  value={rating}
                  onChange={(event) => setRating(Number(event.target.value))}
                  disabled={submittingReview}
                >
                  {ratingOptions.map((option) => (
                    <option key={option} value={option}>
                      {option} sao
                    </option>
                  ))}
                </select>
              </div>

              <div className="movie-detail-review-form-row">
                <label htmlFor="review-title">Tiêu đề (không bắt buộc)</label>
                <input
                  id="review-title"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ví dụ: Bộ phim cực kỳ hấp dẫn"
                  maxLength={100}
                  disabled={submittingReview}
                />
              </div>

              <div className="movie-detail-review-form-row">
                <label htmlFor="review-content">Nội dung đánh giá</label>
                <textarea
                  id="review-content"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Chia sẻ cảm nhận của bạn về bộ phim..."
                  rows={5}
                  minLength={MIN_REVIEW_CONTENT_LENGTH}
                  disabled={submittingReview}
                />
                <small>Tối thiểu {MIN_REVIEW_CONTENT_LENGTH} ký tự.</small>
              </div>

              {localError ? (
                <div className="movie-detail-review-form-error">
                  {localError}
                </div>
              ) : null}
              {submitReviewError ? (
                <div className="movie-detail-review-form-error">
                  {submitReviewError}
                </div>
              ) : null}

              <div className="movie-detail-review-form-actions">
                <button
                  type="button"
                  className="movie-detail-action secondary"
                  onClick={handleCancelForm}
                  disabled={submittingReview}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="movie-detail-action primary"
                  disabled={submittingReview}
                >
                  {submittingReview
                    ? mode === "edit"
                      ? "Đang cập nhật..."
                      : "Đang gửi..."
                    : mode === "edit"
                    ? "Cập nhật đánh giá"
                    : "Gửi đánh giá"}{" "}
                </button>
              </div>
            </form>
          ) : null}

          {helpfulError ? (
            <div className="movie-detail-review-global-error">
              {helpfulError}
            </div>
          ) : null}
          {deleteReviewError ? (
            <div className="movie-detail-review-global-error">
              {deleteReviewError}
            </div>
          ) : null}
          {reportError ? (
            <div className="movie-detail-review-global-error">
              {reportError}
            </div>
          ) : null}
          {reportSuccess ? (
            <div className="movie-detail-review-global-success">
              {reportSuccess}
            </div>
          ) : null}

          {reviewLoading && reviewItems.length === 0 ? (
            <div className="movie-detail-state">Đang tải bình luận...</div>
          ) : reviewItems.length === 0 ? (
            <div className="movie-detail-state">
              Chưa có bình luận nào cho phim này.
            </div>
          ) : (
            <ul className="movie-detail-review-list">
              {reviewItems.map((review) => {
                const reviewId = getReviewId(review);
                const helpfulCount = normalizeHelpfulCount(review);
                const isPending =
                  helpfulLoadingId != null &&
                  reviewId != null &&
                  String(helpfulLoadingId) === String(reviewId);
                const votedHelpful = review?.currentUserVoted === true;
                const isReporting =
                  reportingReviewId != null &&
                  reviewId != null &&
                  String(reportingReviewId) === String(reviewId);
                const displayRating = getReviewRating(review);
                const displayTitle = getReviewTitle(review);
                const displayContent = getReviewContent(review);
                return (
                  <li
                    key={
                      reviewId ||
                      `${review?.userId || "user"}-${
                        review?.createdAt || review?.createdDate
                      }`
                    }
                    className="movie-detail-review-item"
                  >
                    <div className="movie-detail-review-header">
                      <div className="movie-detail-review-author">
                        <span className="movie-detail-review-name">
                          {getReviewerName(review)}
                        </span>
                        {review?.isMine ? (
                          <span className="movie-detail-review-badge movie-detail-review-badge--mine">
                            (Bạn)
                          </span>
                        ) : null}
                        {review?.createdAt || review?.createdDate ? (
                          <span className="movie-detail-review-date">
                            {fmtLocalDate(
                              review?.createdAt || review?.createdDate,
                              "DD/MM/YYYY"
                            )}
                          </span>
                        ) : null}
                      </div>
                      {displayRating != null ? (
                        <span className="movie-detail-review-rating">
                          {Number(displayRating).toFixed(1)} / 5
                        </span>
                      ) : null}
                    </div>
                    {displayTitle ? (
                      <p className="movie-detail-review-title">
                        {displayTitle}
                      </p>
                    ) : null}
                    <p className="movie-detail-review-body">{displayContent}</p>
                    <div className="movie-detail-review-footer">
                      <button
                        type="button"
                        className={
                          "movie-detail-review-helpful" +
                          (votedHelpful ? " is-active" : "")
                        }
                        onClick={() => handleHelpfulClick(review)}
                        disabled={Boolean(review?.isMine) || isPending}
                      >
                        {isPending
                          ? "Đang lưu..."
                          : votedHelpful
                          ? "Đã hữu ích"
                          : "Hữu ích"}
                      </button>
                      <span className="movie-detail-review-helpful-count">
                        {helpfulCount.toLocaleString("vi-VN")}
                      </span>
                      {review?.isMine ? (
                        <div className="movie-detail-review-manage">
                          <button
                            type="button"
                            className="movie-detail-review-manage-button"
                            onClick={() => handleStartEditFromList(review)}
                            disabled={submittingReview || deletingReview}
                          >
                            {mode === "edit" && showForm
                              ? "Đang chỉnh sửa"
                              : "Chỉnh sửa"}
                          </button>
                          <button
                            type="button"
                            className="movie-detail-review-manage-button is-danger"
                            onClick={handleDeleteClick}
                            disabled={deletingReview}
                          >
                            {deletingReview ? "Đang xoá..." : "Xoá"}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="movie-detail-review-report"
                          onClick={() => handleReportClick(review)}
                          disabled={isReporting}
                        >
                          {isReporting ? "Đang báo cáo..." : "Báo cáo"}
                        </button>
                      )}
                      {review?.isVerifiedPurchase ? (
                        <span className="movie-detail-review-verified">
                          Đã mua vé
                        </span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {reviewHasMore ? (
            <div className="movie-detail-review-actions">
              <button
                type="button"
                className="movie-detail-action primary"
                onClick={onLoadMore}
                disabled={reviewLoading}
              >
                {reviewLoading ? "Đang tải..." : "Xem thêm bình luận"}
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
