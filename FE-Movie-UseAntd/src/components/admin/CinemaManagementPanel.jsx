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
  Popconfirm,
  Switch,
  Tag,
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
  createCinema,
  deleteCinema,
  getPagedCinemas,
  updateCinema,
} from "../../services/cinemaService";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

const INITIAL_FORM = {
  name: "",
  code: "",
  address: "",
  phoneNumber: "",
  latitude: "",
  longitude: "",
  isActive: true,
};

const SORT_OPTIONS = [
  { value: "name", label: "Tên rạp" },
  { value: "id", label: "ID" },
  { value: "roomCount", label: "Số phòng" },
  { value: "code", label: "Mã rạp" },
  { value: "address", label: "Địa chỉ" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Đang hoạt động" },
  { value: "inactive", label: "Ngưng hoạt động" },
];

function normalizeCode(value) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, "").toUpperCase();
}

function toNumberOrNull(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function CinemaManagementPanel() {
  const [msgApi, contextHolder] = message.useMessage();

  // bảng & filter
  const [cinemas, setCinemas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState("");

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1]);
  const [totalCount, setTotalCount] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortDescending, setSortDescending] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // form
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  // ===== LOAD DATA (server-side paging) =====
  useEffect(() => {
    const controller = new AbortController();
    let ignore = false;

    (async () => {
      try {
        setLoading(true);
        setListError("");

        // map FE sortBy to BE keys
        let apiSortBy = sortBy;
        if (sortBy === "roomCount") apiSortBy = "roomcount"; // BE expects "roomcount"
        if (sortBy === "code") apiSortBy = "name"; // fallback nếu BE không sort theo code

        const data = await getPagedCinemas(
          {
            pageNumber,
            pageSize,
            searchTerm: searchTerm.trim(),
            sortBy: apiSortBy,
            sortDescending,
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

        setCinemas(items);
        setTotalCount(total);
      } catch (err) {
        if (ignore || controller.signal.aborted) return;
        console.error("Failed to load cinemas", err);
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Không thể tải danh sách rạp chiếu phim.";
        setListError(msg);
        setCinemas([]);
        setTotalCount(0);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [pageNumber, pageSize, searchTerm, sortBy, sortDescending, refreshKey]);

  // ===== DERIVED DATA =====
  const displayedCinemas = useMemo(() => {
    const items = Array.isArray(cinemas) ? [...cinemas] : [];
    if (statusFilter === "active") {
      return items.filter((c) => c?.isActive !== false);
    }
    if (statusFilter === "inactive") {
      return items.filter((c) => c?.isActive === false);
    }
    return items;
  }, [cinemas, statusFilter]);

  // ===== HANDLERS =====
  const handleSearchSubmit = () => {
    setSearchTerm(searchInput.trim());
    setPageNumber(1);
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setSearchTerm("");
    setStatusFilter("all");
    setSortBy("name");
    setSortDescending(false);
    setPageSize(PAGE_SIZE_OPTIONS[1]);
    setPageNumber(1);
    setRefreshKey((v) => v + 1);
  };

  const resetForm = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue(INITIAL_FORM);
  };

  const onEdit = (cinema) => {
    setEditingId(cinema.id);
    form.setFieldsValue({
      name: cinema.name ?? "",
      code: cinema.code ?? "",
      address: cinema.address ?? "",
      phoneNumber: cinema.phoneNumber ?? "",
      latitude: cinema.latitude ?? "",
      longitude: cinema.longitude ?? "",
      isActive: cinema.isActive !== false,
    });
  };

  const onDelete = async (cinema) => {
    try {
      await deleteCinema(cinema.id);
      msgApi.success(`Đã xóa rạp chiếu phim "${cinema.name}".`);
      if (displayedCinemas.length === 1 && pageNumber > 1) {
        setPageNumber((p) => Math.max(1, p - 1));
      } else {
        setRefreshKey((v) => v + 1);
      }
    } catch (err) {
      console.error("Failed to delete cinema", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Không thể xóa rạp chiếu phim. Vui lòng thử lại.";
      msgApi.error(msg);
    }
  };

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();

      const trimmedName = values.name.trim();
      const normalizedCode = normalizeCode(values.code || "");

      const payload = {
        name: trimmedName,
        code: normalizedCode || null,
        address: values.address?.trim() || null,
        phoneNumber: values.phoneNumber?.trim() || null,
        latitude: toNumberOrNull(values.latitude),
        longitude: toNumberOrNull(values.longitude),
        isActive: Boolean(values.isActive),
      };

      setSubmitting(true);

      if (editingId == null) {
        await createCinema(payload);
        msgApi.success("Đã tạo rạp chiếu phim mới thành công.");
        setPageNumber(1);
      } else {
        await updateCinema(editingId, payload);
        msgApi.success("Đã cập nhật thông tin rạp chiếu phim.");
      }

      resetForm();
      setRefreshKey((v) => v + 1);
    } catch (err) {
      if (err?.errorFields) return; // lỗi validate form
      console.error("Failed to submit cinema form", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Không thể lưu rạp chiếu phim. Vui lòng thử lại.";
      msgApi.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ===== TABLE COLUMNS =====
  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      width: 70,
      render: (v) => `#${v}`,
    },
    {
      title: "Tên rạp",
      dataIndex: "name",
      ellipsis: true,
    },
    {
      title: "Số phòng",
      dataIndex: "roomCount",
      width: 100,
      render: (v) => v ?? 0,
    },
    {
      title: "Địa chỉ",
      dataIndex: "address",
      ellipsis: true,
      render: (v) => v || "—",
    },
    {
      title: "Điện thoại",
      dataIndex: "phoneNumber",
      width: 140,
      render: (v) => v || "—",
    },
    {
      title: "Active",
      dataIndex: "isActive",
      width: 100,
      render: (v) => (
        <Tag color={v ? "green" : "default"}>{v ? "Yes" : "No"}</Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 170,
      render: (_, cinema) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(cinema)}
          >
            Sửa
          </Button>
          <Popconfirm
            title={`Bạn có chắc chắn muốn xóa "${cinema.name}"?`}
            description="Rạp sẽ bị vô hiệu hoá và ẩn khỏi hệ thống."
            onConfirm={() => onDelete(cinema)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
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
                        Danh sách rạp chiếu phim
                      </Title>
                      <Text type="secondary">
                        Quản lý rạp chiếu phim trong hệ thống.
                      </Text>
                    </Space>
                  }
                  extra={
                    <Input
                      placeholder="Tìm theo tên, mã hoặc địa chỉ..."
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
                    <span>Trạng thái:</span>
                    <Select
                      style={{ width: 150 }}
                      value={statusFilter}
                      onChange={setStatusFilter}
                      options={STATUS_OPTIONS}
                    />

                    <span>Sắp xếp theo:</span>
                    <Select
                      style={{ width: 160 }}
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
                    dataSource={displayedCinemas}
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
                        `Hiển thị ${range[0]}-${range[1]} trong tổng số ${total} rạp chiếu phim`,
                    }}
                  />
                </Card>
              </Col>

              {/* FORM BÊN PHẢI */}
              <Col xs={24} xl={8} xxl={7}>
                <Card
                  title={
                    editingId == null
                      ? "Thêm rạp chiếu phim mới"
                      : "Cập nhật rạp chiếu phim"
                  }
                >
                  <Form
                    form={form}
                    layout="vertical"
                    initialValues={INITIAL_FORM}
                    onFinish={onSubmit}
                  >
                    <Form.Item
                      name="name"
                      label="Tên rạp chiếu phim *"
                      rules={[
                        {
                          required: true,
                          message: "Vui lòng nhập tên rạp chiếu phim.",
                        },
                      ]}
                    >
                      <Input
                        placeholder="Ví dụ: CGV Vincom"
                        disabled={submitting}
                      />
                    </Form.Item>

                    <Form.Item
                      name="code"
                      label="Mã rạp (tùy chọn)"
                      extra="Mã sẽ được chuẩn hóa thành chữ in hoa và bỏ khoảng trắng khi lưu."
                    >
                      <Input
                        placeholder="Ví dụ: CGV_VINCOM"
                        disabled={submitting}
                      />
                    </Form.Item>

                    <Form.Item name="address" label="Địa chỉ">
                      <Input
                        placeholder="Số nhà, đường, quận/huyện, tỉnh/thành"
                        disabled={submitting}
                      />
                    </Form.Item>

                    <Form.Item name="phoneNumber" label="Số điện thoại">
                      <Input
                        placeholder="Ví dụ: 028-xxxxxxx"
                        disabled={submitting}
                      />
                    </Form.Item>

                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item
                          name="latitude"
                          label="Vĩ độ (Latitude)"
                          normalize={(v) => v}
                        >
                          <InputNumber
                            style={{ width: "100%" }}
                            placeholder="10.762622"
                            step={0.000001}
                            stringMode
                            disabled={submitting}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name="longitude"
                          label="Kinh độ (Longitude)"
                          normalize={(v) => v}
                        >
                          <InputNumber
                            style={{ width: "100%" }}
                            placeholder="106.660172"
                            step={0.000001}
                            stringMode
                            disabled={submitting}
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item
                      name="isActive"
                      label="Đang hoạt động"
                      valuePropName="checked"
                    >
                      <Switch />
                    </Form.Item>

                    <Space>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={submitting}
                      >
                        {editingId == null
                          ? "Thêm rạp chiếu phim"
                          : "Lưu thay đổi"}
                      </Button>
                      <Button onClick={resetForm} disabled={submitting}>
                        Hủy
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
