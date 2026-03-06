import React, { useEffect, useMemo, useState } from "react";
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
  Modal,
  Form,
  Switch,
  message,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  LockOutlined,
  UnlockOutlined,
} from "@ant-design/icons";

import {
  createUser,
  getPagedUsers,
  getUserDetail,
  setUserStatus,
  updateUser,
} from "../../services/userManagementService";

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const SORT_OPTIONS = [
  { value: "createdAt", label: "Ngày tạo" },
  { value: "email", label: "Email" },
  { value: "fullName", label: "Họ tên" },
  { value: "isActive", label: "Trạng thái" },
];
const STATUS_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Đang hoạt động" },
  { value: "inactive", label: "Bị khóa" },
];

function parseRoles(text) {
  if (typeof text !== "string") return [];
  const parts = text
    .split(/[\n,]/)
    .map((part) => part.trim())
    .filter(Boolean);
  return Array.from(new Set(parts));
}

function formatDate(date) {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    if (typeof date === "string" && date.length >= 10) return date.slice(0, 10);
    return "";
  }
  return parsed.toLocaleDateString("vi-VN");
}

function formatDateTime(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    if (typeof value === "string") return value;
    return "";
  }
  return parsed.toLocaleString("vi-VN");
}

function toDateInputValue(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const tzOffset = parsed.getTimezoneOffset() * 60000;
  return new Date(parsed.getTime() - tzOffset).toISOString().slice(0, 10);
}

function buildErrorMessage(err, fallback) {
  return (
    err?.response?.data?.error ||
    err?.response?.data?.message ||
    err?.message ||
    fallback
  );
}

function UserRoles({ roles }) {
  if (!roles?.length) {
    return <Tag>Chưa gán</Tag>;
  }
  return roles.map((role) => (
    <Tag key={role} color="blue">
      {role}
    </Tag>
  ));
}

export default function UserManagementPanel() {
  const [msgApi, contextHolder] = message.useMessage();

  // list & filters
  const [users, setUsers] = useState([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [totalCount, setTotalCount] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDescending, setSortDescending] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // detail
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);

  // create
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [createForm] = Form.useForm();

  // edit
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editForm] = Form.useForm();
  const [updatingUser, setUpdatingUser] = useState(false);
  const [editError, setEditError] = useState("");

  // ===== AUTO HIDE SUCCESS =====
  useEffect(() => {
    if (!totalCount && !listError) return;
  }, [totalCount, listError]);

  // ===== LOAD USERS =====
  useEffect(() => {
    const controller = new AbortController();
    let ignore = false;

    async function loadUsers() {
      setLoadingList(true);
      setListError("");

      try {
        const params = {
          pageNumber,
          pageSize,
          searchTerm: searchTerm.trim(),
          sortBy,
          sortDescending,
        };

        if (statusFilter === "active") params.isActive = true;
        else if (statusFilter === "inactive") params.isActive = false;

        if (roleFilter) params.role = roleFilter;

        const data = await getPagedUsers(params, { signal: controller.signal });

        if (ignore) return;

        const items = Array.isArray(data?.items) ? data.items : [];
        const total = Number.isFinite(data?.totalCount) ? data.totalCount : 0;

        if (pageNumber > 1 && items.length === 0 && total > 0) {
          setLoadingList(false);
          setPageNumber((v) => Math.max(1, v - 1));
          return;
        }

        setUsers(items);
        setTotalCount(total);
      } catch (err) {
        if (ignore || controller.signal.aborted) return;
        console.error("Failed to load users", err);
        setListError(
          buildErrorMessage(
            err,
            "Không thể tải danh sách người dùng. Vui lòng thử lại sau."
          )
        );
        setUsers([]);
        setTotalCount(0);
      } finally {
        if (!ignore) setLoadingList(false);
      }
    }

    loadUsers();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [
    pageNumber,
    pageSize,
    searchTerm,
    roleFilter,
    statusFilter,
    sortBy,
    sortDescending,
    refreshKey,
  ]);

  // ===== LOAD DETAIL =====
  useEffect(() => {
    if (selectedUserId == null) {
      setSelectedUser(null);
      setDetailError("");
      setDetailLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    let ignore = false;

    async function loadDetail() {
      setDetailLoading(true);
      setDetailError("");

      try {
        const data = await getUserDetail(selectedUserId, {
          signal: controller.signal,
        });

        if (ignore) return;
        setSelectedUser(data);
      } catch (err) {
        if (ignore || controller.signal.aborted) return;
        console.error("Failed to load user detail", err);
        setSelectedUser(null);
        setDetailError(
          buildErrorMessage(err, "Không thể tải chi tiết người dùng được chọn.")
        );
      } finally {
        if (!ignore) setDetailLoading(false);
      }
    }

    loadDetail();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [selectedUserId, detailRefreshKey]);

  // ===== LOAD DATA FOR EDIT =====
  useEffect(() => {
    if (!editModalOpen || editingUserId == null) return undefined;

    const controller = new AbortController();
    let ignore = false;

    async function loadEdit() {
      setEditLoading(true);
      setEditError("");
      try {
        const data = await getUserDetail(editingUserId, {
          signal: controller.signal,
        });
        if (ignore) return;

        editForm.setFieldsValue({
          fullName: data?.fullName || "",
          phoneNumber: data?.phoneNumber || "",
          dateOfBirth: toDateInputValue(data?.dateOfBirth),
          isActive: Boolean(data?.isActive),
          rolesText: Array.isArray(data?.roles) ? data.roles.join(", ") : "",
        });
      } catch (err) {
        if (ignore || controller.signal.aborted) return;
        console.error("Failed to load user for edit", err);
        setEditError(
          buildErrorMessage(
            err,
            "Không thể tải dữ liệu người dùng để chỉnh sửa."
          )
        );
      } finally {
        if (!ignore) setEditLoading(false);
      }
    }

    loadEdit();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [editModalOpen, editingUserId, editForm]);

  // // ===== DERIVED =====
  // const totalPages = useMemo(() => {
  //   if (totalCount <= 0) return 1;
  //   return Math.max(1, Math.ceil(totalCount / pageSize));
  // }, [totalCount, pageSize]);

  // const paginationWindow = useMemo(() => {
  //   if (totalCount <= 0) return { start: 0, end: 0 };
  //   const start = (pageNumber - 1) * pageSize + 1;
  //   const end = Math.min(pageNumber * pageSize, totalCount);
  //   return { start, end };
  // }, [pageNumber, pageSize, totalCount]);

  const availableRoles = useMemo(() => {
    const unique = new Set();
    for (const user of users) {
      if (!user?.roles) continue;
      for (const role of user.roles) {
        if (role) unique.add(role);
      }
    }
    if (selectedUser?.roles) {
      for (const role of selectedUser.roles) {
        if (role) unique.add(role);
      }
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [users, selectedUser]);

  // ===== HANDLERS =====
  const handleSearchSubmit = () => {
    setSearchTerm(searchInput.trim());
    setPageNumber(1);
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setSearchTerm("");
    setRoleFilter("");
    setStatusFilter("all");
    setSortBy("createdAt");
    setSortDescending(true);
    setPageSize(PAGE_SIZE_OPTIONS[0]);
    setPageNumber(1);
    setRefreshKey((v) => v + 1);
  };

  const handleToggleUserStatus = async (user) => {
    if (!user) return;

    const nextStatus = !user.isActive;
    const confirmed = window.confirm(
      nextStatus
        ? "Bạn có chắc muốn mở khóa người dùng này?"
        : "Bạn có chắc muốn khóa người dùng này?"
    );
    if (!confirmed) return;

    try {
      await setUserStatus(user.id, nextStatus);
      msgApi.success("Đã cập nhật trạng thái người dùng.");
      setRefreshKey((v) => v + 1);
      setDetailRefreshKey((v) => v + 1);
    } catch (err) {
      console.error("Failed to toggle user status", err);
      msgApi.error(
        buildErrorMessage(
          err,
          "Không thể cập nhật trạng thái người dùng. Vui lòng thử lại."
        )
      );
    }
  };

  const openCreateModal = () => {
    createForm.resetFields();
    createForm.setFieldsValue({
      email: "",
      password: "",
      fullName: "",
      phoneNumber: "",
      dateOfBirth: "",
      isActive: true,
      rolesText: "",
    });
    setCreateModalOpen(true);
  };

  const handleCreateUser = async (values) => {
    const roles = parseRoles(values.rolesText || "");
    const payload = {
      email: values.email.trim(),
      password: values.password,
      fullName: values.fullName?.trim() || null,
      phoneNumber: values.phoneNumber?.trim() || null,
      dateOfBirth: values.dateOfBirth || null,
      isActive: Boolean(values.isActive),
      roles,
    };

    setCreatingUser(true);
    try {
      await createUser(payload);
      msgApi.success("Tạo người dùng mới thành công.");
      setCreateModalOpen(false);
      setRefreshKey((v) => v + 1);
    } catch (err) {
      console.error("Failed to create user", err);
      msgApi.error(
        buildErrorMessage(
          err,
          "Không thể tạo người dùng. Vui lòng kiểm tra dữ liệu và thử lại."
        )
      );
    } finally {
      setCreatingUser(false);
    }
  };

  const openEditModal = (user) => {
    setEditingUserId(user.id);
    setEditModalOpen(true);
    editForm.resetFields();
  };

  const handleUpdateUser = async (values) => {
    const roles = parseRoles(values.rolesText || "");
    const payload = {
      fullName: values.fullName?.trim() || null,
      phoneNumber: values.phoneNumber?.trim() || null,
      dateOfBirth: values.dateOfBirth || null,
      isActive: Boolean(values.isActive),
      roles,
    };

    setUpdatingUser(true);
    try {
      await updateUser(editingUserId, payload);
      msgApi.success("Cập nhật người dùng thành công.");
      setEditModalOpen(false);
      setEditingUserId(null);
      setRefreshKey((v) => v + 1);
      setDetailRefreshKey((v) => v + 1);
    } catch (err) {
      console.error("Failed to update user", err);
      msgApi.error(
        buildErrorMessage(err, "Không thể cập nhật thông tin người dùng.")
      );
    } finally {
      setUpdatingUser(false);
    }
  };

  // ===== TABLE COLUMNS =====
  const columns = [
    {
      title: "Email",
      dataIndex: "email",
      render: (v, user) => (
        <Button
          type="link"
          onClick={() => setSelectedUserId(user.id)}
          style={{ padding: 0 }}
        >
          {v || "(Không có email)"}
        </Button>
      ),
    },
    {
      title: "Họ tên",
      dataIndex: "fullName",
      render: (v) => v || "--",
    },
    {
      title: "Điện thoại",
      dataIndex: "phoneNumber",
      render: (v) => v || "--",
    },
    {
      title: "Ngày sinh",
      dataIndex: "dateOfBirth",
      render: (v) => formatDate(v) || "--",
    },
    {
      title: "Vai trò",
      dataIndex: "roles",
      render: (roles) => <UserRoles roles={roles} />,
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      render: (v) => (
        <Tag color={v ? "green" : "red"}>{v ? "Hoạt động" : "Bị khóa"}</Tag>
      ),
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      render: (v) => formatDateTime(v) || "--",
    },
    {
      title: "Thao tác",
      key: "actions",
      render: (_, user) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(user)}
          >
            Sửa
          </Button>
          <Button
            type="link"
            size="small"
            danger={user.isActive}
            icon={user.isActive ? <LockOutlined /> : <UnlockOutlined />}
            onClick={() => handleToggleUserStatus(user)}
          >
            {user.isActive ? "Khóa" : "Mở khóa"}
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
              {/* BÊN TRÁI: BẢNG */}
              <Col xs={24} xl={16} xxl={17}>
                <Card
                  title={
                    <Space direction="vertical" size={0}>
                      <Title level={4} style={{ margin: 0 }}>
                        Danh sách người dùng
                      </Title>
                      <Text type="secondary">
                        Quản lý tài khoản đăng nhập hệ thống.
                      </Text>
                    </Space>
                  }
                  extra={
                    <Space>
                      <Input
                        placeholder="Email, tên, số điện thoại..."
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
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={openCreateModal}
                      >
                        Tạo người dùng
                      </Button>
                    </Space>
                  }
                  bodyStyle={{ paddingTop: 12 }}
                >
                  {/* FILTER HÀNG TRÊN */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      marginBottom: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <span>Vai trò:</span>
                    <Input
                      style={{ width: 200 }}
                      placeholder="Nhập vai trò cần lọc"
                      value={roleFilter}
                      onChange={(e) => {
                        setRoleFilter(e.target.value.trim());
                        setPageNumber(1);
                      }}
                    />

                    {availableRoles.length > 0 && (
                      <Text type="secondary">
                        Vai trò hiện có: {availableRoles.join(", ")}
                      </Text>
                    )}
                  </div>

                  {/* FILTER HÀNG DƯỚI */}
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
                      onChange={(v) => {
                        setStatusFilter(v);
                        setPageNumber(1);
                      }}
                      options={STATUS_OPTIONS}
                    />

                    <span>Sắp xếp theo:</span>
                    <Select
                      style={{ width: 160 }}
                      value={sortBy}
                      onChange={(v) => {
                        setSortBy(v);
                        setPageNumber(1);
                      }}
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

                    <span>Số dòng:</span>
                    <Select
                      style={{ width: 120 }}
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
                    loading={loadingList}
                    dataSource={users}
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
                        `Hiển thị ${range[0]}-${range[1]} trong tổng số ${total} người dùng`,
                    }}
                  />
                </Card>
              </Col>

              {/* BÊN PHẢI: CHI TIẾT */}
              <Col xs={24} xl={8} xxl={7}>
                <Card
                  title="Chi tiết người dùng"
                  bodyStyle={{ minHeight: 260 }}
                >
                  {detailLoading && (
                    <Text type="secondary">
                      Đang tải chi tiết người dùng...
                    </Text>
                  )}

                  {detailError && !detailLoading && (
                    <Text type="danger">{detailError}</Text>
                  )}

                  {!selectedUser && !detailLoading && !detailError && (
                    <Text type="secondary">
                      Chưa có người dùng nào được chọn. Nhấn vào email trong
                      bảng để xem chi tiết.
                    </Text>
                  )}

                  {selectedUser && !detailLoading && !detailError && (
                    <div>
                      <p>
                        <strong>Email:</strong> {selectedUser.email || "--"}
                      </p>
                      <p>
                        <strong>Họ và tên:</strong>{" "}
                        {selectedUser.fullName || "--"}
                      </p>
                      <p>
                        <strong>Số điện thoại:</strong>{" "}
                        {selectedUser.phoneNumber || "--"}
                      </p>
                      <p>
                        <strong>Ngày sinh:</strong>{" "}
                        {formatDate(selectedUser.dateOfBirth) || "--"}
                      </p>
                      <p>
                        <strong>Trạng thái:</strong>{" "}
                        <Tag color={selectedUser.isActive ? "green" : "red"}>
                          {selectedUser.isActive ? "Hoạt động" : "Bị khóa"}
                        </Tag>
                      </p>
                      <p>
                        <strong>Vai trò:</strong>{" "}
                        <UserRoles roles={selectedUser.roles} />
                      </p>
                      <p>
                        <strong>Ngày tạo:</strong>{" "}
                        {formatDateTime(selectedUser.createdAt) || "--"}
                      </p>
                    </div>
                  )}
                </Card>
              </Col>
            </Row>
          </Content>
        </Layout>
      </Layout>

      {/* MODAL TẠO USER */}
      <Modal
        open={createModalOpen}
        title="Tạo người dùng mới"
        onCancel={() => !creatingUser && setCreateModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          layout="vertical"
          form={createForm}
          onFinish={handleCreateUser}
          initialValues={{ isActive: true }}
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Email là bắt buộc." },
              { type: "email", message: "Email không hợp lệ." },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[
              { required: true, message: "Mật khẩu là bắt buộc." },
              { min: 6, message: "Mật khẩu tối thiểu 6 ký tự." },
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item name="fullName" label="Họ và tên">
            <Input />
          </Form.Item>

          <Form.Item name="phoneNumber" label="Số điện thoại">
            <Input />
          </Form.Item>

          <Form.Item name="dateOfBirth" label="Ngày sinh">
            <Input type="date" />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="Cho phép đăng nhập ngay"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item name="rolesText" label="Vai trò (ngăn cách bởi dấu phẩy)">
            <TextArea rows={2} placeholder="Ví dụ: Admin, Staff" />
          </Form.Item>

          <Space style={{ marginTop: 8 }}>
            <Button type="primary" htmlType="submit" loading={creatingUser}>
              {creatingUser ? "Đang tạo..." : "Tạo người dùng"}
            </Button>
            <Button
              onClick={() => setCreateModalOpen(false)}
              disabled={creatingUser}
            >
              Hủy
            </Button>
          </Space>
        </Form>
      </Modal>

      {/* MODAL SỬA USER */}
      <Modal
        open={editModalOpen}
        title="Chỉnh sửa người dùng"
        onCancel={() => !updatingUser && setEditModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        {editLoading ? (
          <Text type="secondary">Đang tải dữ liệu người dùng...</Text>
        ) : editError ? (
          <Text type="danger">{editError}</Text>
        ) : (
          <Form layout="vertical" form={editForm} onFinish={handleUpdateUser}>
            <Form.Item label="Email">
              <Input
                value={
                  users.find((u) => u.id === editingUserId)?.email ||
                  selectedUser?.email ||
                  ""
                }
                disabled
              />
            </Form.Item>

            <Form.Item name="fullName" label="Họ và tên">
              <Input />
            </Form.Item>

            <Form.Item name="phoneNumber" label="Số điện thoại">
              <Input />
            </Form.Item>

            <Form.Item name="dateOfBirth" label="Ngày sinh">
              <Input type="date" />
            </Form.Item>

            <Form.Item
              name="isActive"
              label="Cho phép đăng nhập"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              name="rolesText"
              label="Vai trò (ngăn cách bởi dấu phẩy)"
            >
              <TextArea rows={2} placeholder="Ví dụ: Admin, Staff" />
            </Form.Item>

            <Space style={{ marginTop: 8 }}>
              <Button type="primary" htmlType="submit" loading={updatingUser}>
                {updatingUser ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
              <Button
                onClick={() => setEditModalOpen(false)}
                disabled={updatingUser}
              >
                Hủy
              </Button>
            </Space>
          </Form>
        )}
      </Modal>
    </>
  );
}
