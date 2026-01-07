import React from "react";
import { Modal, Button, Spin } from "antd";

const ConfirmDeleteModal = ({
  open,
  onCancel,
  onConfirm,
  loading = false,
  title = "Confirm Delete",

  // mode / text
  mode = "single", // "single" | "bulk"
  count = 0,
  singleText = "Are you sure you want to delete this item? This action cannot be undone.",
  bulkText = (c) =>
    `Are you sure you want to delete ${c} selected items? This action cannot be undone.`,

  // button labels
  cancelText = "Cancel",
  confirmText = "Delete",

  // modal props
  width = 520,
  centered = false,
}) => {
  const message =
    mode === "bulk" ? (typeof bulkText === "function" ? bulkText(count) : bulkText) : singleText;

  return (
    <Modal
      open={open}
      title={title}
      centered={centered}
      width={width}
      onCancel={() => !loading && onCancel?.()}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={loading}>
          {cancelText}
        </Button>,
        <Button
          key="delete"
          type="primary"
          danger
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? <Spin size="small" /> : confirmText}
        </Button>,
      ]}
    >
      <p style={{ margin: 0 }}>{message}</p>
    </Modal>
  );
};

export default ConfirmDeleteModal;
