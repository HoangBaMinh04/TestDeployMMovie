// import { useCallback, useEffect, useMemo, useState } from "react";
// import {
//   cancelOrder,
//   getOrderDetail,
//   getPagedOrders,
//   processExpiredOrders,
// } from "../../services/orderService";
// import { fmtLocal } from "../../utils/datetime";

// import {
//   Badge,
//   Button,
//   Card,
//   Descriptions,
//   Drawer,
//   Form,
//   Input,
//   List,
//   Modal,
//   Select,
//   Space,
//   Table,
//   Tag,
//   message,
// } from "antd";
// import {
//   ReloadOutlined,
//   ExclamationCircleOutlined,
//   ArrowDownOutlined,
//   ArrowUpOutlined,
// } from "@ant-design/icons";

// const STATUS_OPTIONS = [
//   { value: "", label: "Tất cả trạng thái" },
//   { value: "Holding", label: "Đang giữ chỗ" },
//   { value: "Pending", label: "Chờ thanh toán" },
//   { value: "Paid", label: "Đã thanh toán" },
//   { value: "Canceled", label: "Đã hủy" },
//   { value: "Expired", label: "Đã hết hạn" },
// ];

// const SORT_OPTIONS = [
//   { value: "createdAt", label: "Ngày tạo" },
//   { value: "status", label: "Trạng thái" },
//   { value: "amount", label: "Giá trị đơn" },
// ];

// const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

// const currencyFormatter = new Intl.NumberFormat("vi-VN", {
//   style: "currency",
//   currency: "VND",
//   maximumFractionDigits: 0,
// });

// function formatCurrency(value) {
//   if (value == null || value === "") return "—";
//   const numeric = Number(value);
//   if (!Number.isFinite(numeric)) return String(value);
//   return currencyFormatter.format(Math.max(0, numeric));
// }

// function formatDate(value) {
//   if (!value) return "—";
//   return fmtLocal(value, "DD/MM/YYYY HH:mm") || String(value);
// }

// function mapStatusToBadge(status) {
//   if (!status) return "default";
//   const normalized = String(status).toLowerCase();
//   if (
//     ["paid", "completed", "success", "hoàn", "thanh"].some((t) =>
//       normalized.includes(t)
//     )
//   ) {
//     return "success";
//   }
//   if (
//     ["pending", "holding", "chờ", "đang"].some((t) => normalized.includes(t))
//   ) {
//     return "processing";
//   }
//   if (
//     ["cancel", "fail", "hủy", "expired", "error"].some((t) =>
//       normalized.includes(t)
//     )
//   ) {
//     return "error";
//   }
//   return "default";
// }

// function normalizeStatus(status) {
//   if (!status) return "";
//   const text = String(status).trim();
//   return text.charAt(0).toUpperCase() + text.slice(1);
// }

// export default function OrderManagementPanel() {
//   const [form] = Form.useForm();

//   const [orders, setOrders] = useState([]);
//   const [totalCount, setTotalCount] = useState(0);

//   const [pageNumber, setPageNumber] = useState(1);
//   const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1]);

//   const [searchInput, setSearchInput] = useState("");
//   const [searchTerm, setSearchTerm] = useState("");
//   const [statusFilter, setStatusFilter] = useState("");
//   const [sortBy, setSortBy] = useState("createdAt");
//   const [sortDescending, setSortDescending] = useState(true);

//   const [loading, setLoading] = useState(false);
//   const [selectedOrderId, setSelectedOrderId] = useState(null);
//   const [selectedOrder, setSelectedOrder] = useState(null);
//   const [detailLoading, setDetailLoading] = useState(false);

//   const [processingExpired, setProcessingExpired] = useState(false);

//   const totalPages = useMemo(() => {
//     if (!totalCount) return 1;
//     return Math.max(1, Math.ceil(totalCount / pageSize));
//   }, [pageSize, totalCount]);

//   const paginationWindow = useMemo(() => {
//     if (totalCount <= 0) return { start: 0, end: 0 };
//     const start = (pageNumber - 1) * pageSize + 1;
//     const end = Math.min(pageNumber * pageSize, totalCount);
//     return { start: Math.max(1, Math.min(start, totalCount)), end };
//   }, [pageNumber, pageSize, totalCount]);

//   const fetchOrders = useCallback(async () => {
//     setLoading(true);
//     try {
//       const data = await getPagedOrders({
//         pageNumber,
//         pageSize,
//         searchTerm: searchTerm.trim() || undefined,
//         status: statusFilter || undefined,
//         sortBy,
//         sortDescending,
//       });

//       const items = Array.isArray(data?.items) ? data.items : [];
//       const total = Number.isFinite(data?.totalCount)
//         ? data.totalCount
//         : items.length;

//       if (pageNumber > 1 && items.length === 0 && total > 0) {
//         setPageNumber((v) => Math.max(1, v - 1));
//         return;
//       }

//       setOrders(items);
//       setTotalCount(total);
//     } catch (err) {
//       console.error("Failed to load orders", err);
//       const msg =
//         err?.response?.data?.message ||
//         err?.response?.data?.error ||
//         err?.message ||
//         "Không thể tải danh sách đơn hàng.";
//       setOrders([]);
//       setTotalCount(0);
//       message.error(msg);
//     } finally {
//       setLoading(false);
//     }
//   }, [pageNumber, pageSize, searchTerm, statusFilter, sortBy, sortDescending]);

//   useEffect(() => {
//     fetchOrders();
//   }, [fetchOrders]);

//   const applySearch = useCallback(() => {
//     setPageNumber(1);
//     setSearchTerm(searchInput.trim());
//   }, [searchInput]);

//   const clearFilters = useCallback(() => {
//     setSearchInput("");
//     setSearchTerm("");
//     setStatusFilter("");
//     setSortBy("createdAt");
//     setSortDescending(true);
//     setPageNumber(1);
//   }, []);

//   const refresh = useCallback(() => {
//     fetchOrders();
//   }, [fetchOrders]);

//   useEffect(() => {
//     if (selectedOrderId == null) {
//       setSelectedOrder(null);
//       return;
//     }
//     let ignore = false;
//     const controller = new AbortController();
//     async function loadDetail() {
//       setDetailLoading(true);
//       try {
//         const data = await getOrderDetail(selectedOrderId, {
//           signal: controller.signal,
//         });
//         if (ignore) return;
//         setSelectedOrder(data);
//       } catch (err) {
//         if (ignore || controller.signal.aborted) return;
//         console.error("Failed to load order detail", err);
//         const msg =
//           err?.response?.data?.message ||
//           err?.response?.data?.error ||
//           err?.message ||
//           "Không thể tải chi tiết đơn hàng.";
//         message.error(msg);
//         setSelectedOrder(null);
//       } finally {
//         if (!ignore) setDetailLoading(false);
//       }
//     }
//     loadDetail();
//     return () => {
//       ignore = true;
//       controller.abort();
//     };
//   }, [selectedOrderId]);

//   const canCancel = useCallback((order) => {
//     if (!order) return false;
//     const status = String(order.status || "").toLowerCase();
//     return status === "holding" || status === "pending";
//   }, []);

//   const handleCancelOrder = useCallback(
//     async (order) => {
//       if (!order) return;
//       const reason = "Huỷ bởi quản trị viên";
//       Modal.confirm({
//         title: "Xác nhận huỷ đơn",
//         icon: <ExclamationCircleOutlined />,
//         content: "Bạn có chắc muốn huỷ đơn này?",
//         okText: "Huỷ đơn",
//         okButtonProps: { danger: true },
//         cancelText: "Bỏ qua",
//         async onOk() {
//           const rawId = order.id ?? order.orderId ?? order.orderID;
//           if (rawId == null) {
//             message.warning("Không xác định được mã đơn để hủy.");
//             return;
//           }
//           const numeric = Number(rawId);
//           const identifier = Number.isFinite(numeric) ? numeric : rawId;
//           try {
//             await cancelOrder(identifier, reason);
//             message.success("Đã huỷ đơn hàng thành công.");
//             refresh();
//             if (selectedOrderId === identifier) setSelectedOrderId(identifier);
//           } catch (err) {
//             console.error("Cancel order failed", err);
//             const msg =
//               err?.response?.data?.message ||
//               err?.response?.data?.error ||
//               err?.message ||
//               "Không thể huỷ đơn hàng.";
//             message.error(msg);
//           }
//         },
//       });
//     },
//     [refresh, selectedOrderId]
//   );

//   const handleProcessExpired = useCallback(async () => {
//     setProcessingExpired(true);
//     try {
//       await processExpiredOrders();
//       message.success("Đã xử lý các đơn hàng quá hạn.");
//       refresh();
//       if (selectedOrderId != null) setSelectedOrderId(selectedOrderId);
//     } catch (err) {
//       console.error("Process expired orders failed", err);
//       const msg =
//         err?.response?.data?.message ||
//         err?.response?.data?.error ||
//         err?.message ||
//         "Không thể xử lý đơn hàng quá hạn.";
//       message.error(msg);
//     } finally {
//       setProcessingExpired(false);
//     }
//   }, [refresh, selectedOrderId]);

//   const columns = [
//     {
//       title: "ID",
//       dataIndex: "id",
//       key: "id",
//       width: 90,
//       render: (v) => <span>#{v}</span>,
//     },
//     {
//       title: "Mã đơn",
//       dataIndex: "orderCode",
//       key: "orderCode",
//       render: (_, record) => (
//         <Tag color="blue">
//           {record.orderCode || record.id || record.orderId}
//         </Tag>
//       ),
//     },
//     {
//       title: "Phim",
//       dataIndex: "movieName",
//       key: "movieName",
//       ellipsis: true,
//       render: (v) => v || "—",
//     },
//     {
//       title: "Khách hàng",
//       key: "customer",
//       render: (_, r) => r.userName || r.userEmail || "Khách lẻ",
//     },
//     {
//       title: "Trạng thái",
//       dataIndex: "status",
//       key: "status",
//       render: (v) => (
//         <Space>
//           <Badge status={mapStatusToBadge(v)} />
//           <span>{normalizeStatus(v) || "—"}</span>
//         </Space>
//       ),
//     },
//     {
//       title: "Tổng tiền",
//       key: "amount",
//       align: "right",
//       render: (_, r) => formatCurrency(r.finalAmount ?? r.totalAmount),
//     },
//     {
//       title: "Ngày tạo",
//       dataIndex: "createdAt",
//       key: "createdAt",
//       render: (v) => formatDate(v),
//     },
//     {
//       title: "",
//       key: "actions",
//       fixed: "right",
//       width: 170,
//       render: (_, record) => (
//         <Space>
//           <Button
//             type="link"
//             onClick={() => {
//               const rawId =
//                 record.id ?? record.orderId ?? record.orderID ?? null;
//               if (rawId == null) {
//                 setSelectedOrderId(null);
//                 return;
//               }
//               const numeric = Number(rawId);
//               const resolved = Number.isFinite(numeric) ? numeric : rawId;
//               setSelectedOrderId(resolved);
//             }}
//           >
//             Xem chi tiết
//           </Button>
//           {canCancel(record) && (
//             <Button
//               type="link"
//               danger
//               onClick={() => handleCancelOrder(record)}
//             >
//               Huỷ đơn
//             </Button>
//           )}
//         </Space>
//       ),
//     },
//   ];

//   return (
//     <Space direction="vertical" size="large" style={{ width: "100%" }}>
//       <Card
//         title="Danh sách đơn hàng"
//         extra={
//           <Space>
//             <Button
//               icon={<ReloadOutlined />}
//               onClick={refresh}
//               loading={loading}
//             >
//               Tải lại
//             </Button>
//             <Button
//               type="primary"
//               onClick={handleProcessExpired}
//               loading={processingExpired}
//             >
//               Xử lý đơn quá hạn
//             </Button>
//           </Space>
//         }
//       >
//         <Form
//           form={form}
//           layout="inline"
//           style={{ marginBottom: 16, rowGap: 12 }}
//           onFinish={applySearch}
//         >
//           <Form.Item label="Tìm kiếm">
//             <Input.Search
//               allowClear
//               placeholder="Mã đơn, email, phim..."
//               value={searchInput}
//               onChange={(e) => setSearchInput(e.target.value)}
//               onSearch={applySearch}
//               style={{ minWidth: 300 }}
//             />
//           </Form.Item>

//           <Form.Item label="Trạng thái">
//             <Select
//               value={statusFilter}
//               onChange={(v) => {
//                 setStatusFilter(v);
//                 setPageNumber(1);
//               }}
//               style={{ width: 200 }}
//               options={STATUS_OPTIONS}
//             />
//           </Form.Item>

//           <Form.Item label="Sắp xếp theo">
//             <Space.Compact>
//               <Select
//                 value={sortBy}
//                 onChange={(v) => setSortBy(v)}
//                 style={{ width: 180 }}
//                 options={SORT_OPTIONS}
//               />
//               <Button
//                 onClick={() => setSortDescending((v) => !v)}
//                 icon={
//                   sortDescending ? <ArrowDownOutlined /> : <ArrowUpOutlined />
//                 }
//               />
//             </Space.Compact>
//           </Form.Item>

//           <Form.Item label="Số dòng">
//             <Select
//               value={pageSize}
//               onChange={(v) => {
//                 setPageSize(v);
//                 setPageNumber(1);
//               }}
//               style={{ width: 120 }}
//               options={PAGE_SIZE_OPTIONS.map((s) => ({
//                 value: s,
//                 label: `${s}/trang`,
//               }))}
//             />
//           </Form.Item>

//           <Form.Item>
//             <Button onClick={clearFilters}>Xoá bộ lọc</Button>
//           </Form.Item>
//         </Form>

//         <Table
//           rowKey={(r) => r.id ?? r.orderId ?? r.orderCode}
//           loading={loading}
//           columns={columns}
//           dataSource={orders}
//           pagination={{
//             current: pageNumber,
//             pageSize,
//             total: totalCount,
//             showSizeChanger: false,
//             onChange: (page) => setPageNumber(page),
//           }}
//           scroll={{ x: 980 }}
//         />

//         <div style={{ marginTop: 8, color: "#666" }}>
//           {totalCount > 0 ? (
//             <span>
//               Hiển thị {paginationWindow.start}-{paginationWindow.end} trong
//               tổng số {totalCount} đơn hàng
//             </span>
//           ) : (
//             <span>Không có dữ liệu để hiển thị</span>
//           )}
//         </div>
//       </Card>

//       <Drawer
//         title="Chi tiết đơn hàng"
//         open={selectedOrderId != null}
//         onClose={() => setSelectedOrderId(null)}
//         width={520}
//       >
//         {detailLoading ? (
//           <Card loading />
//         ) : !selectedOrder ? (
//           <Card>Chọn một đơn hàng để xem chi tiết.</Card>
//         ) : (
//           <Space direction="vertical" style={{ width: "100%" }} size="large">
//             <Descriptions bordered size="small" column={1}>
//               <Descriptions.Item label="Mã đơn">
//                 <Tag color="purple">
//                   {selectedOrder.orderCode || selectedOrder.id}
//                 </Tag>
//               </Descriptions.Item>
//               <Descriptions.Item label="Trạng thái">
//                 <Space>
//                   <Badge status={mapStatusToBadge(selectedOrder.status)} />
//                   {normalizeStatus(selectedOrder.status) || "—"}
//                 </Space>
//               </Descriptions.Item>
//               <Descriptions.Item label="Phim">
//                 <strong>{selectedOrder.movieName || "—"}</strong>
//               </Descriptions.Item>
//               <Descriptions.Item label="Rạp">
//                 {selectedOrder.cinemaName || "—"}
//               </Descriptions.Item>
//               <Descriptions.Item label="Phòng">
//                 {selectedOrder.roomName || "—"}
//               </Descriptions.Item>
//               <Descriptions.Item label="Suất chiếu">
//                 {formatDate(
//                   selectedOrder.showtimeStart ??
//                     selectedOrder.showTimeStart ??
//                     selectedOrder.showTime
//                 )}
//               </Descriptions.Item>
//               <Descriptions.Item label="Khách hàng">
//                 {selectedOrder.userName || selectedOrder.userEmail || "—"}
//               </Descriptions.Item>
//               <Descriptions.Item label="Email">
//                 {selectedOrder.userEmail || "—"}
//               </Descriptions.Item>
//               <Descriptions.Item label="Số điện thoại">
//                 {selectedOrder.phoneNumber || "—"}
//               </Descriptions.Item>
//               <Descriptions.Item label="Tổng tiền">
//                 <strong>
//                   {formatCurrency(
//                     selectedOrder.finalAmount ?? selectedOrder.totalAmount
//                   )}
//                 </strong>
//               </Descriptions.Item>
//               <Descriptions.Item label="Ngày tạo">
//                 {formatDate(selectedOrder.createdAt)}
//               </Descriptions.Item>
//               <Descriptions.Item label="Hết hạn">
//                 {formatDate(selectedOrder.expiresAt)}
//               </Descriptions.Item>
//             </Descriptions>

//             {Array.isArray(selectedOrder.tickets) &&
//               selectedOrder.tickets.length > 0 && (
//                 <Card size="small" title="Danh sách vé">
//                   <List
//                     size="small"
//                     dataSource={selectedOrder.tickets}
//                     renderItem={(t) => (
//                       <List.Item>
//                         <Space>
//                           <Tag>{t.seatLabel || "Ghế"}</Tag>
//                           <span>{t.tier || ""}</span>
//                           <strong>{formatCurrency(t.price)}</strong>
//                         </Space>
//                       </List.Item>
//                     )}
//                   />
//                 </Card>
//               )}

//             {Array.isArray(selectedOrder.payments) &&
//               selectedOrder.payments.length > 0 && (
//                 <Card size="small" title="Lịch sử thanh toán">
//                   <List
//                     size="small"
//                     dataSource={selectedOrder.payments}
//                     renderItem={(p) => (
//                       <List.Item>
//                         <Space direction="vertical" style={{ width: "100%" }}>
//                           <Space
//                             style={{
//                               justifyContent: "space-between",
//                               width: "100%",
//                             }}
//                           >
//                             <Space>
//                               <Tag color="blue">
//                                 {p.provider ||
//                                   selectedOrder.paymentProvider ||
//                                   "VNPay"}
//                               </Tag>
//                               <span>{p.transactionId || "—"}</span>
//                             </Space>
//                             <Space>
//                               <Tag>{normalizeStatus(p.status)}</Tag>
//                               <strong>{formatCurrency(p.amount)}</strong>
//                             </Space>
//                           </Space>
//                           <span style={{ color: "#888" }}>
//                             {formatDate(p.createdAt)}
//                           </span>
//                         </Space>
//                       </List.Item>
//                     )}
//                   />
//                 </Card>
//               )}
//           </Space>
//         )}
//       </Drawer>
//     </Space>
//   );
// }

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  cancelOrder,
  getOrderDetail,
  getPagedOrders,
  processExpiredOrders,
} from "../../services/orderService";
import { fmtLocal } from "../../utils/datetime";

import {
  Badge,
  Button,
  Card,
  Descriptions,
  Drawer,
  Form,
  Input,
  List,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  message,
} from "antd";
import {
  ReloadOutlined,
  ExclamationCircleOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
} from "@ant-design/icons";

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "Holding", label: "Đang giữ chỗ" },
  { value: "Pending", label: "Chờ thanh toán" },
  { value: "Paid", label: "Đã thanh toán" },
  { value: "Canceled", label: "Đã hủy" },
  { value: "Expired", label: "Đã hết hạn" },
];

const SORT_OPTIONS = [
  { value: "createdAt", label: "Ngày tạo" },
  { value: "status", label: "Trạng thái" },
  { value: "amount", label: "Giá trị đơn" },
];

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

function formatCurrency(value) {
  if (value == null || value === "") return "—";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return currencyFormatter.format(Math.max(0, numeric));
}

function formatDate(value) {
  if (!value) return "—";
  return fmtLocal(value, "DD/MM/YYYY HH:mm") || String(value);
}

function mapStatusToBadge(status) {
  if (!status) return "default";
  const normalized = String(status).toLowerCase();
  if (
    ["paid", "completed", "success", "hoàn", "thanh"].some((t) =>
      normalized.includes(t)
    )
  ) {
    return "success";
  }
  if (
    ["pending", "holding", "chờ", "đang"].some((t) => normalized.includes(t))
  ) {
    return "processing";
  }
  if (
    ["cancel", "fail", "hủy", "expired", "error"].some((t) =>
      normalized.includes(t)
    )
  ) {
    return "error";
  }
  return "default";
}

function normalizeStatus(status) {
  if (!status) return "";
  const text = String(status).trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function OrderManagementPanel() {
  const [form] = Form.useForm();

  const [orders, setOrders] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1]);

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDescending, setSortDescending] = useState(true);

  const [loading, setLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [processingExpired, setProcessingExpired] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const totalPages = useMemo(() => {
    if (!totalCount) return 1;
    return Math.max(1, Math.ceil(totalCount / pageSize));
  }, [pageSize, totalCount]);

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

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPagedOrders({
        pageNumber,
        pageSize,
        searchTerm: searchTerm.trim() || undefined,
        status: statusFilter || undefined,
        sortBy,
        sortDescending,
      });

      const items = Array.isArray(data?.items) ? data.items : [];
      const total = Number.isFinite(data?.totalCount)
        ? data.totalCount
        : items.length;

      if (pageNumber > 1 && items.length === 0 && total > 0) {
        setPageNumber((v) => Math.max(1, v - 1));
        return;
      }

      setOrders(items);
      setTotalCount(total);
    } catch (err) {
      console.error("Failed to load orders", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Không thể tải danh sách đơn hàng.";
      setOrders([]);
      setTotalCount(0);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }, [pageNumber, pageSize, searchTerm, statusFilter, sortBy, sortDescending]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders, refreshKey]);

  const applySearch = useCallback(() => {
    setPageNumber(1);
    setSearchTerm(searchInput.trim());
  }, [searchInput]);

  const clearFilters = useCallback(() => {
    setSearchInput("");
    setSearchTerm("");
    setStatusFilter("");
    setSortBy("createdAt");
    setSortDescending(true);
    setPageNumber(1);
  }, []);

  const refresh = useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  useEffect(() => {
    if (selectedOrderId == null) {
      setSelectedOrder(null);
      return;
    }
    let ignore = false;
    const controller = new AbortController();
    async function loadDetail() {
      setDetailLoading(true);
      try {
        const data = await getOrderDetail(selectedOrderId, {
          signal: controller.signal,
        });
        if (ignore) return;
        setSelectedOrder(data);
      } catch (err) {
        if (ignore || controller.signal.aborted) return;
        console.error("Failed to load order detail", err);
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Không thể tải chi tiết đơn hàng.";
        message.error(msg);
        setSelectedOrder(null);
      } finally {
        if (!ignore) setDetailLoading(false);
      }
    }
    loadDetail();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [selectedOrderId, refreshKey]);

  const handleCancelOrder = useCallback(
    async (order) => {
      if (!order) return;
      const reason = window.prompt(
        "Nhập lý do hủy đơn hàng",
        "Huỷ bởi quản trị viên"
      );
      if (reason === null) return;

      const rawId = order.id ?? order.orderId ?? order.orderID;
      if (rawId == null) {
        setActionMessage("Không xác định được mã đơn để hủy.");
        return;
      }

      const numeric = Number(rawId);
      const identifier = Number.isFinite(numeric) ? numeric : rawId;

      try {
        await cancelOrder(identifier, reason);
        setActionMessage("Đã huỷ đơn hàng thành công.");
        refresh();
        if (selectedOrderId === identifier) {
          setSelectedOrderId(identifier);
        }
      } catch (err) {
        console.error("Cancel order failed", err);
        const message =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Không thể huỷ đơn hàng.";
        setActionMessage(message);
      }
    },
    [refresh, selectedOrderId]
  );

  const handleProcessExpired = useCallback(async () => {
    setProcessingExpired(true);
    setActionMessage("");
    try {
      await processExpiredOrders();
      setActionMessage("Đã xử lý các đơn hàng quá hạn.");
      refresh();
      if (selectedOrderId != null) setSelectedOrderId(selectedOrderId);
    } catch (err) {
      console.error("Process expired orders failed", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Không thể xử lý đơn hàng quá hạn.";
      setActionMessage(msg);
    } finally {
      setProcessingExpired(false);
    }
  }, [refresh, selectedOrderId]);

  const canCancel = useCallback((order) => {
    if (!order) return false;
    const status = String(order.status || "").toLowerCase();
    return status === "holding" || status === "pending";
  }, []);

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 90,
      render: (v) => <span>#{v}</span>,
    },
    {
      title: "Mã đơn",
      dataIndex: "orderCode",
      key: "orderCode",
      render: (_, record) => (
        <Tag color="blue">
          {record.orderCode || record.id || record.orderId}
        </Tag>
      ),
    },
    {
      title: "Phim",
      dataIndex: "movieName",
      key: "movieName",
      ellipsis: true,
      render: (v) => v || "—",
    },
    {
      title: "Khách hàng",
      key: "customer",
      render: (_, r) => r.userName || r.userEmail || "Khách lẻ",
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (v) => (
        <Space>
          <Badge status={mapStatusToBadge(v)} />
          <span>{normalizeStatus(v) || "—"}</span>
        </Space>
      ),
    },
    {
      title: "Tổng tiền",
      key: "amount",
      align: "right",
      render: (_, r) => formatCurrency(r.finalAmount ?? r.totalAmount),
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (v) => formatDate(v),
    },
    {
      title: "",
      key: "actions",
      fixed: "right",
      width: 170,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            onClick={() => {
              const rawId =
                record.id ?? record.orderId ?? record.orderID ?? null;
              if (rawId == null) {
                setSelectedOrderId(null);
                return;
              }
              const numeric = Number(rawId);
              const resolved = Number.isFinite(numeric) ? numeric : rawId;
              setSelectedOrderId(resolved);
            }}
          >
            Xem chi tiết
          </Button>
          {canCancel(record) && (
            <Button
              type="link"
              danger
              onClick={() => handleCancelOrder(record)}
            >
              Huỷ đơn
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Card
        title="Danh sách đơn hàng"
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={refresh}
              loading={loading}
            >
              Tải lại
            </Button>
            <Button
              type="primary"
              onClick={handleProcessExpired}
              loading={processingExpired}
            >
              Xử lý đơn quá hạn
            </Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="inline"
          style={{ marginBottom: 16, rowGap: 12 }}
          onFinish={applySearch}
        >
          <Form.Item label="Tìm kiếm">
            <Input.Search
              allowClear
              placeholder="Mã đơn, email, phim..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onSearch={applySearch}
              style={{ minWidth: 300 }}
            />
          </Form.Item>

          <Form.Item label="Trạng thái">
            <Select
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v);
                setPageNumber(1);
              }}
              style={{ width: 200 }}
              options={STATUS_OPTIONS}
            />
          </Form.Item>

          <Form.Item label="Sắp xếp theo">
            <Space.Compact>
              <Select
                value={sortBy}
                onChange={(v) => setSortBy(v)}
                style={{ width: 180 }}
                options={SORT_OPTIONS}
              />
              <Button
                onClick={() => setSortDescending((v) => !v)}
                icon={
                  sortDescending ? <ArrowDownOutlined /> : <ArrowUpOutlined />
                }
              />
            </Space.Compact>
          </Form.Item>

          <Form.Item label="Số dòng">
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
          </Form.Item>

          <Form.Item>
            <Button onClick={clearFilters}>Xoá bộ lọc</Button>
          </Form.Item>
        </Form>

        <Table
          rowKey={(r) => r.id ?? r.orderId ?? r.orderCode}
          loading={loading}
          columns={columns}
          dataSource={orders}
          pagination={{
            current: pageNumber,
            pageSize,
            total: totalCount,
            showSizeChanger: false,
            onChange: (page) => setPageNumber(page),
          }}
          scroll={{ x: 980 }}
        />

        <div style={{ marginTop: 8, color: "#666" }}>
          {totalCount > 0 ? (
            <span>
              Hiển thị {paginationWindow.start}-{paginationWindow.end} trong
              tổng số {totalCount} đơn hàng
            </span>
          ) : (
            <span>Không có dữ liệu để hiển thị</span>
          )}
        </div>
      </Card>

      <Drawer
        title="Chi tiết đơn hàng"
        open={selectedOrderId != null}
        onClose={() => setSelectedOrderId(null)}
        width={520}
      >
        {detailLoading ? (
          <Card loading />
        ) : !selectedOrder ? (
          <Card>Chọn một đơn hàng để xem chi tiết.</Card>
        ) : (
          <Space direction="vertical" style={{ width: "100%" }} size="large">
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Mã đơn">
                <Tag color="purple">
                  {selectedOrder.orderCode || selectedOrder.id}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Space>
                  <Badge status={mapStatusToBadge(selectedOrder.status)} />
                  {normalizeStatus(selectedOrder.status) || "—"}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Phim">
                <strong>{selectedOrder.movieName || "—"}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Rạp">
                {selectedOrder.cinemaName || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Phòng">
                {selectedOrder.roomName || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Suất chiếu">
                {formatDate(
                  selectedOrder.showtimeStart ??
                    selectedOrder.showTimeStart ??
                    selectedOrder.showTime
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Khách hàng">
                {selectedOrder.userName || selectedOrder.userEmail || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {selectedOrder.userEmail || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">
                {selectedOrder.phoneNumber || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Tổng tiền">
                <strong>
                  {formatCurrency(
                    selectedOrder.finalAmount ?? selectedOrder.totalAmount
                  )}
                </strong>
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tạo">
                {formatDate(selectedOrder.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="Hết hạn">
                {formatDate(selectedOrder.expiresAt)}
              </Descriptions.Item>
            </Descriptions>

            {Array.isArray(selectedOrder.tickets) &&
              selectedOrder.tickets.length > 0 && (
                <Card size="small" title="Danh sách vé">
                  <List
                    size="small"
                    dataSource={selectedOrder.tickets}
                    renderItem={(t) => (
                      <List.Item>
                        <Space>
                          <Tag>{t.seatLabel || "Ghế"}</Tag>
                          <span>{t.tier || ""}</span>
                          <strong>{formatCurrency(t.price)}</strong>
                        </Space>
                      </List.Item>
                    )}
                  />
                </Card>
              )}

            {Array.isArray(selectedOrder.payments) &&
              selectedOrder.payments.length > 0 && (
                <Card size="small" title="Lịch sử thanh toán">
                  <List
                    size="small"
                    dataSource={selectedOrder.payments}
                    renderItem={(p) => (
                      <List.Item>
                        <Space direction="vertical" style={{ width: "100%" }}>
                          <Space
                            style={{
                              justifyContent: "space-between",
                              width: "100%",
                            }}
                          >
                            <Space>
                              <Tag color="blue">
                                {p.provider ||
                                  selectedOrder.paymentProvider ||
                                  "VNPay"}
                              </Tag>
                              <span>{p.transactionId || "—"}</span>
                            </Space>
                            <Space>
                              <Tag>{normalizeStatus(p.status)}</Tag>
                              <strong>{formatCurrency(p.amount)}</strong>
                            </Space>
                          </Space>
                          <span style={{ color: "#888" }}>
                            {formatDate(p.createdAt)}
                          </span>
                        </Space>
                      </List.Item>
                    )}
                  />
                </Card>
              )}
          </Space>
        )}
      </Drawer>
    </Space>
  );
}
