import { useEffect, useMemo, useState } from "react";
import {
  Layout,
  Typography,
  Card,
  Row,
  Col,
  Input,
  Select,
  Button,
  Space,
  Tag,
  Alert,
  message,
  Divider,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";

import { getCinemas } from "../../services/cinemaService";
import { getRoomsByCinema } from "../../services/roomService";
import {
  DEFAULT_SEAT_TIERS,
  bulkUpdateSeats,
  getSeatsByRoom,
  toggleSeatActive,
} from "../../services/seatService";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const STATUS_FILTERS = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Đang mở" },
  { value: "inactive", label: "Đang khóa" },
];

const TIER_FILTERS = [
  { value: "all", label: "Tất cả" },
  ...DEFAULT_SEAT_TIERS.map((tier) => ({
    value: tier.toLowerCase(),
    label: tier,
  })),
];

function buildErrorMessage(err, fallback) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.response?.data ||
    err?.message ||
    fallback
  );
}

function ensureStringId(value) {
  if (value == null) return "";
  return String(value);
}

// ====== STYLE HELPERS ======

const seatBaseStyle = {
  height: 56,
  borderRadius: 8,
  border: "1px solid #d9d9d9",
  background: "#fafafa",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  padding: 4,
  cursor: "pointer",
  fontSize: 12,
  transition: "all 0.2s",
  userSelect: "none",
};

function getSeatStyle({ tier, isActive, isSelected, isFocused, isDimmed }) {
  let style = { ...seatBaseStyle };

  const t = (tier || "").toLowerCase();

  // Màu theo hạng ghế (mặc định)
  if (t === "vip") {
    style.background = "#fff7e6";
    style.borderColor = "#faad14";
  } else if (t === "deluxe") {
    style.background = "#f9f0ff";
    style.borderColor = "#9254de";
  } else {
    style.background = "#f5f5f5";
    style.borderColor = "#d9d9d9";
  }

  // Ghế bị khóa -> xám, mờ
  if (isActive === false) {
    style.background = "#f0f0f0";
    style.borderColor = "#d9d9d9";
    style.borderStyle = "dashed";
    style.opacity = 0.5;
  }

  // Ghế đang được chọn -> ĐỎ
  if (isSelected) {
    style.background = "#fff1f0";
    style.borderColor = "#ff4d4f";
    style.borderWidth = 2;
    style.color = "#a8071a";
    style.boxShadow = "0 0 0 2px rgba(255,77,79,0.25)";
  }

  // Ghế đang focus (ghế đang xem chi tiết)
  if (isFocused) {
    style.boxShadow = "0 0 0 2px rgba(0,0,0,0.12)";
  }

  // Ghế không match filter/search -> làm mờ
  if (isDimmed) {
    style.opacity = 0.25;
  }

  return style;
}

export default function SeatManagementPanel() {
  const [msgApi, contextHolder] = message.useMessage();

  const [cinemas, setCinemas] = useState([]);
  const [cinemasLoading, setCinemasLoading] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);

  const [selectedCinema, setSelectedCinema] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");

  const [seats, setSeats] = useState([]);
  const [seatLoading, setSeatLoading] = useState(false);
  const [seatError, setSeatError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [focusedSeatId, setFocusedSeatId] = useState(null);

  const [bulkTier, setBulkTier] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

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
      } catch (err) {
        if (ignore || controller.signal.aborted) return;
        console.error("Failed to load cinemas", err);
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

  // auto chọn cinema đầu tiên
  useEffect(() => {
    if (!cinemas.length || selectedCinema) return;
    const first = cinemas[0];
    if (first) setSelectedCinema(ensureStringId(first.id));
  }, [cinemas, selectedCinema]);

  // LOAD ROOMS
  useEffect(() => {
    if (!selectedCinema) {
      setRooms([]);
      setSelectedRoom("");
      return;
    }

    const controller = new AbortController();
    let ignore = false;

    async function loadRooms() {
      setRoomsLoading(true);
      try {
        const data = await getRoomsByCinema(Number(selectedCinema), {
          signal: controller.signal,
        });
        if (ignore) return;
        setRooms(Array.isArray(data) ? data : []);
      } catch (err) {
        if (ignore || controller.signal.aborted) return;
        console.error("Failed to load rooms", err);
        setRooms([]);
      } finally {
        if (!ignore) {
          setRoomsLoading(false);
        }
      }
    }

    loadRooms();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [selectedCinema]);

  // auto chọn room đầu tiên
  useEffect(() => {
    if (!rooms.length) {
      setSelectedRoom("");
      return;
    }
    if (
      selectedRoom &&
      rooms.some((room) => ensureStringId(room.id) === selectedRoom)
    ) {
      return;
    }
    const first = rooms[0];
    if (first) setSelectedRoom(ensureStringId(first.id));
  }, [rooms, selectedRoom]);

  // LOAD SEATS
  useEffect(() => {
    if (!selectedRoom) {
      setSeats([]);
      setSeatError("");
      setSelectedSeatIds([]);
      setFocusedSeatId(null);
      return;
    }

    const controller = new AbortController();
    let ignore = false;

    async function loadSeats() {
      setSeatLoading(true);
      setSeatError("");
      try {
        const data = await getSeatsByRoom(Number(selectedRoom), {
          signal: controller.signal,
        });
        if (ignore) return;
        setSeats(Array.isArray(data) ? data : []);
      } catch (err) {
        if (ignore || controller.signal.aborted) return;
        console.error("Failed to load seats", err);
        setSeats([]);
        setSeatError(
          buildErrorMessage(err, "Không thể tải danh sách ghế cho phòng này.")
        );
      } finally {
        if (!ignore) {
          setSeatLoading(false);
        }
      }
    }

    loadSeats();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [selectedRoom, refreshKey]);

  // auto clear success
  useEffect(() => {
    if (!successMessage) return undefined;
    const t = setTimeout(() => setSuccessMessage(""), 4000);
    return () => clearTimeout(t);
  }, [successMessage]);

  // giữ selected/focused hợp lệ theo list mới
  useEffect(() => {
    setSelectedSeatIds((prev) =>
      prev.filter((id) => seats.some((s) => s.id === id))
    );
    if (focusedSeatId && !seats.some((s) => s.id === focusedSeatId)) {
      setFocusedSeatId(null);
    }
  }, [seats, focusedSeatId]);

  const trimmedSearch = searchTerm.trim().toLowerCase();

  const seatMatches = useMemo(() => {
    const map = new Map();
    seats.forEach((seat) => {
      let isMatch = true;

      if (trimmedSearch) {
        const rowLabel = seat.row
          ? String.fromCharCode("A".charCodeAt(0) + (seat.row - 1))
          : "";
        const haystack = [
          seat.label,
          rowLabel,
          seat.row != null ? `${seat.row}` : "",
          seat.col != null ? `${seat.col}` : "",
        ]
          .join(" ")
          .toLowerCase();
        isMatch = haystack.includes(trimmedSearch);
      }

      if (isMatch && tierFilter !== "all") {
        isMatch = (seat.tier || "").toLowerCase() === tierFilter;
      }

      if (isMatch && statusFilter !== "all") {
        const active = seat.isActive !== false;
        isMatch = statusFilter === "active" ? active : !active;
      }

      map.set(seat.id, isMatch);
    });
    return map;
  }, [seats, trimmedSearch, tierFilter, statusFilter]);

  const totalRows = useMemo(
    () =>
      seats.reduce((max, seat) => {
        if (!Number.isFinite(seat?.row)) return max;
        return seat.row > max ? seat.row : max;
      }, 0),
    [seats]
  );

  const totalCols = useMemo(
    () =>
      seats.reduce((max, seat) => {
        if (!Number.isFinite(seat?.col)) return max;
        return seat.col > max ? seat.col : max;
      }, 0),
    [seats]
  );

  const seatLookup = useMemo(() => {
    const map = new Map();
    seats.forEach((seat) => {
      const key = `${seat.row ?? 0}-${seat.col ?? seat.id}`;
      map.set(key, seat);
    });
    return map;
  }, [seats]);

  const selectedSeats = useMemo(
    () => seats.filter((s) => selectedSeatIds.includes(s.id)),
    [seats, selectedSeatIds]
  );

  const focusedSeat = useMemo(() => {
    if (focusedSeatId) {
      return seats.find((s) => s.id === focusedSeatId) || null;
    }
    if (selectedSeats.length === 1) return selectedSeats[0];
    return null;
  }, [focusedSeatId, seats, selectedSeats]);

  const seatSummary = useMemo(() => {
    const total = seats.length;
    const active = seats.filter((s) => s.isActive !== false).length;
    const inactive = total - active;

    const tiers = DEFAULT_SEAT_TIERS.reduce((acc, t) => {
      acc[t] = 0;
      return acc;
    }, {});
    let otherTiers = 0;

    seats.forEach((seat) => {
      const tier = (seat.tier || "").trim();
      if (!tier) {
        tiers.Standard += 1;
        return;
      }
      const match = DEFAULT_SEAT_TIERS.find(
        (c) => c.toLowerCase() === tier.toLowerCase()
      );
      if (match) {
        tiers[match] += 1;
      } else {
        otherTiers += 1;
      }
    });

    return { total, active, inactive, tiers, otherTiers };
  }, [seats]);

  // ===== HANDLERS =====
  const handleSeatClick = (seat, event) => {
    const multiSelect = event.ctrlKey || event.metaKey || event.shiftKey;
    setActionError("");
    setSuccessMessage("");

    setSelectedSeatIds((prev) => {
      const exists = prev.includes(seat.id);

      // Nếu giữ Ctrl/Cmd/Shift → giữ behavior cũ
      if (multiSelect) {
        if (exists) {
          return prev.filter((id) => id !== seat.id);
        }
        return [...prev, seat.id];
      }

      // Click bình thường: toggle ghế, KHÔNG xoá selection cũ
      if (exists) {
        return prev.filter((id) => id !== seat.id);
      }
      return [...prev, seat.id];
    });

    setFocusedSeatId(seat.id);
  };

  const handleSelectAll = () => {
    setActionError("");
    setSuccessMessage("");
    setSelectedSeatIds(seats.map((s) => s.id));
  };

  const handleClearSelection = () => {
    setActionError("");
    setSuccessMessage("");
    setSelectedSeatIds([]);
    setFocusedSeatId(null);
  };

  const applyBulkTier = async () => {
    if (!selectedSeatIds.length) {
      setActionError("Vui lòng chọn ít nhất một ghế để cập nhật hạng.");
      return;
    }
    if (!bulkTier) {
      setActionError("Vui lòng chọn hạng ghế muốn áp dụng.");
      return;
    }

    setActionError("");
    setSuccessMessage("");
    setActionLoading("tier");

    try {
      await bulkUpdateSeats(
        Number(selectedRoom),
        selectedSeatIds.map((id) => ({ seatId: id, tier: bulkTier })),
        {}
      );
      setSuccessMessage("Cập nhật hạng ghế thành công.");
      msgApi.success("Cập nhật hạng ghế thành công.");
      setBulkTier("");
      setRefreshKey((v) => v + 1);
    } catch (err) {
      console.error("Failed to update seat tier", err);
      const msg = buildErrorMessage(err, "Không thể cập nhật hạng ghế.");
      setActionError(msg);
      msgApi.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const applyBulkStatus = async (isActive) => {
    if (!selectedSeatIds.length) {
      setActionError("Vui lòng chọn ghế để thay đổi trạng thái.");
      return;
    }

    setActionError("");
    setSuccessMessage("");
    setActionLoading(isActive ? "activate" : "deactivate");

    try {
      await bulkUpdateSeats(
        Number(selectedRoom),
        selectedSeatIds.map((id) => ({ seatId: id, isActive })),
        {}
      );
      const msg = isActive
        ? "Đã mở khóa ghế được chọn."
        : "Đã khóa ghế được chọn.";
      setSuccessMessage(msg);
      msgApi.success(msg);
      setRefreshKey((v) => v + 1);
    } catch (err) {
      console.error("Failed to toggle seat status", err);
      const msg = buildErrorMessage(
        err,
        isActive ? "Không thể mở khóa ghế." : "Không thể khóa ghế."
      );
      setActionError(msg);
      msgApi.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleFocusedSeat = async () => {
    if (!focusedSeat) return;
    setActionError("");
    setSuccessMessage("");
    setActionLoading("single-toggle");

    try {
      await toggleSeatActive(focusedSeat.id);
      const msg = "Đã thay đổi trạng thái ghế.";
      setSuccessMessage(msg);
      msgApi.success(msg);
      setRefreshKey((v) => v + 1);
    } catch (err) {
      console.error("Failed to toggle seat", err);
      const msg = buildErrorMessage(err, "Không thể thay đổi trạng thái ghế.");
      setActionError(msg);
      msgApi.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");

    setTierFilter("all");
    setStatusFilter("all");
  };

  const renderSeat = (seat, key) => {
    if (!seat) {
      return (
        <div
          key={key}
          style={{
            ...seatBaseStyle,
            visibility: "hidden",
            cursor: "default",
          }}
        />
      );
    }

    const rowLetter = seat.row
      ? String.fromCharCode("A".charCodeAt(0) + (seat.row - 1))
      : "";

    const style = getSeatStyle({
      tier: seat.tier,
      isActive: seat.isActive,
      isSelected: selectedSeatIds.includes(seat.id),
      isFocused: focusedSeat?.id === seat.id,
      isDimmed: !seatMatches.get(seat.id),
    });

    return (
      <button
        key={seat.id}
        type="button"
        style={style}
        onClick={(e) => handleSeatClick(seat, e)}
        aria-pressed={selectedSeatIds.includes(seat.id)}
        title={`${seat.label || `${rowLetter}${seat.col}`} • ${
          seat.tier || "Standard"
        }`}
      >
        <div style={{ fontWeight: 500 }}>
          {seat.label || `${rowLetter}${seat.col}`}
        </div>
        <div style={{ fontSize: 11, opacity: 0.8 }}>
          {seat.tier || "Standard"}
        </div>
      </button>
    );
  };

  const hasSeats = seats.length > 0;
  const totalSelected = selectedSeatIds.length;

  return (
    <>
      {contextHolder}
      <Layout style={{ minHeight: "100vh" }}>
        <Content style={{ padding: 16 }}>
          <Card>
            {/* FILTER ROW – gần giống form cũ */}
            <form
              onSubmit={(e) => e.preventDefault()}
              style={{ marginBottom: 16 }}
            >
              <Row gutter={[16, 12]} align="bottom">
                <Col xs={24} md={8} lg={6}>
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <Text>Chọn rạp</Text>
                    <Select
                      style={{ width: "100%" }}
                      loading={cinemasLoading}
                      value={selectedCinema || ""}
                      onChange={(v) => {
                        setSelectedCinema(v);
                        setSelectedRoom("");
                        setSeats([]);
                        setSeatError("");
                        setSelectedSeatIds([]);
                        setFocusedSeatId(null);
                      }}
                      options={[
                        { value: "", label: "-- Chọn rạp --" },
                        ...cinemas.map((c) => ({
                          value: ensureStringId(c.id),
                          label: c.name || `Rạp #${c.id}`,
                        })),
                      ]}
                    />
                  </Space>
                </Col>

                <Col xs={24} md={8} lg={6}>
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <Text>Chọn phòng</Text>
                    <Select
                      style={{ width: "100%" }}
                      loading={roomsLoading}
                      disabled={!selectedCinema}
                      value={selectedRoom || ""}
                      onChange={(v) => {
                        setSelectedRoom(v);
                        setSelectedSeatIds([]);
                        setFocusedSeatId(null);
                      }}
                      options={[
                        { value: "", label: "-- Chọn phòng --" },
                        ...rooms.map((r) => ({
                          value: ensureStringId(r.id),
                          label: r.name || `Phòng #${r.id}`,
                        })),
                      ]}
                    />
                  </Space>
                </Col>

                <Col xs={24} md={8} lg={6}>
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <Text>Tìm kiếm ghế</Text>
                    <Input
                      placeholder="Nhập mã ghế hoặc hàng ghế"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      disabled={!hasSeats}
                    />
                  </Space>
                </Col>

                <Col xs={24} md={8} lg={4}>
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <Text>Lọc theo hạng ghế</Text>
                    <Select
                      style={{ width: "100%" }}
                      value={tierFilter}
                      onChange={setTierFilter}
                      disabled={!hasSeats}
                      options={TIER_FILTERS}
                    />
                  </Space>
                </Col>

                <Col xs={24} md={8} lg={4}>
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <Text>Lọc trạng thái</Text>
                    <Select
                      style={{ width: "100%" }}
                      value={statusFilter}
                      onChange={setStatusFilter}
                      disabled={!hasSeats}
                      options={STATUS_FILTERS}
                    />
                  </Space>
                </Col>

                <Col xs={24} md={8} lg={4}>
                  <Space
                    style={{ width: "100%", justifyContent: "flex-start" }}
                  >
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={clearFilters}
                      disabled={
                        !searchTerm &&
                        tierFilter === "all" &&
                        statusFilter === "all"
                      }
                    >
                      Xóa bộ lọc
                    </Button>
                  </Space>
                </Col>
              </Row>
            </form>

            {/* ALERTS */}
            <Space
              direction="vertical"
              style={{ width: "100%", marginBottom: 16 }}
            >
              {seatError && (
                <Alert
                  type="error"
                  showIcon
                  message={seatError}
                  closable
                  onClose={() => setSeatError("")}
                />
              )}
              {actionError && (
                <Alert
                  type="error"
                  showIcon
                  message={actionError}
                  closable
                  onClose={() => setActionError("")}
                />
              )}
              {successMessage && (
                <Alert
                  type="success"
                  showIcon
                  message={successMessage}
                  closable
                  onClose={() => setSuccessMessage("")}
                />
              )}
            </Space>

            {/* SUMMARY – thay cho card nhỏ cũ */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={12} md={6} lg={4}>
                <Card size="small">
                  <Text type="secondary">Tổng ghế</Text>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>
                    {seatSummary.total}
                  </div>
                </Card>
              </Col>
              <Col xs={12} md={6} lg={4}>
                <Card size="small">
                  <Text type="secondary">Đang mở</Text>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 600,
                      color: "#52c41a",
                    }}
                  >
                    {seatSummary.active}
                  </div>
                </Card>
              </Col>
              <Col xs={12} md={6} lg={4}>
                <Card size="small">
                  <Text type="secondary">Đang khóa</Text>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 600,
                      color: "#ff4d4f",
                    }}
                  >
                    {seatSummary.inactive}
                  </div>
                </Card>
              </Col>

              {DEFAULT_SEAT_TIERS.map((tier) => (
                <Col key={tier} xs={12} md={6} lg={4}>
                  <Card size="small">
                    <Text type="secondary">{tier}</Text>
                    <div style={{ fontSize: 18, fontWeight: 500 }}>
                      {seatSummary.tiers[tier] ?? 0}
                    </div>
                  </Card>
                </Col>
              ))}

              {seatSummary.otherTiers > 0 && (
                <Col xs={12} md={6} lg={4}>
                  <Card size="small">
                    <Text type="secondary">Khác</Text>
                    <div style={{ fontSize: 18, fontWeight: 500 }}>
                      {seatSummary.otherTiers}
                    </div>
                  </Card>
                </Col>
              )}
            </Row>

            {/* LEGEND */}
            <Space
              style={{
                marginBottom: 16,
                padding: 8,
                borderRadius: 8,
                background: "#fafafa",
              }}
              wrap
            >
              <Space>
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    background: "#f5f5f5",
                    border: "1px solid #d9d9d9",
                  }}
                />
                <Text>Standard</Text>
              </Space>
              <Space>
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    background: "#fff7e6",
                    border: "1px solid #faad14",
                  }}
                />
                <Text>VIP</Text>
              </Space>
              <Space>
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    background: "#f9f0ff",
                    border: "1px solid #9254de",
                  }}
                />
                <Text>Deluxe</Text>
              </Space>
              <Space>
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    background: "#fff1f0",
                    border: "1px dashed #ff4d4f",
                  }}
                />
                <Text>Khóa</Text>
              </Space>
              <Space>
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    border: "2px solid #ff0000ff",
                  }}
                />
                <Text>Đang chọn</Text>
              </Space>
            </Space>

            {/* MAIN: GRID + SIDE PANEL */}
            <Row gutter={16}>
              <Col xs={24} lg={16}>
                {seatLoading ? (
                  <div
                    style={{
                      padding: 40,
                      textAlign: "center",
                      color: "#999",
                    }}
                  >
                    Đang tải sơ đồ ghế...
                  </div>
                ) : !selectedRoom ? (
                  <div
                    style={{
                      padding: 40,
                      textAlign: "center",
                      color: "#999",
                    }}
                  >
                    Vui lòng chọn rạp và phòng chiếu để xem danh sách ghế.
                  </div>
                ) : !hasSeats ? (
                  <div
                    style={{
                      padding: 40,
                      textAlign: "center",
                      color: "#999",
                    }}
                  >
                    Phòng chiếu này chưa có ghế nào được cấu hình.
                  </div>
                ) : (
                  <div
                    style={{
                      borderRadius: 12,
                      border: "1px solid #f0f0f0",
                      padding: 16,
                      background: "#fff",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: `repeat(${Math.max(
                          totalCols,
                          1
                        )}, minmax(48px, 1fr))`,
                        gap: 8,
                      }}
                    >
                      {Array.from({ length: totalRows }, (_, rowIndex) => {
                        const rowNumber = rowIndex + 1;
                        return Array.from(
                          { length: totalCols },
                          (_, colIndex) => {
                            const seat =
                              seatLookup.get(`${rowNumber}-${colIndex + 1}`) ||
                              null;
                            return renderSeat(
                              seat,
                              `${rowNumber}-${colIndex + 1}`
                            );
                          }
                        );
                      }).flat()}
                    </div>
                  </div>
                )}
              </Col>

              <Col xs={24} lg={8}>
                <Card size="small" title="Ghế đã chọn">
                  <Space
                    style={{ marginBottom: 8 }}
                    split={<Divider type="vertical" />}
                  >
                    <Button
                      type="link"
                      onClick={handleSelectAll}
                      disabled={!hasSeats}
                    >
                      Chọn tất cả
                    </Button>
                    <Button
                      type="link"
                      danger
                      onClick={handleClearSelection}
                      disabled={!selectedSeatIds.length}
                    >
                      Bỏ chọn
                    </Button>
                  </Space>
                  <Text type="secondary">
                    Đang chọn <b>{totalSelected}</b> ghế.
                  </Text>

                  {selectedSeats.length > 0 && (
                    <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                      {selectedSeats.slice(0, 12).map((s) => (
                        <li key={s.id}>{s.label || `Ghế ${s.id}`}</li>
                      ))}
                      {selectedSeats.length > 12 && (
                        <li>... và {selectedSeats.length - 12} ghế khác</li>
                      )}
                    </ul>
                  )}

                  <Divider />

                  <Space
                    direction="vertical"
                    style={{ width: "100%", marginBottom: 8 }}
                  >
                    <Text>Đổi hạng ghế</Text>
                    <Select
                      style={{ width: "100%" }}
                      value={bulkTier || undefined}
                      onChange={setBulkTier}
                      disabled={!selectedSeatIds.length}
                      placeholder="-- Chọn hạng ghế --"
                      options={DEFAULT_SEAT_TIERS.map((t) => ({
                        value: t,
                        label: t,
                      }))}
                    />
                    <Button
                      type="primary"
                      block
                      onClick={applyBulkTier}
                      disabled={
                        !selectedSeatIds.length ||
                        !bulkTier ||
                        actionLoading === "tier"
                      }
                      loading={actionLoading === "tier"}
                    >
                      Áp dụng hạng ghế
                    </Button>
                  </Space>

                  <Space style={{ width: "100%" }}>
                    <Button
                      block
                      onClick={() => applyBulkStatus(true)}
                      disabled={
                        !selectedSeatIds.length || actionLoading === "activate"
                      }
                      loading={actionLoading === "activate"}
                    >
                      Mở khóa ghế
                    </Button>
                    <Button
                      block
                      danger
                      onClick={() => applyBulkStatus(false)}
                      disabled={
                        !selectedSeatIds.length ||
                        actionLoading === "deactivate"
                      }
                      loading={actionLoading === "deactivate"}
                    >
                      Khóa ghế
                    </Button>
                  </Space>

                  <Divider />

                  <Space
                    direction="vertical"
                    style={{ width: "100%", marginTop: 4 }}
                  >
                    <Title level={5} style={{ marginBottom: 4 }}>
                      Chi tiết ghế
                    </Title>
                    {!focusedSeat ? (
                      <Text type="secondary">
                        Chọn một ghế để xem chi tiết và thao tác nhanh.
                      </Text>
                    ) : (
                      <>
                        <Space style={{ justifyContent: "space-between" }}>
                          <Text type="secondary">Mã ghế:</Text>
                          <Text strong>
                            {focusedSeat.label || `Ghế ${focusedSeat.id}`}
                          </Text>
                        </Space>
                        <Space style={{ justifyContent: "space-between" }}>
                          <Text type="secondary">Hàng ghế:</Text>
                          <Text strong>
                            {focusedSeat.row
                              ? String.fromCharCode(
                                  "A".charCodeAt(0) + (focusedSeat.row - 1)
                                )
                              : "-"}
                          </Text>
                        </Space>
                        <Space style={{ justifyContent: "space-between" }}>
                          <Text type="secondary">Cột:</Text>
                          <Text strong>{focusedSeat.col ?? "-"}</Text>
                        </Space>
                        <Space style={{ justifyContent: "space-between" }}>
                          <Text type="secondary">Hạng ghế:</Text>
                          <Text strong>{focusedSeat.tier || "Standard"}</Text>
                        </Space>
                        <Space style={{ justifyContent: "space-between" }}>
                          <Text type="secondary">Trạng thái:</Text>
                          <Tag
                            color={
                              focusedSeat.isActive === false ? "red" : "green"
                            }
                          >
                            {focusedSeat.isActive === false
                              ? "Đang khóa"
                              : "Đang mở"}
                          </Tag>
                        </Space>

                        <Button
                          block
                          style={{ marginTop: 8 }}
                          onClick={toggleFocusedSeat}
                          disabled={
                            !focusedSeat || actionLoading === "single-toggle"
                          }
                          loading={actionLoading === "single-toggle"}
                        >
                          {focusedSeat?.isActive === false
                            ? "Mở khóa ghế này"
                            : "Khóa ghế này"}
                        </Button>
                      </>
                    )}
                  </Space>
                </Card>
              </Col>
            </Row>
          </Card>
        </Content>
      </Layout>
    </>
  );
}
