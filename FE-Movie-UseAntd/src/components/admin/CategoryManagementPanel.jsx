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
  Radio,
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
  createCategory,
  deleteCategory,
  getPagedCategories,
  updateCategory,
} from "../../services/categoryService";

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

const INITIAL_FORM = {
  name: "",
  slug: "",
  description: "",
};

const SORT_OPTIONS = [
  { value: "name", label: "Tên thể loại" },
  { value: "id", label: "ID" },
  { value: "movieCount", label: "Số phim liên kết" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "used", label: "Đang sử dụng" },
  { value: "unused", label: "Chưa sử dụng" },
];

function normalizeSlug(value) {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default function CategoryManagementPanelAntd() {
  const [msgApi, contextHolder] = message.useMessage();

  // bảng & filter
  const [categories, setCategories] = useState([]);
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

  // ===== LOAD DATA =====
  useEffect(() => {
    const controller = new AbortController();
    let ignore = false;

    (async () => {
      try {
        setLoading(true);
        setListError("");

        let apiSortBy = sortBy;
        if (sortBy === "movieCount") apiSortBy = "moviecount";

        const data = await getPagedCategories(
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

        setCategories(items);
        setTotalCount(total);
      } catch (err) {
        if (ignore || controller.signal.aborted) return;
        console.error("Failed to load categories", err);
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Không thể tải danh sách thể loại.";
        setListError(msg);
        setCategories([]);
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
  const displayedCategories = useMemo(() => {
    const items = Array.isArray(categories) ? [...categories] : [];
    if (statusFilter === "used") {
      return items.filter((c) => (c?.movieCount ?? 0) > 0);
    }
    if (statusFilter === "unused") {
      return items.filter((c) => (c?.movieCount ?? 0) === 0);
    }
    return items;
  }, [categories, statusFilter]);

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

  const onEdit = (category) => {
    setEditingId(category.id);
    form.setFieldsValue({
      name: category.name ?? "",
      slug: category.slug ?? "",
      description: category.description ?? "",
    });
  };

  const onDelete = async (category) => {
    try {
      await deleteCategory(category.id);
      msgApi.success(`Đã xóa thể loại "${category.name}".`);
      if (displayedCategories.length === 1 && pageNumber > 1) {
        setPageNumber((p) => Math.max(1, p - 1));
      } else {
        setRefreshKey((v) => v + 1);
      }
    } catch (err) {
      console.error("Failed to delete category", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Không thể xóa thể loại. Vui lòng thử lại.";
      msgApi.error(msg);
    }
  };

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      const trimmedName = values.name.trim();
      const normalizedSlug = normalizeSlug(values.slug || "");

      const payload = {
        name: trimmedName,
        slug: normalizedSlug || null,
        description: values.description?.trim() || null,
      };

      setSubmitting(true);

      if (editingId == null) {
        await createCategory(payload);
        msgApi.success("Đã tạo thể loại mới thành công.");
        setPageNumber(1);
      } else {
        await updateCategory(editingId, payload);
        msgApi.success("Đã cập nhật thông tin thể loại.");
      }

      resetForm();
      setRefreshKey((v) => v + 1);
    } catch (err) {
      if (err?.errorFields) return;
      console.error("Failed to submit category form", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Không thể lưu thể loại. Vui lòng thử lại.";
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
      width: 80,
      render: (v) => `#${v}`,
    },
    {
      title: "Tên thể loại",
      dataIndex: "name",
      ellipsis: true,
    },
    {
      title: "Slug",
      dataIndex: "slug",
      width: 180,
      ellipsis: true,
      render: (v) => v || "—",
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      ellipsis: true,
      render: (v) => v || "—",
    },
    {
      title: "Số phim",
      dataIndex: "movieCount",
      width: 100,
      render: (v) => v ?? 0,
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 170,
      render: (_, category) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(category)}
          >
            Sửa
          </Button>
          <Popconfirm
            title={`Bạn có chắc chắn muốn xóa "${category.name}"?`}
            description="Các liên kết phim thuộc thể loại này sẽ bị xoá."
            onConfirm={() => onDelete(category)}
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
                        Danh sách thể loại
                      </Title>
                      <Text type="secondary">
                        Quản lý thể loại được gắn với phim trong hệ thống.
                      </Text>
                    </Space>
                  }
                  extra={
                    <Input
                      placeholder="Tìm theo tên, slug hoặc mô tả..."
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
                    dataSource={displayedCategories}
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
                        `Hiển thị ${range[0]}-${range[1]} trong tổng số ${total} thể loại`,
                    }}
                  />
                </Card>
              </Col>

              {/* FORM BÊN PHẢI */}
              <Col xs={24} xl={8} xxl={7}>
                <Card
                  title={
                    editingId == null
                      ? "Thêm thể loại mới"
                      : "Cập nhật thể loại"
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
                      label="Tên thể loại *"
                      rules={[
                        {
                          required: true,
                          message: "Vui lòng nhập tên thể loại.",
                        },
                      ]}
                    >
                      <Input
                        placeholder="Ví dụ: Hành động"
                        disabled={submitting}
                      />
                    </Form.Item>

                    <Form.Item
                      name="slug"
                      label="Slug (tùy chọn)"
                      extra="Nếu để trống, hệ thống sẽ tự sinh slug từ tên. Khi lưu sẽ được chuẩn hoá nhẹ."
                    >
                      <Input
                        placeholder="ví dụ: hanh-dong"
                        disabled={submitting}
                        onBlur={(e) => {
                          const normalized = normalizeSlug(e.target.value);
                          form.setFieldValue("slug", normalized);
                        }}
                      />
                    </Form.Item>

                    <Form.Item name="description" label="Mô tả">
                      <TextArea
                        rows={3}
                        placeholder="Mô tả ngắn về thể loại..."
                        disabled={submitting}
                      />
                    </Form.Item>

                    <Space>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={submitting}
                      >
                        {editingId == null ? "Thêm thể loại" : "Lưu thay đổi"}
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
