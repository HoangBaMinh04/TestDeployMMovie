import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  DatePicker,
  Switch,
  Button,
  Space,
  Tag,
  Table,
  Popconfirm,
  Divider,
  Radio,
  Tooltip,
  message,
} from "antd";
import {
  SearchOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
} from "@ant-design/icons";
import dayjs from "dayjs";
import "antd/dist/reset.css";

import {
  createMovie,
  deleteMovie,
  getMovieById,
  getMoviesPagedAdmin,
  toggleMovieDelete,
  updateMovie,
} from "../../services/movieService";
import { getCategories } from "../../services/categoryService";
import { getCountries } from "../../services/countryService";
import { fmtLocalDate } from "../../utils/datetime";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
const FALLBACK_QUALITY_OPTIONS = [
  "HD",
  "FullHD",
  "4K",
  "2D",
  "3D",
  "SD",
  "CAM",
];
const FALLBACK_AGE_RATINGS = ["P", "K", "T13", "T16", "T18", "C"];

const SORT_OPTIONS = [
  { value: "createdAt", label: "Ngày tạo" },
  { value: "name", label: "Tên phim" },
  { value: "releaseDate", label: "Ngày phát hành" },
  { value: "year", label: "Năm" },
  { value: "duration", label: "Thời lượng" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "published", label: "Đang xuất bản" },
  { value: "unpublished", label: "Chưa xuất bản" },
  { value: "deleted", label: "Đã ẩn" },
];

const INITIAL_FORM = {
  name: "",
  slug: "",
  description: "",
  quality: "HD",
  year: undefined,
  duration: undefined,
  releaseDate: null,
  ageRating: undefined,
  trailerUrl: "",
  thumbnailUrl: "",
  posterUrl: "",
  isPublished: true,
  countryId: undefined,
  categories: [],
  primaryCategoryId: undefined,
};

function normalizeNumeric(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function MovieManagementPanelAntd() {
  const [msgApi, contextHolder] = message.useMessage();

  // Bảng & filter
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1]);
  const [totalCount, setTotalCount] = useState(0);

  const [statusFilter, setStatusFilter] = useState(STATUS_OPTIONS[0].value);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDescending, setSortDescending] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // input của ô search (header)
  const [searchInput, setSearchInput] = useState("");

  // Options
  const [countries, setCountries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  // Form
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const normalizedCountries = useMemo(
    () =>
      (Array.isArray(countries) ? countries : [])
        .map((c) => ({
          id: c?.id ?? c?.countryId,
          label: c?.name ?? c?.countryName,
        }))
        .filter((c) => c.id && c.label),
    [countries]
  );

  const categoryOptions = useMemo(
    () =>
      (Array.isArray(categories) ? categories : [])
        .map((x) => ({
          id: x?.id ?? x?.categoryId,
          label: x?.name ?? x?.categoryName ?? x?.CategoryName,
        }))
        .filter((x) => x.id && x.label),
    [categories]
  );

  const derivedQualityOptions = useMemo(() => {
    const set = new Set(FALLBACK_QUALITY_OPTIONS);
    movies.forEach((m) => m?.quality && set.add(String(m.quality)));
    return Array.from(set).sort();
  }, [movies]);

  const derivedAgeRatingOptions = useMemo(() => {
    const set = new Set(FALLBACK_AGE_RATINGS);
    movies.forEach((m) => m?.ageRating && set.add(String(m.ageRating)));
    return Array.from(set).sort();
  }, [movies]);

  const updateMovieInList = useCallback((movieId, updater) => {
    if (movieId == null) return;
    setMovies((prev) => {
      if (!Array.isArray(prev)) return prev;
      return prev.map((item) => {
        if (item?.id !== movieId) return item;
        const patch = typeof updater === "function" ? updater(item) : updater;
        if (!patch || typeof patch !== "object") return item;
        return { ...item, ...patch };
      });
    });
  }, []);

  const syncFormWithMovie = useCallback(
    (m) => {
      if (!m) {
        form.setFieldsValue(INITIAL_FORM);
        return;
      }
      form.setFieldsValue({
        name: m?.name ?? "",
        slug: m?.slug ?? "",
        description: m?.description ?? "",
        quality: m?.quality ?? "HD",
        year: m?.year ?? undefined,
        duration: m?.duration ?? undefined,
        releaseDate: m?.releaseDate ? dayjs(m.releaseDate) : null,
        ageRating: m?.ageRating ?? undefined,
        trailerUrl: m?.trailerUrl ?? "",
        thumbnailUrl: m?.thumbnailUrl ?? "",
        posterUrl: m?.posterUrl ?? "",
        isPublished: Boolean(m?.isPublished ?? true),
        countryId: m?.countryId ?? undefined,
        categories: (Array.isArray(m?.categories) ? m.categories : [])
          .map((c) => c?.categoryId ?? c?.id)
          .filter(Boolean),
        primaryCategoryId: (Array.isArray(m?.categories)
          ? m.categories
          : []
        ).find((c) => c?.isPrimary)?.categoryId,
      });
    },
    [form]
  );

  // apply search / reset filters
  const applySearch = useCallback(() => {
    setSearchTerm(searchInput.trim());
    setPageNumber(1);
  }, [searchInput]);

  const resetFilters = useCallback(() => {
    setStatusFilter("all");
    setSortBy("createdAt");
    setSortDescending(true);
    setPageSize(PAGE_SIZE_OPTIONS[1]);
    setSearchInput("");
    setSearchTerm("");
    setPageNumber(1);
  }, []);

  // Load options
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setOptionsLoading(true);
        const [cs, cats] = await Promise.all([getCountries(), getCategories()]);
        if (ignore) return;
        setCountries(Array.isArray(cs) ? cs : []);
        setCategories(Array.isArray(cats) ? cats : []);
      } catch (e) {
        console.error(e);
        msgApi.error("Không thể tải quốc gia/thể loại.");
      } finally {
        if (!ignore) setOptionsLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [msgApi]);

  // Load movies
  useEffect(() => {
    const controller = new AbortController();
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        setListError("");
        const data = await getMoviesPagedAdmin(
          {
            pageNumber,
            pageSize,
            searchTerm,
            sortBy,
            sortDescending,
            includeDeleted: true,
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
        setMovies(items);
        setTotalCount(total);
      } catch (e) {
        if (!ignore && !controller.signal.aborted) {
          console.error(e);
          setListError(e?.message || "Không thể tải danh sách phim.");
          setMovies([]);
          setTotalCount(0);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [pageNumber, pageSize, searchTerm, sortBy, sortDescending, refreshKey]);

  // Filter by status (client-side)
  const displayedMovies = useMemo(() => {
    const arr = Array.isArray(movies) ? movies : [];
    switch (statusFilter) {
      case "published":
        return arr.filter(
          (m) => m?.isDeleted !== true && m?.isPublished !== false
        );
      case "unpublished":
        return arr.filter(
          (m) => m?.isDeleted !== true && m?.isPublished === false
        );
      case "deleted":
        return arr.filter((m) => m?.isDeleted === true);
      default:
        return arr;
    }
  }, [movies, statusFilter]);

  // Table columns
  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      width: 90,
      render: (v) => <Text>#{v}</Text>,
    },
    {
      title: "Tên phim",
      dataIndex: "name",
      ellipsis: true,
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.name}</Text>
          {record.slug ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.slug}
            </Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: "Quốc gia",
      dataIndex: "countryName",
      width: 150,
      render: (v) => v || "-",
    },
    {
      title: "Năm",
      dataIndex: "year",
      width: 110,
      sorter: true,
      render: (v) => v ?? "-",
    },
    {
      title: "Ngày phát hành",
      dataIndex: "releaseDate",
      width: 170,
      sorter: true,
      render: (v) => fmtLocalDate(v) || "-",
    },
    {
      title: "Thể loại",
      dataIndex: "categories",
      render: (cats) => {
        const names = Array.isArray(cats)
          ? cats
              .map((c) => c?.categoryName || c?.name || c?.CategoryName)
              .filter(Boolean)
          : [];
        return names.length ? names.join(", ") : "-";
      },
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 160,
      render: (_, m) => (
        <Tag color={m.isDeleted ? "red" : m.isPublished ? "green" : "gold"}>
          {m.isDeleted ? "Đã ẩn" : m.isPublished ? "Đang hiển thị" : "Nháp"}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 220,
      render: (_, m) => (
        <Space>
          <Tooltip title="Sửa">
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => onEdit(m)}
            />
          </Tooltip>
          <Tooltip title={m.isDeleted ? "Khôi phục" : "Ẩn"}>
            <Popconfirm
              title={
                m.isDeleted
                  ? `Khôi phục phim "${m.name}"?`
                  : `Ẩn phim "${m.name}"?`
              }
              onConfirm={() => onToggleDelete(m)}
            >
              <Button
                icon={m.isDeleted ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
                size="small"
              />
            </Popconfirm>
          </Tooltip>
          <Tooltip title="Xoá vĩnh viễn">
            <Popconfirm
              title={`Xoá vĩnh viễn "${m.name}"?`}
              onConfirm={() => onDelete(m)}
            >
              <Button danger icon={<DeleteOutlined />} size="small" />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const onTableChange = (_pagination, _filters, sorter) => {
    if (sorter && sorter.field) {
      setSortBy(
        sorter.field === "releaseDate" || sorter.field === "year"
          ? sorter.field
          : "name"
      );
      setSortDescending(sorter.order !== "ascend");
    }
  };

  // CRUD handlers
  const onEdit = async (movie) => {
    if (!movie?.id) return;
    try {
      const m = await getMovieById(movie.id);
      setEditingId(movie.id);
      syncFormWithMovie(m);
      updateMovieInList(movie.id, m);
    } catch (e) {
      console.error(e);
      msgApi.error("Không thể tải chi tiết phim.");
    }
  };

  const onDelete = async (movie) => {
    try {
      await deleteMovie(movie.id);
      msgApi.success(`Đã xoá phim "${movie.name}".`);
      setRefreshKey((v) => v + 1);
    } catch (e) {
      console.error(e);
      msgApi.error("Xoá thất bại.");
    }
  };

  const onToggleDelete = async (movie) => {
    try {
      const result = await toggleMovieDelete(movie.id);
      const nextIsDeleted =
        result && typeof result === "object" && "isDeleted" in result
          ? Boolean(result.isDeleted)
          : !movie.isDeleted;
      updateMovieInList(movie.id, (prev) => ({
        ...prev,
        ...(result && typeof result === "object" ? result : {}),
        isDeleted: nextIsDeleted,
      }));
      msgApi.success(nextIsDeleted ? "Đã ẩn phim." : "Đã khôi phục.");
      setRefreshKey((v) => v + 1);
    } catch (e) {
      console.error(e);
      msgApi.error("Cập nhật trạng thái thất bại.");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue(INITIAL_FORM);
  };

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        name: values.name.trim(),
        slug: values.slug?.trim() || null,
        description: values.description?.trim() || null,
        quality: values.quality,
        year: normalizeNumeric(values.year),
        duration: normalizeNumeric(values.duration),
        releaseDate: values.releaseDate
          ? values.releaseDate.toDate().toISOString()
          : null,
        ageRating: values.ageRating ?? null,
        trailerUrl: values.trailerUrl?.trim() || null,
        thumbnailUrl: values.thumbnailUrl?.trim() || null,
        posterUrl: values.posterUrl?.trim() || null,
        isPublished: Boolean(values.isPublished),
        countryId: Number(values.countryId),
        categories: (values.categories || []).map((id, idx) => ({
          categoryId: id,
          isPrimary: values.primaryCategoryId
            ? values.primaryCategoryId === id
            : idx === 0,
          displayOrder: idx + 1,
        })),
      };

      setSubmitting(true);
      if (editingId == null) {
        const created = await createMovie(payload);
        msgApi.success("Đã tạo phim mới.");
        setPageNumber(1);
        if (created && created.id) {
          setMovies((prev) => [created, ...(Array.isArray(prev) ? prev : [])]);
        }
      } else {
        await updateMovie(editingId, payload);
        try {
          const refreshed = await getMovieById(editingId);
          if (refreshed) {
            updateMovieInList(editingId, refreshed);
            syncFormWithMovie(refreshed);
          }
        } catch (error) {
          console.error(error);
        }
        msgApi.success("Đã lưu thay đổi.");
      }
      setRefreshKey((v) => v + 1);
      if (editingId == null) {
        resetForm();
      }
    } catch (e) {
      if (e?.errorFields) return;
      console.error(e);
      msgApi.error(e?.message || "Không thể lưu phim.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Layout style={{ minHeight: "100vh" }}>
        <Layout>
          <Content style={{ padding: 16 }}>
            <Row gutter={16}>
              {/* BẢNG */}
              <Col xs={24} xl={16} xxl={17}>
                <Card
                  title={
                    <Space direction="vertical" size={0}>
                      <Title level={4} style={{ margin: 0 }}>
                        Danh sách phim
                      </Title>
                      <Text type="secondary">
                        Quản lý thông tin phim, trạng thái xuất bản và thể loại.
                      </Text>
                    </Space>
                  }
                  extra={
                    <Input
                      allowClear
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onPressEnter={applySearch}
                      placeholder="Tìm kiếm theo tên, mô tả, slug..."
                      style={{ width: 320 }}
                      prefix={<SearchOutlined />}
                    />
                  }
                  bodyStyle={{ paddingTop: 12 }}
                >
                  {/* FILTER BAR */}
                  <Form
                    layout="inline"
                    onSubmitCapture={(e) => {
                      e.preventDefault();
                      applySearch();
                    }}
                  >
                    <Space wrap style={{ marginBottom: 12 }}>
                      <span>Trạng thái:</span>
                      <Select
                        value={statusFilter}
                        onChange={(v) => {
                          setStatusFilter(v);
                          setPageNumber(1);
                        }}
                        style={{ width: 160 }}
                        options={STATUS_OPTIONS.map((x) => ({
                          value: x.value,
                          label: x.label,
                        }))}
                      />

                      <span>Sắp xếp theo:</span>
                      <Select
                        value={sortBy}
                        onChange={(v) => {
                          setSortBy(v);
                          setPageNumber(1);
                        }}
                        style={{ width: 160 }}
                        options={SORT_OPTIONS}
                      />

                      <span>Thứ tự:</span>
                      <Select
                        style={{ width: 130 }}
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

                      <span>Hiển thị:</span>
                      <Select
                        value={pageSize}
                        onChange={(v) => {
                          setPageSize(v);
                          setPageNumber(1);
                        }}
                        style={{ width: 120 }}
                        options={PAGE_SIZE_OPTIONS.map((s) => ({
                          value: s,
                          label: `${s}/trang`,
                        }))}
                      />
                      <Button onClick={resetFilters}>Xoá bộ lọc</Button>
                    </Space>
                  </Form>

                  {listError && (
                    <div style={{ marginBottom: 8 }}>
                      <Text type="danger">{listError}</Text>
                    </div>
                  )}

                  <Table
                    rowKey="id"
                    loading={loading}
                    dataSource={displayedMovies}
                    columns={columns}
                    onChange={onTableChange}
                    pagination={{
                      current: pageNumber,
                      pageSize,
                      total: totalCount,
                      onChange: (p) => setPageNumber(p),
                      showTotal: (total, range) =>
                        `Hiển thị ${range[0]}-${range[1]} của ${total} phim`,
                    }}
                  />
                </Card>
              </Col>

              {/* FORM */}
              <Col xs={24} xl={8} xxl={7}>
                <Card
                  title={editingId == null ? "Thêm phim mới" : "Cập nhật phim"}
                >
                  <Form
                    form={form}
                    layout="vertical"
                    initialValues={INITIAL_FORM}
                    onFinish={onSubmit}
                  >
                    <Form.Item
                      name="name"
                      label="Tên phim"
                      rules={[
                        { required: true, message: "Vui lòng nhập tên phim" },
                      ]}
                    >
                      <Input placeholder="Ví dụ: Avengers: Endgame" />
                    </Form.Item>

                    <Form.Item
                      name="slug"
                      label="Slug"
                      extra="Nếu bỏ trống, hệ thống sẽ tự tạo slug từ tên phim."
                    >
                      <Input placeholder="vd: avengers-endgame" />
                    </Form.Item>

                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item
                          name="countryId"
                          label="Quốc gia"
                          rules={[{ required: true, message: "Chọn quốc gia" }]}
                        >
                          <Select
                            loading={optionsLoading}
                            placeholder="-- Chọn quốc gia --"
                            options={normalizedCountries.map((c) => ({
                              value: c.id,
                              label: c.label,
                            }))}
                            showSearch
                            optionFilterProp="label"
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="year" label="Năm sản xuất">
                          <InputNumber
                            min={1900}
                            max={2100}
                            style={{ width: "100%" }}
                            placeholder="2025"
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item name="duration" label="Thời lượng (phút)">
                          <InputNumber
                            min={0}
                            style={{ width: "100%" }}
                            placeholder="150"
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="releaseDate" label="Ngày phát hành">
                          <DatePicker
                            showTime
                            style={{ width: "100%" }}
                            format="DD/MM/YYYY HH:mm"
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item
                          name="quality"
                          label="Chất lượng"
                          rules={[{ required: true }]}
                        >
                          <Select
                            options={derivedQualityOptions.map((q) => ({
                              value: q,
                              label: q,
                            }))}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="ageRating" label="Giới hạn độ tuổi">
                          <Select
                            allowClear
                            options={derivedAgeRatingOptions.map((a) => ({
                              value: a,
                              label: a,
                            }))}
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item name="trailerUrl" label="Trailer URL">
                      <Input placeholder="https://youtube.com/..." />
                    </Form.Item>

                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item name="posterUrl" label="Poster URL">
                          <Input placeholder="https://..." />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="thumbnailUrl" label="Thumbnail URL">
                          <Input placeholder="https://..." />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item name="description" label="Mô tả">
                      <Input.TextArea
                        rows={3}
                        placeholder="Giới thiệu ngắn gọn về phim..."
                      />
                    </Form.Item>

                    <Form.Item
                      name="isPublished"
                      label="Xuất bản phim"
                      valuePropName="checked"
                    >
                      <Switch />
                    </Form.Item>

                    <Divider orientation="left">Thể loại</Divider>

                    <Form.Item name="categories">
                      <Select
                        mode="multiple"
                        allowClear
                        placeholder="-- Chọn thể loại --"
                        options={categoryOptions.map((c) => ({
                          value: c.id,
                          label: c.label,
                        }))}
                        optionFilterProp="label"
                      />
                    </Form.Item>

                    <Form.Item
                      noStyle
                      shouldUpdate={(prev, cur) =>
                        prev.categories !== cur.categories
                      }
                    >
                      {({ getFieldValue, setFieldValue }) => {
                        const selected = getFieldValue("categories") || [];
                        const options = categoryOptions.filter((c) =>
                          selected.includes(c.id)
                        );
                        if (!selected.length) return null;
                        return (
                          <Form.Item
                            name="primaryCategoryId"
                            label="Thể loại chính"
                            rules={[
                              {
                                required: true,
                                message: "Chọn thể loại chính",
                              },
                            ]}
                          >
                            <Radio.Group
                              onChange={(e) =>
                                setFieldValue(
                                  "primaryCategoryId",
                                  e.target.value
                                )
                              }
                            >
                              <Space direction="vertical">
                                {options.map((o) => (
                                  <Radio key={o.id} value={o.id}>
                                    {o.label}
                                  </Radio>
                                ))}
                              </Space>
                            </Radio.Group>
                          </Form.Item>
                        );
                      }}
                    </Form.Item>

                    <Space>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={submitting}
                      >
                        {editingId == null ? "Thêm phim" : "Lưu thay đổi"}
                      </Button>
                      <Button onClick={resetForm}>Huỷ</Button>
                    </Space>
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
