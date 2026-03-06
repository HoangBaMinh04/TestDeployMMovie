import { useMemo } from "react";

function buildPageList(currentPage, totalPages) {
  if (!totalPages || totalPages <= 1) {
    return [];
  }

  const maxVisible = 5;
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, "...", totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [
      1,
      "...",
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "...",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "...",
    totalPages,
  ];
}

export default function Pagination({
  currentPage,
  totalPages,
  hasPreviousPage,
  hasNextPage,
  onPageChange,
}) {
  const pages = useMemo(
    () => buildPageList(currentPage, totalPages),
    [currentPage, totalPages]
  );

  if (!pages.length) {
    return null;
  }

  return (
    <div className="pagination">
      <button
        type="button"
        className="pagination-btn"
        onClick={() => onPageChange?.(currentPage - 1)}
        disabled={!hasPreviousPage}
      >
        « Trước
      </button>

      {pages.map((page, index) => (
        <button
          key={`${page}-${index}`}
          type="button"
          className={`pagination-btn ${page === currentPage ? "active" : ""} ${
            page === "..." ? "dots" : ""
          }`}
          onClick={() => typeof page === "number" && onPageChange?.(page)}
          disabled={page === "..."}
        >
          {page}
        </button>
      ))}

      <button
        type="button"
        className="pagination-btn"
        onClick={() => onPageChange?.(currentPage + 1)}
        disabled={!hasNextPage}
      >
        Sau »
      </button>
    </div>
  );
}
