import React, { useEffect, useMemo, useState } from "react";
import {
  Layout,
  Typography,
  Row,
  Col,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Space,
  Table,
  Tag,
  Popconfirm,
  Switch,
  DatePicker,
  message,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { fmtLocal, toDateTimeLocalInputValue } from "../../utils/datetime.js";
import {
  createShowtime,
  deleteShowtime,
  getPagedShowtimes,
  updateShowtime,
} from "../../services/showtimeService";
import { getCinemas } from "../../services/cinemaService";
import { getMovies } from "../../services/movieService";
import { getRoomsByCinema } from "../../services/roomService";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
const SORT_OPTIONS = [
  { value: "startAt", label: "Thời gian bắt đầu" },
  { value: "movie", label: "Tên phim" },
  { value: "cinema", label: "Rạp chiếu" },
];

const INITIAL_FORM = {
  movieId: undefined,
  cinemaId: undefined,
  roomId: undefined,
  startAt: "",
  endAt: "",
  format: "2D",
  language: "VI",
  subtitle: "VI",
  basePrice: undefined,
  isActive: true,
};

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

function buildErrorMessage(err, fallback) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  );
}

function formatCurrency(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return currencyFormatter.format(0);
  return currencyFormatter.format(Math.max(0, numeric));
}

function formatDateTime(value) {
  const formatted = fmtLocal(value, "HH:mm:ss DD/MM/YYYY");
  return formatted || "-";
}

export default function ShowtimeManagementPanel() {
  const [msgApi, contextHolder] = message.useMessage();

  // bảng & filter
  const [showtimes, setShowtimes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState("");

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1]);
  const [totalCount, setTotalCount] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [cinemaFilter, setCinemaFilter] = useState(undefined);
  const [movieFilter, setMovieFilter] = useState(undefined);
  const [dateFilter, setDateFilter] = useState(""); // yyyy-MM-dd

  const [sortBy, setSortBy] = useState(SORT_OPTIONS[0].value);
  const [sortDescending, setSortDescending] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [cinemas, setCinemas] = useState([]);
  const [movies, setMovies] = useState([]);

  // rooms cho form
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState("");

  // form
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // action (toggle / delete)
  const [busyAction, setBusyAction] = useState({ id: null, type: null });

  const trimmedSearchTerm = useMemo(() => searchTerm.trim(), [searchTerm]);

  const cinemaIdWatch = Form.useWatch("cinemaId", form);

  // ===== LOAD OPTIONS (CINEMA + MOVIE) =====
  useEffect(() => {
    const controller = new AbortController();
    let ignore = false;

    (async () => {
      try {
        const [cinemaData, movieData] = await Promise.all([
          getCinemas({ signal: controller.signal }).catch((err) => {
            console.error("Failed to load cinemas", err);
            return [];
          }),
          getMovies({ signal: controller.signal }).catch((err) => {
            console.error("Failed to load movies", err);
            return [];
          }),
        ]);

        if (ignore) return;

        setCinemas(Array.isArray(cinemaData) ? cinemaData : []);
        setMovies(Array.isArray(movieData) ? movieData : []);
      } catch (err) {
        if (ignore || controller.signal.aborted) return;
        console.error("Failed to load showtime options", err);
      }
    })();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, []);

  // ===== LOAD ROOMS KHI CHỌN RẠP TRONG FORM =====
  useEffect(() => {
    if (!cinemaIdWatch) {
      setRooms([]);
      setRoomsError("");
      return;
    }

    const controller = new AbortController();
    let ignore = false;

    (async () => {
      try {
        setRoomsLoading(true);
        setRoomsError("");
        const data = await getRoomsByCinema(cinemaIdWatch, {
          signal: controller.signal,
        });
        if (ignore) return;
        setRooms(Array.isArray(data) ? data : []);
      } catch (err) {
        if (ignore || controller.signal.aborted) return;
        console.error("Failed to load rooms", err);
        setRooms([]);
        setRoomsError("Không thể tải danh sách phòng chiếu cho rạp đã chọn.");
      } finally {
        if (!ignore) setRoomsLoading(false);
      }
    })();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [cinemaIdWatch]);

  // ===== LOAD SHOWTIMES =====
  useEffect(() => {
    const controller = new AbortController();
    let ignore = false;

    (async () => {
      try {
        setLoading(true);
        setListError("");

        const data = await getPagedShowtimes(
          {
            pageNumber,
            pageSize,
            searchTerm: trimmedSearchTerm,
            sortBy,
            sortDescending,
            cinemaId: cinemaFilter,
            movieId: movieFilter,
            date: dateFilter || undefined,
          },
          { signal: controller.signal }
        );

        if (ignore) return;

        const items = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.Items)
          ? data.Items
          : [];
        const total = Number.isFinite(data?.totalCount)
          ? data.totalCount
          : Number(data?.TotalCount) || 0;

        if (pageNumber > 1 && items.length === 0 && total > 0) {
          setLoading(false);
          setPageNumber((v) => Math.max(1, v - 1));
          return;
        }

        setShowtimes(items);
        setTotalCount(total);
      } catch (err) {
        if (ignore || controller.signal.aborted) return;
        console.error("Failed to load showtimes", err);
        setShowtimes([]);
        setTotalCount(0);
        setListError(
          buildErrorMessage(err, "Không thể tải danh sách lịch chiếu.")
        );
      } finally {
        if (!ignore) setLoading(false);
      }
    })();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [
    pageNumber,
    pageSize,
    trimmedSearchTerm,
    cinemaFilter,
    movieFilter,
    dateFilter,
    sortBy,
    sortDescending,
    refreshKey,
  ]);

  // ===== FILTER HANDLERS =====
  const handleSearchSubmit = () => {
    setSearchTerm(searchInput.trim());
    setPageNumber(1);
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setSearchTerm("");
    setCinemaFilter(undefined);
    setMovieFilter(undefined);
    setDateFilter("");
    setSortBy(SORT_OPTIONS[0].value);
    setSortDescending(false);
    setPageSize(PAGE_SIZE_OPTIONS[1]);
    setPageNumber(1);
    setRefreshKey((v) => v + 1);
  };

  const handleResetForm = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue(INITIAL_FORM);
    setRoomsError("");
  };

  // ===== FORM SUBMIT =====
  const onSubmit = async () => {
    try {
      const values = await form.validateFields();

      const movieIdNumber = Number(values.movieId);
      const cinemaIdNumber = Number(values.cinemaId);
      const roomIdNumber = Number(values.roomId);
      const basePriceNumber = values.basePrice;

      if (!Number.isFinite(movieIdNumber) || movieIdNumber <= 0) {
        msgApi.error("Vui lòng chọn phim.");
        return;
      }
      if (!Number.isFinite(cinemaIdNumber) || cinemaIdNumber <= 0) {
        msgApi.error("Vui lòng chọn rạp chiếu.");
        return;
      }
      if (!Number.isFinite(roomIdNumber) || roomIdNumber <= 0) {
        msgApi.error("Vui lòng chọn phòng chiếu.");
        return;
      }
      if (!values.startAt || !values.endAt) {
        msgApi.error("Vui lòng chọn thời gian bắt đầu và kết thúc.");
        return;
      }

      const startLocal = dayjs(values.startAt);
      const endLocal = dayjs(values.endAt);
      if (!startLocal.isValid() || !endLocal.isValid()) {
        msgApi.error("Thời gian không hợp lệ.");
        return;
      }
      if (!endLocal.isAfter(startLocal)) {
        msgApi.error("Thời gian kết thúc phải sau thời gian bắt đầu.");
        return;
      }

      if (
        basePriceNumber != null &&
        basePriceNumber !== "" &&
        Number(basePriceNumber) < 0
      ) {
        msgApi.error("Giá cơ bản không hợp lệ.");
        return;
      }

      const payload = {
        movieId: movieIdNumber,
        cinemaId: cinemaIdNumber,
        roomId: roomIdNumber,
        startAt: startLocal.utc().format(),
        endAt: endLocal.utc().format(),
        format: values.format || "2D",
        language: values.language || "VI",
        subtitle: values.subtitle || "VI",
        basePrice: basePriceNumber ?? null,
        isActive: values.isActive !== false,
      };

      setSubmitting(true);

      if (editingId != null) {
        await updateShowtime(editingId, payload);
        msgApi.success("Cập nhật lịch chiếu thành công.");
      } else {
        await createShowtime(payload);
        msgApi.success("Tạo lịch chiếu mới thành công.");
      }

      setRefreshKey((v) => v + 1);
      setPageNumber(1);
      handleResetForm();
    } catch (err) {
      if (err?.errorFields) return;
      console.error("Failed to submit showtime form", err);
      msgApi.error(buildErrorMessage(err, "Không thể lưu lịch chiếu."));
    } finally {
      setSubmitting(false);
    }
  };

  // ===== ACTIONS =====
  const onEditShowtime = (item) => {
    if (!item) return;
    setEditingId(item.id);
    setRoomsError("");

    form.setFieldsValue({
      movieId: item.movieId,
      cinemaId: item.cinemaId,
      roomId: item.roomId,
      startAt: toDateTimeLocalInputValue(item.startAt),
      endAt: toDateTimeLocalInputValue(item.endAt),
      format: item.format || "2D",
      language: item.language || "VI",
      subtitle: item.subtitle || "VI",
      basePrice:
        item.basePrice == null || Number.isNaN(Number(item.basePrice))
          ? undefined
          : Number(item.basePrice),
      isActive: item.isActive !== false,
    });
  };

  const onToggleActive = async (item) => {
    if (!item) return;
    setBusyAction({ id: item.id, type: "toggle" });
    setListError("");

    try {
      await updateShowtime(item.id, {
        movieId: item.movieId,
        cinemaId: item.cinemaId,
        roomId: item.roomId,
        startAt: item.startAt,
        endAt: item.endAt,
        format: item.format,
        language: item.language,
        subtitle: item.subtitle,
        basePrice: item.basePrice,
        isActive: !item.isActive,
      });

      msgApi.success(
        item.isActive
          ? "Đã khóa lịch chiếu thành công."
          : "Đã mở khóa lịch chiếu thành công."
      );
      setRefreshKey((v) => v + 1);
    } catch (err) {
      console.error("Failed to toggle showtime", err);
      msgApi.error(
        buildErrorMessage(err, "Không thể thay đổi trạng thái lịch chiếu.")
      );
    } finally {
      setBusyAction({ id: null, type: null });
    }
  };

  const onDeleteShowtime = async (item) => {
    if (!item) return;
    setBusyAction({ id: item.id, type: "delete" });
    setListError("");

    try {
      await deleteShowtime(item.id);
      msgApi.success("Đã xóa lịch chiếu.");
      setRefreshKey((v) => v + 1);
    } catch (err) {
      console.error("Failed to delete showtime", err);
      msgApi.error(buildErrorMessage(err, "Không thể xóa lịch chiếu."));
    } finally {
      setBusyAction({ id: null, type: null });
    }
  };

  // ===== TABLE COLUMNS =====
  const columns = [
    {
      title: "Phim",
      dataIndex: "movieName",
      ellipsis: true,
      render: (v) => v || "-",
    },
    {
      title: "Rạp",
      dataIndex: "cinemaName",
      ellipsis: true,
      render: (v) => v || "-",
    },
    {
      title: "Phòng",
      dataIndex: "roomName",
      ellipsis: true,
      render: (v) => v || "-",
    },
    {
      title: "Bắt đầu",
      dataIndex: "startAt",
      render: (v) => formatDateTime(v),
    },
    {
      title: "Kết thúc",
      dataIndex: "endAt",
      render: (v) => formatDateTime(v),
    },
    {
      title: "Giá cơ bản",
      dataIndex: "basePrice",
      render: (v) => formatCurrency(v),
      width: 130,
    },
    {
      title: "Ghế trống",
      key: "seats",
      width: 130,
      render: (_, item) => {
        const available = Number.isFinite(item.availableSeats)
          ? item.availableSeats
          : Number(item.availableSeats) || 0;
        const total = Number.isFinite(item.totalSeats)
          ? item.totalSeats
          : Number(item.totalSeats) || 0;
        return (
          <span>
            {available}/{total}
          </span>
        );
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      width: 140,
      render: (v) => (
        <Tag color={v ? "green" : "default"}>
          {v ? "Đang mở bán" : "Đang khóa"}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 230,
      render: (_, item) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEditShowtime(item)}
          >
            Sửa
          </Button>
          <Button
            type="link"
            size="small"
            danger={item.isActive}
            onClick={() => onToggleActive(item)}
            loading={busyAction.id === item.id && busyAction.type === "toggle"}
          >
            {item.isActive ? "Khóa" : "Mở khóa"}
          </Button>
          <Popconfirm
            title={`Bạn có chắc chắn muốn xóa lịch chiếu "${
              item.movieName || ""
            } - ${formatDateTime(item.startAt)}"?`}
            onConfirm={() => onDeleteShowtime(item)}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={
                busyAction.id === item.id && busyAction.type === "delete"
              }
            >
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <Layout style={{ minHeight: "100vh" }}>
        <Layout>
          <Content style={{ padding: 16 }}>
            <Row gutter={16}>
              {/* BẢNG BÊN TRÁI */}
              <Col xs={24} xl={16} xxl={17}>
                <Card
                  title={
                    <Space direction="vertical" size={0}>
                      <Title level={4} style={{ margin: 0 }}>
                        Danh sách lịch chiếu
                      </Title>
                      <Text type="secondary">
                        Quản lý lịch chiếu trong hệ thống.
                      </Text>
                    </Space>
                  }
                  extra={
                    <Input
                      placeholder="Tìm theo phim hoặc rạp..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onPressEnter={handleSearchSubmit}
                      style={{
                        width: 320,
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
                          {/* vạch ngăn cách */}
                          <div
                            style={{
                              width: 1,
                              height: 20,
                              backgroundColor: "#d9d9d9",
                            }}
                          />
                          {/* kính lúp */}
                          <SearchOutlined
                            onClick={handleSearchSubmit}
                            style={{
                              cursor: "pointer",
                              fontSize: 16,
                              color: "#999",
                            }}
                          />
                        </div>
                      }
                    />
                  }
                  bodyStyle={{ paddingTop: 12 }}
                >
                  {/* FILTER 1 HÀNG */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      marginBottom: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <span>Rạp chiếu:</span>
                    <Select
                      allowClear
                      style={{ width: 200 }}
                      placeholder="Tất cả rạp"
                      value={cinemaFilter}
                      onChange={(v) => {
                        setCinemaFilter(v);
                        setPageNumber(1);
                      }}
                      options={cinemas.map((c) => ({
                        value: c.id,
                        label: c.name,
                      }))}
                    />

                    <span>Phim:</span>
                    <Select
                      allowClear
                      style={{ width: 220 }}
                      placeholder="Tất cả phim"
                      value={movieFilter}
                      onChange={(v) => {
                        setMovieFilter(v);
                        setPageNumber(1);
                      }}
                      options={movies.map((m) => ({
                        value: m.id,
                        label: m.name,
                      }))}
                    />

                    <span>Ngày chiếu:</span>
                    <DatePicker
                      allowClear
                      format="YYYY-MM-DD"
                      value={
                        dateFilter ? dayjs(dateFilter, "YYYY-MM-DD") : null
                      }
                      onChange={(value) => {
                        setDateFilter(value ? value.format("YYYY-MM-DD") : "");
                        setPageNumber(1);
                      }}
                    />

                    <span>Sắp xếp theo:</span>
                    <Select
                      style={{ width: 170 }}
                      value={sortBy}
                      onChange={(v) => {
                        setSortBy(v);
                        setSortDescending(false);
                        setPageNumber(1);
                      }}
                      options={SORT_OPTIONS}
                    />

                    <span>Thứ tự:</span>
                    <Select
                      style={{ width: 120 }}
                      value={sortDescending ? "desc" : "asc"}
                      onChange={(v) => {
                        setSortDescending(v === "desc");
                        setPageNumber(1);
                      }}
                      options={[
                        { value: "asc", label: "Tăng dần" },
                        { value: "desc", label: "Giảm dần" },
                      ]}
                    />

                    <span>Số dòng:</span>
                    <Select
                      style={{ width: 110 }}
                      value={pageSize}
                      onChange={(v) => {
                        setPageSize(v);
                        setPageNumber(1);
                      }}
                      options={PAGE_SIZE_OPTIONS.map((s) => ({
                        value: s,
                        label: `${s}/trang`,
                      }))}
                    />

                    <Button
                      onClick={handleResetFilters}
                      icon={<ReloadOutlined />}
                    >
                      Xóa bộ lọc
                    </Button>
                  </div>

                  {listError && (
                    <Text
                      type="danger"
                      style={{ marginBottom: 8, display: "block" }}
                    >
                      {listError}
                    </Text>
                  )}

                  <Table
                    rowKey="id"
                    loading={loading}
                    dataSource={showtimes}
                    columns={columns}
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
                      showTotal: (total, range) =>
                        `Hiển thị ${range[0]}-${range[1]} trong tổng số ${total} lịch chiếu`,
                    }}
                    locale={{
                      emptyText: "Không tìm thấy lịch chiếu phù hợp.",
                    }}
                  />
                </Card>
              </Col>

              {/* FORM BÊN PHẢI */}
              <Col xs={24} xl={8} xxl={7}>
                <Card
                  title={
                    editingId != null
                      ? "Chỉnh sửa lịch chiếu"
                      : "Thêm lịch chiếu"
                  }
                  extra={
                    <Button type="link" onClick={handleResetForm}>
                      Reset
                    </Button>
                  }
                >
                  <Form
                    form={form}
                    layout="vertical"
                    initialValues={INITIAL_FORM}
                    onFinish={onSubmit}
                  >
                    {roomsError && (
                      <Text
                        type="danger"
                        style={{ marginBottom: 8, display: "block" }}
                      >
                        {roomsError}
                      </Text>
                    )}

                    <Form.Item
                      name="movieId"
                      label="Phim *"
                      rules={[
                        { required: true, message: "Vui lòng chọn phim." },
                      ]}
                    >
                      <Select
                        placeholder="-- Chọn phim --"
                        options={movies.map((m) => ({
                          value: m.id,
                          label: m.name,
                        }))}
                        disabled={submitting}
                        showSearch
                        optionFilterProp="label"
                      />
                    </Form.Item>

                    <Form.Item
                      name="cinemaId"
                      label="Rạp chiếu *"
                      rules={[
                        { required: true, message: "Vui lòng chọn rạp chiếu." },
                      ]}
                    >
                      <Select
                        placeholder="-- Chọn rạp --"
                        options={cinemas.map((c) => ({
                          value: c.id,
                          label: c.name,
                        }))}
                        disabled={submitting}
                        showSearch
                        optionFilterProp="label"
                      />
                    </Form.Item>

                    <Form.Item
                      name="roomId"
                      label="Phòng chiếu *"
                      rules={[
                        {
                          required: true,
                          message: "Vui lòng chọn phòng chiếu.",
                        },
                      ]}
                    >
                      <Select
                        placeholder={
                          roomsLoading
                            ? "Đang tải phòng..."
                            : "-- Chọn phòng --"
                        }
                        disabled={!cinemaIdWatch || roomsLoading || submitting}
                        options={rooms.map((r) => ({
                          value: r.id,
                          label: r.name,
                        }))}
                      />
                    </Form.Item>

                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item
                          name="startAt"
                          label="Bắt đầu *"
                          rules={[
                            {
                              required: true,
                              message: "Vui lòng chọn thời gian bắt đầu.",
                            },
                          ]}
                        >
                          <Input type="datetime-local" disabled={submitting} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name="endAt"
                          label="Kết thúc *"
                          rules={[
                            {
                              required: true,
                              message: "Vui lòng chọn thời gian kết thúc.",
                            },
                          ]}
                        >
                          <Input type="datetime-local" disabled={submitting} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={12}>
                      <Col span={8}>
                        <Form.Item name="format" label="Định dạng">
                          <Input
                            placeholder="VD: 2D, 3D"
                            disabled={submitting}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="language" label="Ngôn ngữ">
                          <Input
                            placeholder="VD: VI, EN"
                            disabled={submitting}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="subtitle" label="Phụ đề">
                          <Input
                            placeholder="VD: VI, EN"
                            disabled={submitting}
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item name="basePrice" label="Giá cơ bản (VND)">
                      <InputNumber
                        style={{ width: "100%" }}
                        min={0}
                        step={1000}
                        placeholder="Ví dụ: 90000"
                        disabled={submitting}
                      />
                    </Form.Item>

                    {editingId != null && (
                      <Form.Item
                        name="isActive"
                        label="Đang mở bán"
                        valuePropName="checked"
                      >
                        <Switch disabled={submitting} />
                      </Form.Item>
                    )}

                    <Space>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={submitting}
                      >
                        {editingId != null ? "Cập nhật lịch" : "Thêm lịch"}
                      </Button>
                      <Button onClick={handleResetForm} disabled={submitting}>
                        Hủy
                      </Button>
                    </Space>

                    <Text
                      type="secondary"
                      style={{ display: "block", marginTop: 8 }}
                    >
                      * Đảm bảo phòng chiếu không trùng lịch và thời gian kết
                      thúc sau thời gian bắt đầu.
                    </Text>
                  </Form>
                </Card>
              </Col>
            </Row>
          </Content>
        </Layout>
      </Layout>
    </>
  );
}
