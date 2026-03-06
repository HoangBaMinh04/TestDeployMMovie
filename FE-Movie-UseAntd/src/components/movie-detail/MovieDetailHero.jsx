import { pickPoster } from "../../services/movieDetailService";

export default function MovieDetailHero({
  movie,
  loading,
  error,
  averageRating,
  reviewCount,
  releaseYear,
  runtime,
  categories,
  countries,
  directors,
  actors,
  trailerLink,
  onOpenTrailer,
}) {
  if (loading) {
    return (
      <section className="movie-detail-hero movie-detail-hero--loading">
        <div className="movie-detail-state">Đang tải thông tin phim...</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="movie-detail-hero movie-detail-hero--error">
        <div className="movie-detail-state">{error}</div>
      </section>
    );
  }

  if (!movie) {
    return (
      <section className="movie-detail-hero movie-detail-hero--empty">
        <div className="movie-detail-state">
          Không tìm thấy thông tin phim theo yêu cầu.
        </div>
      </section>
    );
  }
  

  return (
    <section className="movie-detail-hero">
      <div className="movie-detail-poster">
        <img
          src={pickPoster(movie)}
          alt={movie?.name || movie?.title || "Poster phim"}
        />
      </div>
      <div className="movie-detail-info">
        <h1 className="movie-detail-title">
          {movie?.name || movie?.title || "Thông tin phim"}
        </h1>
        <div className="movie-detail-meta">
          {averageRating != null ? (
            <div className="movie-detail-rating">
              <span className="movie-detail-rating-value">{averageRating}</span>
              <span className="movie-detail-rating-label">/5</span>
            </div>
          ) : null}
          {reviewCount != null ? (
            <span className="movie-detail-meta-item">
              {reviewCount.toLocaleString("vi-VN")} đánh giá
            </span>
          ) : null}
          {releaseYear ? (
            <span className="movie-detail-meta-item">{releaseYear}</span>
          ) : null}
          {runtime ? (
            <span className="movie-detail-meta-item">{runtime}</span>
          ) : null}
        </div>

        {categories ? (
          <p className="movie-detail-genres">Thể loại: {categories}</p>
        ) : null}

        {countries.length ? (
          <p className="movie-detail-genres">
            Quốc gia: {countries.join(", ")}
          </p>
        ) : null}

        {directors.length ? (
          <p className="movie-detail-genres">
            Đạo diễn: {directors.join(", ")}
          </p>
        ) : null}

        {actors.length ? (
          <p className="movie-detail-genres">Diễn viên: {actors.join(", ")}</p>
        ) : null}

        {movie?.description ? (
          <p className="movie-detail-description">
            Tóm tắt: {movie.description}
          </p>
        ) : null}

        <div className="movie-detail-actions">
          {trailerLink ? (
            <button
              type="button"
              className="movie-detail-action primary"
              onClick={onOpenTrailer}
            >
              Xem trailer
            </button>
          ) : null}
          <a className="movie-detail-action" href="#showtimes">
            Xem lịch chiếu
          </a>
        </div>
      </div>
    </section>
  );
}
