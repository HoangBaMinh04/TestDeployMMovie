import React, { useEffect, useMemo, useState } from "react";
import {
  Layout,
  Typography,
  Row,
  Col,
  Card,
  Input,
  Select,
  Checkbox,
  Button,
  Space,
  Table,
  Tag,
  Popconfirm,
  message,
  Descriptions,
  Divider,
  Tooltip,
} from "antd";
import {
  ReloadOutlined,
  SearchOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  DeleteOutlined,
  FlagOutlined,
} from "@ant-design/icons";

import {
  adminDeleteReview,
  getAdminReviews,
  getReviewById,
  getReviewReports,
  hideReviewAsAdmin,
  resolveReviewReport,
  showReviewAsAdmin,
} from "../../services/reviewService";
import { fmtLocal } from "../../utils/datetime";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

const VISIBILITY_OPTIONS = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "visible", label: "Đang hiển thị" },
  { value: "hidden", label: "Đang ẩn" },
];

function getReviewId(review) {
  if (!review) return null;
  const candidates = [
    review.id,
    review.Id,
    review.reviewId,
    review.reviewID,
    review.ReviewId,
    review.ReviewID,
  ];
  for (const candidate of candidates) {
    if (candidate == null) continue;
    if (typeof candidate === "string" && candidate.trim() === "") {
      continue;
    }
    return candidate;
  }
  return null;
}

function getReviewMovieName(review) {
  if (!review) return "";
  return (
    review.movieName ||
    review.MovieName ||
    review.movieTitle ||
    review.MovieTitle ||
    ""
  );
}

function getReviewUserName(review) {
  if (!review) return "";
  return review.userName || review.UserName || review.reviewerName || "";
}

function getReviewRating(review) {
  if (!review) return null;
  const candidates = [review.rating, review.Rating, review.score, review.Score];
  for (const candidate of candidates) {
    if (candidate == null) continue;
    const numeric = Number(candidate);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }
  return null;
}

function getReviewTitle(review) {
  if (!review) return "";
  const candidates = [review.title, review.Title];
  for (const candidate of candidates) {
    if (candidate == null) continue;
    const text = String(candidate).trim();
    if (text) return text;
  }
  return "";
}

function getReviewContent(review) {
  if (!review) return "";
  const candidates = [
    review.content,
    review.Content,
    review.comment,
    review.Comment,
    review.body,
    review.Body,
  ];
  for (const candidate of candidates) {
    if (candidate == null) continue;
    const text = String(candidate).trim();
    if (text) return text;
  }
  return "";
}

function getReviewVisibility(review) {
  const isVisible = Boolean(review?.isVisible ?? review?.IsVisible);
  const isDeleted = Boolean(review?.isDeleted ?? review?.IsDeleted);
  return { isVisible, isDeleted };
}

function getHelpfulCounts(review) {
  const helpful = Number(
    review?.helpfulCount ?? review?.HelpfulCount ?? review?.likes ?? 0
  );
  const notHelpful = Number(
    review?.notHelpfulCount ?? review?.NotHelpfulCount ?? review?.dislikes ?? 0
  );
  return {
    helpful: Number.isFinite(helpful) ? Math.max(0, helpful) : 0,
    notHelpful: Number.isFinite(notHelpful) ? Math.max(0, notHelpful) : 0,
  };
}

function toIdQuery(value) {
  if (value == null) {
    return null;
  }
  const text = String(value).trim();
  if (!text) {
    return null;
  }
  const numeric = Number(text);
  if (Number.isFinite(numeric)) {
    return numeric;
  }
  return text;
}

function describeVisibility(review) {
  const { isVisible, isDeleted } = getReviewVisibility(review);
  if (isDeleted) return { label: "Đã xoá", status: "deleted" };
  if (isVisible) return { label: "Đang hiển thị", status: "visible" };
  return { label: "Đang ẩn", status: "hidden" };
}

function formatDate(value) {
  if (!value) return "—";
  return fmtLocal(value, "DD/MM/YYYY HH:mm") || String(value);
}

function getBoolean(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

export default function ReviewManagementPanel() {
  const [msgApi, contextHolder] = message.useMessage();

  const [reviews, setReviews] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1]);

  // filters
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [movieInput, setMovieInput] = useState("");
  const [movieFilter, setMovieFilter] = useState(null);
  const [userInput, setUserInput] = useState("");
  const [userFilter, setUserFilter] = useState(null);
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [includeDeleted, setIncludeDeleted] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // detail
  const [selectedReviewId, setSelectedReviewId] = useState(null);
  const [selectedReview, setSelectedReview] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const [actionLoading, setActionLoading] = useState(false);

  // reports
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState("");
  const [includeResolvedReports, setIncludeResolvedReports] = useState(false);
  const [reportsRefreshKey, setReportsRefreshKey] = useState(0);
  const [selectedReportId, setSelectedReportId] = useState(null);

  const trimmedSearchTerm = useMemo(() => searchTerm.trim(), [searchTerm]);

  const paginationWindow = useMemo(() => {
    if (totalCount <= 0) {
      return { start: 0, end: 0 };
    }
    const start = (pageNumber - 1) * pageSize + 1;
    const end = Math.min(pageNumber * pageSize, totalCount);
    return {
      start: Math.max(1, Math.min(start, totalCount)),
      end,
    };
  }, [pageNumber, pageSize, totalCount]);

  // ===== LOAD REVIEWS =====
  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function loadReviews() {
      setLoading(true);
      setError("");

      const query = {
        pageNumber,
        pageSize,
        searchTerm: trimmedSearchTerm || undefined,
        includeDeleted,
      };

      const movieId = toIdQuery(movieFilter);
      if (movieId != null) query.movieId = movieId;

      const userId = toIdQuery(userFilter);
      if (userId != null) query.userId = userId;

      if (visibilityFilter === "visible") query.isVisible = true;
      else if (visibilityFilter === "hidden") query.isVisible = false;

      try {
        const data = await getAdminReviews(query, {
          signal: controller.signal,
        });

        if (ignore) return;

        const items = Array.isArray(data?.items) ? data.items : [];
        const total = Number.isFinite(data?.totalCount)
          ? data.totalCount
          : items.length;

        if (pageNumber > 1 && items.length === 0 && total > 0) {
          setPageNumber((value) => Math.max(1, value - 1));
          return;
        }

        setReviews(items);
        setTotalCount(total);
      } catch (err) {
        if (ignore || controller.signal.aborted) return;
        console.error("Failed to load admin reviews", err);
        const messageText =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Không thể tải danh sách đánh giá.";
        setReviews([]);
        setTotalCount(0);
        setError(messageText);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadReviews();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [
    pageNumber,
    pageSize,
    trimmedSearchTerm,
    movieFilter,
    userFilter,
    visibilityFilter,
    includeDeleted,
    refreshKey,
  ]);

  // ===== LOAD DETAIL =====
  useEffect(() => {
    if (!selectedReviewId) {
      setSelectedReview(null);
      setDetailError("");
      return;
    }

    let ignore = false;
    const controller = new AbortController();

    async function loadDetail() {
      setDetailLoading(true);
      setDetailError("");

      try {
        const data = await getReviewById(selectedReviewId, {
          signal: controller.signal,
        });
        if (ignore) return;
        setSelectedReview(data);
      } catch (err) {
        if (ignore || controller.signal.aborted) return;
        console.error("Failed to load review detail", err);
        const messageText =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Không thể tải chi tiết đánh giá.";
        setSelectedReview(null);
        setDetailError(messageText);
      } finally {
        if (!ignore) {
          setDetailLoading(false);
        }
      }
    }

    loadDetail();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [selectedReviewId, refreshKey]);

  // ===== LOAD REPORTS =====
  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function loadReports() {
      setReportsLoading(true);
      setReportsError("");

      try {
        const data = await getReviewReports(
          { includeResolved: includeResolvedReports },
          { signal: controller.signal }
        );

        if (ignore) return;

        setReports(Array.isArray(data) ? data : []);
      } catch (err) {
        if (ignore || controller.signal.aborted) return;
        console.error("Failed to load review reports", err);
        const messageText =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Không thể tải danh sách báo cáo.";
        setReports([]);
        setReportsError(messageText);
      } finally {
        if (!ignore) {
          setReportsLoading(false);
        }
      }
    }

    loadReports();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [includeResolvedReports, reportsRefreshKey]);

  // ===== FILTER HANDLERS =====
  const handleApplyFilters = () => {
    setPageNumber(1);
    setSearchTerm(searchInput.trim());
    setMovieFilter(movieInput.trim());
    setUserFilter(userInput.trim());
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setSearchTerm("");
    setMovieInput("");
    setMovieFilter(null);
    setUserInput("");
    setUserFilter(null);
    setVisibilityFilter("all");
    setIncludeDeleted(false);
    setPageNumber(1);
  };

  const refreshReviews = () => {
    setRefreshKey((value) => value + 1);
  };

  const refreshReports = () => {
    setReportsRefreshKey((value) => value + 1);
  };

  const handleSelectReview = (review) => {
    const id = getReviewId(review);
    if (!id) {
      setSelectedReviewId(null);
      setSelectedReview(null);
      setDetailError("Không xác định được đánh giá được chọn.");
      return;
    }
    setSelectedReviewId(id);
  };

  // ===== REVIEW ACTIONS =====
  const handleHideReview = async () => {
    if (!selectedReviewId || actionLoading) return;
    setActionLoading(true);
    try {
      await hideReviewAsAdmin(selectedReviewId);
      msgApi.success("Đánh giá đã được ẩn.");
      refreshReviews();
    } catch (err) {
      console.error("Failed to hide review", err);
      const messageText =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Không thể ẩn đánh giá.";
      msgApi.error(messageText);
    } finally {
      setActionLoading(false);
    }
  };

  const handleShowReview = async () => {
    if (!selectedReviewId || actionLoading) return;
    setActionLoading(true);
    try {
      await showReviewAsAdmin(selectedReviewId);
      msgApi.success("Đánh giá đã được hiển thị lại.");
      refreshReviews();
    } catch (err) {
      console.error("Failed to show review", err);
      const messageText =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Không thể hiển thị đánh giá.";
      msgApi.error(messageText);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!selectedReviewId || actionLoading) return;
    const confirmed = window.confirm(
      "Bạn có chắc muốn xoá vĩnh viễn đánh giá này?"
    );
    if (!confirmed) return;

    setActionLoading(true);
    try {
      await adminDeleteReview(selectedReviewId);
      msgApi.success("Đánh giá đã được xoá khỏi hệ thống.");
      setSelectedReviewId(null);
      setSelectedReview(null);
      refreshReviews();
    } catch (err) {
      console.error("Failed to delete review", err);
      const messageText =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Không thể xoá đánh giá.";
      msgApi.error(messageText);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveReport = async (report, nextState) => {
    const reportId =
      report?.id || report?.Id || report?.reportId || report?.ReportId;

    if (!reportId) {
      msgApi.error("Không xác định được báo cáo cần xử lý.");
      return;
    }

    let adminNote = null;
    if (nextState && !getBoolean(report?.isResolved ?? report?.IsResolved)) {
      adminNote = window.prompt("Ghi chú cho việc xử lý (không bắt buộc):", "");
      if (adminNote != null) {
        adminNote = adminNote.trim();
      }
      if (adminNote === "") {
        adminNote = null;
      }
    }

    try {
      await resolveReviewReport(reportId, {
        isResolved: nextState,
        adminNote,
      });
      msgApi.success(
        nextState
          ? "Báo cáo đã được đánh dấu đã xử lý."
          : "Báo cáo đã được mở lại."
      );
      refreshReports();
      refreshReviews();
    } catch (err) {
      console.error("Failed to resolve review report", err);
      const messageText =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Không thể cập nhật trạng thái báo cáo.";
      msgApi.error(messageText);
    }
  };

  // ===== TABLE COLUMNS =====
  const reviewColumns = [
    {
      title: "ID",
      dataIndex: "id",
      width: 80,
      render: (_, review) => getReviewId(review) ?? "—",
    },
    {
      title: "Phim",
      key: "movie",
      render: (_, review) => getReviewMovieName(review) || "—",
    },
    {
      title: "Người dùng",
      key: "user",
      render: (_, review) => getReviewUserName(review) || "—",
    },
    {
      title: "Đánh giá",
      key: "rating",
      width: 120,
      render: (_, review) => {
        const rating = getReviewRating(review);
        return rating != null ? `${rating.toFixed(1)} / 5` : "—";
      },
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 140,
      render: (_, review) => {
        const visibility = describeVisibility(review);
        let color = "default";
        if (visibility.status === "visible") color = "green";
        if (visibility.status === "hidden") color = "orange";
        if (visibility.status === "deleted") color = "red";

        return <Tag color={color}>{visibility.label}</Tag>;
      },
    },
    {
      title: "Hữu ích / Không hữu ích",
      key: "helpful",
      render: (_, review) => {
        const counts = getHelpfulCounts(review);
        return (
          <>
            {counts.helpful.toLocaleString("vi-VN")} /{" "}
            {counts.notHelpful.toLocaleString("vi-VN")}
          </>
        );
      },
    },
    {
      title: "Ngày tạo",
      key: "createdAt",
      width: 180,
      render: (_, review) => {
        const createdAt =
          review?.createdAt || review?.CreatedAt || review?.createdDate;
        return formatDate(createdAt);
      },
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 100,
      render: (_, review) => (
        <Button
          type="link"
          size="small"
          onClick={() => handleSelectReview(review)}
        >
          Xem
        </Button>
      ),
    },
  ];

  const reportColumns = [
    {
      title: "ID",
      dataIndex: "id",
      width: 80,
      render: (_, report) =>
        report?.id || report?.Id || report?.reportId || report?.ReportId || "—",
    },
    {
      title: "ID đánh giá",
      dataIndex: "reviewId",
      width: 100,
      render: (_, report) =>
        report?.reviewId || report?.ReviewId || report?.reviewID || "—",
    },
    {
      title: "Phim",
      key: "movie",
      render: (_, report) => report?.movieName || report?.MovieName || "—",
    },
    {
      title: "Người báo cáo",
      key: "reporter",
      render: (_, report) =>
        report?.reportedByUserName || report?.ReportedByUserName || "—",
    },
    {
      title: "Lý do",
      key: "reason",
      render: (_, report) => report?.reason || report?.Reason || "—",
    },
    {
      title: "Ngày báo cáo",
      key: "createdAt",
      width: 180,
      render: (_, report) => formatDate(report?.createdAt || report?.CreatedAt),
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 120,
      render: (_, report) => {
        const isResolved = getBoolean(report?.isResolved ?? report?.IsResolved);
        return (
          <Tag color={isResolved ? "green" : "orange"}>
            {isResolved ? "Đã xử lý" : "Chưa xử lý"}
          </Tag>
        );
      },
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 200,
      render: (_, report) => {
        const reportId =
          report?.id || report?.Id || report?.reportId || report?.ReportId;
        const reviewId =
          report?.reviewId || report?.ReviewId || report?.reviewID;
        const isResolved = getBoolean(report?.isResolved ?? report?.IsResolved);

        return (
          <Space>
            <Button
              type="link"
              size="small"
              onClick={() => {
                setSelectedReportId(reportId);
                if (reviewId) {
                  setSelectedReviewId(reviewId);
                }
              }}
            >
              Xem
            </Button>
            <Button
              type="link"
              size="small"
              onClick={() => handleResolveReport(report, !isResolved)}
            >
              {isResolved ? "Mở lại" : "Đã xử lý"}
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <>
      {contextHolder}
      <Layout style={{ minHeight: "100vh" }}>
        <Layout>
          <Header
            style={{
              background: "#fff",
              borderBottom: "1px solid #f0f0f0",
              paddingInline: 24,
            }}
          >
            <Space align="center" style={{ height: "100%" }}>
              <Title level={3} style={{ margin: 0 }}>
                Quản lý đánh giá
              </Title>
              <Text type="secondary">
                Theo dõi, lọc và điều chỉnh các đánh giá của người dùng.
              </Text>
            </Space>
          </Header>

          <Content style={{ padding: 16 }}>
            <Row gutter={16}>
              {/* BẢNG ĐÁNH GIÁ BÊN TRÁI */}
              <Col xs={24} xl={16} xxl={17}>
                <Card
                  title={
                    <Space direction="vertical" size={0}>
                      <Title level={4} style={{ margin: 0 }}>
                        Danh sách đánh giá
                      </Title>
                      <Text type="secondary">
                        Quản lý đánh giá theo phim và người dùng.
                      </Text>
                    </Space>
                  }
                  extra={
                    <Space>
                      <Input
                        placeholder="Từ khoá: tiêu đề hoặc nội dung..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onPressEnter={handleApplyFilters}
                        style={{
                          width: 340,
                          height: 38,
                          borderRadius: 8,
                        }}
                        suffix={
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <div
                              style={{
                                width: 1,
                                height: 20,
                                backgroundColor: "#d9d9d9",
                              }}
                            />
                            <SearchOutlined
                              onClick={handleApplyFilters}
                              style={{
                                cursor: "pointer",
                                fontSize: 16,
                                color: "#999",
                              }}
                            />
                          </div>
                        }
                      />
                    </Space>
                  }
                  bodyStyle={{ paddingTop: 12 }}
                >
                  {/* FILTER 1 HÀNG */}
                  <Space
                    style={{
                      marginBottom: 16,
                      display: "flex",
                      flexWrap: "wrap",
                    }}
                    size="middle"
                  >
                    <span>ID phim:</span>
                    <Input
                      placeholder="VD: 1024"
                      value={movieInput}
                      onChange={(e) => setMovieInput(e.target.value)}
                      style={{ width: 140 }}
                    />

                    <span>ID người dùng:</span>
                    <Input
                      placeholder="VD: 2057"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      style={{ width: 140 }}
                    />

                    <span>Trạng thái hiển thị:</span>
                    <Select
                      style={{ width: 180 }}
                      value={visibilityFilter}
                      onChange={(v) => {
                        setVisibilityFilter(v);
                        setPageNumber(1);
                      }}
                      options={VISIBILITY_OPTIONS}
                    />

                    <span>Số dòng / trang:</span>
                    <Select
                      style={{ width: 120 }}
                      value={pageSize}
                      onChange={(size) => {
                        setPageSize(size);
                        setPageNumber(1);
                      }}
                      options={PAGE_SIZE_OPTIONS.map((n) => ({
                        value: n,
                        label: `${n} / page`,
                      }))}
                      dropdownMatchSelectWidth={false}
                    />

                    <Button onClick={handleClearFilters}>Xóa bộ lọc</Button>
                  </Space>

                  {error && (
                    <Text
                      type="danger"
                      style={{ marginBottom: 8, display: "block" }}
                    >
                      {error}
                    </Text>
                  )}

                  <Table
                    rowKey={(review) =>
                      getReviewId(review) ??
                      `${getReviewUserName(review)}-${
                        review?.createdAt ||
                        review?.CreatedAt ||
                        review?.createdDate ||
                        ""
                      }`
                    }
                    loading={loading}
                    dataSource={reviews}
                    columns={reviewColumns}
                    pagination={{
                      current: pageNumber,
                      pageSize,
                      total: totalCount,
                      onChange: (page, size) => {
                        if (size !== pageSize) {
                          setPageSize(size);
                          setPageNumber(1);
                        } else {
                          setPageNumber(page);
                        }
                      },
                      showTotal: () =>
                        totalCount > 0
                          ? `Hiển thị ${paginationWindow.start}-${
                              paginationWindow.end
                            } trên ${totalCount.toLocaleString(
                              "vi-VN"
                            )} đánh giá`
                          : "Không có đánh giá nào",
                    }}
                    onRow={(review) => {
                      const reviewId = getReviewId(review);
                      const isActive =
                        selectedReviewId != null &&
                        reviewId != null &&
                        String(selectedReviewId) === String(reviewId);
                      return {
                        onClick: () => handleSelectReview(review),
                        style: isActive
                          ? { backgroundColor: "#e6f7ff", cursor: "pointer" }
                          : { cursor: "pointer" },
                      };
                    }}
                    locale={{
                      emptyText: loading
                        ? "Đang tải danh sách đánh giá..."
                        : "Chưa có đánh giá phù hợp.",
                    }}
                  />
                </Card>
              </Col>

              {/* CHI TIẾT ĐÁNH GIÁ BÊN PHẢI */}
              <Col xs={24} xl={8} xxl={7}>
                <Card
                  title="Chi tiết đánh giá"
                  extra={
                    selectedReviewId ? (
                      <Text type="secondary">
                        ID: {String(selectedReviewId)}
                      </Text>
                    ) : null
                  }
                >
                  {detailLoading ? (
                    <Text>Đang tải chi tiết...</Text>
                  ) : detailError ? (
                    <Text type="danger">{detailError}</Text>
                  ) : !selectedReview ? (
                    <Text type="secondary">
                      Chọn một đánh giá ở bảng bên trái để xem chi tiết.
                    </Text>
                  ) : (
                    <>
                      {(() => {
                        const visibility = describeVisibility(selectedReview);
                        const counts = getHelpfulCounts(selectedReview);
                        const rating = getReviewRating(selectedReview);

                        let statusColor = "default";
                        if (visibility.status === "visible")
                          statusColor = "green";
                        if (visibility.status === "hidden")
                          statusColor = "orange";
                        if (visibility.status === "deleted")
                          statusColor = "red";

                        const createdAt =
                          selectedReview?.createdAt ||
                          selectedReview?.CreatedAt ||
                          selectedReview?.createdDate;
                        const updatedAt =
                          selectedReview?.updatedAt ||
                          selectedReview?.UpdatedAt ||
                          selectedReview?.modifiedAt;

                        return (
                          <>
                            <Descriptions
                              size="small"
                              column={1}
                              bordered
                              labelStyle={{ width: 140 }}
                            >
                              <Descriptions.Item label="ID đánh giá">
                                {getReviewId(selectedReview)}
                              </Descriptions.Item>
                              <Descriptions.Item label="Phim">
                                {getReviewMovieName(selectedReview) || "—"}
                              </Descriptions.Item>
                              <Descriptions.Item label="Người dùng">
                                {getReviewUserName(selectedReview) || "—"}
                              </Descriptions.Item>
                              <Descriptions.Item label="Điểm đánh giá">
                                {rating != null
                                  ? `${rating.toFixed(1)} / 5`
                                  : "—"}
                              </Descriptions.Item>
                              <Descriptions.Item label="Trạng thái">
                                <Tag color={statusColor}>
                                  {visibility.label}
                                </Tag>
                              </Descriptions.Item>
                              <Descriptions.Item label="Ngày tạo">
                                {formatDate(createdAt)}
                              </Descriptions.Item>
                              <Descriptions.Item label="Cập nhật cuối">
                                {updatedAt ? formatDate(updatedAt) : "—"}
                              </Descriptions.Item>
                              <Descriptions.Item label="Hữu ích / Không hữu ích">
                                {counts.helpful.toLocaleString("vi-VN")} /{" "}
                                {counts.notHelpful.toLocaleString("vi-VN")}
                              </Descriptions.Item>
                              {getReviewTitle(selectedReview) && (
                                <Descriptions.Item label="Tiêu đề">
                                  {getReviewTitle(selectedReview)}
                                </Descriptions.Item>
                              )}
                              <Descriptions.Item label="Nội dung">
                                {getReviewContent(selectedReview) || "—"}
                              </Descriptions.Item>
                            </Descriptions>

                            <Divider />

                            <Space wrap>
                              <Tooltip title="Ẩn đánh giá khỏi người dùng">
                                <Button
                                  icon={<EyeInvisibleOutlined />}
                                  onClick={handleHideReview}
                                  disabled={
                                    actionLoading ||
                                    getReviewVisibility(selectedReview)
                                      .isDeleted ||
                                    !getReviewVisibility(selectedReview)
                                      .isVisible
                                  }
                                >
                                  Ẩn
                                </Button>
                              </Tooltip>
                              <Tooltip title="Hiển thị lại đánh giá">
                                <Button
                                  type="primary"
                                  icon={<EyeOutlined />}
                                  onClick={handleShowReview}
                                  disabled={
                                    actionLoading ||
                                    getReviewVisibility(selectedReview)
                                      .isDeleted ||
                                    getReviewVisibility(selectedReview)
                                      .isVisible
                                  }
                                >
                                  Hiển thị lại
                                </Button>
                              </Tooltip>
                              <Popconfirm
                                title="Bạn có chắc muốn xoá vĩnh viễn đánh giá này?"
                                onConfirm={handleDeleteReview}
                              >
                                <Button
                                  danger
                                  icon={<DeleteOutlined />}
                                  disabled={
                                    actionLoading ||
                                    getReviewVisibility(selectedReview)
                                      .isDeleted
                                  }
                                >
                                  Xoá
                                </Button>
                              </Popconfirm>
                            </Space>
                          </>
                        );
                      })()}
                    </>
                  )}
                </Card>
              </Col>
            </Row>

            {/* BÁO CÁO ĐÁNH GIÁ */}
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col span={24}>
                <Card
                  title={
                    <Space>
                      <FlagOutlined />
                      <span>Danh sách báo cáo đánh giá</span>
                    </Space>
                  }
                  extra={
                    <Space>
                      <Checkbox
                        checked={includeResolvedReports}
                        onChange={(e) =>
                          setIncludeResolvedReports(e.target.checked)
                        }
                      >
                        Hiển thị báo cáo đã xử lý
                      </Checkbox>
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={refreshReports}
                        disabled={reportsLoading}
                      >
                        Làm mới
                      </Button>
                    </Space>
                  }
                >
                  {reportsError && (
                    <Text
                      type="danger"
                      style={{ marginBottom: 8, display: "block" }}
                    >
                      {reportsError}
                    </Text>
                  )}

                  <Table
                    rowKey={(report) =>
                      report?.id ||
                      report?.Id ||
                      report?.reportId ||
                      report?.ReportId ||
                      `${report?.reviewId || report?.ReviewId || ""}-${
                        report?.createdAt || report?.CreatedAt || ""
                      }`
                    }
                    loading={reportsLoading}
                    dataSource={reports}
                    columns={reportColumns}
                    pagination={false}
                    onRow={(report) => {
                      const reportId =
                        report?.id ||
                        report?.Id ||
                        report?.reportId ||
                        report?.ReportId;
                      const isActive =
                        selectedReportId != null &&
                        reportId != null &&
                        String(selectedReportId) === String(reportId);
                      return {
                        onClick: () => {
                          setSelectedReportId(reportId);
                          const reviewId =
                            report?.reviewId ||
                            report?.ReviewId ||
                            report?.reviewID;
                          if (reviewId) {
                            setSelectedReviewId(reviewId);
                          }
                        },
                        style: isActive
                          ? { backgroundColor: "#fff7e6", cursor: "pointer" }
                          : { cursor: "pointer" },
                      };
                    }}
                    locale={{
                      emptyText: reportsLoading
                        ? "Đang tải danh sách báo cáo..."
                        : "Không có báo cáo nào.",
                    }}
                  />

                  {selectedReportId && (
                    <>
                      <Divider />
                      {(() => {
                        const report = reports.find((item) => {
                          const itemId =
                            item?.id ||
                            item?.Id ||
                            item?.reportId ||
                            item?.ReportId;
                          return (
                            itemId != null &&
                            String(itemId) === String(selectedReportId)
                          );
                        });

                        if (!report) {
                          return (
                            <Text type="secondary">
                              Không tìm thấy chi tiết báo cáo được chọn.
                            </Text>
                          );
                        }

                        const isResolved = getBoolean(
                          report?.isResolved ?? report?.IsResolved
                        );

                        return (
                          <Descriptions
                            title="Chi tiết báo cáo"
                            size="small"
                            column={1}
                            bordered
                            labelStyle={{ width: 160 }}
                          >
                            <Descriptions.Item label="Lý do báo cáo">
                              {report?.reason || report?.Reason || "—"}
                            </Descriptions.Item>
                            {(report?.description || report?.Description) && (
                              <Descriptions.Item label="Mô tả chi tiết">
                                {report?.description || report?.Description}
                              </Descriptions.Item>
                            )}
                            <Descriptions.Item label="Nội dung đánh giá">
                              {report?.reviewContent ||
                                report?.ReviewContent ||
                                "—"}
                            </Descriptions.Item>
                            <Descriptions.Item label="Ghi chú quản trị">
                              {report?.adminNote || report?.AdminNote || "—"}
                            </Descriptions.Item>
                            <Descriptions.Item label="Trạng thái báo cáo">
                              <Tag color={isResolved ? "green" : "orange"}>
                                {isResolved ? "Đã xử lý" : "Chưa xử lý"}
                              </Tag>
                            </Descriptions.Item>
                          </Descriptions>
                        );
                      })()}
                    </>
                  )}
                </Card>
              </Col>
            </Row>
          </Content>
        </Layout>
      </Layout>
    </>
  );
}
