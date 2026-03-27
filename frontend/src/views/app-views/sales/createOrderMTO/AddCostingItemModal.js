import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Modal, Form, Input, InputNumber, Select, Button, Divider, Typography,
  Row, Col, DatePicker, Card, message
} from 'antd';
import { CloseOutlined, SaveOutlined } from '@ant-design/icons';
import LibraryService from 'services/libraryService';
import SkillLevelCostingService from 'services/SkillLevelCostingService';
import dayjs from 'dayjs';
import moment from 'moment';
import useDebounce from 'utils/debouce';
import { categorizeUOMs } from 'utils/unitConversion';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
export const convertLengthUnitPrice = (pricePerBaseUnit, baseUnit, targetUnit) => {
  if (!pricePerBaseUnit || !baseUnit || !targetUnit) return pricePerBaseUnit;

  const lengthMap = {
    M: 1,
    MM: 1000,
    CM: 100,
    FT: 3.28084,
    INCH: 39.3701,
    IN: 39.3701
  };

  // only for length units
  const isLengthUnit = (unit) =>
    ["M", "MM", "CM", "FT", "INCH", "IN"].includes(unit);

  if (!isLengthUnit(baseUnit) || !isLengthUnit(targetUnit)) {
    return pricePerBaseUnit;
  }

  if (!(baseUnit in lengthMap) || !(targetUnit in lengthMap)) {
    return pricePerBaseUnit;
  }

  // default quantity = 1
  const quantity = 1;

  // STEP 1: target → meters
  const targetInMeters = quantity / lengthMap[targetUnit];

  // STEP 2: meters → base unit
  const targetInBaseUnit = targetInMeters * lengthMap[baseUnit];

  // STEP 3: final price (NO currency conversion here)
  const finalPrice = targetInBaseUnit * pricePerBaseUnit;

  return Number(finalPrice.toFixed(2));
};

// export const convertLengthUnitPrice = (price, from, to) => {
//   // agar price ya unit missing ho, return price
//   if (!price || !from || !to) return price;

//   // agar dono unit same hai, price wapas do
//   if (from === to) return price;

//   // length conversion map
//   const lengthMap = {
//     M: 1,
//     MM: 1000,
//     CM: 100,
//     FT: 3.28084,
//     INCH: 39.3701,
//     IN: 39.3701
//   };

//   // agar koi bhi unit length map me nahi hai, original price wapas do
//   if (!(from in lengthMap) || !(to in lengthMap)) {
//     return price;
//   }

//   // convert price
//   const base = price * lengthMap[from];
//   return base * lengthMap[to];
// };


const AddCostingItemModal = ({
  visible,
  onClose,
  onAction,
  selectedQuoteType,           // 'material' | 'manhour' | 'packing'
  drawingName,
  projectName,
  editData,                    // existing row for edit mode (or undefined for add)
  costingMaterialData,         // has .costingItems to compute next item number
  uoms = [],                   // [{_id, code, ...}]
  suppliers = [],              // [{_id, companyName}]
  mpnList = []                 // [{_id, MPN, ...}]
}) => {
  const [form] = Form.useForm();
  const [childPartOptions, setChildPartOptions] = useState([]);
  const [childPartData, setChildPartData] = useState(null);
  const [loadingChild, setLoadingChild] = useState(false);
  const [childSearch, setChildSearch] = useState("");
  const [childOpen, setChildOpen] = useState(false);
  const [skillLevelOptions, setSkillLevelOptions] = useState([]); // [{value, label, data}]
  const [loadingSkill, setLoadingSkill] = useState(false);
  const [baseUom, setBaseUom] = useState(null);
  const [packingUOM, setPackingUOM] = useState(null)


  
 
  // ---------- helpers ----------
  const S = (v) => (v === null || v === undefined ? '' : String(v));
  const N = (v) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  };
  const DJ = (v) => (v ? dayjs(v) : null);

  // ---------- compute next item number per quote type ----------
  const getNextDrawingNumber = useCallback(() => {
    const items = costingMaterialData?.costingItems || [];
    const filtered = items.filter((d) => d.quoteType === selectedQuoteType);
    if (!filtered.length) return '0001';
    const nums = filtered
      .map((d) => parseInt(d.itemNumber, 10))
      .filter((n) => !isNaN(n));
    const maxNum = nums.length ? Math.max(...nums) : 0;
    return (maxNum + 1).toString().padStart(4, '0');
  }, [costingMaterialData, selectedQuoteType]);


  const loadChildParts = async (searchText = "") => {
    setLoadingChild(true);
    try {
      const res = await LibraryService.getAllChild({
        search: searchText,
        page: 1,
        limit: searchText ? 50 : 10,
      });

      const opts = (res?.data || []).map((item) => ({
        value: item._id,
        label: item.ChildPartNo,
        data: item,
      }));

      setChildPartOptions(opts);


    } catch (err) {
      console.error(err);
      setChildPartOptions([]);
    } finally {
      // setChildOpen(true);
      setLoadingChild(false);
    }
  };



  // ---------- load child parts (for material) ----------
  useEffect(() => {
    if (visible && selectedQuoteType === "material") {
      setChildSearch("");        // reset typed text
      loadChildParts("");        // load first 10
    }
  }, [visible, selectedQuoteType]);

  const handleChildSearch = (val) => {
    setChildSearch(val);         // ✅ typed text keep
    debouncedSearch(val);        // ✅ API search
  };

  const handleChildClear = () => {
    setChildSearch("");
    loadChildParts("");          // back to first 10
  };


  // ---------- load skill levels (for manhour) ----------
  useEffect(() => {
    const loadSkillLevels = async () => {
      setLoadingSkill(true);
      try {
        const response = await SkillLevelCostingService.getAllSkillLevelCostings();
        const opts = (response?.data || []).map((item) => ({
          value: item._id,
          label: `${item?.skillLevelName} - (${item?.currencyType?.symbol || ''}${item?.rate}/${item?.type?.code})`,
          data: item
        }));
        setSkillLevelOptions(opts);
      } catch (error) {
        console.error('Error loading skill levels:', error);
        message.error('Failed to load skill levels');
        setSkillLevelOptions([]);
      } finally {
        setLoadingSkill(false);
      }
    };
    if (visible && selectedQuoteType === 'manhour') {
      loadSkillLevels();
    }
  }, [visible, selectedQuoteType]);

  // ---------- auto-calc: MATERIAL ----------
  const recalcMaterial = useCallback(() => {
    const quantity = N(form.getFieldValue('quantity'));
    const uom = N(form.getFieldValue('uom'));
    const tolerance = N(form.getFieldValue('tolerance'));
    const unitPrice = N(form.getFieldValue('unitPrice'));

    const sgaPercent = N(form.getFieldValue('sgaPercent'));
    const matBurden = N(form.getFieldValue('matBurden'));
    const freightPercent = N(form.getFieldValue('freightPercent')); // optional %
    const fixedFreight = N(form.getFieldValue('freightCost') || form.getFieldValue('fixedFreightCost')); // optional fixed

    const actualQty = quantity + (quantity * (tolerance / 100));
    const extPrice = actualQty * unitPrice;

    const pct = (sgaPercent + matBurden + freightPercent) / 100;
    const salesPrice = extPrice + (extPrice * pct) + fixedFreight;

    form.setFieldsValue({
      tolerance: tolerance,
      actualQty: Number.isFinite(actualQty) ? Number(actualQty.toFixed(4)) : 0,
      extPrice: Number.isFinite(extPrice) ? Number(extPrice.toFixed(4)) : 0,
      salesPrice: Number.isFinite(salesPrice) ? Number(salesPrice.toFixed(4)) : 0
    });
  }, [form]);

  // ---------- auto-calc: PACKING ----------
  const recalcPacking = useCallback(() => {
    const unitPrice = N(form.getFieldValue('unitPrice'));
    const quantity = N(form.getFieldValue('quantity'));
    const extPrice = unitPrice * quantity;

    const sgaPercent = N(form.getFieldValue('sgaPercent'));
    const maxBurden = N(form.getFieldValue('maxBurden'));
    const freightPercent = N(form.getFieldValue('freightPercent'));
    const pct = (sgaPercent + maxBurden + freightPercent) / 100;

    const salesPrice = extPrice + (extPrice * pct);

    form.setFieldsValue({
      extPrice: Number.isFinite(extPrice) ? Number(extPrice.toFixed(4)) : 0,
      salesPrice: Number.isFinite(salesPrice) ? Number(salesPrice.toFixed(4)) : 0
    });
  }, [form]);

  // ---------- handlers that trigger recalcs ----------
  const onQtyTolChange_Material = () => recalcMaterial();
  const onUnitChange_Material = () => recalcMaterial();
  const onPctChange_Material = () => recalcMaterial();
  const onFixedFreightChange_Material = () => recalcMaterial();

  const onQtyChange_Packing = () => recalcPacking();
  const onUnitChange_Packing = () => recalcPacking();
  const onPctChange_Packing = () => recalcPacking();

  // ---------- CHILD PART change (material) ----------
  // const handleChildPartChange = (value, option) => {
  //   console.log('-------value', value, option)
  //    setChildPartData(value || null);
  //   const selected = option?.data;


  //   setChildSearch("");      // search text clear
  //   setChildOpen(false);     // dropdown close


  //   if (selected) {
  //     const unitPrice = selected?.mpn?.RFQUnitPrice ? parseFloat(selected.mpn.RFQUnitPrice) : 0;

  //     form.setFieldsValue({
  //       description: selected?.mpn?.Description || '',
  //       mpn: selected?.mpn?._id || '',
  //       manufacturer: selected?.mpn?.Manufacturer || '',
  //       // uom is reference id in your Select; try to map by code if mpn.UOM is code
  //       uom: selected?.mpn?.UOM,
  //       unitPrice: unitPrice,
  //       moq: selected?.mpn?.MOQ || 0,
  //       supplier: selected?.mpn?.Supplier || '',
  //       rfqDate: selected?.mpn?.RFQDate ? DJ(selected?.mpn?.RFQDate) : null,
  //       leadTime: selected?.mpn?.LeadTime_WK || 0
  //     });

  //     setTimeout(() => recalcMaterial(), 0);
  //   }
  // };

  const handleChildPartChange = (value, option) => {
    // value = { value: _id, label: ChildPartNo }
    console.log('------------last')
    const selected = option?.data;

    setChildPartData(selected || null);
    setChildSearch("");
    setChildOpen(false);
   
    if (selected) {
      const unitPrice = Number(selected?.mpn?.RFQUnitPrice || 0);
      const mpnUom = selected?.mpn?.UOM?.code;

   

      setBaseUom(mpnUom);

      form.setFieldsValue({
        baseunitPrice:unitPrice,
        uom: mpnUom,
        childPart: value,                 // 👈 object, not id
        description: selected?.mpn?.Description || "",
        mpn: selected?.mpn?._id || "",
        manufacturer: selected?.mpn?.Manufacturer || "",
        uom: selected?.mpn?.UOM?._id,
        unitPrice,
        moq: selected?.mpn?.MOQ || 0,
        supplier: selected?.mpn?.Supplier || "",
        rfqDate: selected?.mpn?.RFQDate ? DJ(selected.mpn.RFQDate) : null,
        leadTime: selected?.mpn?.LeadTime_WK || 0,
      });

      setTimeout(recalcMaterial, 0);
    }
  };


  // ---------- SKILL LEVEL change (manhour) ----------
  const handleSkillLevelChange = (value, option) => {
    // console.log('-----option',option)
    const selectedSkill = option?.data;
    if (!selectedSkill) return;

    const unitPrice = N(selectedSkill.hourlyRate || selectedSkill.rate || selectedSkill.unitPrice);

    // UOM from skill level type (object with _id/code)
    const uomId = selectedSkill?.type?._id || form.getFieldValue('uom');

    form.setFieldsValue({
      unitPrice,
      uom: uomId,
      description: selectedSkill?.description || form.getFieldValue('description')
    });

    const qty = N(form.getFieldValue('quantity'));
    form.setFieldsValue({ salesPrice: Number((unitPrice * qty).toFixed(4)) });
  };

  // inside your component

  // const handleMpnChange = (mpnId) => {
  //   const selected = mpnList.find((m) => m._id === mpnId);
  //   console.log('----selected', selected)
  //   if (!selected) return;

  //   const uomId = selected?.UOM?._id || form.getFieldValue('uom');
  //   form.setFieldsValue({
  //     description: selected.Description || "",   // or selected.description
  //     uom: uomId,                      // will auto-select UOM in dropdown
  //     unitPrice: selected.RFQUnitPrice
  //   });
  // };

  const handleUomChange = (uomId) => {

    const selectedUom = uoms.find(u => u._id === uomId);

    const currentPrice = Number(form.getFieldValue("baseunitPrice"));
    console.log('-------currentPrice',currentPrice)

    const from = baseUom;
    const to = selectedUom?.code;
console.log('-------from',from,to)
    const newPrice = convertLengthUnitPrice(currentPrice, from, to);
   console.log('-------newPrice',newPrice)
    form.setFieldsValue({
      unitPrice: Number(newPrice.toFixed(6))
    });

    setTimeout(recalcMaterial, 0);
  };

  const handleMpnChange = (mpnId) => {
    const selected = mpnList.find((m) => String(m._id) === String(mpnId));
    if (!selected) return;

    console.log('-------selected',selected)
    setPackingUOM(selected?.UOM?.code)
    const uomId =
      selected?.UOM?._id ||
      selected?.UOM ||               // if already id
      form.getFieldValue("uom");
   
    const unitPrice = Number(selected?.RFQUnitPrice || 0);
   
    // quantity agar blank ho to 1 set kar do
    const qty = Number(form.getFieldValue("quantity") || 1);

    form.setFieldsValue({
      mpn: mpnId,
      description: selected?.Description || "",
      uom: uomId,
      unitPrice,
      quantity: qty,
    });

    // ✅ IMPORTANT: setFieldsValue onChange trigger nahi karta
    // so manual recalculation
    setTimeout(() => {
      recalcPacking(); // <-- your existing function
    }, 0);
  };



  // ---------- EFFECT: initialize form values on open / edit ----------
  useEffect(() => {
    if (!visible) return;
    console.log('-------editData',editData)
    // reset for add
    if (!editData) {
      form.resetFields();
      form.setFieldsValue({
        itemNumber: getNextDrawingNumber(),
        quantity: 1,
        unitPrice: 0,
        salesPrice: 0,
        ...(selectedQuoteType === 'material'
          ? { sgaPercent: 0, freightCost: 0, leadTime: 0, matBurden: 0, actualQty: 1.0, freightPercent: 0 }
          : selectedQuoteType === 'packing'
            ? { sgaPercent: 0, maxBurden: 0, freightPercent: 0, extPrice: 0 }
            : {})
      });
      setChildPartData(null);
      return;
    }

    // edit mode: set raw fields directly; fix DatePicker fields
    
    const raw = { ...editData };
    if (raw.rfqDate) raw.rfqDate = DJ(raw.rfqDate);

    // normalize reference ids for Selects (mpn, uom, supplier, childPart, skillLevel)
    if (raw.mpn && raw.mpn._id) raw.mpn = raw.mpn._id;
    if (raw.uom && raw.uom._id) raw.uom = raw.uom._id;
    if (raw.supplier && raw.supplier._id) raw.supplier = raw.supplier._id;
    // if (raw.childPart && raw.childPart._id) raw.childPart = raw.childPart._id;
    if (raw.childPart && raw.childPart._id) {
      raw.childPart = {
        value: raw.childPart._id,
        label: raw.childPart.ChildPartNo || raw.childPart.partNo || "Selected"
      };
    }
    if (raw.skillLevel && raw.skillLevel._id) raw.skillLevel = raw.skillLevel._id;

    form.setFieldsValue(raw);
 
    // If material & childPart present, populate dependent fields via handler
    if (selectedQuoteType === 'material' && raw.childPart) {

    

      // console.log('-------opt', raw.childPart)
      const opt = childPartOptions.find(o => o.value === raw.childPart);
      // console.log('-------opt', opt)
      if (opt) handleChildPartChange(raw.childPart, opt);
      else setChildPartData(null);
      setTimeout(() => recalcMaterial(), 0);
    }

    // If packing, ensure UOM & MPN are preselected even if only objects provided
    if (selectedQuoteType === 'packing') {
     
      if (editData?.uom?._id) form.setFieldsValue({ uom: editData.uom._id });
      if (editData?.mpn?._id) form.setFieldsValue({ mpn: editData.mpn._id });
      setTimeout(() => recalcPacking(), 0);
    }

    // For material, ensure UOM/MPN as well (if provided as objects)
    if (selectedQuoteType === 'material') {
       setChildPartData(editData)
      setBaseUom(editData?.uom?.code)
      if (editData?.uom?._id) form.setFieldsValue({ uom: editData.uom._id });
      if (editData?.mpn?._id) form.setFieldsValue({ mpn: editData.mpn._id });
      if (editData?.lastEditedBy?.name) form.setFieldsValue({ editedBy: editData?.lastEditedBy?.name });
       if (editData?.mpn?.RFQUnitPrice) {
    form.setFieldsValue({
      baseunitPrice: editData.mpn.RFQUnitPrice
    });
  }
    }
  }, [visible, editData, selectedQuoteType, childPartOptions, form, getNextDrawingNumber, recalcMaterial, recalcPacking]);

  // ---------- EFFECT: after skill options arrive, auto-select for edit (manhour) ----------
  useEffect(() => {
    if (!visible) return;
    if (selectedQuoteType !== 'manhour') return;
    if (!editData?.skillLevel) return;
    if (!skillLevelOptions.length) return;

    const targetId = editData.skillLevel?._id || editData.skillLevel;
    const sl = skillLevelOptions.find(o => o.value === targetId);
    if (sl) {
      form.setFieldsValue({ skillLevel: sl.value });
      handleSkillLevelChange(sl.value, sl);
    }
  }, [visible, selectedQuoteType, editData, skillLevelOptions, form]);

  const debouncedSearch = useDebounce((val) => {
    loadChildParts(val);
  }, 1000);


  // ---------- EFFECT: if UOM list arrives later, try to map by code for edit (packing/material) ----------
  useEffect(() => {
    if (!visible) return;
    if (!uoms.length) return;
    if (!editData) return;

    const ensureUom = () => {
      if (editData?.uom?._id) {
        form.setFieldsValue({ uom: editData.uom._id });
        return;
      }
      // fallback if editData.uom is code string
      const target = editData?.uom;
      const match =
        uoms.find(u => String(u._id) === String(target)) ||
        uoms.find(u => (u.code || '').toLowerCase() === String(target || '').toLowerCase());
      if (match) form.setFieldsValue({ uom: match._id });
    };

    if (selectedQuoteType === 'packing' || selectedQuoteType === 'material') {
      ensureUom();
    }
  }, [visible, uoms, editData, selectedQuoteType, form]);

  // ---------- cancel ----------
  const handleCancel = () => {
    form.resetFields();
    setChildPartData(null);
    onClose && onClose();
  };

  // ---------- submit ----------
  const handleSubmit = (actionType) => {
    form.validateFields()
      .then((values) => {
        // normalize outgoing payload
        const payload = { ...values };

        // Dates -> ISO strings
        if (payload.rfqDate && dayjs.isDayjs(payload.rfqDate)) {
          payload.rfqDate = payload.rfqDate.toDate();
        }

        if (payload.childPart && typeof payload.childPart === "object") {
          payload.childPart = payload.childPart.value;
        }

        // keep quoteType in payload for backend clarity
        payload.quoteType = selectedQuoteType;

        onAction && onAction(actionType, payload, selectedQuoteType);
      })
      .catch((err) => {
        console.log('Validation failed:', err);
      });
  };

  // ---------- title ----------
  const getModalTitle = () => {
    const base =
      selectedQuoteType === 'manhour' ? 'Manhour Costing Item'
        : selectedQuoteType === 'packing' ? 'Packing/Others Costing Item'
          : 'Costing Item';
    return editData ? `Edit ${base}` : `Add New ${base}`;
  };

  // ---------- forms ----------
  const MaterialForm = (
    <>
      <Card
        style={{ backgroundColor: '#fafafa', border: '1px solid #e8e8e8', borderRadius: 8 }}
        bodyStyle={{ padding: '5px 5px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Selected Drawing</Text>
            <Text strong style={{ display: 'block', fontSize: 16 }}>{drawingName}</Text>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>Project</Text>
            <Text strong style={{ display: 'block', fontSize: 16 }}>{projectName}</Text>
          </div>
        </div>
      </Card>

      {childPartData && (
        <div style={{ marginBottom: 16, padding: 8, backgroundColor: '#f0f9ff', border: '1px solid #91d5ff', borderRadius: 4 }}>
          <Text type="success" style={{ fontSize: 12 }}>
            ✓ Loaded: {childPartData.mpn?.Description} | MPN: {childPartData.mpn?.MPN} | Manufacturer: {childPartData.mpn?.Manufacturer} | UOM: {childPartData.mpn?.UOM?.code} | Price: ${childPartData.mpn?.RFQUnitPrice}
          </Text>
        </div>
      )}

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label={<Text strong>Item Number</Text>}
            name="itemNumber"
            rules={[{ required: true, message: 'Please enter item number' }]}
          >
            <Input placeholder="Enter number" />
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item label={<Text strong>Child Part</Text>} name="childPart">
            <Select
              showSearch
              labelInValue          // ✅ IMPORTANT
              placeholder="Select child part"
              loading={loadingChild}
              options={childPartOptions}
              onChange={handleChildPartChange}
              onSearch={(val) => {
                setChildSearch(val);
                setChildOpen(true);
                debouncedSearch(val);
              }}
              searchValue={childSearch}
              filterOption={false}
              allowClear
              open={childOpen}
              onClear={() => {
                setChildSearch("");
                loadChildParts("");
              }}
              onDropdownVisibleChange={(open) => {
                setChildOpen(open);
                if (open && !childSearch && childPartOptions.length === 0) {
                  loadChildParts("");
                }
              }}
              notFoundContent={loadingChild ? "Searching..." : "No matching child part"}
            />
          </Form.Item>

        </Col>

      </Row>

      <Form.Item
        label={<Text strong>Description</Text>}
        name="description"
        rules={[{ required: true, message: 'Please enter description' }]}
      >
        <TextArea disabled rows={1} placeholder="Enter description" />
      </Form.Item>

      <Divider />

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label={<Text strong>MPN Number</Text>} name="mpn">
            <Select disabled placeholder="Select">
              {mpnList.map((option) => (
                <Option key={option._id} value={option._id}>{option.MPN}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<Text strong>Manufacturer</Text>} name="manufacturer">
            <Input disabled placeholder="Enter manufacturer" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          {/* <Form.Item label={<Text strong>UOM</Text>} name="uom" rules={[{ required: true, message: 'Please select UOM' }]}>
            <Select placeholder="Select UOM">
              {uoms.map((u) => (
                <Option key={u._id} value={u._id}>{u.code}</Option>
              ))}
            </Select>
          </Form.Item> */}
          <Form.Item
            label="UOM"
            name="uom"
            rules={[{ required: true }]}
          >
            <Select onChange={handleUomChange}>
              {categorizeUOMs(uoms, childPartData?.mpn?.UOM?.code).map((u) => (
                <Option key={u._id} value={u._id}>
                  {u.code}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={<Text strong>Quantity</Text>} name="quantity" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} onChange={onQtyTolChange_Material} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={<Text strong>Tolerance %</Text>} name="tolerance">
            <InputNumber min={0} max={100} style={{ width: '100%' }} onChange={onQtyTolChange_Material} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label={<Text strong>Actual Qty (Auto)</Text>} name="actualQty">
            <InputNumber disabled style={{ width: '100%' }} readOnly />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={<Text strong>Unit Price</Text>} name="unitPrice" rules={[{ required: true }]}>
            <InputNumber disabled min={0} style={{ width: '100%' }} onChange={onUnitChange_Material} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={<Text strong>Ext Price (Auto)</Text>} name="extPrice">
            <InputNumber disabled style={{ width: '100%' }} readOnly />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label={<Text strong>SGA %</Text>} name="sgaPercent">
            <InputNumber min={0} max={100} style={{ width: '100%' }} onChange={onPctChange_Material} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={<Text strong>Mat Burden %</Text>} name="matBurden">
            <InputNumber min={0} max={100} style={{ width: '100%' }} onChange={onPctChange_Material} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={<Text strong>Freight Cost %</Text>} name="freightPercent">
            <InputNumber min={0} max={100} style={{ width: '100%' }} onChange={onPctChange_Material} />
          </Form.Item>
        </Col>

      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label={<Text strong>Fixed Freight Cost</Text>} name="freightCost">
            <InputNumber min={0} style={{ width: '100%' }} onChange={onFixedFreightChange_Material} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={<Text strong>Sales Price (Auto)</Text>} name="salesPrice">
            <InputNumber disabled style={{ width: '100%' }} readOnly />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={<Text strong>MOQ</Text>} name="moq">
            <InputNumber disabled min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Col>

      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label={<Text strong>RFQ Date</Text>} name="rfqDate">
            <DatePicker disabled style={{ width: '100%' }} placeholder="Select RFQ Date" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<Text strong>Supplier</Text>} name="supplier">
            <Select placeholder="Select Supplier" disabled>
              {suppliers.map((s) => (
                <Option key={s._id} value={s._id}>{s.companyName}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<Text strong>Lead Time (weeks)</Text>} name="leadTime">
            <InputNumber disabled min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label={<Text strong>Edited By</Text>}
            name="editedBy"
          >
            <Input disabled placeholder="Enter name" />
          </Form.Item>
        </Col>
      </Row>
    </>
  );

  const ManhourForm = (
    <>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label={<Text strong>Item Number</Text>}
            name="itemNumber"
            rules={[{ required: true, message: 'Please enter item number' }]}
          >
            <Input disabled placeholder="Enter number" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label={<Text strong>Skill Level</Text>}
            name="skillLevel"
            rules={[{ required: true, message: 'Please select skill level' }]}
          >
            <Select
              placeholder="Select skill level"
              loading={loadingSkill}
              onChange={handleSkillLevelChange}
              options={skillLevelOptions}
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        label={<Text strong>Description</Text>}
        name="description"
        rules={[{ required: true, message: 'Please enter description' }]}
      >
        <TextArea disabled placeholder="Enter description" rows={3} />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label={<Text strong>UOM</Text>} name="uom" rules={[{ required: true }]}>
            <Select disabled placeholder="Select">
              {uoms.map((u) => (
                <Option key={u._id} value={u._id}>{u.code}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<Text strong>Quantity</Text>} name="quantity" rules={[{ required: true }]}>
            <InputNumber

              min={0}
              style={{ width: '100%' }}
              placeholder="Enter quantity"
              onChange={() => {
                const unitPrice = N(form.getFieldValue('unitPrice'));
                const qty = N(form.getFieldValue('quantity'));
                form.setFieldsValue({ salesPrice: Number((unitPrice * qty).toFixed(4)) });
              }}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label={<Text strong>Unit Price (Auto)</Text>} name="unitPrice">
            <InputNumber disabled style={{ width: '100%' }} readOnly />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<Text strong>Sales Price (Auto)</Text>} name="salesPrice">
            <InputNumber disabled style={{ width: '100%' }} readOnly />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item label={<Text strong>Remarks</Text>} name="remarks">
        <TextArea rows={3} placeholder="Enter remarks" />
      </Form.Item>
    </>
  );

  const PackingForm = (
    <>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label={<Text strong>Item Number</Text>}
            name="itemNumber"
            rules={[{ required: true, message: 'Please enter item number' }]}
          >
            <Input disabled placeholder="Enter number" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<Text strong>MPN</Text>} name="mpn">
            <Select
              placeholder="Select MPN"
              showSearch
              optionFilterProp="children"
              onChange={handleMpnChange}
              filterOption={(input, option) =>
                option.children
                  ?.toString()
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
            >
              {mpnList.map((m) => (
                <Option key={m._id} value={m._id}>
                  {m.MPN}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>

      </Row>

      <Form.Item
        label={<Text strong>Description</Text>}
        name="description"
        rules={[{ required: true, message: 'Please enter description' }]}
      >
        <TextArea rows={1} placeholder="Enter description" />
      </Form.Item>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label={<Text strong>UOM</Text>} name="uom" rules={[{ required: true }]}>
            <Select placeholder="Select">
              {categorizeUOMs(uoms, packingUOM).map((u) => (
                <Option key={u._id} value={u._id}>{u.code}</Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<Text strong>Quantity</Text>} name="quantity" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} onChange={onQtyChange_Packing} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label={<Text strong>Unit Price</Text>} name="unitPrice" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} onChange={onUnitChange_Packing} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label={<Text strong>Ext Price (Auto)</Text>} name="extPrice">
            <InputNumber disabled style={{ width: '100%' }} readOnly />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label={<Text strong>SGA %</Text>} name="sgaPercent">
            <InputNumber min={0} max={100} style={{ width: '100%' }} onChange={onPctChange_Packing} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={<Text strong>Max Burden %</Text>} name="maxBurden">
            <InputNumber min={0} max={100} style={{ width: '100%' }} onChange={onPctChange_Packing} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label={<Text strong>Freight %</Text>} name="freightPercent">
            <InputNumber min={0} max={100} style={{ width: '100%' }} onChange={onPctChange_Packing} />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item label={<Text strong>Sales Price (Auto)</Text>} name="salesPrice">
        <InputNumber disabled style={{ width: '100%' }} readOnly />
      </Form.Item>
    </>
  );

  const renderFormContent = () => {
    if (selectedQuoteType === 'manhour') return ManhourForm;
    if (selectedQuoteType === 'packing') return PackingForm;
    return MaterialForm;
  };

  return (
    <Modal
      title={<Title level={4} style={{ margin: 0 }}>{getModalTitle()}</Title>}
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={800}
      centered
      style={{ top: 20 }}
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{
        quantity: 1,
        unitPrice: 0,
        salesPrice: 0,
        ...(selectedQuoteType === 'material'
          ? { sgaPercent: 0, freightCost: 0, leadTime: 0, matBurden: 0, actualQty: 1.0, freightPercent: 0 }
          : selectedQuoteType === 'packing'
            ? { sgaPercent: 0, maxBurden: 0, freightPercent: 0, extPrice: 0 }
            : {})
      }}>
        {renderFormContent()}
        <Divider />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button size="small" onClick={handleCancel} icon={<CloseOutlined />}>
            Cancel
          </Button>
          <div style={{ display: 'flex', gap: 12 }}>
            {selectedQuoteType === 'material' ? (
              <>
                <Button size="small" onClick={() => handleSubmit('close')} icon={<CloseOutlined />}>
                  {editData ? 'Update & Close' : 'Close & Finish'}
                </Button>
                {!editData && (
                  <Button type="primary" size="small" onClick={() => handleSubmit('save')} icon={<SaveOutlined />}>
                    Save & Add Another
                  </Button>
                )}
                {editData && (
                  <Button type="primary" size="small" onClick={() => handleSubmit('save')} icon={<SaveOutlined />}>
                    Update
                  </Button>
                )}
              </>
            ) : (
              <Button type="primary" size="small" onClick={() => handleSubmit('save')} icon={<SaveOutlined />}>
                {editData ? 'Update' : 'Save Item'}
              </Button>
            )}
          </div>
        </div>
      </Form>
    </Modal>
  );
};

export default AddCostingItemModal;
