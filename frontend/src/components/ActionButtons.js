// components/ActionButtons.js
import React, { useState } from "react";
import { Button, Space, Popconfirm, Modal, Spin } from "antd";
import { InfoCircleFilled, EditFilled, DeleteFilled, PlusOutlined, ZoomInOutlined, ZoomOutOutlined, ReloadOutlined, MailFilled, CloseOutlined } from "@ant-design/icons";

const ActionButtons = ({
  onInfo,
  onEdit,
  onDelete,
  onExpand,
  onReset,
  showInfo = false,
  showEdit = false,
  showDelete = false,
  showDeleteConfirm = true,
  expandTable = false,
  collapsedTable = false,
  showReset = false,
  showMail = false,
  showCross = false,
  onCross,
  onMail,
  showUpdate = false,
  onUpdate
}) => {

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);


  const handleConfirmDelete = async () => {
    try {
      setLoading(true);
      await onDelete(); // aapke handleDelete function call hoga yaha
      setDeleteModalVisible(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Space>

      {collapsedTable && (
        <Button
          icon={<ZoomOutOutlined style={{ color: "black" }} />}
          style={{
            backgroundColor: "#e7eae7ff", // green background
            border: "none",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            borderRadius: "6px",
          }}
          onClick={onExpand} // 👈 expand handler
        />
      )}
      {expandTable && (
        <Button
          icon={<ZoomInOutlined style={{ color: "black" }} />}
          style={{
            backgroundColor: "#e7eae7ff", // green background
            border: "none",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            borderRadius: "6px",
          }}
          onClick={onExpand} // 👈 expand handler
        />
      )}
      {/* Info Button */}
      {showInfo && (
        <Button
          icon={<InfoCircleFilled style={{ color: "#FFC107" }} />}
          style={{
            backgroundColor: "#FFF8E1",
            border: "none",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
          onClick={onInfo}
        />
      )}

      {/* Reset Button */}
      {showReset && (

        <Button
          icon={<ReloadOutlined style={{ color: "#1890ff" }} />}
          style={{
            backgroundColor: "#E6F7FF",
            border: "none",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: "32px",
            height: "32px"
          }}
          onClick={onReset}
        />

      )}

      {/* Edit Button */}
      {showEdit && (
        <Button
          icon={<EditFilled style={{ color: "#1890ff" }} />}
          style={{
            backgroundColor: "#E6F7FF",
            border: "none",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
          onClick={onEdit}
        />
      )}

      {/* Edit Button */}
      {showMail && (
        <Button
          icon={<MailFilled style={{ color: "#3c3d3eff" }} />}
          style={{
            backgroundColor: "#d5d6d7a3",
            border: "none",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
          onClick={onMail}
        />
      )}

      {/* Edit Button */}
      {showCross && (
        <Button
          icon={<CloseOutlined style={{ color: "#FF4D4F" }} />}
          style={{
            backgroundColor: "#FFF1F0",
            border: "none",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
          onClick={onCross}
        />
      )}

      {/* Delete Button */}
      {showDelete && (
        <>
          <Button
            icon={<DeleteFilled style={{ color: "#FF4D4F" }} />}
            style={{
              backgroundColor: "#FFF1F0",
              border: "none",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
            onClick={() => setDeleteModalVisible(true)}
          />

          <Modal
            open={deleteModalVisible}
            title="Confirm Delete"
            onCancel={() => setDeleteModalVisible(false)}
            footer={[
              <Button key="cancel" onClick={() => setDeleteModalVisible(false)}>
                Cancel
              </Button>,
              <Button
                key="delete"
                type="primary"
                danger
                onClick={handleConfirmDelete}
                disabled={loading}
              >
                {loading ? <Spin size="small" /> : "Delete"}
              </Button>,
            ]}
          >
            <p>Are you sure you want to delete this item? This action cannot be undone.</p>
          </Modal>
        </>
      )}

      {showUpdate && (
        <Button
          type="primary"
          onClick={onUpdate}
        >Update</Button>
      )}
    </Space>
  );
};

export default ActionButtons;
