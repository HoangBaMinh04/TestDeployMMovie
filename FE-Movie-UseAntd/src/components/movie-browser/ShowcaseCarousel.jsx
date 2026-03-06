import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toLocalDayjs } from "../../utils/datetime.js";
import { pickAverageRating } from "../../services/movieDetailService";
const FALLBACK_POSTER =
  "linear-gradient(135deg, rgba(34, 34, 34, 0.8), rgba(80, 80, 80, 0.8))";

function pickPoster(movie = {}) {
  return movie.posterUrl || null;
}

function pickRating(movie = {}) {
  const rating = pickAverageRating(movie);
  if (typeof rating !== "number" || Number.isNaN(rating)) return null;
  return rating.toFixed(1);
}

function pickDate(movie = {}) {
  const date = toLocalDayjs(movie.releaseDate);
  if (!date) return null;

  const day = date.format("DD");
  const month = date.locale("vi").format("MMM").replace(".", "");
  const year = date.format("YYYY");

  return { day, month, year };
}

function pickCategories(movie = {}) {
  if (Array.isArray(movie.categoryNames) && movie.categoryNames.length) {
    return movie.categoryNames.join(", ");
  }

  if (Array.isArray(movie.categories) && movie.categories.length) {
    return movie.categories
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.categoryName ?? item?.CategoryName ?? item?.name
      )

      .filter(Boolean)
      .join(", ");
  }

  if (typeof movie.category === "string") {
    return movie.category;
  }

  return "";
}

export default function ShowcaseCarousel({
  title,
  subtitle,
  movies = [],
  loading = false,
  error = "",
  onRetry,
  theme = "dark",
}) {
  const [page, setPage] = useState(0);

  const safeMovies = useMemo(
    () => (Array.isArray(movies) ? movies : []),
    [movies]
  );
  const totalPages = Math.max(1, Math.ceil(safeMovies.length / 4));

  useEffect(() => {
    setPage(0);
  }, [safeMovies]);

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages - 1));
  }, [totalPages]);

  const startIndex = page * 4;
  const visibleMovies = safeMovies.slice(startIndex, startIndex + 4);
  const canNavigate = safeMovies.length > 4 && !loading && !error;

  const handlePrev = () => {
    if (page > 0) {
      setPage((value) => Math.max(0, value - 1));
    }
  };

  const handleNext = () => {
    if (startIndex + 4 < safeMovies.length) {
      setPage((value) => Math.min(totalPages - 1, value + 1));
    }
  };

  const handleRetry = () => {
    onRetry?.();
  };

  const sectionClass = `showcase-section ${
    theme === "light" ? "showcase-light" : "showcase-dark"
  }`;

  return (
    <section className={sectionClass} aria-label={title}>
      <div className="showcase-header">
        <div className="showcase-header-text">
          <h2 className="showcase-title">{title}</h2>
          {subtitle && <p className="showcase-subtitle">{subtitle}</p>}
        </div>
        <div className="showcase-controls">
          {safeMovies.length > 0 && (
            <span className="showcase-counter">
              {Math.min(page + 1, totalPages)}/{totalPages}
            </span>
          )}
        </div>
      </div>

      <div className="showcase-body">
        {canNavigate && (
          <>
            <button
              type="button"
              className="showcase-arrow showcase-arrow--prev"
              onClick={handlePrev}
              disabled={page === 0}
              aria-label="Xem nhóm phim trước"
            >
              ‹
            </button>
            <button
              type="button"
              className="showcase-arrow showcase-arrow--next"
              onClick={handleNext}
              disabled={page >= totalPages - 1}
              aria-label="Xem nhóm phim tiếp theo"
            >
              ›
            </button>
          </>
        )}
        {loading ? (
          <div className="showcase-state">
            <span className="showcase-spinner" aria-hidden="true" />
            <span>Đang tải danh sách phim...</span>
          </div>
        ) : error ? (
          <div className="showcase-state">
            <span>{error}</span>
            {onRetry && (
              <button
                type="button"
                className="showcase-retry"
                onClick={handleRetry}
              >
                Thử lại
              </button>
            )}
          </div>
        ) : safeMovies.length === 0 ? (
          <div className="showcase-state">
            <span>Hiện chưa có phim trong danh sách này.</span>
          </div>
        ) : (
          <div className="showcase-grid">
            {visibleMovies.map((movie) => {
              const poster = pickPoster(movie);
              const rating = pickRating(movie);
              const dateParts = pickDate(movie);
              const categories = pickCategories(movie);

              const style = poster
                ? { backgroundImage: `url(${poster})` }
                : { backgroundImage: FALLBACK_POSTER };

              const cardKey = movie.id || movie.slug || movie.movieId;
              const detailSlug = movie.slug || movie.id || movie.movieId;
              const detailPath = detailSlug ? `/movies/${detailSlug}` : null;
              const cardClass = `showcase-card ${
                theme === "light" ? "showcase-card--light" : ""
              }`;

              const cardChildren = (
                <>
                  <div className="showcase-card-visual">
                    <div
                      className="showcase-card-bg"
                      style={style}
                      aria-hidden="true"
                    />
                    <div className="showcase-card-overlay" aria-hidden="true" />
                    <div className="showcase-card-visual-top">
                      {dateParts && (
                        <div className="showcase-date">
                          <span className="showcase-date-day">
                            {dateParts.day}
                          </span>
                          <span className="showcase-date-month">
                            {dateParts.month}
                          </span>
                        </div>
                      )}
                      <div className="showcase-badges">
                        {movie.ageRating && (
                          <span className="showcase-badge-rating">
                            {movie.ageRating}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="showcase-play" aria-hidden="true">
                      ▶
                    </div>
                  </div>

                  <div className="showcase-card-content">
                    <h3 className="showcase-card-title">
                      {movie.name || movie.title}
                    </h3>

                    {categories && (
                      <span className="showcase-badge">{categories}</span>
                    )}

                    <div className="showcase-card-footer">
                      <span className="showcase-meta">
                        ⭐ {rating}
                        <span className="showcase-meta-scale">/5</span>
                      </span>
                    </div>
                  </div>
                </>
              );

              if (detailPath) {
                return (
                  <Link
                    key={cardKey}
                    to={detailPath}
                    className="showcase-card-link"
                  >
                    <article className={cardClass}>{cardChildren}</article>
                  </Link>
                );
              }

              return (
                <article key={cardKey} className={cardClass}>
                  {cardChildren}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
