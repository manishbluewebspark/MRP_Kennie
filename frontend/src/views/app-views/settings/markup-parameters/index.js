import React, { useEffect, useState } from "react";
import { Card, Row, Col, InputNumber, Button, message } from "antd";
import MarkupParameterService from "services/MarkupParameterService";
import { hasPermission } from "utils/auth";

const MarkupParameterPage = () => {
  const [materialsMarkup, setMaterialsMarkup] = useState(0);
  const [manhourMarkup, setManhourMarkup] = useState(0);
  const [packingMarkup, setPackingMarkup] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch existing markup values
  const fetchMarkup = async () => {
    try {
      const res = await MarkupParameterService.getAllMarkupParameters();
      if (res?.success && res.data.length > 0) {
        const latest = res.data[0];
        setMaterialsMarkup(latest.materialsMarkup);
        setManhourMarkup(latest.manhourMarkup);
        setPackingMarkup(latest.packingMarkup);
      }
    } catch (err) {
      console.error(err);
      message.error("Failed to fetch markup parameters");
    }
  };

  useEffect(() => {
    fetchMarkup();
  }, []);

  // Save API (single function)
  const saveMarkup = async (fieldName) => {
    setLoading(true);
    try {
      // Send all current state values
      const res = await MarkupParameterService.addOrUpdateMarkupParameter({
        materialsMarkup,
        manhourMarkup,
        packingMarkup,
      });

      if (res?.success) {
        message.success(`${fieldName} saved successfully`);
      } else {
        message.error(res?.message || "Failed to save markup");
      }
    } catch (err) {
      console.error(err);
      message.error("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Card style={{ marginBottom: "10px" }}>
        <h2>Markup Parameters</h2>
        <p style={{ color: "#666" }}>
          Set percentages for materials, labor, and packing/others
        </p>
      </Card>

      <Row gutter={16}>
        {/* Materials */}
        <Col span={8}>
          <Card style={{ padding: "16px" }}>
            <h3>Materials Markup</h3>
            <InputNumber
              style={{ width: "100%", marginTop: "8px" }}
              min={0}
              max={100}
              value={materialsMarkup}
              onChange={(val) => setMaterialsMarkup(val)}
            />
            <span>Markup applied to material costs</span>
            {hasPermission('settings.markupParameter:update_material_settings') && (<Button
              style={{ marginTop: "8px" }}
              type="primary"
              block
              loading={loading}
              onClick={() => saveMarkup("Materials Markup")}
            >
              Save Materials
            </Button>)}
            
          </Card>
        </Col>

        {/* Manhour */}
        <Col span={8}>
          <Card style={{ padding: "16px" }}>
            <h3>Manhour Markup</h3>
            <InputNumber
              style={{ width: "100%", marginTop: "8px" }}
              min={0}
              max={100}
              value={manhourMarkup}
              onChange={(val) => setManhourMarkup(val)}
            />
            <span>Markup applied to labor costs</span>
            {hasPermission('settings.markupParameter:update_manhour_settings') && (<Button
              style={{ marginTop: "8px" }}
              type="primary"
              block
              loading={loading}
              onClick={() => saveMarkup("Manhour Markup")}
            >
              Save Manhour
            </Button>)}
            
          </Card>
        </Col>

        {/* Packing/Others */}
        <Col span={8}>
          <Card style={{ padding: "16px" }}>
            <h3>Packing/Others Markup</h3>
            <InputNumber
              style={{ width: "100%", marginTop: "8px" }}
              min={0}
              max={100}
              value={packingMarkup}
              onChange={(val) => setPackingMarkup(val)}
            />
            <span>Markup applied to packing/other costs</span>
            {hasPermission('settings.markupParameter:update_packing_settings') && (<Button
              style={{ marginTop: "8px" }}
              type="primary"
              block
              loading={loading}
              onClick={() => saveMarkup("Packing/Others Markup")}
            >
              Save Packing/Others
            </Button>)}
            
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default MarkupParameterPage;
