import { Link } from "react-router-dom";
import {
  resolveMovieLink,
  resolvePosterMeta,
} from "../../services/movieDetailService";
import { fmtLocalDate } from "../../utils/datetime.js";

export default function MovieDetailSidebar({
  nowShowing = [],
  comingSoon = [],
}) {
  return (
    <aside className="movie-detail-sidebar">
      <div className="movie-detail-sidebar-section">
        <h3>Phim đang chiếu</h3>
        <ul>
          {nowShowing.map((item) => {
            const posterMeta = resolvePosterMeta(item);

            return (
              <li key={item.id || item.movieId || item.slug || item.name}>
                <Link
                  to={resolveMovieLink(item)}
                  className="movie-detail-sidebar-link"
                >
                  <div className="movie-detail-sidebar-thumb">
                    {posterMeta.hasImage ? (
                      <img
                        src={posterMeta.src}
                        alt={item.name || item.title || "Poster phim"}
                        loading="lazy"
                      />
                    ) : (
                      <span className="movie-detail-sidebar-thumb-placeholder">
                        {posterMeta.text}
                      </span>
                    )}
                  </div>
                  <div className="movie-detail-sidebar-details">
                    <span className="movie-detail-sidebar-name">
                      {item.name || item.title}
                    </span>
                    {item.averageRating ? (
                      <span className="movie-detail-sidebar-rating">
                        {Number(item.averageRating).toFixed(1)} / 5
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="movie-detail-sidebar-section">
        <h3>Phim sắp chiếu</h3>
        <ul>
          {comingSoon.map((item) => {
            const posterMeta = resolvePosterMeta(item);

            return (
              <li key={item.id || item.movieId || item.slug || item.name}>
                <Link
                  to={resolveMovieLink(item)}
                  className="movie-detail-sidebar-link"
                >
                  <div className="movie-detail-sidebar-thumb">
                    {posterMeta.hasImage ? (
                      <img
                        src={posterMeta.src}
                        alt={item.name || item.title || "Poster phim"}
                        loading="lazy"
                      />
                    ) : (
                      <span className="movie-detail-sidebar-thumb-placeholder">
                        {posterMeta.text}
                      </span>
                    )}
                  </div>
                  <div className="movie-detail-sidebar-details">
                    <span className="movie-detail-sidebar-name">
                      {item.name || item.title}
                    </span>
                    {item.releaseDate ? (
                      <span className="movie-detail-sidebar-date">
                        {fmtLocalDate(item.releaseDate, "DD/MM/YYYY")}
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
