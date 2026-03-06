import { useEffect, useMemo, useState } from "react";
import { Modal, Form, Input, DatePicker, Button, Alert, Spin, Space } from "antd";
import { UserOutlined, PhoneOutlined, CalendarOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { toDateInputValue, toLocalDayjs } from "../../utils/datetime";

function normalizeDateInput(value) {
  return toDateInputValue(value);
}

function isFutureDate(value) {
  const candidate = toLocalDayjs(value);
  if (!candidate) return false;

  const today = toLocalDayjs(new Date());
  if (!today) return false;

  return candidate.startOf("day").isAfter(today.startOf("day"));
}

export default function UserProfileModal({
  open,
  onClose,
  profile,
  loading = false,
  updating = false,
  error = "",
  onSubmit,
}) {
  const [form] = Form.useForm();
  const [isEditing, setIsEditing] = useState(false);
  const [localError, setLocalError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (!open) return;

    form.setFieldsValue({
      fullName: profile?.fullName ?? "",
      phoneNumber: profile?.phoneNumber ?? "",
      dateOfBirth: profile?.dateOfBirth ? dayjs(profile.dateOfBirth) : null,
    });

    setIsEditing(false);
    setLocalError("");
    setStatusMessage("");
  }, [open, profile, form]);

  useEffect(() => {
    if (!error) return;
    setLocalError(error);
  }, [error]);

  const disabled = loading || updating;

  const handleSubmit = async (values) => {
    setLocalError("");

    const dateValue = values.dateOfBirth
      ? values.dateOfBirth.format("YYYY-MM-DD")
      : null;

    if (dateValue && isFutureDate(dateValue)) {
      setLocalError("Ngày sinh không thể ở tương lai.");
      return;
    }

    try {
      await onSubmit?.({
        fullName: values.fullName?.trim() || "",
        phoneNumber: values.phoneNumber?.trim() || "",
        dateOfBirth: dateValue,
      });
      setLocalError("");
      setStatusMessage("Cập nhật thông tin thành công!");
      setIsEditing(false);
    } catch (err) {
      setLocalError(
        err?.message && err.message !== "Network Error"
          ? err.message
          : "Cập nhật thông tin thất bại."
      );
    }
  };

  const handleCancelEdit = () => {
    form.setFieldsValue({
      fullName: profile?.fullName ?? "",
      phoneNumber: profile?.phoneNumber ?? "",
      dateOfBirth: profile?.dateOfBirth ? dayjs(profile.dateOfBirth) : null,
    });
    setIsEditing(false);
    setLocalError("");
    setStatusMessage("");
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="👤 Thông tin cá nhân"
      footer={null}
      centered
      width={450}
      destroyOnClose
    >
      {loading && !profile ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin tip="Đang tải thông tin..." />
        </div>
      ) : (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark={false}
        >
          <Form.Item name="fullName" label="Họ và Tên">
            <Input
              prefix={<UserOutlined />}
              placeholder="Nguyễn Văn A"
              disabled={!isEditing || disabled}
              size="large"
            />
          </Form.Item>

          <Form.Item name="phoneNumber" label="Số điện thoại">
            <Input
              prefix={<PhoneOutlined />}
              placeholder="0123 456 789"
              disabled={!isEditing || disabled}
              size="large"
            />
          </Form.Item>

          <Form.Item name="dateOfBirth" label="Ngày sinh">
            <DatePicker
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              placeholder="Chọn ngày sinh"
              disabled={!isEditing || disabled}
              size="large"
              disabledDate={(current) =>
                current && current > dayjs().endOf("day")
              }
            />
          </Form.Item>

          {(localError || statusMessage) && (
            <Alert
              message={localError || statusMessage}
              type={localError ? "error" : "success"}
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Form.Item style={{ marginBottom: 0 }}>
            {isEditing ? (
              <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                <Button onClick={handleCancelEdit} disabled={disabled}>
                  Hủy
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={updating}
                >
                  Lưu thay đổi
                </Button>
              </Space>
            ) : (
              <Button
                type="primary"
                block
                onClick={() => {
                  setIsEditing(true);
                  setLocalError("");
                  setStatusMessage("");
                }}
                disabled={
                  disabled || (!profile && !form.getFieldValue("fullName"))
                }
              >
                Chỉnh sửa
              </Button>
            )}
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}
