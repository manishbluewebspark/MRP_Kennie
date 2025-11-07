// components/GlobalModal.js
import React from "react";
import { Modal } from "antd";

const GlobalModal = ({
  visible,
  onCancel,
  onOk,
  header = "Modal Title",
  okText = "Submit",
  width = 700,
  height = "auto", // height can be number or 'auto'
  children
}) => {
  return (
    <Modal
      title={header}
      visible={visible}
      onOk={onOk}
      onCancel={onCancel}
      okText={okText}
      width={width}
      bodyStyle={{ maxHeight: height, overflowY: "auto" }}
    >
      {children}
    </Modal>
  );
};

export default GlobalModal;
