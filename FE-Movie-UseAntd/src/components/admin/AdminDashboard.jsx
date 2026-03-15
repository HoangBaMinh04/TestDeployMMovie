import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { fmtLocal, toLocalDayjs } from "../../utils/datetime";

import {
  Layout,
  Menu,
  Typography,
  Space,
  Avatar,
  Row,
  Col,
  Card,
  Segmented,
  Alert,
  Spin,
  Select,
} from "antd";
import {
  DashboardOutlined,
  UserOutlined,
  FileTextOutlined,
  VideoCameraOutlined,
  ShopOutlined,
  ApartmentOutlined,
  CalendarOutlined,
  AppstoreOutlined,
  TagsOutlined,
  DollarCircleOutlined,
  StarOutlined,
  FolderOpenOutlined,
  GlobalOutlined,
  MessageOutlined,
} from "@ant-design/icons";

import {
  DEFAULT_DASHBOARD_SALES,
  DEFAULT_DASHBOARD_SUMMARY,
  DEFAULT_MOVIE_STATS,
  DEFAULT_MOVIE_TREND,
  DEFAULT_SALES_DISTRIBUTION,
  getDashboardMovieStats,
  getDashboardSales,
  getDashboardSummary,
  getDashboardMovieTrend,
  getDashboardSalesDistribution,
} from "../../services/dashboardService";
import { getProfile } from "../../services/profileService";
import { getAccessToken } from "../../api/http";
import {
  clearStoredRoles,
  extractNormalizedRoles,
  hasAdminRole,
  loadUserRoles,
  storeUserRoles,
} from "../../utils/auth";
import "../../css/adminCss/AdminDashboard.css";
import CountryManagementPanel from "./CountryManagementPanel";
import CategoryManagementPanel from "./CategoryManagementPanel";
import MovieManagementPanel from "./MovieManagementPanel";
import CinemaManagementPanel from "./CinemaManagementPanel";
import OrderManagementPanel from "./OrderManagementPanel";
import PromotionManagementPanel from "./PromotionManagementPanel";
import UserManagementPanel from "./UserManagementPanel";
import RoomManagementPanel from "./RoomManagementPanel";
import ShowtimeManagementPanel from "./ShowtimeManagementPanel";
import SeatManagementPanel from "./SeatManagement.Panel";
import PriceRuleManagementPanel from "./PriceRuleManagementPanel";
import ReviewManagementPanel from "./ReviewManagementPanel";
import SupportChatPanel from "./SupportChatPanel";

// Chart.js setup
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ChartTitle,
  Tooltip,
  Legend,
  Filler,
);
/* ================================= */

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const numberFormatter = new Intl.NumberFormat("vi-VN");
const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});
const OVERVIEW_ERROR_MESSAGE =
  "Không tải được dữ liệu thống kê. Đang hiển thị dữ liệu mẫu.";
const SALES_ERROR_MESSAGE =
  "Không tải được dữ liệu doanh thu. Đang hiển thị dữ liệu mẫu.";
const MOVIE_TREND_ERROR_MESSAGE =
  "Không tải được dữ liệu xu hướng tạo phim. Đang hiển thị dữ liệu mẫu.";
const SALES_DISTRIBUTION_ERROR_MESSAGE =
  "Không tải được dữ liệu phân bổ doanh thu. Đang hiển thị dữ liệu mẫu.";
const SIDER_WIDTH = 260;
const SIDER_COLLAPSED_WIDTH = 72;

function formatCurrency(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return currencyFormatter.format(0);
  return currencyFormatter.format(Math.max(numeric, 0));
}
function formatNumber(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return numberFormatter.format(0);
  return numberFormatter.format(Math.max(0, Math.round(numeric)));
}
function formatPercent(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "0%";
  const normalized = Math.max(0, numeric);
  const formatted = normalized.toFixed(1);
  return `${formatted.endsWith(".0") ? formatted.slice(0, -2) : formatted}%`;
}

function resolveSectionFromPath(pathname) {
  if (!pathname) return "dashboard";
  const normalized = pathname.toLowerCase();
  if (normalized.startsWith("/admin/dashboard/country-manager"))
    return "countries";
  if (normalized.startsWith("/admin/dashboard/category-manager"))
    return "categories";
  if (normalized.startsWith("/admin/dashboard/movie-manager")) return "movies";
  if (normalized.startsWith("/admin/dashboard/cinema-manager"))
    return "cinemas";
  if (normalized.startsWith("/admin/dashboard/order-manager")) return "orders";
  if (normalized.startsWith("/admin/dashboard/promotion-manager"))
    return "promotions";
  if (normalized.startsWith("/admin/dashboard/user-manager")) return "users";
  if (normalized.startsWith("/admin/dashboard/room-manager")) return "rooms";
  if (normalized.startsWith("/admin/dashboard/showtime-manager"))
    return "showtimes";
  if (normalized.startsWith("/admin/dashboard/seat-manager")) return "seats";
  if (normalized.startsWith("/admin/dashboard/price-rule-manager"))
    return "pricerules";
  if (normalized.startsWith("/admin/dashboard/review-manager"))
    return "reviews";
  if (normalized.startsWith("/admin/dashboard/support-chat"))
    return "supportchat";
  return "dashboard";
}

/* =======================
   Chart components (NEW)
   ======================= */

function SalesLineChart({ data, range = "week" }) {
  const labels = (data ?? []).map((d) => {
    if (range === "today") {
      // cố gắng format theo HH:mm, nếu fail thì dùng nguyên chuỗi label
      return (
        fmtLocal(d?.label, "HH:mm") ||
        (typeof d?.label === "string" ? d.label : "")
      );
    }
    // 7 ngày: ngày/tháng ; 30 ngày: ngày/tháng/năm
    const f = range === "week" ? "DD/MM" : "DD/MM/YYYY";
    return fmtLocal(d?.label, f) || "";
  });
  const values = (data ?? []).map((d) => Number(d?.value ?? 0));

  if (!labels.length) {
    return (
      <div className="adminLineChart__empty">Không có dữ liệu doanh thu.</div>
    );
  }

  const chartData = {
    labels,
    datasets: [
      {
        label: "Doanh thu",
        data: values,
        fill: true,
        borderColor: "#4c84ff",
        backgroundColor: "rgba(76,132,255,0.15)",
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => items.map((it) => it.label),
          label: (ctx) => ` ${formatCurrency(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        ticks: { callback: (v) => numberFormatter.format(v) },
        grid: { color: "rgba(0,0,0,0.06)" },
      },
    },
  };

  return (
    <div style={{ height: 260 }}>
      <Line data={chartData} options={options} />
    </div>
  );
}

function MovieCreationTrendChart({ trend, range = "month" }) {
  const points = Array.isArray(trend?.points)
    ? trend.points
    : DEFAULT_MOVIE_TREND.points;
  if (!points.length) {
    return (
      <div className="adminLineChart__empty">Không có dữ liệu tạo phim.</div>
    );
  }

  const labels = points.map((p) => {
    if (range === "today") {
      return (
        fmtLocal(p?.label, "HH:mm") ||
        (typeof p?.label === "string" ? p.label : "")
      );
    }
    const f = range === "week" ? "DD/MM" : "DD/MM/YYYY";
    return fmtLocal(p?.label, f) || "";
  });

  const values = points.map((p) => Number(p?.value ?? 0));

  const chartData = {
    labels,
    datasets: [
      {
        label: "Phim mới",
        data: values,
        fill: true,
        borderColor: "#10b981",
        backgroundColor: "rgba(16,185,129,0.15)",
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        title: (items) => items.map((it) => it.label),
        label: (ctx) => ` ${formatNumber(ctx.parsed.y)}`,
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: { ticks: { callback: (v) => numberFormatter.format(v) } },
    },
  };

  return (
    <div style={{ height: 260 }}>
      <Line data={chartData} options={options} />
    </div>
  );
}

function MovieBarChart({ stats }) {
  const source =
    stats && typeof stats === "object" ? stats : DEFAULT_MOVIE_STATS;
  const series = [
    { label: "Hôm nay", value: Number(source.today ?? 0) },
    { label: "7 ngày qua", value: Number(source.thisWeek ?? 0) },
    { label: "30 ngày qua", value: Number(source.thisMonth ?? 0) },
    {
      label: "Tổng phim đã phát hành",
      value: Number(source.totalPublished ?? 0),
    },
  ];

  const chartData = {
    labels: series.map((s) => s.label),
    datasets: [
      {
        label: "Số lượng",
        data: series.map((s) => s.value),
        backgroundColor: "rgba(99,102,241,0.35)",
        borderColor: "#6366f1",
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: (ctx) => ` ${formatNumber(ctx.parsed.y)}` },
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: { ticks: { callback: (v) => numberFormatter.format(v) } },
    },
  };

  return (
    <div style={{ height: 240 }}>
      <Bar data={chartData} options={options} />
    </div>
  );
}

function SalesDistributionChart({ distribution }) {
  const items = Array.isArray(distribution?.items)
    ? distribution.items
    : DEFAULT_SALES_DISTRIBUTION.items;

  if (!items.length) {
    return (
      <div className="adminDistributionChart__empty">
        Không có dữ liệu phân bổ doanh thu.
      </div>
    );
  }

  const labels = items.map((i) => i.label ?? "");
  const values = items.map((i) => Number(i.value ?? 0));
  const perc = items.map((i) => Number(i.percentage ?? 0));

  const chartData = {
    labels,
    datasets: [
      {
        label: "Doanh thu",
        data: values,
        backgroundColor: "rgba(34,197,94,0.35)",
        borderColor: "#22c55e",
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const options = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          beforeLabel: (ctx) =>
            ` ${labels[ctx.dataIndex]} (${formatPercent(perc[ctx.dataIndex])})`,
          label: (ctx) => ` ${formatCurrency(ctx.parsed.x)}`,
        },
      },
    },
    scales: {
      x: { ticks: { callback: (v) => numberFormatter.format(v) } },
      y: { grid: { display: false } },
    },
  };

  return (
    <div style={{ height: 340 }}>
      <Bar data={chartData} options={options} />
    </div>
  );
}

/* ======================= */

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [authorized, setAuthorized] = useState(() =>
    hasAdminRole(loadUserRoles()),
  );
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [summary, setSummary] = useState(DEFAULT_DASHBOARD_SUMMARY);
  const [sales, setSales] = useState(DEFAULT_DASHBOARD_SALES);
  const [movieStats, setMovieStats] = useState(DEFAULT_MOVIE_STATS);
  const [movieTrend, setMovieTrend] = useState(DEFAULT_MOVIE_TREND);
  const [salesDistribution, setSalesDistribution] = useState(
    DEFAULT_SALES_DISTRIBUTION,
  );
  const [loading, setLoading] = useState(true);
  const [overviewError, setOverviewError] = useState("");
  const [salesError, setSalesError] = useState("");
  const [movieTrendError, setMovieTrendError] = useState("");
  const [distributionError, setDistributionError] = useState("");
  const [selectedRange, setSelectedRange] = useState("week");
  const [movieTrendRange, setMovieTrendRange] = useState("month");
  const [distributionDimension, setDistributionDimension] = useState("cinema");
  const [distributionTop, setDistributionTop] = useState(5);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeSection, setActiveSection] = useState(() =>
    resolveSectionFromPath(location.pathname),
  );
  const [collapsed, setCollapsed] = useState(false);

  const errorMessage =
    activeSection === "dashboard"
      ? overviewError || salesError || movieTrendError || distributionError
      : "";

  const headerContent = useMemo(() => {
    if (activeSection === "categories") {
      return {
        title: "Quản lý thể loại phim",
        subtitle:
          "Thêm, chỉnh sửa và sắp xếp danh sách thể loại sử dụng cho phim.",
      };
    }
    if (activeSection === "countries") {
      return {
        title: "Quản lý quốc gia phim",
        subtitle:
          "Thêm, chỉnh sửa và sắp xếp danh sách quốc gia sử dụng cho phim.",
      };
    }
    if (activeSection === "movies") {
      return {
        title: "Quản lý phim",
        subtitle:
          "Tạo mới, chỉnh sửa và kiểm soát trạng thái hiển thị của phim.",
      };
    }
    if (activeSection === "cinemas") {
      return {
        title: "Quản lý rạp chiếu phim",
        subtitle:
          "Tạo mới, chỉnh sửa và kiểm soát trạng thái hiển thị của rạp chiếu phim.",
      };
    }
    if (activeSection === "orders") {
      return {
        title: "Quản lý đơn hàng",
        subtitle:
          "Theo dõi, tìm kiếm và xử lý trạng thái đơn đặt vé của khách hàng.",
      };
    }
    if (activeSection === "promotions") {
      return {
        title: "Quản lý phiếu giảm giá",
        subtitle:
          "Tạo mới, chỉnh sửa và quản lý trạng thái mã khuyến mãi cho khách hàng.",
      };
    }
    if (activeSection === "users") {
      return {
        title: "Quản lý người dùng",
        subtitle:
          "Tìm kiếm, tạo mới, cập nhật thông tin và kiểm soát quyền truy cập của người dùng.",
      };
    }
    if (activeSection === "rooms") {
      return {
        title: "Quản lý phòng chiếu",
        subtitle:
          "Tạo mới, chỉnh sửa và theo dõi trạng thái phòng chiếu tại từng rạp.",
      };
    }
    if (activeSection === "showtimes") {
      return {
        title: "Quản lý lịch chiếu",
        subtitle:
          "Tạo mới, chỉnh sửa và theo dõi lịch chiếu phim tại các phòng chiếu.",
      };
    }
    if (activeSection === "seats") {
      return {
        title: "Quản lý chỗ ngồi",
        subtitle:
          "Kiểm soát sơ đồ ghế của từng phòng chiếu, cập nhật hạng ghế và trạng thái sử dụng.",
      };
    }
    if (activeSection === "pricerules") {
      return {
        title: "Quản lý quy tắc giá",
        subtitle:
          "Cấu hình các quy tắc điều chỉnh giá theo rạp, khung giờ và hạng ghế.",
      };
    }
    if (activeSection === "reviews") {
      return {
        title: "Quản lý đánh giá",
        subtitle: "Kiểm soát các đánh giá, điều chỉnh các đánh giá phù hợp",
      };
    }
    if (activeSection === "supportchat") {
      return {
        title: "Chat hỗ trợ khách hàng",
        subtitle:
          "Trò chuyện trực tuyến, hỗ trợ và giải đáp thắc mắc của khách hàng.",
      };
    }
    return {
      title: "Dashboard",
      subtitle: "Tổng quan hiệu suất hệ thống đặt vé phim.",
    };
  }, [activeSection]);

  const navItems = useMemo(
    () => [
      {
        key: "dashboard",
        label: "Bảng điều khiển",
        icon: <DashboardOutlined />,
        interactive: true,
      },
      {
        key: "users",
        label: "Quản lý người dùng",
        icon: <UserOutlined />,
        interactive: true,
      },
      {
        key: "orders",
        label: "Quản lý đơn hàng",
        icon: <FileTextOutlined />,
        interactive: true,
      },
      {
        key: "movies",
        label: "Quản lý phim",
        icon: <VideoCameraOutlined />,
        interactive: true,
      },
      {
        key: "cinemas",
        label: "Quản lý rạp",
        icon: <ShopOutlined />,
        interactive: true,
      },
      {
        key: "rooms",
        label: "Quản lý phòng chiếu",
        icon: <ApartmentOutlined />,
        interactive: true,
      },
      {
        key: "showtimes",
        label: "Quản lý lịch chiếu",
        icon: <CalendarOutlined />,
        interactive: true,
      },
      {
        key: "seats",
        label: "Quản lý chỗ ngồi",
        icon: <AppstoreOutlined />,
        interactive: true,
      },
      {
        key: "promotions",
        label: "Quản lý phiếu giảm giá",
        icon: <TagsOutlined />,
        interactive: true,
      },
      {
        key: "pricerules",
        label: "Quản lý quy tắc giá",
        icon: <DollarCircleOutlined />,
        interactive: true,
      },
      {
        key: "reviews",
        label: "Quản lý đánh giá",
        icon: <StarOutlined />,
        interactive: true,
      },
      {
        key: "categories",
        label: "Quản lý thể loại phim",
        icon: <FolderOpenOutlined />,
        interactive: true,
      },
      {
        key: "countries",
        label: "Quản lý quốc gia phim",
        icon: <GlobalOutlined />,
        interactive: true,
      },
      {
        key: "supportchat",
        label: "Chat hỗ trợ",
        icon: <MessageOutlined />,
        interactive: true,
      },
    ],
    [],
  );

  useEffect(() => {
    const nextSection = resolveSectionFromPath(location.pathname);
    setActiveSection((current) =>
      current === nextSection ? current : nextSection,
    );
  }, [location.pathname]);

  const handleSectionNavigation = (sectionKey) => {
    const go = (path, section) => {
      if (activeSection !== section) setActiveSection(section);
      if (!location.pathname.toLowerCase().startsWith(path)) navigate(path);
    };

    if (sectionKey === "countries")
      return go("/admin/dashboard/country-manager", "countries");
    if (sectionKey === "categories")
      return go("/admin/dashboard/category-manager", "categories");
    if (sectionKey === "movies")
      return go("/admin/dashboard/movie-manager", "movies");
    if (sectionKey === "cinemas")
      return go("/admin/dashboard/cinema-manager", "cinemas");
    if (sectionKey === "orders")
      return go("/admin/dashboard/order-manager", "orders");
    if (sectionKey === "rooms")
      return go("/admin/dashboard/room-manager", "rooms");
    if (sectionKey === "promotions")
      return go("/admin/dashboard/promotion-manager", "promotions");
    if (sectionKey === "users")
      return go("/admin/dashboard/user-manager", "users");
    if (sectionKey === "showtimes")
      return go("/admin/dashboard/showtime-manager", "showtimes");
    if (sectionKey === "seats")
      return go("/admin/dashboard/seat-manager", "seats");
    if (sectionKey === "pricerules")
      return go("/admin/dashboard/price-rule-manager", "pricerules");
    if (sectionKey === "reviews")
      return go("/admin/dashboard/review-manager", "reviews");
    if (sectionKey === "supportchat")
      return go("/admin/dashboard/support-chat", "supportchat");

    if (activeSection !== "dashboard") setActiveSection("dashboard");
    if (location.pathname.toLowerCase() !== "/admin/dashboard")
      navigate("/admin/dashboard");
  };

  useEffect(() => {
    let ignore = false;

    async function verifyAdmin() {
      if (!getAccessToken()) {
        if (!ignore) {
          clearStoredRoles();
          setAuthorized(false);
          setCheckingAuth(false);
        }
        navigate("/", { replace: true });
        return;
      }

      try {
        const profile = await getProfile();
        if (ignore) return;

        const currentRoles = extractNormalizedRoles(profile, loadUserRoles());
        storeUserRoles(currentRoles);
        const isAdmin = hasAdminRole(currentRoles);
        if (!isAdmin) {
          clearStoredRoles();
          setAuthorized(false);
          navigate("/", { replace: true });
          return;
        }
        setAuthorized(true);
      } catch (err) {
        console.error("Admin verification failed", err);
        if (!ignore) {
          clearStoredRoles();
          setAuthorized(false);
          navigate("/", { replace: true });
        }
        return;
      } finally {
        if (!ignore) setCheckingAuth(false);
      }
    }

    verifyAdmin();
    return () => {
      ignore = true;
    };
  }, [navigate]);

  useEffect(() => {
    if (!authorized || checkingAuth) return;
    const controller = new AbortController();
    let ignore = false;

    async function loadOverview() {
      setLoading(true);
      setOverviewError("");
      try {
        const [summaryData, movieData] = await Promise.all([
          getDashboardSummary({ signal: controller.signal }),
          getDashboardMovieStats({ signal: controller.signal }),
        ]);
        if (ignore) return;
        setSummary(summaryData ?? DEFAULT_DASHBOARD_SUMMARY);
        setMovieStats(movieData ?? DEFAULT_MOVIE_STATS);
        setLastUpdated(new Date());
      } catch (err) {
        if (ignore) return;
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED")
          return;
        console.error("Failed to load dashboard overview", err);
        const message =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          OVERVIEW_ERROR_MESSAGE;
        setOverviewError(message);
        setSummary(DEFAULT_DASHBOARD_SUMMARY);
        setMovieStats(DEFAULT_MOVIE_STATS);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadOverview();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [authorized, checkingAuth]);

  useEffect(() => {
    if (!authorized || checkingAuth) return;
    const controller = new AbortController();
    let ignore = false;

    async function loadSales(range) {
      try {
        const salesData = await getDashboardSales({
          signal: controller.signal,
          range,
        });
        if (ignore) return;
        setSales(salesData ?? DEFAULT_DASHBOARD_SALES);
        setLastUpdated(new Date());
        setSalesError("");
      } catch (err) {
        if (ignore) return;
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED")
          return;
        console.error("Failed to load dashboard sales trend", err);
        setSales(DEFAULT_DASHBOARD_SALES);
        setSalesError(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            SALES_ERROR_MESSAGE,
        );
      }
    }

    loadSales(selectedRange);
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [authorized, checkingAuth, selectedRange]);

  useEffect(() => {
    if (!authorized || checkingAuth) return;
    const controller = new AbortController();
    let ignore = false;

    async function loadMovieTrend(range) {
      try {
        const trendData = await getDashboardMovieTrend({
          signal: controller.signal,
          range,
        });
        if (ignore) return;
        setMovieTrend(trendData ?? DEFAULT_MOVIE_TREND);
        setMovieTrendError("");
        setLastUpdated(new Date());
      } catch (err) {
        if (ignore) return;
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED")
          return;
        console.error("Failed to load movie creation trend", err);
        setMovieTrend(DEFAULT_MOVIE_TREND);
        setMovieTrendError(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            MOVIE_TREND_ERROR_MESSAGE,
        );
      }
    }

    loadMovieTrend(movieTrendRange);
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [authorized, checkingAuth, movieTrendRange]);

  useEffect(() => {
    if (!authorized || checkingAuth) return;
    const controller = new AbortController();
    let ignore = false;

    async function loadDistribution(dimension, top) {
      try {
        const distributionData = await getDashboardSalesDistribution({
          signal: controller.signal,
          dimension,
          top,
        });
        if (ignore) return;
        setSalesDistribution(distributionData ?? DEFAULT_SALES_DISTRIBUTION);
        setDistributionError("");
        setLastUpdated(new Date());
      } catch (err) {
        if (ignore) return;
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED")
          return;
        console.error("Failed to load sales distribution", err);
        setSalesDistribution(DEFAULT_SALES_DISTRIBUTION);
        setDistributionError(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            SALES_DISTRIBUTION_ERROR_MESSAGE,
        );
      }
    }

    loadDistribution(distributionDimension, distributionTop);
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [authorized, checkingAuth, distributionDimension, distributionTop]);

  const summaryCards = useMemo(
    () => [
      {
        title: "Tổng doanh thu",
        value: formatCurrency(summary.totalRevenue),
        description: "Tổng doanh thu từ các đơn hàng đã thanh toán.",
        accent: "primary",
      },
      {
        title: "Vé bán ra",
        value: formatNumber(summary.ticketsSold),
        description: "Tổng số vé đã bán ra trong hệ thống.",
        accent: "indigo",
      },
      {
        title: "Khách hàng",
        value: formatNumber(summary.customerCount),
        description: "Số lượng khách hàng đã đăng ký.",
        accent: "orange",
      },
      {
        title: "Phim đã phát hành",
        value: formatNumber(summary.movieCount),
        description: "Tổng số phim đã được xuất bản.",
        accent: "teal",
      },
      {
        title: "Rạp đang hoạt động",
        value: formatNumber(summary.cinemaCount),
        description: "Số lượng rạp đang phục vụ khách hàng.",
        accent: "indigo",
      },
      {
        title: "Phòng chiếu hoạt động",
        value: formatNumber(summary.roomCount),
        description: "Số phòng chiếu đang được sử dụng.",
        accent: "orange",
      },
    ],
    [summary],
  );

  const menuItems = navItems.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: item.label,
    disabled: !item.interactive,
  }));

  return (
    <div className="adminDashboardPage">
      <Layout style={{ minHeight: "100vh" }}>
        <Sider
          width={SIDER_WIDTH}
          collapsedWidth={SIDER_COLLAPSED_WIDTH}
          breakpoint="lg"
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          style={{
            background: "#001529",
            position: "fixed",
            left: 0,
            top: 0,
            bottom: 0,
            overflow: "auto",
            zIndex: 100,
          }}
        >
          <div
            style={{
              height: 64,
              display: "flex",
              alignItems: "center",
              paddingInline: 16,
              gap: 12,
            }}
          >
            <Link
              to="/"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                color: "#fff",
                textDecoration: "none",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                }}
              >
                🎬
              </div>
              {!collapsed && (
                <div style={{ lineHeight: 1.2 }}>
                  <div style={{ fontWeight: 600 }}>MoviePalace</div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>
                    Admin Portal
                  </div>
                </div>
              )}
            </Link>
          </div>

          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[activeSection]}
            items={menuItems}
            onClick={({ key }) => handleSectionNavigation(key)}
          />
        </Sider>

        {/* Layout bên phải chừa chỗ cho Sider fixed */}
        <Layout
          style={{
            marginLeft: collapsed ? SIDER_COLLAPSED_WIDTH : SIDER_WIDTH,
            minHeight: "100vh",
            transition: "margin-left 0.2s",
          }}
        >
          <Header
            style={{
              background: "#fff",
              borderBottom: "1px solid #f0f0f0",
              paddingInline: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <Title level={3} style={{ margin: 0 }}>
                {headerContent.title}
              </Title>
              <Text type="secondary">{headerContent.subtitle}</Text>
            </div>

            <Space size="large">
              <Space>
                <Avatar style={{ backgroundColor: "#1677ff" }}>AD</Avatar>
                <div style={{ lineHeight: 1.2 }}>
                  <div style={{ fontWeight: 500 }}>Quản trị viên</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Admin
                  </Text>
                </div>
              </Space>
            </Space>
          </Header>

          <Content style={{ padding: 16 }}>
            {activeSection === "dashboard" && (
              <>
                {errorMessage && (
                  <Alert
                    type="warning"
                    message={errorMessage}
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                )}

                <Row gutter={[16, 16]}>
                  {summaryCards.map((card) => (
                    <Col xs={24} sm={12} md={8} key={card.title}>
                      <Card
                        bordered={false}
                        style={{ height: "100%" }}
                        bodyStyle={{ padding: 16 }}
                      >
                        <Text type="secondary">{card.title}</Text>
                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 22,
                            fontWeight: 600,
                          }}
                        >
                          {card.value}
                        </div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {card.description}
                        </Text>
                      </Card>
                    </Col>
                  ))}
                </Row>

                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                  <Col xs={24} lg={16}>
                    <Card
                      bordered={false}
                      title={
                        <>
                          <div>Doanh thu</div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Hiệu suất doanh thu theo thời gian.
                          </Text>
                        </>
                      }
                      extra={
                        <Segmented
                          value={selectedRange}
                          onChange={(val) => setSelectedRange(val)}
                          options={[
                            { label: "Hôm nay", value: "today" },
                            { label: "7 ngày", value: "week" },
                            { label: "30 ngày", value: "month" },
                          ]}
                        />
                      }
                      bodyStyle={{ padding: 16 }}
                    >
                      {salesError && (
                        <Text
                          type="danger"
                          style={{ display: "block", marginBottom: 12 }}
                        >
                          {salesError}
                        </Text>
                      )}
                      <SalesLineChart data={sales} range={selectedRange} />
                    </Card>
                  </Col>

                  <Col xs={24} lg={8}>
                    <Card
                      bordered={false}
                      title={
                        <>
                          <div>Thống kê phim được xuất bản</div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Số lượng phim phát hành theo từng mốc thời gian.
                          </Text>
                        </>
                      }
                      bodyStyle={{ padding: 16 }}
                    >
                      <MovieBarChart stats={movieStats} />
                    </Card>
                  </Col>
                </Row>

                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                  <Col xs={24} lg={16}>
                    <Card
                      bordered={false}
                      title={
                        <>
                          <div>Xu hướng tạo phim mới</div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Số lượng phim được tạo trong khoảng thời gian đã
                            chọn.
                          </Text>
                        </>
                      }
                      extra={
                        <Segmented
                          size="middle"
                          value={movieTrendRange}
                          onChange={(val) => setMovieTrendRange(val)}
                          options={[
                            { label: "Hôm nay", value: "today" },
                            { label: "7 ngày", value: "week" },
                            { label: "30 ngày", value: "month" },
                          ]}
                        />
                      }
                      bodyStyle={{ padding: 16 }}
                    >
                      {movieTrendError && (
                        <Text
                          type="danger"
                          style={{ display: "block", marginBottom: 12 }}
                        >
                          {movieTrendError}
                        </Text>
                      )}
                      <MovieCreationTrendChart
                        trend={movieTrend}
                        range={movieTrendRange}
                      />{" "}
                    </Card>
                  </Col>

                  <Col xs={24} lg={8}>
                    <Card
                      bordered={false}
                      title={
                        <>
                          <div>Phân bổ doanh thu</div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Top đơn vị đóng góp doanh thu theo từng chiều dữ
                            liệu.
                          </Text>
                        </>
                      }
                      extra={
                        <Space size={8} wrap>
                          <Segmented
                            size="middle"
                            value={distributionDimension}
                            onChange={(val) => setDistributionDimension(val)}
                            options={[
                              { label: "Theo rạp", value: "cinema" },
                              { label: "Theo phim", value: "movie" },
                              { label: "Theo thể loại", value: "category" },
                            ]}
                          />
                          <Select
                            size="small"
                            value={String(distributionTop)}
                            onChange={(value) =>
                              setDistributionTop(Number(value))
                            }
                            options={[
                              { label: "Top 3", value: "3" },
                              { label: "Top 5", value: "5" },
                              { label: "Top 10", value: "10" },
                            ]}
                            style={{ width: 90 }}
                          />
                        </Space>
                      }
                      bodyStyle={{ padding: 16 }}
                    >
                      {distributionError && (
                        <Text
                          type="danger"
                          style={{ display: "block", marginBottom: 12 }}
                        >
                          {distributionError}
                        </Text>
                      )}
                      <SalesDistributionChart
                        distribution={salesDistribution}
                      />
                    </Card>
                  </Col>
                </Row>

                <div style={{ marginTop: 16, textAlign: "right" }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {lastUpdated
                      ? `Cập nhật lần cuối: ${lastUpdated.toLocaleString(
                          "vi-VN",
                        )}`
                      : "Đang tải dữ liệu gần nhất..."}
                  </Text>
                </div>
              </>
            )}

            {activeSection === "countries" && <CountryManagementPanel />}
            {activeSection === "categories" && <CategoryManagementPanel />}
            {activeSection === "movies" && <MovieManagementPanel />}
            {activeSection === "cinemas" && <CinemaManagementPanel />}
            {activeSection === "orders" && <OrderManagementPanel />}
            {activeSection === "promotions" && <PromotionManagementPanel />}
            {activeSection === "users" && <UserManagementPanel />}
            {activeSection === "rooms" && <RoomManagementPanel />}
            {activeSection === "showtimes" && <ShowtimeManagementPanel />}
            {activeSection === "seats" && <SeatManagementPanel />}
            {activeSection === "pricerules" && <PriceRuleManagementPanel />}
            {activeSection === "reviews" && <ReviewManagementPanel />}
            {activeSection === "supportchat" && <SupportChatPanel />}
          </Content>
        </Layout>

        {(checkingAuth || (activeSection === "dashboard" && loading)) && (
          <Spin
            spinning
            fullscreen
            tip={
              checkingAuth
                ? "Đang xác thực quyền truy cập..."
                : "Đang tải dữ liệu..."
            }
          />
        )}
      </Layout>
    </div>
  );
}
