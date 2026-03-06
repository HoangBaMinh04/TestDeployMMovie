export default function MovieTrailerModal({
  isOpen,
  embedUrl,
  title,
  onClose,
}) {
  if (!isOpen || !embedUrl) {
    return null;
  }

  return (
    <div className="movie-trailer-modal" role="dialog" aria-modal="true">
      <div className="movie-trailer-backdrop" onClick={onClose} />
      <div className="movie-trailer-dialog" role="document">
        <button
          type="button"
          className="movie-trailer-close"
          aria-label="Đóng trailer"
          onClick={onClose}
        >
          ×
        </button>
        <div className="movie-trailer-frame">
          <iframe
            src={embedUrl}
            title={title}
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        </div>
        {title ? <div className="movie-trailer-caption">{title}</div> : null}
      </div>
    </div>
  );
}
