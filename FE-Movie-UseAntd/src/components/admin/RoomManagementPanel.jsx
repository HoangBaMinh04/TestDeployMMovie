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
  createRoom,
  deleteRoom,
  getPagedRooms,
  toggleRoomActive,
  updateRoom,
} from "../../services/roomService";
import { getCinemas } from "../../services/cinemaService";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
const SORT_OPTIONS = [
  { value: "name", label: "Tên phòng" },
  { value: "cinema", label: "Rạp chiếu" },
  { value: "seats", label: "Số ghế" },
];

const INITIAL_FORM = {
  cinemaId: undefined,
  name: "",
  rows: undefined,
  cols: undefined,
  isActive: true,
};

function buildErrorMessage(err, fallback) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  );
}

function formatSeatLayout(rows, cols) {
  const r = Number(rows);
  const c = Number(cols);
  if (!Number.isFinite(r) || !Number.isFinite(c)) return "-";
  return `${r} x ${c}`;
}

function toNumberOrNull(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function RoomManagementPanel() {
  const [msgApi, contextHolder] = message.useMessage();

  // data
  const [rooms, setRooms] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState("");

  // paging + filter
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1]);
  const [totalCount, setTotalCount] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [cinemaFilter, setCinemaFilter] = useState(undefined);
  const [sortBy, setSortBy] = useState(SORT_OPTIONS[0].value);
  const [sortDescending, setSortDescending] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // form
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // action loading (toggle / delete)
  const [busyAction, setBusyAction] = useState({ id: null, type: null });

  // ===== LOAD CINEMAS =====
  useEffect(() => {
    const controller = new AbortController();
    let ignore = false;

    (async () => {
      try {
        const data = await getCinemas({ signal: controller.signal });
        if (ignore) return;
        const items = Array.isArray(data) ? data : [];
        setCinemas(items);
      } catch (err) {
        if (ignore || controller.signal.aborted) return;
        console.error("Failed to load cinemas", err);
      }
    })();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, []);

  // ===== LOAD ROOMS =====
  useEffect(() => {
    const controller = new AbortController();
    let ignore = false;

    (async () => {
      try {
        setLoading(true);
        setListError("");

        const data = await getPagedRooms(
          {
            pageNumber,
            pageSize,
            searchTerm: searchTerm.trim(),
            sortBy,
            sortDescending,
            cinemaId: cinemaFilter,
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

        setRooms(items);
        setTotalCount(total);
      } catch (err) {
        if (ignore || controller.signal.aborted) return;
        console.error("Failed to load rooms", err);
        setRooms([]);
        setTotalCount(0);
        setListError(
          buildErrorMessage(err, "Không thể tải danh sách phòng chiếu.")
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
    searchTerm,
    cinemaFilter,
    sortBy,
    sortDescending,
    refreshKey,
  ]);

  // ===== DERIVED =====
  const paginationInfo = useMemo(() => {
    if (totalCount <= 0) return { start: 0, end: 0 };
    const start = (pageNumber - 1) * pageSize + 1;
    const end = Math.min(pageNumber * pageSize, totalCount);
    return { start, end };
  }, [pageNumber, pageSize, totalCount]);

  // ===== HANDLERS =====
  const handleSearchSubmit = () => {
    setSearchTerm(searchInput);
    setPageNumber(1);
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setSearchTerm("");
    setCinemaFilter(undefined);
    setSortBy(SORT_OPTIONS[0].value);
    setSortDescending(false);
    setPageSize(PAGE_SIZE_OPTIONS[1]);
    setPageNumber(1);
    setRefreshKey((v) => v + 1);
  };

  const handleCreateNew = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue(INITIAL_FORM);
  };

  const onEditRoom = (room) => {
    if (!room) return;
    setEditingId(room.id);
    form.setFieldsValue({
      cinemaId: room.cinemaId,
      name: room.name ?? "",
      rows:
        room.rows == null || Number.isNaN(Number(room.rows))
          ? undefined
          : Number(room.rows),
      cols:
        room.cols == null || Number.isNaN(Number(room.cols))
          ? undefined
          : Number(room.cols),
      isActive: room.isActive !== false,
    });
  };

  const onToggleActive = async (room) => {
    if (!room) return;
    setBusyAction({ id: room.id, type: "toggle" });
    try {
      await toggleRoomActive(room.id);
      msgApi.success(
        room.isActive
          ? "Đã khóa phòng chiếu thành công."
          : "Đã mở khóa phòng chiếu thành công."
      );
      setRefreshKey((v) => v + 1);
    } catch (err) {
      console.error("Failed to toggle room", err);
      msgApi.error(
        buildErrorMessage(err, "Không thể thay đổi trạng thái phòng.")
      );
    } finally {
      setBusyAction({ id: null, type: null });
    }
  };

  const onDeleteRoom = async (room) => {
    if (!room) return;
    setBusyAction({ id: room.id, type: "delete" });
    try {
      await deleteRoom(room.id);
      msgApi.success("Đã xóa phòng chiếu.");
      setRefreshKey((v) => v + 1);
    } catch (err) {
      console.error("Failed to delete room", err);
      msgApi.error(buildErrorMessage(err, "Không thể xóa phòng chiếu."));
    } finally {
      setBusyAction({ id: null, type: null });
    }
  };

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();

      const cinemaIdNumber = Number(values.cinemaId);
      const rowsNumber = Number(values.rows);
      const colsNumber = Number(values.cols);

      if (!Number.isFinite(cinemaIdNumber) || cinemaIdNumber <= 0) {
        msgApi.error("Vui lòng chọn rạp chiếu.");
        return;
      }
      if (!values.name?.trim()) {
        msgApi.error("Vui lòng nhập tên phòng chiếu.");
        return;
      }
      if (!Number.isFinite(rowsNumber) || rowsNumber < 1 || rowsNumber > 50) {
        msgApi.error("Số hàng ghế phải nằm trong khoảng 1 - 50.");
        return;
      }
      if (!Number.isFinite(colsNumber) || colsNumber < 1 || colsNumber > 50) {
        msgApi.error("Số ghế mỗi hàng phải nằm trong khoảng 1 - 50.");
        return;
      }

      const payloadBase = {
        cinemaId: cinemaIdNumber,
        name: values.name.trim(),
        rows: Math.round(rowsNumber),
        cols: Math.round(colsNumber),
      };

      setSubmitting(true);

      if (editingId != null) {
        await updateRoom(editingId, {
          ...payloadBase,
          isActive: Boolean(values.isActive),
        });
        msgApi.success("Cập nhật phòng chiếu thành công.");
      } else {
        await createRoom(payloadBase);
        msgApi.success("Tạo phòng chiếu mới thành công.");
      }

      setPageNumber(1);
      setRefreshKey((v) => v + 1);
      handleCreateNew();
    } catch (err) {
      if (err?.errorFields) return;
      console.error("Failed to submit room form", err);
      msgApi.error(buildErrorMessage(err, "Không thể lưu phòng chiếu."));
    } finally {
      setSubmitting(false);
    }
  };

  // ===== TABLE COLUMNS =====
  const columns = [
    {
      title: "Tên phòng",
      dataIndex: "name",
      ellipsis: true,
      render: (v) => v || "-",
    },
    {
      title: "Rạp chiếu",
      dataIndex: "cinemaName",
      ellipsis: true,
      render: (v) => v || "-",
    },
    {
      title: "Sơ đồ ghế",
      key: "layout",
      width: 140,
      render: (_, room) => formatSeatLayout(room.rows, room.cols),
    },
    {
      title: "Tổng ghế",
      dataIndex: "totalSeats",
      width: 120,
      render: (v, room) => {
        const total =
          Number.isFinite(v) && v != null
            ? v
            : Number(room.totalSeats) ||
              Number(room.rows) * Number(room.cols) ||
              0;
        return `${total} ghế`;
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      width: 140,
      render: (v) => (
        <Tag color={v ? "green" : "default"}>
          {v ? "Đang hoạt động" : "Đang khóa"}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 220,
      render: (_, room) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEditRoom(room)}
          >
            Sửa
          </Button>
          <Button
            type="link"
            size="small"
            danger={room.isActive}
            onClick={() => onToggleActive(room)}
            loading={busyAction.id === room.id && busyAction.type === "toggle"}
          >
            {room.isActive ? "Khóa" : "Mở khóa"}
          </Button>
          <Popconfirm
            title={`Bạn có chắc chắn muốn xóa phòng "${room.name}"?`}
            onConfirm={() => onDeleteRoom(room)}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={
                busyAction.id === room.id && busyAction.type === "delete"
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
                        Danh sách phòng chiếu
                      </Title>
                      <Text type="secondary">
                        Quản lý phòng chiếu trong hệ thống.
                      </Text>
                    </Space>
                  }
                  extra={
                    <Input
                      placeholder="Tìm theo tên phòng hoặc rạp..."
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
                    dataSource={rooms}
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
                        `Hiển thị ${range[0]}-${range[1]} trong tổng số ${total} phòng chiếu`,
                    }}
                  />
                </Card>
              </Col>

              {/* FORM BÊN PHẢI */}
              <Col xs={24} xl={8} xxl={7}>
                <Card
                  title={
                    editingId != null
                      ? "Chỉnh sửa phòng chiếu"
                      : "Thêm phòng chiếu"
                  }
                  extra={
                    <Button type="link" onClick={handleCreateNew}>
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
                    <Form.Item
                      name="cinemaId"
                      label="Rạp chiếu *"
                      rules={[
                        {
                          required: true,
                          message: "Vui lòng chọn rạp chiếu.",
                        },
                      ]}
                    >
                      <Select
                        placeholder="-- Chọn rạp chiếu --"
                        options={cinemas.map((c) => ({
                          value: c.id,
                          label: c.name,
                        }))}
                        disabled={submitting}
                      />
                    </Form.Item>

                    <Form.Item
                      name="name"
                      label="Tên phòng *"
                      rules={[
                        {
                          required: true,
                          message: "Vui lòng nhập tên phòng chiếu.",
                        },
                      ]}
                    >
                      <Input
                        placeholder="Ví dụ: Phòng 1, Deluxe A"
                        disabled={submitting}
                      />
                    </Form.Item>

                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item
                          name="rows"
                          label="Số hàng ghế *"
                          rules={[
                            {
                              required: true,
                              message: "Vui lòng nhập số hàng ghế.",
                            },
                          ]}
                        >
                          <InputNumber
                            style={{ width: "100%" }}
                            min={1}
                            max={50}
                            disabled={submitting}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name="cols"
                          label="Ghế mỗi hàng *"
                          rules={[
                            {
                              required: true,
                              message: "Vui lòng nhập số ghế mỗi hàng.",
                            },
                          ]}
                        >
                          <InputNumber
                            style={{ width: "100%" }}
                            min={1}
                            max={50}
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
                      <Switch disabled={submitting} />
                    </Form.Item>

                    <Space>
                      <Button
                        type="primary"
                        htmlType="submit"
                        icon={<PlusOutlined />}
                        loading={submitting}
                      >
                        {editingId != null ? "Cập nhật phòng" : "Tạo phòng"}
                      </Button>
                      <Button onClick={handleCreateNew} disabled={submitting}>
                        Hủy
                      </Button>
                    </Space>

                    <Text
                      type="secondary"
                      style={{ display: "block", marginTop: 8 }}
                    >
                      * Hệ thống sẽ tự động sinh ghế theo sơ đồ khi tạo mới
                      phòng.
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
