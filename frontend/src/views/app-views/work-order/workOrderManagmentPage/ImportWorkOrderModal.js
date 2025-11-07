import React from "react";
import { Modal, Space, Button, Upload, Typography, message } from "antd";
import { InboxOutlined, UploadOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;
const { Dragger } = Upload;

const ImportWorkOrderModal = ({ visible, onClose, onQuoteTypeSelect }) => {
  const [selected, setSelected] = React.useState("cable_harness");
  const [file, setFile] = React.useState(null);

  const quoteTypes = [
    { value: "cable_assembly", title: "Cable Harness/Assembly", description: "Generate quote with all drawing costing data" },
    { value: "box_Build_assembly", title: "Box Build Assembly", description: "Drawing & BOM list will import under Work Order" },
    { value: "others_assembly", title: "Other Quote", description: "Generate customer.quote_for_other.services" },
  ];

  const uploadProps = {
    name: "file",
    multiple: false,
    beforeUpload: (file) => {
      setFile(file);
      message.success(`${file.name} selected successfully`);
      return false; // stop auto upload
    },
    onRemove: () => {
      setFile(null);
      message.info("File removed");
    },
  };

  const handleContinue = () => {
    // Send both selected type + file (if any)
    onQuoteTypeSelect({ type: selected, file });
    onClose();
  };

  return (
    <Modal
      title="Import Work Order"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" onClick={handleContinue}>
          Continue
        </Button>,
      ]}
      width={720}
      centered
    >
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        <div>
          {quoteTypes.map((q) => (
            <div
              key={q.value}
              onClick={() => setSelected(q.value)}
              style={{
                border: selected === q.value ? "2px solid #1890ff" : "1px solid #e8e8e8",
                padding: 12,
                borderRadius: 6,
                marginBottom: 8,
                cursor: "pointer",
                background: selected === q.value ? "#f0f8ff" : "#fafafa",
              }}
            >
              <Text strong style={{ display: "block" }}>{q.title}</Text>
              <Text type="secondary">{q.description}</Text>
            </div>
          ))}
        </div>

        <div>
          <Dragger {...uploadProps} style={{ borderRadius: 8 }}>
            <p style={{ fontSize: 28, color: "#1890ff" }}><InboxOutlined /></p>
            <Title level={5}>Import drawings (optional)</Title>
            <Text type="secondary">Drag & drop a file here, or click to select</Text>
            <div style={{ marginTop: 12 }}>
              <Button icon={<UploadOutlined />}>Browse Files</Button>
            </div>
          </Dragger>
          {file && (
            <div style={{ marginTop: 8 }}>
              <Text type="success">Selected File:</Text> <Text strong>{file.name}</Text>
            </div>
          )}
        </div>
      </Space>
    </Modal>
  );
};

export default ImportWorkOrderModal;
