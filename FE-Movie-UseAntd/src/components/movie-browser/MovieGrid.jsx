const POSTER_FIELDS = ["posterUrl"];
import { Link } from "react-router-dom";
import { pickAverageRating } from "../../services/movieDetailService";

function pickPoster(movie = {}) {
  for (const field of POSTER_FIELDS) {
    const value = movie?.[field];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  if (Array.isArray(movie?.images)) {
    const poster = movie.images.find((item) => typeof item === "string");
    if (poster) {
      return poster;
    }

    const posterObj = movie.images.find(
      (item) => item && typeof item.url === "string"
    );

    if (posterObj) {
      return posterObj.url;
    }
  }

  return null;
}

const MAX_CATS = 3;

function pickCategoryNames(movie = {}, max = MAX_CATS) {
  const list = Array.isArray(movie.categories) ? movie.categories : [];

  // Sắp xếp: Primary trước, rồi theo displayOrder, rồi theo tên
  const sorted = [...list].sort((a, b) => {
    const pri = (b?.isPrimary === true) - (a?.isPrimary === true); // true trước
    if (pri !== 0) return pri;

    const ao = (a?.displayOrder ?? 0) - (b?.displayOrder ?? 0);
    if (ao !== 0) return ao;

    return (a?.categoryName ?? "").localeCompare(b?.categoryName ?? "");
  });

  const names = sorted
    .map((x) => x?.categoryName)
    .filter((x) => typeof x === "string" && x.trim());

  const visible = names.slice(0, max);
  const restCount = Math.max(0, names.length - visible.length);

  return { visible, restCount };
}

export default function MovieGrid({ movies = [] }) {
  if (!movies.length) return null;

  return (
    <div className="movies-grid">
      {movies.map((movie = {}) => {
        const poster = pickPoster(movie);
        const cardKey = movie.id;
        const duration = movie.duration;
        const rating = pickAverageRating(movie);
        const ratingDisplay =
          typeof rating === "number" ? rating.toFixed(1) : null;

        const { visible: cats, restCount } = pickCategoryNames(movie);

        const cardBody = (
          <>
            <div className={`movie-poster ${poster ? "has-image" : ""}`.trim()}>
              {poster ? (
                <img
                  src={poster}
                  alt={movie.name ? `Poster phim ${movie.name}` : ""}
                  loading="lazy"
                />
              ) : null}
              {movie.ageRating ? (
                <div className="quality-badge">{movie.ageRating}</div>
              ) : null}
            </div>

            <div className="movie-info">
              <h4>{movie.name}</h4>

              {/* Category chips */}
              {cats.length ? (
                <div className="movie-categories">
                  {cats.map((name) => (
                    <span key={name} className="cat-chip">
                      {name}
                    </span>
                  ))}
                  {restCount > 0 ? (
                    <span className="cat-chip more">+{restCount}</span>
                  ) : null}
                </div>
              ) : null}

              {duration ? (
                <p className="movie-runtime">Thời lượng: {duration} phút</p>
              ) : null}

              {ratingDisplay ? (
                <div
                  className="movie-rating"
                  aria-label={`Đánh giá ${ratingDisplay} trên 5`}
                >
                  <span className="movie-rating-icon" aria-hidden="true">
                    ⭐
                  </span>
                  <span className="movie-rating-value">{ratingDisplay}</span>
                  <span className="movie-rating-scale">/5</span>
                </div>
              ) : null}
            </div>
          </>
        );

        const detailSlug = movie.slug;
        const detailPath = detailSlug ? `/movies/${detailSlug}` : null;

        if (detailPath) {
          return (
            <Link key={cardKey} to={detailPath} className="movie-card-link">
              <div className="movie-card">{cardBody}</div>
            </Link>
          );
        }

        return (
          <div key={cardKey} className="movie-card">
            {cardBody}
          </div>
        );
      })}
    </div>
  );
}
