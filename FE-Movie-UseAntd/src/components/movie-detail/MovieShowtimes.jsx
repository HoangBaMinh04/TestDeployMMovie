import {
  formatCurrency,
  formatDateLabel,
} from "../../services/movieDetailService";

export default function MovieShowtimes({
  movie,
  movieError,
  showtimeLoading,
  showtimeError,
  dateOptions,
  activeDate,
  onSelectDate,
  showtimesForActiveDate,
  onSelectShowtime = () => {},
}) {
  return (
    <section className="movie-detail-section" id="showtimes">
      <div className="section-header">
        <h2>Lịch chiếu</h2>
        {showtimeError ? (
          <span className="section-error">{showtimeError}</span>
        ) : null}
      </div>

      {!movie || movieError ? (
        <div className="movie-detail-state">
          Vui lòng chọn phim hợp lệ để xem lịch chiếu.
        </div>
      ) : showtimeLoading ? (
        <div className="movie-detail-state">Đang tải lịch chiếu...</div>
      ) : dateOptions.length === 0 ? (
        <div className="movie-detail-state">
          Hiện chưa có lịch chiếu cho phim này.
        </div>
      ) : (
        <>
          <div className="movie-detail-date-picker">
            {dateOptions.map((dateKey) => {
              const dateLabel = formatDateLabel(dateKey);
              const isActive = activeDate === dateKey;
              return (
                <button
                  key={dateKey}
                  type="button"
                  className={`movie-detail-date ${isActive ? "active" : ""}`}
                  onClick={() => onSelectDate(dateKey)}
                >
                  <span className="movie-detail-date-weekday">
                    {dateLabel.weekday}
                  </span>
                  <span className="movie-detail-date-day">{dateLabel.day}</span>
                  <span className="movie-detail-date-month">
                    {dateLabel.month}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="movie-detail-showtimes">
            {showtimesForActiveDate.length === 0 ? (
              <div className="movie-detail-state">
                Không có lịch chiếu trong ngày này.
              </div>
            ) : (
              showtimesForActiveDate.map((cinema) => (
                <div
                  key={cinema.cinemaId || cinema.cinemaName}
                  className="movie-detail-cinema"
                >
                  <div className="movie-detail-cinema-header">
                    <h3>{cinema.cinemaName}</h3>
                    {cinema.cinemaAddress ? (
                      <p>{cinema.cinemaAddress}</p>
                    ) : null}
                  </div>
                  <div className="movie-detail-showtime-grid">
                    {cinema.showtimes.map((item) => (
                      <button
                        key={`${cinema.cinemaId || cinema.cinemaName}-${
                          item.id || item.timeLabel
                        }`}
                        type="button"
                        className="movie-detail-showtime"
                        onClick={() =>
                          onSelectShowtime?.(
                            {
                              ...item,
                              cinemaId:
                                item.cinemaId ??
                                cinema.cinemaId ??
                                item.cinema?.id ??
                                null,
                              cinemaName:
                                item.cinemaName ||
                                cinema.cinemaName ||
                                item.cinema?.name ||
                                "Rạp chưa rõ",
                              cinemaAddress:
                                item.cinemaAddress ||
                                cinema.cinemaAddress ||
                                item.cinema?.address ||
                                "",
                            },
                            cinema
                          )
                        }
                      >
                        <span className="movie-detail-showtime-time">
                          {item.timeLabel || "--:--"}
                        </span>
                        {item.format ? (
                          <span className="movie-detail-showtime-format">
                            {item.format}
                          </span>
                        ) : null}
                        {item.price != null ? (
                          <span className="movie-detail-showtime-price">
                            {formatCurrency(item.price)} đ
                          </span>
                        ) : null}
                        {item.roomName ? (
                          <span className="movie-detail-showtime-room">
                            Phòng {item.roomName}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
}
