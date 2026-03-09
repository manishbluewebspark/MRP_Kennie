import React, { useEffect, useState } from "react";
import {
  Table,
  Card,
  Tag,
  Input,
  Tooltip,
  message,
} from "antd";
import {
  EditOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { useParams } from "react-router-dom";
import DemandListService from "services/DemandListService";
import { formatDate } from "utils/formatDate";
import useDebounce from "utils/debouce";

/* =======================
   Helpers
======================= */

const shortageTag = (shortage) =>
  shortage > 0
    ? <Tag color="red">Shortage</Tag>
    : <Tag color="green">Available</Tag>;

const purchaseTag = (required) =>
  required
    ? <Tag color="volcano">Yes</Tag>
    : <Tag>No</Tag>;

/* =======================
   Component
======================= */

const DemandListItemsPage = () => {
  const { id } = useParams();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editRow, setEditRow] = useState({});

  /* =======================
     Fetch Items
  ======================= */

  const fetchItems = async (params = {}) => {
    setLoading(true);
    try {
      const res = await DemandListService.getDemandListById(id, {
        search: params.search ?? search,
      });
      // console.log('----res',res)

      setData(res?.items || []);
    } catch (err) {
      console.error(err);
      message.error("Failed to load demand list items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [id]);

  const handleSearch = useDebounce((val) => {
    fetchItems({ search: val });
  }, 500);

  /* =======================
     Save Item
  ======================= */

  const handleSave = async (record) => {
    try {
      const qty = Number(editRow.qtyRequired || 0);
      const stock = Number(editRow.stock || 0);
      const shortage = Math.max(qty - stock, 0);

      await DemandListService.updateDemandListItem(record._id, {
        qtyRequired: qty,
        stock,
        shortage,
        purchaseRequired: shortage > 0,
        status: shortage > 0 ? "Shortage" : "Available",
      });

      message.success("Item updated");
      setEditingId(null);
      fetchItems();
    } catch (e) {
      message.error("Failed to update item");
    }
  };

  /* =======================
     Columns
  ======================= */

  const columns = [
    {
      title: "Part Number",
      dataIndex: "partNumber",
      fixed: "left",
    },
    {
      title: "Manufacturer",
      dataIndex: "manufacturer",
    },
    {
      title: "UOM",
      dataIndex: "uom",
      width: 80,
    },
    {
      title: "Qty Required",
      dataIndex: "qtyRequired",
      render: (val, record) =>
        editingId === record._id ? (
          <Input
            type="number"
            value={editRow.qtyRequired}
            onChange={(e) =>
              setEditRow({ ...editRow, qtyRequired: e.target.value })
            }
          />
        ) : (
          val
        ),
    },
    {
      title: "Required Date",
      dataIndex: "requiredDate",
      render: formatDate,
    },
    {
      title: "Stock Status",
      dataIndex: "stockStatus",
    },
    {
      title: "Shortage",
      dataIndex: "shortage",
      render: shortageTag,
    },
    {
      title: "Purchase Required",
      dataIndex: "purchaseRequired",
      render: purchaseTag,
    },
    {
      title: "Actions",
      align: "center",
      width: 120,
      render: (_, record) =>
        editingId === record._id ? (
          <Tooltip title="Save">
            <SaveOutlined
              style={{ color: "#22c55e", cursor: "pointer" }}
              onClick={() => handleSave(record)}
            />
          </Tooltip>
        ) : (
          <Tooltip title="Edit">
            <EditOutlined
              style={{ color: "#1677ff", cursor: "pointer" }}
              onClick={() => {
                setEditingId(record._id);
                setEditRow(record);
              }}
            />
          </Tooltip>
        ),
    },
  ];

  /* =======================
     Render
  ======================= */

  return (
    <Card
      title="Demand List Items"
      extra={
        <Input.Search
          placeholder="Search part / manufacturer..."
          allowClear
          onChange={(e) => {
            setSearch(e.target.value);
            handleSearch(e.target.value);
          }}
          style={{ width: 260 }}
        />
      }
    >
      <Table
        rowKey="_id"
        columns={columns}
        dataSource={data}
        loading={loading}
        scroll={{ x: 1200 }}
        pagination={false}
      />
    </Card>
  );
};

export default DemandListItemsPage;
