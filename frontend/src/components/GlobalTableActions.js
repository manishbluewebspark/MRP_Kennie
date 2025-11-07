// components/GlobalTableActions.js
import React, { useRef, useState } from "react";
import { Input, Button, Space } from "antd";
import {
  SearchOutlined,
  UploadOutlined,
  CloudDownloadOutlined,
  FilterOutlined,
  SettingFilled,
  ZoomInOutlined,
  ZoomOutOutlined,
  SettingOutlined,
  FilePdfOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

const GlobalTableActions = ({
  showSearch = false,
  onSearch,
  searchPlaceholder = "Search...",
  showImport = false,
  onImport,
  importText = "Import Excel",
  showExport = false,
  onExport,
  exportText = "Export Excel",
  showFilter = false,
  onFilter,
  filterText = "Filter",
  showUpdatePurchaseHistory = false,
  onUpdatePurchaseHistory,
  updatePurchaseText = "Update Purchase History",
  showPurchase = false,
  showPurchaseText = "Show Purchase History",
  onShowPurchaseHistory,
  showProductSetting,
  onProductSetting=false,
  showProductSettingText,
  showMPNTracker,
  onMPNTracker,
  showExportPDF,
  onExportPDF,
   showExportWord,
  onExportWord,
  showImportWorkOrder = false,
  onImportWorkOrder
}) => {
  const fileInputRef = useRef(null);
  const [showPurchasess, setShowPurchase] = useState(false);

  const handleToggle = () => {
    setShowPurchase(!showPurchasess);
    onShowPurchaseHistory?.(); // callback trigger
  };



  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && onImport) {
      onImport(file); // pass selected file
    }
    e.target.value = ""; // reset input so same file can be reselected
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        width: "100%",
      }}
    >
      {/* Search Input */}
      {showSearch && (
        <Input
          placeholder={searchPlaceholder}
          prefix={<SearchOutlined />}
          style={{ width: 300, borderRadius: 8 }}
          onChange={(e) => onSearch && onSearch(e.target.value)}
        />
      )}

      {/* Action Buttons */}
      <Space>
        {showPurchase && (
          <>
            <Button
              icon={showPurchasess ? <ZoomOutOutlined /> : <ZoomInOutlined />}
              type="default"
              onClick={handleToggle}
            >
              {showPurchasess ? "Hide Purchase History" : "Show Purchase History"}
            </Button>
          </>
        )}

        {showMPNTracker && (
          <Button icon={<SettingOutlined />} type="default" onClick={onMPNTracker}>
            MPN Tracker
          </Button>
        )}


        {showImportWorkOrder && (
          <Button icon={<SettingOutlined />} type="default" onClick={onImportWorkOrder}>
            Import Work Order
          </Button>
        )}

        {showImport && (
          <>
            <Button
              icon={<UploadOutlined />}
              type="default"
              onClick={handleImportClick}
            >
              {importText}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
          </>
        )}

        {showExportPDF && (
          <Button
            icon={<FilePdfOutlined />}
            type="default"
            onClick={onExportPDF}
          >
            Export PDF
          </Button>
        )}

        {showExportWord && (
          <Button
            icon={<FilePdfOutlined />}
            type="default"
            onClick={onExportWord}
          >
            Export Word
          </Button>
        )}

        {showExport && (
          <Button
            icon={<CloudDownloadOutlined />}
            type="default"
            onClick={onExport}
          >
            {exportText}
          </Button>
        )}

        {showUpdatePurchaseHistory && (
          <Button
            icon={<ReloadOutlined />}
            type="default"
            onClick={onUpdatePurchaseHistory}
          >
            {updatePurchaseText}
          </Button>
        )}

        {showFilter && (
          <Button icon={<FilterOutlined />} type="default" onClick={onFilter}>
            {filterText}
          </Button>
        )}

        {showProductSetting && (
          <Button icon={<SettingOutlined />} type="default" onClick={onProductSetting}>
            {showProductSettingText}
          </Button>
        )}
      </Space>
    </div>
  );
};

export default GlobalTableActions;
