import { useEffect, useState } from "react";
import {
  Layout,
  Typography,
  Row,
  Col,
  Card,
  Input,
  Select,
  Button,
  Space,
  Table,
  Tag,
  Popconfirm,
  message,
  Switch,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";

import { getCinemas } from "../../services/cinemaService";
import {
  createPriceRule,
  deletePriceRule,
  getPagedPriceRules,
  togglePriceRuleActive,
  updatePriceRule,
} from "../../services/priceRuleService";
import { DEFAULT_SEAT_TIERS } from "../../services/seatService";

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

const SORT_OPTIONS = [
  { value: "priority", label: "Độ ưu tiên" },
  { value: "name", label: "Tên quy tắc" },
  { value: "cinema", label: "Rạp áp dụng" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "Trạng thái (tất cả)" },
  { value: "active", label: "Đang áp dụng" },
  { value: "inactive", label: "Tạm ngưng" },
];

const TIER_OPTIONS = [
  { value: "all", label: "Hạng ghế (tất cả)" },
  ...DEFAULT_SEAT_TIERS.map((tier) => ({ value: tier, label: tier })),
];

const DAY_OF_WEEK_OPTIONS = [
  { value: "", label: "Tất cả các ngày" },
  { value: "0", label: "Chủ nhật" },
  { value: "1", label: "Thứ hai" },
  { value: "2", label: "Thứ ba" },
  { value: "3", label: "Thứ tư" },
  { value: "4", label: "Thứ năm" },
  { value: "5", label: "Thứ sáu" },
  { value: "6", label: "Thứ bảy" },
];

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const INITIAL_FORM = {
  cinemaId: "",
  name: "",
  tier: "",
  dayOfWeek: "",
  timeFrom: "",
  timeTo: "",
  priceModifier: "",
  adjustmentMode: "percentage",
  priority: "1",
  isActive: true,
};

function formatCurrency(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return currencyFormatter.format(0);
  }
  return currencyFormatter.format(numeric);
}

function formatDayOfWeek(value) {
  if (value === null || value === undefined || value === "") {
    return "Mọi ngày";
  }

  const numeric = Number(value);
  switch (numeric) {
    case 0:
      return "Chủ nhật";
    case 1:
      return "Thứ hai";
    case 2:
      return "Thứ ba";
    case 3:
      return "Thứ tư";
    case 4:
      return "Thứ năm";
    case 5:
      return "Thứ sáu";
    case 6:
      return "Thứ bảy";
    default:
      return "Mọi ngày";
  }
}

function formatTimeInput(value) {
  if (!value) return "";

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    const parts = trimmed.split(":");
    if (parts.length >= 2) {
      const hours = parts[0].padStart(2, "0");
      const minutes = parts[1].padStart(2, "0");
      return `${hours}:${minutes}`;
    }
    return trimmed;
  }

  if (typeof value === "object") {
    const { hour, minute } = value;
    if (hour == null || minute == null) return "";
    const hours = String(hour).padStart(2, "0");
    const minutes = String(minute).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  return "";
}

function toTimePayload(value) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length === 5) {
    return `${trimmed}:00`;
  }
  return trimmed;
}

function formatTimeRange(from, to) {
  const fromValue = formatTimeInput(from);
  const toValue = formatTimeInput(to);

  if (!fromValue && !toValue) {
    return "Cả ngày";
  }

  if (fromValue && !toValue) {
    return `Từ ${fromValue}`;
  }

  if (!fromValue && toValue) {
    return `Đến ${toValue}`;
  }

  return `${fromValue} – ${toValue}`;
}

function formatTierLabel(tier) {
  if (!tier) {
    return "Mọi hạng ghế";
  }

  const match = DEFAULT_SEAT_TIERS.find(
    (item) => item.toLowerCase() === String(tier).toLowerCase()
  );

  return match || tier;
}

function formatPriceModifier(rule) {
  const value = Number(rule?.priceModifier ?? 0);
  if (!Number.isFinite(value)) {
    return "-";
  }

  if (rule?.isPercentage) {
    return `${value}%`;
  }

  const formatted = formatCurrency(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

function buildErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.response?.data?.errorMessage ||
    error?.response?.data ||
    error?.message ||
    fallback
  );
}

export default function PriceRuleManagementPanel() {
  const [msgApi, contextHolder] = message.useMessage();

  const [cinemas, setCinemas] = useState([]);
  const [cinemasLoading, setCinemasLoading] = useState(false);

  const [priceRules, setPriceRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState("");

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1]);
  const [totalCount, setTotalCount] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [cinemaFilter, setCinemaFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [sortBy, setSortBy] = useState(SORT_OPTIONS[0].value);
  const [sortDescending, setSortDescending] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [actionBusyId, setActionBusyId] = useState(null);

  const [formValues, setFormValues] = useState({ ...INITIAL_FORM });
  const [formError, setFormError] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const trimmedSearch = searchTerm.trim();

  const handleResetFilters = () => {
    setSearchInput("");
    setSearchTerm("");

    // reset filters
    setCinemaFilter("all");
    setStatusFilter("all");
    setTierFilter("all");

    setSortBy(SORT_OPTIONS[0].value);
    setSortDescending(false);
    setPageSize(PAGE_SIZE_OPTIONS[1]);

    setPageNumber(1);
  };

  // ===== LOAD CINEMAS =====
  useEffect(() => {
    const controller = new AbortController();
    let ignore = false;

    async function loadCinemas() {
      setCinemasLoading(true);
      try {
        const data = await getCinemas({ signal: controller.signal });
        if (ignore) return;
        setCinemas(Array.isArray(data) ? data : []);
      } catch (error) {
        if (ignore || controller.signal.aborted) return;
        console.error("Failed to load cinemas", error);
      } finally {
        if (!ignore) {
          setCinemasLoading(false);
        }
      }
    }

    loadCinemas();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, []);

  // set default cinemaId for form (create mode)
  useEffect(() => {
    if (editingId) {
      return;
    }

    if (!formValues.cinemaId && cinemas.length > 0) {
      setFormValues((prev) => ({
        ...prev,
        cinemaId: String(cinemas[0].id ?? ""),
      }));
    }
  }, [cinemas, editingId, formValues.cinemaId]);

  // ===== LOAD PRICE RULES =====
  useEffect(() => {
    const controller = new AbortController();
    let ignore = false;

    async function loadPriceRules() {
      setLoading(true);
      setListError("");

      try {
        const response = await getPagedPriceRules(
          {
            pageNumber,
            pageSize,
            searchTerm: trimmedSearch,
            sortBy,
            sortDescending,
            cinemaId:
              cinemaFilter && cinemaFilter !== "all"
                ? Number(cinemaFilter)
                : undefined,
            isActive:
              statusFilter === "all" ? undefined : statusFilter === "active",
            tier: tierFilter === "all" ? undefined : tierFilter,
          },
          { signal: controller.signal }
        );

        if (ignore) return;

        const items = Array.isArray(response?.items)
          ? response.items
          : Array.isArray(response)
          ? response
          : [];

        setPriceRules(items);
        setTotalCount(response?.totalCount ?? items.length ?? 0);
      } catch (error) {
        if (ignore || controller.signal.aborted) return;
        console.error("Failed to load price rules", error);
        setPriceRules([]);
        setTotalCount(0);
        setListError(
          buildErrorMessage(error, "Không tải được danh sách quy tắc giá.")
        );
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadPriceRules();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [
    pageNumber,
    pageSize,
    trimmedSearch,
    sortBy,
    sortDescending,
    cinemaFilter,
    statusFilter,
    tierFilter,
    refreshKey,
  ]);

  // ===== HANDLERS - FILTERS & SEARCH =====
  const handleSearchSubmit = () => {
    setPageNumber(1);
    setSearchTerm(searchInput.trim());
  };

  const handleCinemaFilterChange = (value) => {
    setCinemaFilter(value);
    setPageNumber(1);
  };

  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
    setPageNumber(1);
  };

  const handleTierFilterChange = (value) => {
    setTierFilter(value);
    setPageNumber(1);
  };

  const handleSortChange = (value) => {
    setSortBy(value);
    setPageNumber(1);
  };

  const handleSortOrderChange = (value) => {
    setSortDescending(value === "desc");
    setPageNumber(1);
  };

  const handlePageSizeChange = (value) => {
    setPageSize(value);
    setPageNumber(1);
  };

  // ===== HANDLERS - TABLE ACTIONS =====
  const handleEditRule = (rule) => {
    if (!rule) return;
    setEditingId(rule.id);
    setFormError("");
    setFormValues({
      cinemaId: String(rule.cinemaId ?? ""),
      name: rule.name ?? "",
      tier: rule.tier ?? "",
      dayOfWeek:
        rule.dayOfWeek === null || rule.dayOfWeek === undefined
          ? ""
          : String(rule.dayOfWeek),
      timeFrom: formatTimeInput(rule.timeFrom),
      timeTo: formatTimeInput(rule.timeTo),
      priceModifier:
        rule.priceModifier === null || rule.priceModifier === undefined
          ? ""
          : String(rule.priceModifier),
      adjustmentMode: rule.isPercentage ? "percentage" : "fixed",
      priority:
        rule.priority === null || rule.priority === undefined
          ? "1"
          : String(rule.priority),
      isActive: Boolean(rule.isActive),
    });
  };

  const handleDeleteRule = async (rule) => {
    if (!rule?.id) return;

    setActionBusyId(rule.id);
    setListError("");

    try {
      await deletePriceRule(rule.id);
      msgApi.success("Đã xoá quy tắc giá thành công.");
      setRefreshKey((v) => v + 1);
      if (editingId === rule.id) {
        handleResetForm();
      }
    } catch (error) {
      console.error("Failed to delete price rule", error);
      msgApi.error(
        buildErrorMessage(
          error,
          "Không xoá được quy tắc giá. Vui lòng thử lại."
        )
      );
    } finally {
      setActionBusyId(null);
    }
  };

  const handleToggleStatus = async (rule) => {
    if (!rule?.id) return;

    setActionBusyId(rule.id);
    setListError("");

    try {
      await togglePriceRuleActive(rule.id);
      msgApi.success("Đã cập nhật trạng thái quy tắc giá.");
      setRefreshKey((v) => v + 1);
      if (editingId === rule.id) {
        setFormValues((prev) => ({ ...prev, isActive: !prev.isActive }));
      }
    } catch (error) {
      console.error("Failed to toggle price rule", error);
      msgApi.error(
        buildErrorMessage(
          error,
          "Không thay đổi được trạng thái của quy tắc giá."
        )
      );
    } finally {
      setActionBusyId(null);
    }
  };

  const handleResetForm = () => {
    setEditingId(null);
    setFormError("");
    setFormValues(() => {
      const fallbackCinemaId =
        cinemaFilter && cinemaFilter !== "all"
          ? cinemaFilter
          : cinemas.length > 0
          ? String(cinemas[0].id ?? "")
          : "";

      return {
        ...INITIAL_FORM,
        cinemaId: fallbackCinemaId,
      };
    });
  };

  const handleFormValueChange = (field) => (event) => {
    const value =
      event.target.type === "checkbox"
        ? event.target.checked
        : event.target.value;
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    if (formSubmitting) return;

    const trimmedName = formValues.name.trim();
    if (!trimmedName) {
      setFormError("Vui lòng nhập tên quy tắc.");
      return;
    }

    const numericCinemaId = Number(formValues.cinemaId);
    if (!Number.isFinite(numericCinemaId) || numericCinemaId <= 0) {
      setFormError("Vui lòng chọn rạp áp dụng.");
      return;
    }

    const priceModifier = Number(formValues.priceModifier);
    if (!Number.isFinite(priceModifier)) {
      setFormError("Giá trị điều chỉnh không hợp lệ.");
      return;
    }

    const priority = Number(formValues.priority);
    const normalizedPriority = Number.isFinite(priority) ? priority : 1;

    const payload = {
      cinemaId: numericCinemaId,
      name: trimmedName,
      tier: formValues.tier || null,
      dayOfWeek:
        formValues.dayOfWeek === "" ? null : Number(formValues.dayOfWeek),
      timeFrom: toTimePayload(formValues.timeFrom),
      timeTo: toTimePayload(formValues.timeTo),
      priceModifier,
      isPercentage: formValues.adjustmentMode === "percentage",
      priority: normalizedPriority,
      isActive: Boolean(formValues.isActive),
    };

    setFormSubmitting(true);
    setFormError("");

    try {
      if (editingId) {
        await updatePriceRule(editingId, payload);
        msgApi.success("Đã cập nhật quy tắc giá thành công.");
      } else {
        await createPriceRule(payload);
        msgApi.success("Đã tạo mới quy tắc giá thành công.");
      }
      setRefreshKey((v) => v + 1);
      handleResetForm();
    } catch (error) {
      console.error("Failed to submit price rule", error);
      setFormError(
        buildErrorMessage(error, "Không lưu được thông tin quy tắc giá.")
      );
    } finally {
      setFormSubmitting(false);
    }
  };

  // ===== TABLE COLUMNS =====
  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      width: 80,
      render: (v) => `#${v}`,
    },
    {
      title: "Tên quy tắc",
      dataIndex: "name",
      render: (v, rule) => (
        <>
          <div>{v}</div>
          <Text type="secondary">Áp dụng tại: {rule.cinemaName || "-"}</Text>
        </>
      ),
    },
    {
      title: "Áp dụng",
      key: "apply",
      render: (_, rule) => (
        <>
          <div>{formatTierLabel(rule.tier)}</div>
          <div>
            <Text type="secondary">{formatDayOfWeek(rule.dayOfWeek)}</Text>
          </div>
          <div>
            <Text type="secondary">
              {formatTimeRange(rule.timeFrom, rule.timeTo)}
            </Text>
          </div>
        </>
      ),
    },
    {
      title: "Điều chỉnh",
      key: "modifier",
      render: (_, rule) => (
        <span style={{ fontWeight: 500 }}>{formatPriceModifier(rule)}</span>
      ),
    },
    {
      title: "Độ ưu tiên",
      dataIndex: "priority",
      width: 120,
      render: (v) => v ?? "-",
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      width: 140,
      render: (v) => (
        <Tag color={v ? "green" : "red"}>
          {v ? "Đang áp dụng" : "Tạm ngưng"}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 210,
      render: (_, rule) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditRule(rule)}
            disabled={actionBusyId === rule.id}
          >
            Sửa
          </Button>
          <Popconfirm
            title={`Xoá quy tắc "${rule.name}"?`}
            description="Bạn sẽ không thể khôi phục lại quy tắc này."
            onConfirm={() => handleDeleteRule(rule)}
            okText="Xoá"
            cancelText="Huỷ"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={actionBusyId === rule.id}
            >
              Xoá
            </Button>
          </Popconfirm>
          <Button
            type="link"
            size="small"
            icon={
              rule.isActive ? <PauseCircleOutlined /> : <PlayCircleOutlined />
            }
            onClick={() => handleToggleStatus(rule)}
            disabled={actionBusyId === rule.id}
          >
            {rule.isActive ? "Tạm dừng" : "Kích hoạt"}
          </Button>
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
                        Danh sách quy tắc giá
                      </Title>
                      <Text type="secondary">
                        Các quy tắc đang được áp dụng cho giá vé.
                      </Text>
                    </Space>
                  }
                  extra={
                    <Space>
                      <Input
                        placeholder="Tìm theo tên quy tắc"
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
                            <div
                              style={{
                                width: 1,
                                height: 20,
                                backgroundColor: "#d9d9d9",
                              }}
                            />
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
                    </Space>
                  }
                  bodyStyle={{ paddingTop: 12 }}
                >
                  {/* FILTER ROW 1 */}
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
                      style={{ width: 200 }}
                      value={cinemaFilter}
                      onChange={handleCinemaFilterChange}
                      options={[
                        { value: "all", label: "Tất cả" },
                        ...cinemas.map((c) => ({
                          value: String(c.id),
                          label: c.name,
                        })),
                      ]}
                      loading={cinemasLoading}
                    />

                    <span>Trạng thái:</span>
                    <Select
                      style={{ width: 180 }}
                      value={statusFilter}
                      onChange={handleStatusFilterChange}
                      options={STATUS_OPTIONS}
                    />
                  </div>

                  {/* FILTER ROW 2 */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      marginBottom: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <span>Hạng ghế:</span>
                    <Select
                      style={{ width: 200 }}
                      value={tierFilter}
                      onChange={handleTierFilterChange}
                      options={TIER_OPTIONS}
                    />

                    <span>Sắp xếp theo:</span>
                    <Select
                      style={{ width: 170 }}
                      value={sortBy}
                      onChange={handleSortChange}
                      options={SORT_OPTIONS}
                    />

                    <span>Thứ tự:</span>
                    <Select
                      style={{ width: 130 }}
                      value={sortDescending ? "desc" : "asc"}
                      onChange={handleSortOrderChange}
                      options={[
                        { value: "asc", label: "Tăng dần" },
                        { value: "desc", label: "Giảm dần" },
                      ]}
                    />

                    <span>Số dòng:</span>
                    <Select
                      style={{ width: 120 }}
                      value={pageSize}
                      onChange={handlePageSizeChange}
                      options={PAGE_SIZE_OPTIONS.map((s) => ({
                        value: s,
                        label: `${s}/trang`,
                      }))}
                    />

                    <Button
                      icon={<ReloadOutlined />}
                      onClick={handleResetFilters}
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
                    dataSource={priceRules}
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
                        `Hiển thị ${range[0]}-${range[1]} trong tổng số ${total} quy tắc giá`,
                    }}
                  />
                </Card>
              </Col>

              {/* FORM BÊN PHẢI */}
              <Col xs={24} xl={8} xxl={7}>
                <Card
                  title={editingId ? "Cập nhật quy tắc" : "Tạo quy tắc mới"}
                  bodyStyle={{ padding: 20 }}
                >
                  <form onSubmit={handleFormSubmit}>
                    <Space
                      direction="vertical"
                      size={14}
                      style={{ width: "100%" }}
                    >
                      <label>
                        <span style={{ display: "block", marginBottom: 6 }}>
                          Rạp áp dụng
                        </span>
                        <Select
                          size="large"
                          value={formValues.cinemaId}
                          onChange={(value) =>
                            setFormValues((p) => ({ ...p, cinemaId: value }))
                          }
                          style={{ width: "100%" }}
                          placeholder="Chọn rạp"
                          options={cinemas.map((c) => ({
                            value: String(c.id),
                            label: c.name,
                          }))}
                        />
                      </label>

                      <label>
                        <span style={{ display: "block", marginBottom: 6 }}>
                          Tên quy tắc
                        </span>
                        <Input
                          size="large"
                          type="text"
                          value={formValues.name}
                          onChange={handleFormValueChange("name")}
                          placeholder="Ví dụ: Khung giờ vàng"
                        />
                      </label>

                      <label>
                        <span style={{ display: "block", marginBottom: 6 }}>
                          Hạng ghế áp dụng
                        </span>
                        <Select
                          size="large"
                          value={formValues.tier || ""}
                          onChange={(value) =>
                            setFormValues((p) => ({ ...p, tier: value }))
                          }
                          style={{ width: "100%" }}
                          options={[
                            { value: "", label: "Mọi hạng ghế" },
                            ...DEFAULT_SEAT_TIERS.map((t) => ({
                              value: t,
                              label: t,
                            })),
                          ]}
                        />
                      </label>

                      <label>
                        <span style={{ display: "block", marginBottom: 6 }}>
                          Ngày áp dụng
                        </span>
                        <Select
                          size="large"
                          value={formValues.dayOfWeek}
                          onChange={(value) =>
                            setFormValues((p) => ({ ...p, dayOfWeek: value }))
                          }
                          style={{ width: "100%" }}
                          options={DAY_OF_WEEK_OPTIONS}
                        />
                      </label>

                      <div>
                        <span style={{ display: "block", marginBottom: 6 }}>
                          Khung giờ
                        </span>
                        <Space.Compact block>
                          <Input
                            size="large"
                            type="time"
                            value={formValues.timeFrom}
                            onChange={handleFormValueChange("timeFrom")}
                            placeholder="Từ"
                          />
                          <Input
                            size="large"
                            type="time"
                            value={formValues.timeTo}
                            onChange={handleFormValueChange("timeTo")}
                            placeholder="Đến"
                          />
                        </Space.Compact>
                      </div>

                      <label>
                        <span style={{ display: "block", marginBottom: 6 }}>
                          Giá trị điều chỉnh
                        </span>
                        <Input
                          size="large"
                          type="number"
                          step="0.1"
                          value={formValues.priceModifier}
                          onChange={handleFormValueChange("priceModifier")}
                          placeholder={
                            formValues.adjustmentMode === "percentage"
                              ? "Ví dụ: 20"
                              : "Ví dụ: 15000"
                          }
                        />
                        <div style={{ marginTop: 6, color: "#6b7280" }}>
                          {formValues.adjustmentMode === "percentage"
                            ? "Nhập phần trăm tăng/giảm. Ví dụ 20 nghĩa là +20%."
                            : "Nhập số tiền tăng/giảm bằng VND. Có thể nhập giá trị âm."}
                        </div>
                      </label>

                      <label>
                        <span style={{ display: "block", marginBottom: 6 }}>
                          Loại điều chỉnh
                        </span>
                        <Select
                          size="large"
                          value={formValues.adjustmentMode}
                          onChange={(value) =>
                            setFormValues((p) => ({
                              ...p,
                              adjustmentMode: value,
                            }))
                          }
                          style={{ width: "100%" }}
                          options={[
                            {
                              value: "percentage",
                              label: "Theo phần trăm (%)",
                            },
                            { value: "fixed", label: "Theo số tiền (VND)" },
                          ]}
                        />
                      </label>

                      <label>
                        <span style={{ display: "block", marginBottom: 6 }}>
                          Độ ưu tiên
                        </span>
                        <Input
                          size="large"
                          type="number"
                          min={1}
                          step={1}
                          value={formValues.priority}
                          onChange={handleFormValueChange("priority")}
                        />
                        <div style={{ marginTop: 6, color: "#6b7280" }}>
                          Số nhỏ sẽ được áp dụng trước khi tính toán các quy tắc
                          khác.
                        </div>
                      </label>

                      <div>
                        <span
                          style={{ display: "flex", paddingBottom: "16px" }}
                        >
                          Đang hoạt động
                        </span>
                        <Switch
                          style={{ display: "flex" }}
                          checked={formValues.isActive}
                          onChange={(checked) =>
                            setFormValues((p) => ({ ...p, isActive: checked }))
                          }
                        />
                      </div>

                      {formError && (
                        <div style={{ color: "#dc2626" }}>{formError}</div>
                      )}

                      <Space
                        style={{ width: "100%", justifyContent: "center" }}
                      >
                        <Button
                          type="primary"
                          htmlType="submit"
                          loading={formSubmitting}
                        >
                          {formSubmitting
                            ? "Đang lưu..."
                            : editingId
                            ? "Cập nhật quy tắc"
                            : "Thêm quy tắc"}
                        </Button>
                        <Button
                          onClick={handleResetForm}
                          disabled={formSubmitting}
                        >
                          {editingId ? "Huỷ" : "Hủy"}
                        </Button>
                      </Space>
                    </Space>
                  </form>
                </Card>
              </Col>
            </Row>
          </Content>
        </Layout>
      </Layout>
    </>
  );
}
