import { http } from "../api/http";

export async function getReviewsByMovie(movieId, query = {}, opts = {}) {
  if (movieId == null || movieId === "") {
    throw new Error("Movie id is required to fetch reviews");
  }

  const params = {};
  if (query.pageNumber != null) params.pageNumber = query.pageNumber;
  if (query.pageSize != null) params.pageSize = query.pageSize;
  if (query.sortBy) params.sortBy = query.sortBy;
  if (query.onlyVerified != null) params.onlyVerified = query.onlyVerified;
  if (query.rating != null) params.rating = query.rating;

  const res = await http.get(`/Review/movie/${movieId}`, {
    params,
    signal: opts.signal,
  });

  return res.data;
}

export async function getMovieReviewStats(movieId, opts = {}) {
  if (movieId == null || movieId === "") {
    throw new Error("Movie id is required to fetch review stats");
  }

  const res = await http.get(`/Review/movie/${movieId}/stats`, {
    signal: opts.signal,
  });

  return res.data;
}

export async function getReviewPermission(movieId, opts = {}) {
  if (movieId == null || movieId === "") {
    throw new Error("Movie id is required to check review permission");
  }

  const res = await http.get(`/Review/can-review/${movieId}`, {
    signal: opts.signal,
  });

  return res.data;
}

export async function createReview(payload = {}, opts = {}) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Payload is required to create review");
  }

  const body = {
    movieId:
      payload.movieId ?? payload.MovieId ?? payload.movieID ?? payload.MovieID,
    orderId:
      payload.orderId ?? payload.OrderId ?? payload.orderID ?? payload.OrderID,
    rating: payload.rating ?? payload.Rating,
    title: payload.title ?? payload.Title ?? null,
    content: payload.content ?? payload.Content,
  };

  if (body.movieId == null || body.movieId === "") {
    throw new Error("Movie id is required to create review");
  }

  if (body.rating == null) {
    throw new Error("Rating is required to create review");
  }

  if (!body.content || String(body.content).trim().length === 0) {
    throw new Error("Content is required to create review");
  }

  const normalized = {
    ...body,
    title:
      body.title == null || body.title === ""
        ? null
        : String(body.title).trim(),
    content: String(body.content).trim(),
  };

  const res = await http.post("/Review", normalized, {
    signal: opts.signal,
  });

  return res.data;
}

export async function voteReviewHelpful(reviewId, isHelpful = true, opts = {}) {
  if (reviewId == null || reviewId === "") {
    throw new Error("Review id is required to vote review");
  }

  const res = await http.post(
    `/Review/${reviewId}/helpful`,
    { isHelpful },
    { signal: opts.signal }
  );

  return res.data;
}

export async function updateReview(payload = {}, opts = {}) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Payload is required to update review");
  }

  const reviewId =
    payload.id ?? payload.Id ?? payload.reviewId ?? payload.reviewID ?? null;

  if (reviewId == null || reviewId === "") {
    throw new Error("Review id is required to update review");
  }

  const body = {
    id: reviewId,
    rating: payload.rating ?? payload.Rating,
    title: payload.title ?? payload.Title ?? null,
    content: payload.content ?? payload.Content,
  };

  if (body.rating == null) {
    throw new Error("Rating is required to update review");
  }

  if (!body.content || String(body.content).trim().length === 0) {
    throw new Error("Content is required to update review");
  }

  const normalized = {
    ...body,
    title:
      body.title == null || body.title === ""
        ? null
        : String(body.title).trim(),
    content: String(body.content).trim(),
  };

  const res = await http.put(`/Review/${reviewId}`, normalized, {
    signal: opts.signal,
  });

  return res.data;
}

export async function deleteReview(reviewId, opts = {}) {
  if (reviewId == null || reviewId === "") {
    throw new Error("Review id is required to delete review");
  }

  const res = await http.delete(`/Review/${reviewId}`, {
    signal: opts.signal,
  });

  return res.data;
}

export async function reportReview(reviewId, payload = {}, opts = {}) {
  if (reviewId == null || reviewId === "") {
    throw new Error("Review id is required to report review");
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Payload is required to report review");
  }

  const normalized = {
    reason: String(payload.reason ?? payload.Reason ?? "").trim(),
    description: payload.description ?? payload.Description ?? null,
  };

  if (!normalized.reason) {
    throw new Error("Reason is required to report review");
  }

  if (normalized.description != null && normalized.description !== "") {
    normalized.description = String(normalized.description).trim();
  } else {
    normalized.description = null;
  }

  const res = await http.post(`/Review/${reviewId}/report`, normalized, {
    signal: opts.signal,
  });

  return res.data;
}

export async function getReviewById(reviewId, opts = {}) {
  if (reviewId == null || reviewId === "") {
    throw new Error("Review id is required to fetch review detail");
  }

  const res = await http.get(`/Review/${reviewId}`, {
    signal: opts.signal,
  });

  return res.data;
}

export async function getMyReviews(opts = {}) {
  const res = await http.get("/Review/my-reviews", {
    signal: opts.signal,
  });

  return res.data;
}

export async function getAdminReviews(query = {}, opts = {}) {
  const params = {};

  if (query.pageNumber != null) params.pageNumber = query.pageNumber;
  if (query.pageSize != null) params.pageSize = query.pageSize;
  if (query.searchTerm) params.searchTerm = query.searchTerm;

  if (query.movieId != null && query.movieId !== "") {
    params.movieId = query.movieId;
  }

  if (query.userId != null && query.userId !== "") {
    params.userId = query.userId;
  }

  if (query.isVisible === true || query.isVisible === false) {
    params.isVisible = query.isVisible;
  }

  if (query.includeDeleted) {
    params.includeDeleted = true;
  }

  const res = await http.get("/Review/paged", {
    params,
    signal: opts.signal,
  });

  return res.data;
}

export async function hideReviewAsAdmin(reviewId, opts = {}) {
  if (reviewId == null || reviewId === "") {
    throw new Error("Review id is required to hide review");
  }

  const res = await http.post(`/Review/${reviewId}/hide`, null, {
    signal: opts.signal,
  });

  return res.data;
}

export async function showReviewAsAdmin(reviewId, opts = {}) {
  if (reviewId == null || reviewId === "") {
    throw new Error("Review id is required to show review");
  }

  const res = await http.post(`/Review/${reviewId}/show`, null, {
    signal: opts.signal,
  });

  return res.data;
}

export async function adminDeleteReview(reviewId, opts = {}) {
  if (reviewId == null || reviewId === "") {
    throw new Error("Review id is required to delete review");
  }

  const res = await http.delete(`/Review/${reviewId}/admin-delete`, {
    signal: opts.signal,
  });

  return res.data;
}

export async function getReviewReports(query = {}, opts = {}) {
  const params = {};

  if (query.includeResolved) {
    params.includeResolved = true;
  }

  const res = await http.get("/Review/reports", {
    params,
    signal: opts.signal,
  });

  return res.data;
}

export async function resolveReviewReport(reportId, payload = {}, opts = {}) {
  if (reportId == null || reportId === "") {
    throw new Error("Report id is required to resolve review report");
  }

  const body = {
    isResolved: Boolean(payload.isResolved),
    adminNote:
      payload.adminNote == null || payload.adminNote === ""
        ? null
        : String(payload.adminNote).trim(),
  };

  const res = await http.post(`/Review/report/${reportId}/resolve`, body, {
    signal: opts.signal,
  });

  return res.data;
}
