import React, { useEffect, useMemo, useState } from "react";
import {
  Layout,
  Typography,
  Row,
  Col,
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  Table,
  Popconfirm,
  message,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";

import {
  createCountry,
  deleteCountry,
  getPagedCountries,
  updateCountry,
} from "../../services/countryService";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

const INITIAL_FORM = {
  name: "",
  code: "",
};

const SORT_OPTIONS = [
  { value: "name", label: "Tên quốc gia" },
  { value: "code", label: "Mã quốc gia" },
  { value: "movieCount", label: "Số phim liên kết" },
  { value: "id", label: "ID" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "used", label: "Đang sử dụng" },
  { value: "unused", label: "Chưa sử dụng" },
];

function normalizeCode(value) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, "").toUpperCase();
}

export default function CountryManagementPanelAntd() {
  const [msgApi, contextHolder] = message.useMessage();

  // bảng & filter
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState("");

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1]);
  const [totalCount, setTotalCount] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortDescending, setSortDescending] = useState(false);
  const [statusFilter, setStatusFilter] = useState(STATUS_OPTIONS[0].value);
  const [refreshKey, setRefreshKey] = useState(0);

  // form
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // ===== LOAD DATA =====
  useEffect(() => {
    const controller = new AbortController();
    let ignore = false;

    (async () => {
      try {
        setLoading(true);
        setListError("");
        const data = await getPagedCountries(
          {
            pageNumber,
            pageSize,
            searchTerm: searchTerm.trim(),
            sortBy,
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

        setCountries(items);
        setTotalCount(total);
      } catch (err) {
        if (ignore || controller.signal.aborted) return;
        console.error("Failed to load countries", err);
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Không thể tải danh sách quốc gia.";
        setListError(msg);
        setCountries([]);
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
  const displayedCountries = useMemo(() => {
    const items = Array.isArray(countries) ? [...countries] : [];
    if (statusFilter === "used") {
      return items.filter((c) => (c?.movieCount ?? 0) > 0);
    }
    if (statusFilter === "unused") {
      return items.filter((c) => (c?.movieCount ?? 0) === 0);
    }
    return items;
  }, [countries, statusFilter]);

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

  const onEdit = (country) => {
    setEditingId(country.id);
    form.setFieldsValue({
      name: country.name ?? "",
      code: country.code ?? "",
    });
  };

  const onDelete = async (country) => {
    try {
      await deleteCountry(country.id);
      msgApi.success(`Đã xóa quốc gia "${country.name}".`);
      // Nếu đang ở trang >1 mà chỉ còn 1 item, lùi lại 1 trang
      if (displayedCountries.length === 1 && pageNumber > 1) {
        setPageNumber((p) => Math.max(1, p - 1));
      } else {
        setRefreshKey((v) => v + 1);
      }
    } catch (err) {
      console.error("Failed to delete country", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Không thể xóa quốc gia. Vui lòng thử lại.";
      msgApi.error(msg);
    }
  };

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      const trimmedName = values.name.trim();
      const normalized = normalizeCode(values.code || "");

      const payload = {
        name: trimmedName,
        code: normalized || null,
      };

      setSubmitting(true);

      if (editingId == null) {
        await createCountry(payload);
        msgApi.success("Đã tạo quốc gia mới thành công.");
        setPageNumber(1);
      } else {
        await updateCountry(editingId, payload);
        msgApi.success("Đã cập nhật thông tin quốc gia.");
      }

      resetForm();
      setRefreshKey((v) => v + 1);
    } catch (err) {
      if (err?.errorFields) return; // lỗi validate form
      console.error("Failed to submit country form", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Không thể lưu quốc gia. Vui lòng thử lại.";
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
      width: 90,
      render: (v) => `#${v}`,
    },
    {
      title: "Tên quốc gia",
      dataIndex: "name",
      ellipsis: true,
    },
    {
      title: "Mã",
      dataIndex: "code",
      width: 120,
      render: (v) => v || "—",
    },
    {
      title: "Số phim",
      dataIndex: "movieCount",
      width: 120,
      render: (v) => v ?? 0,
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 160,
      render: (_, country) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => onEdit(country)}
            icon={<EditOutlined />}
          >
            Sửa
          </Button>
          <Popconfirm
            title={`Bạn có chắc chắn muốn xóa "${country.name}"?`}
            description='Các phim thuộc quốc gia này sẽ được chuyển sang "Unknown".'
            onConfirm={() => onDelete(country)}
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
                        Danh sách quốc gia
                      </Title>
                      <Text type="secondary">
                        Quản lý quốc gia được gắn với phim trong hệ thống.
                      </Text>
                    </Space>
                  }
                  extra={
                    <Space>
                      <Input
                        placeholder="Mã đơn, email, phim..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onPressEnter={handleSearchSubmit}
                        style={{
                          width: 300,
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
                            {/* Vạch ngăn cách */}
                            <div
                              style={{
                                width: 1,
                                height: 20,
                                backgroundColor: "#d9d9d9",
                              }}
                            />

                            {/* Icon kính lúp */}
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
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      marginBottom: 16,
                      flexWrap: "wrap", // nếu màn nhỏ thì tự xuống hàng
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
                      style={{ width: 150 }}
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
                    dataSource={displayedCountries}
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
                        `Hiển thị ${range[0]}-${range[1]} trong tổng số ${total} quốc gia`,
                    }}
                  />
                </Card>
              </Col>

              {/* FORM BÊN PHẢI */}
              <Col xs={24} xl={8} xxl={7}>
                <Card
                  title={
                    editingId == null
                      ? "Thêm quốc gia mới"
                      : "Cập nhật quốc gia"
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
                      label="Tên quốc gia *"
                      rules={[
                        {
                          required: true,
                          message: "Vui lòng nhập tên quốc gia.",
                        },
                      ]}
                    >
                      <Input
                        placeholder="Ví dụ: Việt Nam"
                        disabled={submitting}
                      />
                    </Form.Item>

                    <Form.Item
                      name="code"
                      label="Mã quốc gia (tùy chọn)"
                      extra="Mã sẽ được chuẩn hóa thành chữ in hoa và bỏ khoảng trắng khi lưu."
                    >
                      <Input
                        placeholder="Ví dụ: VN"
                        maxLength={10}
                        disabled={submitting}
                      />
                    </Form.Item>

                    <Space>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={submitting}
                      >
                        {editingId == null ? "Thêm quốc gia" : "Lưu thay đổi"}
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
