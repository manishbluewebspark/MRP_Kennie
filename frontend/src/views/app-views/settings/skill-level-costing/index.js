import React, { useEffect, useState } from "react";
import { Table, Button, Row, Col, Input, Space, Typography, Tag } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import ActionButtons from "components/ActionButtons";
import AddSkillLevelModal from "./AddSkillLevelModal";
import useDebounce from "utils/debouce";
import { addSkillLevelCosting, deleteSkillLevelCosting, fetchSkillLevelCostings, updateSkillLevelCosting } from "store/slices/skillLevelCostingSlice";
import SkillLevelCostingService from "services/SkillLevelCostingService";
import { getAllCurrencies } from "store/slices/currencySlice";
import { getAllUOMs } from "store/slices/uomSlice";
import { hasPermission } from "utils/auth";
import { render } from "@testing-library/react";
const { Title, Text } = Typography;


const SkillLevelCostingList = () => {
  const dispatch = useDispatch();
  // const { list, total } = useSelector((state) => state.list);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [skillLevelCostings, setSkillLevelCostings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { currencies } = useSelector((state) => state.currency);
  const { uoms } = useSelector((state) => state.uoms);

  const [pagination, setPagination] = useState(null)
  
  useEffect(() => {
    fetchData();
  }, []);


  useEffect(() => {
    dispatch(getAllCurrencies());
    dispatch(getAllUOMs())
  }, [dispatch]);


  const fetchData = async (params = {}) => {
    setLoading(true);
    setError(null);
    const { page = 1, limit = 10, search = "", ...filters } = params;
    try {
      const res = await SkillLevelCostingService.getAllSkillLevelCostings({ page, limit, search, ...filters });

      // Agar API response data array me aa raha hai
      setSkillLevelCostings(res.data || []);
      setPagination(res?.pagination)
    } catch (err) {
      console.error("Failed to fetch skill level costings:", err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values, isEdit) => {
    if (isEdit) {
      await dispatch(updateSkillLevelCosting({ id: editing._id, data: values }));
    } else {
      await dispatch(addSkillLevelCosting(values));
    }
    setShowModal(false);
    setEditing(null);
    fetchData()
  };

  const handleEdit = (record) => {
    setEditing(record);
    setShowModal(true);
  };

  const handleDelete = (id) => {
    dispatch(deleteSkillLevelCosting(id));
    fetchData()
  };

  const columns = [
    {
      title: "",
      key: "projectDetails",
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <Space direction="vertical" style={{ width: '100%' }} size={0}>
            <Title level={4} style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
              {record.skillLevelName || 'Cable Harness Technician - Day'}
            </Title>
           
            <Space size="middle" style={{ marginTop: 4 }}>
              <Tag color="blue">{record.currencyType?.code}{record.rate}/{record?.type.code}</Tag>
            </Space>
          </Space>
        </div>
      )
    },
    {
      title: "",
      key: "description",
      render:(_,record)=>( <Text type="secondary" style={{ fontSize: '14px' }}>
              {record.description || 'More complex Cable Harness & Assembly Works'}
            </Text>)
    },
    {
      title: "",
      key: "actions",
      width: 160,
      render: (_, record) => (
        <ActionButtons
          onEdit={() => handleEdit(record)}
          onDelete={() => handleDelete(record._id)}
          showEdit={hasPermission("settings.skillLevel:create_edit_delete")}
          showDelete={hasPermission("settings.skillLevel:create_edit_delete")}
        />
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <h2>Skill Level Costing</h2>
          <p style={{ color: "#888" }}>Manage skill levels and their rates</p>
        </Col>
        <Col>
          {hasPermission("settings.skillLevel:create_edit_delete") && (<Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(null);
              setShowModal(true);
            }}
          >
            Add Skill Level
          </Button>)}

        </Col>
      </Row>

      {/* <Row style={{ marginBottom: 12 }}>
        <Col span={6}>
          <Input
            placeholder="Search skill level"
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Col>
      </Row> */}

      <Table
        columns={columns}
        dataSource={skillLevelCostings}
        loading={loading}
        rowKey="_id"
        pagination={{
          current: page,
          pageSize: limit,
          total: pagination?.total || 0,
          onChange: (p, l) => {
            setPage(p);
            setLimit(l);
            fetchData({ page: p, limit: l });
          }
        }}

      />

      <AddSkillLevelModal
        visible={showModal}
        onCancel={() => {
          setShowModal(false);
          setEditing(null);
        }}
        formData={editing}
        onSubmit={handleSubmit}
        currencies={currencies}
        uoms={uoms}
      />
    </div>
  );
};

export default SkillLevelCostingList;
