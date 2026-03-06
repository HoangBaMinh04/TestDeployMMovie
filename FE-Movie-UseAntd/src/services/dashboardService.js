import { http } from "../api/http";

const SUMMARY_ENDPOINT = "/dashboard/summary";
const SALES_ENDPOINT = "/dashboard/sales";
const MOVIE_STATS_ENDPOINT = "/dashboard/movies";
const MOVIE_TREND_ENDPOINT = "/dashboard/movie-trend";
const SALES_DISTRIBUTION_ENDPOINT = "/dashboard/sales-distribution";

const FALLBACK_SUMMARY = {
  totalRevenue: 0,
  ticketsSold: 0,
  movieCount: 0,
  cinemaCount: 0,
  showtimeCount: 0,
  roomCount: 0,
  customerCount: 0,
};

const FALLBACK_SALES = [
  { label: "Thứ 2", value: 120 },
  { label: "Thứ 3", value: 150 },
  { label: "Thứ 4", value: 180 },
  { label: "Thứ 5", value: 220 },
  { label: "Thứ 6", value: 260 },
  { label: "Thứ 7", value: 310 },
  { label: "CN", value: 280 },
];

const FALLBACK_MOVIE_STATS = {
  totalPublished: 120,
  today: 4,
  thisWeek: 22,
  thisMonth: 68,
};
const FALLBACK_MOVIE_TREND_POINTS = [
  { label: "Tuần 1", value: 6 },
  { label: "Tuần 2", value: 9 },
  { label: "Tuần 3", value: 5 },
  { label: "Tuần 4", value: 8 },
];

const FALLBACK_MOVIE_TREND = {
  totalCreated: FALLBACK_MOVIE_TREND_POINTS.reduce(
    (sum, item) => sum + item.value,
    0
  ),
  points: FALLBACK_MOVIE_TREND_POINTS,
};

const FALLBACK_SALES_DISTRIBUTION_ITEMS = [
  { label: "Rạp Hà Nội", value: 58000000, percentage: 32 },
  { label: "Rạp Hồ Chí Minh", value: 51000000, percentage: 28 },
  { label: "Rạp Đà Nẵng", value: 31000000, percentage: 17 },
  { label: "Rạp Cần Thơ", value: 24000000, percentage: 13 },
  { label: "Rạp Hải Phòng", value: 18000000, percentage: 10 },
];

const FALLBACK_SALES_DISTRIBUTION = {
  dimension: "cinema",
  items: FALLBACK_SALES_DISTRIBUTION_ITEMS,
};
function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeSummary(raw) {
  if (!raw || typeof raw !== "object") {
    return { ...FALLBACK_SUMMARY };
  }
  return {
    totalRevenue: toNumber(raw.totalRevenue ?? raw.TotalRevenue, 0),
    ticketsSold: toNumber(raw.ticketsSold ?? raw.TicketsSold, 0),
    movieCount: toNumber(raw.movieCount ?? raw.MovieCount, 0),
    cinemaCount: toNumber(raw.cinemaCount ?? raw.CinemaCount, 0),
    showtimeCount: toNumber(raw.showtimeCount ?? raw.ShowtimeCount, 0),
    roomCount: toNumber(raw.roomCount ?? raw.RoomCount, 0),
    customerCount: toNumber(raw.customerCount ?? raw.CustomerCount, 0),
  };
}
function normalizeSales(raw) {
  if (!raw) {
    return [...FALLBACK_SALES];
  }

  const items = Array.isArray(raw)
    ? raw
    : Array.isArray(raw.points)
    ? raw.points
    : Array.isArray(raw.Points)
    ? raw.Points
    : [];

  if (!items.length) {
    return [...FALLBACK_SALES];
  }

  const normalized = items.map((item, index) => {
    if (item == null) {
      return { label: `#${index + 1}`, value: 0 };
    }

    const label = item.label ?? item.Label ?? `#${index + 1}`;
    const value = toNumber(item.value ?? item.Value, 0);

    return {
      label: label || `#${index + 1}`,
      value,
    };
  });
  return normalized.length ? normalized : [...FALLBACK_SALES];
}

function normalizeMovieStats(raw) {
  if (!raw || typeof raw !== "object") {
    return { ...FALLBACK_MOVIE_STATS };
  }

  return {
    totalPublished: toNumber(raw.totalPublished ?? raw.TotalPublished, 0),
    today: toNumber(raw.today ?? raw.Today, 0),
    thisWeek: toNumber(raw.thisWeek ?? raw.ThisWeek, 0),
    thisMonth: toNumber(raw.thisMonth ?? raw.ThisMonth, 0),
  };
}

function normalizeMovieTrend(raw) {
  const source = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.points)
    ? raw.points
    : Array.isArray(raw?.Points)
    ? raw.Points
    : [];

  const points = source.length
    ? source.map((item, index) => {
        if (!item) {
          return { label: `#${index + 1}`, value: 0 };
        }

        const label =
          item.label ??
          item.Label ??
          item.date ??
          item.Date ??
          item.name ??
          item.Name ??
          `#${index + 1}`;

        const value = toNumber(
          item.value ??
            item.Value ??
            item.count ??
            item.Count ??
            item.total ??
            item.Total,
          0
        );

        return {
          label: label || `#${index + 1}`,
          value: Number.isFinite(value) ? Math.max(value, 0) : 0,
        };
      })
    : FALLBACK_MOVIE_TREND_POINTS.map((item) => ({ ...item }));

  const totalCreated = toNumber(
    raw?.totalCreated ??
      raw?.TotalCreated ??
      raw?.total ??
      raw?.Total ??
      raw?.count ??
      raw?.Count,
    points.reduce((sum, item) => sum + toNumber(item.value, 0), 0)
  );

  return {
    totalCreated,
    points,
  };
}

function normalizeSalesDistribution(raw) {
  const source = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.items)
    ? raw.items
    : Array.isArray(raw?.Items)
    ? raw.Items
    : Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(raw?.Data)
    ? raw.Data
    : [];

  const items = source.length
    ? source.map((item, index) => {
        if (!item) {
          return {
            key: `item-${index}`,
            label: `#${index + 1}`,
            value: 0,
            percentage: 0,
          };
        }

        const label =
          item.label ??
          item.Label ??
          item.name ??
          item.Name ??
          item.title ??
          item.Title ??
          `#${index + 1}`;

        const value = toNumber(
          item.value ??
            item.Value ??
            item.revenue ??
            item.Revenue ??
            item.amount ??
            item.Amount,
          0
        );

        const percentageRaw = toNumber(
          item.percentage ??
            item.Percentage ??
            item.percent ??
            item.Percent ??
            item.share ??
            item.Share,
          NaN
        );

        return {
          key: `${item.key ?? item.Key ?? label ?? index}-${index}`,
          label: label || `#${index + 1}`,
          value: Number.isFinite(value) ? Math.max(value, 0) : 0,
          percentage: Number.isFinite(percentageRaw)
            ? Math.max(percentageRaw, 0)
            : null,
        };
      })
    : FALLBACK_SALES_DISTRIBUTION_ITEMS.map((item, index) => ({
        key: `fallback-${index}`,
        ...item,
      }));

  const totalValue = items.reduce(
    (sum, item) => sum + toNumber(item.value, 0),
    0
  );

  const normalizedItems = items.map((item, index) => {
    const derivedPercent = totalValue
      ? (toNumber(item.value, 0) / totalValue) * 100
      : 0;

    const percentage =
      item.percentage == null || Number.isNaN(item.percentage)
        ? derivedPercent
        : item.percentage;

    return {
      key: item.key ?? `item-${index}`,
      label: item.label ?? `#${index + 1}`,
      value: toNumber(item.value, 0),
      percentage,
    };
  });

  return {
    dimension: raw?.dimension ?? raw?.Dimension ?? "",
    items: normalizedItems,
    total: totalValue,
  };
}

export async function getDashboardSummary(opts = {}) {
  const response = await http.get(SUMMARY_ENDPOINT, {
    signal: opts.signal,
  });

  return normalizeSummary(response?.data);
}

export async function getDashboardSales(opts = {}) {
  const response = await http.get(SALES_ENDPOINT, {
    signal: opts.signal,
    params: opts.range ? { range: opts.range } : undefined,
  });
  return normalizeSales(response?.data);
}

export async function getDashboardMovieStats(opts = {}) {
  const response = await http.get(MOVIE_STATS_ENDPOINT, {
    signal: opts.signal,
  });

  return normalizeMovieStats(response?.data);
}

export async function getDashboardMovieTrend(opts = {}) {
  const response = await http.get(MOVIE_TREND_ENDPOINT, {
    signal: opts.signal,
    params: opts.range ? { range: opts.range } : undefined,
  });

  return normalizeMovieTrend(response?.data);
}

export async function getDashboardSalesDistribution(opts = {}) {
  const params = {};

  if (opts.dimension) {
    params.dimension = opts.dimension;
  }

  if (opts.top) {
    params.top = opts.top;
  }

  const response = await http.get(SALES_DISTRIBUTION_ENDPOINT, {
    signal: opts.signal,
    params: Object.keys(params).length ? params : undefined,
  });

  return normalizeSalesDistribution(response?.data);
}

export const DEFAULT_DASHBOARD_SUMMARY = { ...FALLBACK_SUMMARY };
export const DEFAULT_DASHBOARD_SALES = [...FALLBACK_SALES];
export const DEFAULT_MOVIE_STATS = { ...FALLBACK_MOVIE_STATS };
export const DEFAULT_MOVIE_TREND = {
  totalCreated: FALLBACK_MOVIE_TREND.totalCreated,
  points: FALLBACK_MOVIE_TREND.points.map((item) => ({ ...item })),
};
export const DEFAULT_SALES_DISTRIBUTION = {
  dimension: FALLBACK_SALES_DISTRIBUTION.dimension,
  items: FALLBACK_SALES_DISTRIBUTION.items.map((item) => ({ ...item })),
  total: FALLBACK_SALES_DISTRIBUTION.items.reduce(
    (sum, item) => sum + item.value,
    0
  ),
};
