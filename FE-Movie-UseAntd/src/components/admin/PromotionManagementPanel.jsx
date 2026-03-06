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
  message,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";

import {
  createPromotion,
  deletePromotion,
  getPagedPromotions,
  togglePromotionActive,
  updatePromotion,
} from "../../services/promotionService";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

const SORT_OPTIONS = [
  { value: "name", label: "Tên khuyến mãi" },
  { value: "code", label: "Mã khuyến mãi" },
  { value: "validfrom", label: "Ngày bắt đầu" },
  { value: "validto", label: "Ngày kết thúc" },
  { value: "usage", label: "Lượt sử dụng" },
];

const DISCOUNT_TYPES = [
  { key: "percentage", label: "Giảm theo phần trăm", enumValue: 0 },
  { key: "fixed", label: "Giảm theo số tiền", enumValue: 1 },
];

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 0,
});

const INITIAL_FORM = {
  code: "",
  name: "",
  description: "",
  type: DISCOUNT_TYPES[0].key,
  value: null,
  maxDiscountAmount: null,
  minOrderAmount: null,
  validFrom: "",
  validTo: "",
  maxUsage: null,
  maxUsagePerUser: null,
  isActive: true,
};

function formatCurrency(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return currencyFormatter.format(0);
  return currencyFormatter.format(Math.max(0, numeric));
}

function formatNumber(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return numberFormatter.format(0);
  return numberFormatter.format(Math.max(0, numeric));
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("vi-VN");
}

function toDateTimeLocalValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
}

function toIsoString(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function resolveDiscountKey(type) {
  if (type === 1) return "fixed";

  if (typeof type === "string") {
    const normalized = type.trim().toLowerCase();
    if (!normalized) return "percentage";
    if (normalized.includes("fixed")) return "fixed";
    return "percentage";
  }

  return "percentage";
}

function resolveDiscountEnum(key) {
  if (key === 1) return DISCOUNT_TYPES[1].enumValue;

  if (typeof key === "string") {
    const normalized = key.trim().toLowerCase();
    if (!normalized) return DISCOUNT_TYPES[0].enumValue;
    if (normalized === "1" || normalized.includes("fixed")) {
      return DISCOUNT_TYPES[1].enumValue;
    }
    return DISCOUNT_TYPES[0].enumValue;
  }

  return DISCOUNT_TYPES[0].enumValue;
}

function parseInteger(value) {
  if (value === "" || value == null) return null;
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, numeric);
}

function parseNumber(value) {
  if (value === "" || value == null) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return numeric;
}

export default function PromotionManagementPanel() {
  const [msgApi, contextHolder] = message.useMessage();

  // bảng & filter
  const [promotions, setPromotions] = useState([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState(SORT_OPTIONS[0].value);
  const [sortDescending, setSortDescending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // form
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [actionBusyId, setActionBusyId] = useState(null);

  const trimmedSearchTerm = useMemo(() => searchTerm.trim(), [searchTerm]);

  const isEditing = editingId != null;

  // ===== LOAD PROMOTIONS =====
  useEffect(() => {
    const controller = new AbortController();
    let ignore = false;

    (async () => {
      setLoading(true);
      setListError("");

      const isActive =
        statusFilter === "all"
          ? null
          : statusFilter === "active"
          ? true
          : false;

      try {
        const data = await getPagedPromotions(
          {
            pageNumber,
            pageSize,
            searchTerm: trimmedSearchTerm,
            sortBy,
            sortDescending,
            isActive,
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
          ? Number(data.totalCount)
          : Number(data?.TotalCount) || 0;

        if (pageNumber > 1 && items.length === 0 && total > 0) {
          setLoading(false);
          setPageNumber((value) => Math.max(1, value - 1));
          return;
        }

        setPromotions(items);
        setTotalCount(total);
      } catch (error) {
        if (ignore || controller.signal.aborted) return;
        console.error("Failed to load promotions", error);
        const msg =
          error?.response?.data?.message ||
          error?.response?.data?.errorMessage ||
          error?.response?.data ||
          error?.message ||
          "Không thể tải danh sách phiếu giảm giá.";
        setPromotions([]);
        setTotalCount(0);
        setListError(msg);
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
    statusFilter,
    sortBy,
    sortDescending,
    refreshKey,
  ]);

  // ===== FILTER HANDLERS =====
  const handleSearchSubmit = () => {
    setSearchTerm(searchInput);
    setPageNumber(1);
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setSearchTerm("");
    setStatusFilter("all");
    setSortBy(SORT_OPTIONS[0].value);
    setSortDescending(false);
    setPageSize(PAGE_SIZE_OPTIONS[1]);
    setPageNumber(1);
    setRefreshKey((v) => v + 1);
  };

  // ===== FORM HELPERS =====
  const resetForm = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue(INITIAL_FORM);
  };

  const handleEditPromotion = (promotion) => {
    if (!promotion) return;
    setEditingId(promotion.id);

    form.setFieldsValue({
      code: promotion.code ?? "",
      name: promotion.name ?? "",
      description: promotion.description ?? "",
      type: resolveDiscountKey(promotion.type),
      value:
        promotion.value == null || Number.isNaN(Number(promotion.value))
          ? null
          : Number(promotion.value),
      maxDiscountAmount:
        promotion.maxDiscountAmount == null ||
        Number.isNaN(Number(promotion.maxDiscountAmount))
          ? null
          : Number(promotion.maxDiscountAmount),
      minOrderAmount:
        promotion.minOrderAmount == null ||
        Number.isNaN(Number(promotion.minOrderAmount))
          ? null
          : Number(promotion.minOrderAmount),
      validFrom: toDateTimeLocalValue(promotion.validFrom),
      validTo: toDateTimeLocalValue(promotion.validTo),
      maxUsage:
        promotion.maxUsage == null || Number.isNaN(Number(promotion.maxUsage))
          ? null
          : Number(promotion.maxUsage),
      maxUsagePerUser:
        promotion.maxUsagePerUser == null ||
        Number.isNaN(Number(promotion.maxUsagePerUser))
          ? null
          : Number(promotion.maxUsagePerUser),
      isActive: Boolean(promotion.isActive),
    });
  };

  // ===== FORM SUBMIT =====
  const onSubmit = async () => {
    try {
      const values = await form.validateFields();

      const trimmedCode = (values.code || "").trim();
      const trimmedName = (values.name || "").trim();
      const trimmedDescription = (values.description || "").trim();

      if (!trimmedCode) {
        msgApi.error("Vui lòng nhập mã phiếu giảm giá.");
        return;
      }
      if (!trimmedName) {
        msgApi.error("Vui lòng nhập tên phiếu giảm giá.");
        return;
      }

      if (!values.validFrom || !values.validTo) {
        msgApi.error("Vui lòng chọn thời gian áp dụng.");
        return;
      }

      const validFromIso = toIsoString(values.validFrom);
      const validToIso = toIsoString(values.validTo);

      if (!validFromIso || !validToIso) {
        msgApi.error("Thời gian áp dụng không hợp lệ.");
        return;
      }

      if (new Date(validFromIso) >= new Date(validToIso)) {
        msgApi.error("Ngày bắt đầu phải trước ngày kết thúc.");
        return;
      }

      const discountTypeKey = values.type || DISCOUNT_TYPES[0].key;
      const discountEnum = resolveDiscountEnum(discountTypeKey);

      const numericValue = Number(values.value);
      if (!Number.isFinite(numericValue) || numericValue <= 0) {
        msgApi.error("Giá trị giảm giá phải lớn hơn 0.");
        return;
      }

      if (
        discountTypeKey === "percentage" &&
        (numericValue <= 0 || numericValue > 100)
      ) {
        msgApi.error("Mức giảm theo phần trăm phải nằm trong khoảng 0 - 100.");
        return;
      }

      const normalizedCode = trimmedCode.toUpperCase();

      const payload = {
        code: normalizedCode,
        name: trimmedName,
        description: trimmedDescription || null,
        type: discountEnum,
        value: numericValue,
        maxDiscountAmount: parseNumber(values.maxDiscountAmount),
        minOrderAmount: parseNumber(values.minOrderAmount),
        validFrom: validFromIso,
        validTo: validToIso,
        maxUsage: parseInteger(values.maxUsage),
        maxUsagePerUser: parseInteger(values.maxUsagePerUser),
      };

      if (isEditing) {
        payload.isActive = values.isActive !== false;
      }

      setFormSubmitting(true);

      if (isEditing) {
        await updatePromotion(editingId, payload);
        msgApi.success(`Đã cập nhật phiếu giảm giá ${normalizedCode}.`);
      } else {
        await createPromotion(payload);
        msgApi.success(`Đã tạo phiếu giảm giá ${normalizedCode}.`);
      }

      setRefreshKey((v) => v + 1);
      resetForm();
    } catch (error) {
      if (error?.errorFields) return;
      console.error("Failed to save promotion", error);
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.errorMessage ||
        error?.response?.data ||
        error?.message ||
        "Không lưu được phiếu giảm giá.";
      msgApi.error(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  // ===== ACTIONS =====
  const handleDeletePromotion = async (promotion) => {
    if (!promotion) return;
    setActionBusyId(promotion.id);
    setListError("");

    try {
      await deletePromotion(promotion.id);
      msgApi.success(`Đã xoá phiếu giảm giá ${promotion.code}.`);
      setRefreshKey((value) => value + 1);
      if (editingId === promotion.id) {
        resetForm();
      }
    } catch (error) {
      console.error("Failed to delete promotion", error);
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.errorMessage ||
        error?.response?.data ||
        error?.message ||
        "Không xoá được phiếu giảm giá.";
      msgApi.error(msg);
    } finally {
      setActionBusyId(null);
    }
  };

  const handleToggleStatus = async (promotion) => {
    if (!promotion) return;
    setActionBusyId(promotion.id);
    setListError("");

    try {
      await togglePromotionActive(promotion.id);
      msgApi.success(
        promotion.isActive
          ? `Đã tạm dừng mã ${promotion.code}.`
          : `Đã kích hoạt mã ${promotion.code}.`
      );
      setRefreshKey((value) => value + 1);
    } catch (error) {
      console.error("Failed to toggle promotion", error);
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.errorMessage ||
        error?.response?.data ||
        error?.message ||
        "Không thay đổi được trạng thái phiếu giảm giá.";
      msgApi.error(msg);
    } finally {
      setActionBusyId(null);
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
      title: "Mã & tên",
      key: "codeName",
      render: (_, promotion) => (
        <div>
          <div style={{ fontWeight: 600 }}>{promotion.code}</div>
          <div>{promotion.name}</div>
          {promotion.description && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {promotion.description}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: "Loại & giá trị",
      key: "typeValue",
      render: (_, promotion) => {
        const discountKey = resolveDiscountKey(promotion.type);
        const typeLabel =
          DISCOUNT_TYPES.find((item) => item.key === discountKey)?.label || "-";

        return (
          <div>
            <Tag color={discountKey === "percentage" ? "blue" : "geekblue"}>
              {typeLabel}
            </Tag>
            <div>
              {discountKey === "percentage"
                ? `${Number(promotion.value ?? 0)}%`
                : formatCurrency(promotion.value)}
            </div>
            {promotion.maxDiscountAmount != null && (
              <Text type="secondary" style={{ display: "block", fontSize: 12 }}>
                Tối đa: {formatCurrency(promotion.maxDiscountAmount)}
              </Text>
            )}
            {promotion.minOrderAmount != null && (
              <Text type="secondary" style={{ display: "block", fontSize: 12 }}>
                Đơn tối thiểu: {formatCurrency(promotion.minOrderAmount)}
              </Text>
            )}
          </div>
        );
      },
    },
    {
      title: "Thời gian áp dụng",
      key: "dateRange",
      render: (_, promotion) => (
        <div>
          <div>{formatDateTime(promotion.validFrom)}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            đến {formatDateTime(promotion.validTo)}
          </Text>
        </div>
      ),
    },
    {
      title: "Lượt sử dụng",
      key: "usage",
      render: (_, promotion) => {
        const usageLimit =
          promotion.maxUsage == null
            ? "Không giới hạn"
            : `${formatNumber(promotion.currentUsage)}/${formatNumber(
                promotion.maxUsage
              )}`;
        const perUserLimit =
          promotion.maxUsagePerUser == null
            ? null
            : `${formatNumber(promotion.maxUsagePerUser)} lần/người`;

        return (
          <div>
            <div>{usageLimit}</div>
            {perUserLimit && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {perUserLimit}
              </Text>
            )}
          </div>
        );
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      width: 140,
      render: (v) => (
        <Tag color={v ? "green" : "default"}>
          {v ? "Đang hoạt động" : "Đã tắt"}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 210,
      render: (_, promotion) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditPromotion(promotion)}
            disabled={actionBusyId === promotion.id}
          >
            Sửa
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => handleToggleStatus(promotion)}
            disabled={actionBusyId === promotion.id}
          >
            {promotion.isActive ? "Tạm dừng" : "Kích hoạt"}
          </Button>
          <Popconfirm
            title={`Bạn có chắc muốn xoá mã giảm giá "${promotion.code}"?`}
            onConfirm={() => handleDeletePromotion(promotion)}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={actionBusyId === promotion.id}
            >
              Xoá
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
                        Danh sách phiếu giảm giá
                      </Title>
                      <Text type="secondary">
                        Theo dõi mã khuyến mãi và trạng thái sử dụng.
                      </Text>
                    </Space>
                  }
                  extra={
                    <Input
                      placeholder="Tìm theo mã hoặc tên..."
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
                          {/* icon kính lúp */}
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
                    <span>Trạng thái:</span>
                    <Select
                      style={{ width: 170 }}
                      value={statusFilter}
                      onChange={(v) => {
                        setStatusFilter(v);
                        setPageNumber(1);
                      }}
                      options={[
                        { value: "all", label: "Tất cả" },
                        { value: "active", label: "Đang hoạt động" },
                        { value: "inactive", label: "Đã tắt" },
                      ]}
                    />

                    <span>Sắp xếp theo:</span>
                    <Select
                      style={{ width: 170 }}
                      value={sortBy}
                      onChange={(v) => {
                        setSortBy(v);
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

                    <span>Hiển thị:</span>
                    <Select
                      style={{ width: 120 }}
                      value={pageSize}
                      onChange={(v) => {
                        setPageSize(v);
                        setPageNumber(1);
                      }}
                      options={PAGE_SIZE_OPTIONS.map((size) => ({
                        value: size,
                        label: `${size} / trang`,
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
                    dataSource={promotions}
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
                        `Hiển thị ${range[0]}-${range[1]} trong tổng số ${total} phiếu giảm giá`,
                    }}
                    locale={{
                      emptyText: "Không tìm thấy phiếu giảm giá phù hợp.",
                    }}
                  />
                </Card>
              </Col>

              {/* FORM BÊN PHẢI */}
              <Col xs={24} xl={8} xxl={7}>
                <Card
                  title={
                    isEditing
                      ? "Chỉnh sửa phiếu giảm giá"
                      : "Tạo phiếu giảm giá"
                  }
                  extra={
                    isEditing ? (
                      <Button type="link" onClick={resetForm}>
                        Huỷ chỉnh sửa
                      </Button>
                    ) : null
                  }
                >
                  <Form
                    form={form}
                    layout="vertical"
                    initialValues={INITIAL_FORM}
                    onFinish={onSubmit}
                  >
                    <Form.Item
                      name="code"
                      label="Mã phiếu giảm giá"
                      rules={[
                        { required: true, message: "Vui lòng nhập mã phiếu." },
                      ]}
                    >
                      <Input
                        placeholder="VD: SUMMER2025"
                        disabled={formSubmitting}
                      />
                    </Form.Item>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Mã duy nhất, sẽ được tự động chuyển thành chữ in hoa khi
                      lưu.
                    </Text>

                    <Form.Item
                      name="name"
                      label="Tên khuyến mãi"
                      rules={[
                        {
                          required: true,
                          message: "Vui lòng nhập tên phiếu giảm giá.",
                        },
                      ]}
                    >
                      <Input
                        placeholder="VD: Ưu đãi khách hàng mới"
                        disabled={formSubmitting}
                      />
                    </Form.Item>

                    <Form.Item name="description" label="Mô tả">
                      <Input.TextArea
                        rows={3}
                        placeholder="Mô tả chi tiết điều kiện áp dụng"
                        disabled={formSubmitting}
                      />
                    </Form.Item>

                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item
                          name="type"
                          label="Loại giảm giá"
                          rules={[{ required: true }]}
                        >
                          <Select
                            disabled={formSubmitting}
                            options={DISCOUNT_TYPES.map((option) => ({
                              value: option.key,
                              label: option.label,
                            }))}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name="value"
                          label="Giá trị"
                          rules={[
                            {
                              required: true,
                              message: "Vui lòng nhập giá trị giảm.",
                            },
                          ]}
                        >
                          <InputNumber
                            style={{ width: "100%" }}
                            min={0}
                            step={0.01}
                            disabled={formSubmitting}
                            placeholder="VD: 10 hoặc 50000"
                          />
                        </Form.Item>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Nếu là phần trăm: 0 - 100.
                        </Text>
                      </Col>
                    </Row>

                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item
                          name="maxDiscountAmount"
                          label="Giảm tối đa (VND)"
                        >
                          <InputNumber
                            style={{ width: "100%" }}
                            min={0}
                            step={1000}
                            placeholder="Không giới hạn"
                            disabled={formSubmitting}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name="minOrderAmount"
                          label="Đơn tối thiểu (VND)"
                        >
                          <InputNumber
                            style={{ width: "100%" }}
                            min={0}
                            step={1000}
                            placeholder="Không giới hạn"
                            disabled={formSubmitting}
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item
                          name="validFrom"
                          label="Ngày bắt đầu"
                          rules={[
                            {
                              required: true,
                              message: "Vui lòng chọn ngày bắt đầu.",
                            },
                          ]}
                        >
                          <Input
                            type="datetime-local"
                            disabled={formSubmitting}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name="validTo"
                          label="Ngày kết thúc"
                          rules={[
                            {
                              required: true,
                              message: "Vui lòng chọn ngày kết thúc.",
                            },
                          ]}
                        >
                          <Input
                            type="datetime-local"
                            disabled={formSubmitting}
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item name="maxUsage" label="Tổng số lượt sử dụng">
                          <InputNumber
                            style={{ width: "100%" }}
                            min={0}
                            step={1}
                            placeholder="Không giới hạn"
                            disabled={formSubmitting}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name="maxUsagePerUser"
                          label="Lượt mỗi người"
                        >
                          <InputNumber
                            style={{ width: "100%" }}
                            min={0}
                            step={1}
                            placeholder="Không giới hạn"
                            disabled={formSubmitting}
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    {isEditing && (
                      <Form.Item
                        name="isActive"
                        label="Kích hoạt mã sau khi lưu"
                        valuePropName="checked"
                      >
                        <Switch disabled={formSubmitting} />
                      </Form.Item>
                    )}

                    <Space>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={formSubmitting}
                      >
                        {isEditing ? "Cập nhật" : "Thêm phiếu giảm gi"}
                      </Button>
                      <Button onClick={resetForm} disabled={formSubmitting}>
                        Huỷ
                      </Button>
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
