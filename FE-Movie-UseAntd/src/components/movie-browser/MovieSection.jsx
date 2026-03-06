import MovieGrid from "./MovieGrid";
import Pagination from "./Pagination";

export default function MovieSection({
  title,
  // totalCount,
  currentPage,
  totalPages,
  loading,
  movies = [],
  hasPreviousPage,
  hasNextPage,
  onPageChange,
  emptyMessage,
}) {
  return (
    <div className="movie-section">
      <div className="section-header">
        <h2 className="section-title">{title}</h2>
        {/* {totalCount > 0 && (
          <div className="result-info">
            Tìm thấy <strong>{totalCount}</strong> phim | Trang {currentPage}/
            {totalPages}
          </div>
        )} */}
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner" />
          Đang tải phim...
        </div>
      ) : movies.length ? (
        <>
          <MovieGrid movies={movies} />
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              hasPreviousPage={hasPreviousPage}
              hasNextPage={hasNextPage}
              onPageChange={onPageChange}
            />
          )}
        </>
      ) : (
        <div className="no-results">{emptyMessage}</div>
      )}
    </div>
  );
}
