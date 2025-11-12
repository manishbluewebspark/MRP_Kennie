import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Card,
    Typography,
    Button,
    Space,
    Row,
    Col,
    Dropdown,
    Menu,
    message,
    Radio,
    Form
} from 'antd';
import {
    PlusOutlined,
    FileExcelOutlined,
    EllipsisOutlined
} from '@ant-design/icons';

import QuoteTypeModal from './QuoteTypeModal';
import CreateSalesQuoteModal from './createQuoteModal';
import EraseDrawingModal from './EraseDrawingModal';
import DuplicateDrawingModal from './DuplicateDrawingModal';
import AssignProjectModal from './AssignProjectModal';
import AddCostingItemModal from './AddCostingItemModal';

import { useParams } from 'react-router-dom';
import DrawingService from 'services/DrawingService';
import ProjectService from 'services/ProjectService';
import CostingTable from './CostingTable';

import { useDispatch, useSelector } from 'react-redux';
import { getAllUOMs } from 'store/slices/uomSlice';
import { fetchSuppliers } from 'store/slices/supplierSlice';
import { fetchAllMpn } from 'store/slices/librarySlice';
import { getAllMarkupParameters } from 'store/slices/markupParameterSlice';
import { hasPermission } from 'utils/auth';

const { Text } = Typography;

const TAB_TO_QUOTETYPE = {
    materials: 'material',
    manhour: 'manhour',
    packing: 'packing',
};

const DrawingDetails = () => {
    const [form] = Form.useForm();
    const { id } = useParams();

    const [quoteModalVisible, setQuoteModalVisible] = useState(false);
    const [createQuoteModalVisible, setCreateQuoteModalVisible] = useState(false);
    const [eraseModalVisible, setEraseModalVisible] = useState(false);
    const [assignModalVisible, setAssignModalVisible] = useState(false);
    const [duplicateModalVisible, setDuplicateModalVisible] = useState(false);
    const [costingModalVisible, setCostingModalVisible] = useState(false);

    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState(0);

    const [selectedQuoteType, setSelectedQuoteType] = useState(null);
    const [activeTab, setActiveTab] = useState('materials');

    const [drawing, setDrawing] = useState(null);
    const [projects, setProjects] = useState([]);
    const [costingMaterialData, setCostingMaterialData] = useState({ costingItems: [] });
    const [editingItem, setEditingItem] = useState(null);
    const [loading, setLoading] = useState(false);

    // per-tab raw subtotals (without markup)
    const [rawTotals, setRawTotals] = useState({ material: 0, manhour: 0, packing: 0 });

    const dispatch = useDispatch();
    const { uoms } = useSelector((state) => state.uoms);
    const { suppliers } = useSelector((state) => state.suppliers);
    const { librarys } = useSelector((state) => state);
    const { markupParameters } = useSelector((state) => state.markupParameter);

    // baselines from master settings
    const [baseMarkups, setBaseMarkups] = useState({ material: 0, manhour: 0, packing: 0 });
    // current markups saved on drawing
    const [markups, setMarkups] = useState({ material: 0, manhour: 0, packing: 0 });

    const fileInputRef = useRef(null);

    const openForEdit = (item) => { setEditingItem(item); setCostingModalVisible(true); };
    const openForAdd = () => { setEditingItem(null); setCostingModalVisible(true); };

    const fetchProjects = async (params = {}) => {
        try {
            const res = await ProjectService.getAllProjects(params);
            setProjects(res?.data || []);
        } catch (err) {
            console.error("Error fetching projects:", err);
        }
    };

    const recalcRawTotals = (items = []) => {
        const subt = { material: 0, manhour: 0, packing: 0 };

        for (const it of items) {
            const qt = (it?.quoteType || '').toLowerCase();
            const bucket =
                qt === 'material' ? 'material' :
                    qt === 'manhour' ? 'manhour' :
                        qt === 'packing' ? 'packing' : null;

            if (!bucket) continue;

            const qty = Number(it?.quantity ?? 0);
            const unit = Number(it?.unitPrice ?? 0);
            const ext = Number(it?.extPrice ?? qty * unit);
            const sales = Number(it?.salesPrice ?? ext);

            subt[bucket] += Number.isFinite(sales) ? sales : 0;
        }

        // optional: round to 2 decimals to avoid float noise
        Object.keys(subt).forEach(k => (subt[k] = Math.round(subt[k] * 100) / 100));

        setRawTotals(subt);
    };


    const fetchCostingItems = async () => {
        setLoading(true);
        try {
            const res = await DrawingService.getAllCostingItems(id);
            const items = res?.data?.costingItems || [];
            setCostingMaterialData({ costingItems: items });
            recalcRawTotals(items);
        } catch (err) {
            console.error("Error fetching costing items:", err);
            message.error("Failed to fetch costing items");
        } finally {
            setLoading(false);
        }
    };

    const getDrawingData = async () => {
        try {
            const res = await DrawingService.getDrawingById(id);
            const d = res?.data || {};
            setDrawing(d);
            setMarkups((prev) => ({
                material: Number(d?.materialMarkup ?? prev.material ?? 0),
                manhour: Number(d?.manhourMarkup ?? prev.manhour ?? 0),
                packing: Number(d?.packingMarkup ?? prev.packing ?? 0),
            }));
        } catch (err) {
            console.error("Error fetching drawing:", err);
            message.error("Failed to fetch drawing data");
        }
    };

    // Load baselines (master settings)
    useEffect(() => {
        if (markupParameters && markupParameters.length > 0) {
            const param = markupParameters[0];
            const base = {
                material: Number(param?.materialsMarkup ?? 0),
                manhour: Number(param?.manhourMarkup ?? 0),
                packing: Number(param?.packingMarkup ?? 0),
            };
            setBaseMarkups(base);

            setMarkups((prev) => ({
                material: Number(drawing?.materialMarkup ?? prev.material ?? base.material ?? 0) || base.material,
                manhour: Number(drawing?.manhourMarkup ?? prev.manhour ?? base.manhour ?? 0) || base.manhour,
                packing: Number(drawing?.packingMarkup ?? prev.packing ?? base.packing ?? 0) || base.packing,
            }));
        }
    }, [markupParameters, drawing?.materialMarkup, drawing?.manhourMarkup, drawing?.packingMarkup]);

    // Initial bootstrap
    useEffect(() => {
        if (!id) return;
        dispatch(fetchAllMpn());
        dispatch(getAllUOMs());
        dispatch(fetchSuppliers());
        dispatch(getAllMarkupParameters());
        fetchProjects();
        fetchCostingItems();
        getDrawingData();
    }, [id]);

    const getQuoteTypeFromActiveTab = (tab = activeTab) => TAB_TO_QUOTETYPE[tab];

    // persist per-tab markup to drawing
    const handleMarkupChange = async (tab, value) => {
        const num = Number(value || 0);
        const fieldMap = {
            materials: 'materialMarkup',
            manhour: 'manhourMarkup',
            packing: 'packingMarkup',
        };
        const field = fieldMap[tab];

        try {
            // optimistic
            setMarkups((prev) => ({
                ...prev,
                [tab === 'materials' ? 'material' : tab]: num,
            }));

            await DrawingService.updateDrawing(id, { [field]: num });
            getDrawingData();
            message.success(`${tab} markup updated to ${num}%`);
        } catch (err) {
            console.error(err);
            message.error("Failed to update markup");
        }
    };

    // GRAND total across all tabs with their markups
    const grandTotalWithMarkup = useMemo(() => {

        // if (drawing?.totalPrice != null) return Number(drawing.totalPrice);

        const m = Number(drawing?.materialMarkup || 0);
        const h = Number(drawing?.manhourMarkup || 0);
        const p = Number(drawing?.packingMarkup || 0);
        const materialTotal = rawTotals.material + (rawTotals.material * m) / 100;
        const manhourTotal = rawTotals.manhour + (rawTotals.manhour * h) / 100;
        const packingTotal = rawTotals.packing + (rawTotals.packing * p) / 100;

        return materialTotal + manhourTotal + packingTotal;
    }, [drawing, rawTotals, markups]);

    const triggerFileInput = () => fileInputRef.current && fileInputRef.current.click();

    const handleFileChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append("file", file);
        fd.append("quoteType", getQuoteTypeFromActiveTab(activeTab));
        try {
            await DrawingService.importCostingItems(id, fd);
            message.success(`Excel imported successfully for ${getQuoteTypeFromActiveTab(activeTab)}!`);
            fetchCostingItems();
        } catch (error) {
            console.error(error);
            message.error("Excel import failed");
        }
    };

    const handleAssignProject = async (data) => {
        try {
            const updateData = { projectId: data, ...(data.otherFields && { ...data.otherFields }) };
            const res = await DrawingService.updateDrawing(id, updateData);
            if (res?.success) {
                message.success('Project assigned successfully!');
                getDrawingData();
                return { success: true, data: res.data };
            } else {
                message.error(res?.message || 'Failed to assign project');
                return { success: false, error: res?.message };
            }
        } catch (error) {
            console.error('Error in handleAssignProject:', error);
            message.error('Error assigning project');
            return { success: false, error: error.message };
        }
    };

    const handleDeleteItem = async (item) => {
        try {
            await DrawingService.deleteCostingItem(id, item._id);
            message.success('Item deleted successfully');
            fetchCostingItems();
        } catch (error) {
            console.error('Error deleting item:', error);
            message.error('Failed to delete item');
        }
    };

    const handleModalAction = async (type, values, quoteType) => {
        try {
            if (!values.extPrice && values.quantity && values.unitPrice) {
                values.extPrice = Number(values.quantity) * Number(values.unitPrice);
            }
            if (editingItem) {
                await DrawingService.updateCostingItem(id, editingItem._id, { ...values, quoteType });
                message.success("Costing item updated successfully");
            } else {
                await DrawingService.addCostingItem(id, { ...values, quoteType });
                message.success("Costing item added successfully");
            }
            fetchCostingItems();
            getDrawingData();
            setCostingModalVisible(false);
            setEditingItem(null);
        } catch (err) {
            console.error("Error saving costing item:", err);
            message.error("Something went wrong while saving item");
        }
    };

    const handleModalClose = () => {
        setCostingModalVisible(false);
        setEditingItem(null);
    };

    const menu = (
        <Menu
            items={[
                { key: '1', label: 'Change Project', onClick: () => setAssignModalVisible(true) },
                { key: '2', label: 'Duplicate', onClick: () => setDuplicateModalVisible(true) },
            ]}
        />
    );

    const drawingDetails = [
        // { key: 'quoteFor', label: 'Quote for', value: drawing?.projectId?.projectName || "-", bold: true },
        { key: 'project', label: 'Project', value: drawing?.projectId?.projectName || "-", bold: true },
        { key: 'customer', label: 'Customer', value: drawing?.customerId?.companyName || "-", bold: true },
        { key: 'currency', label: 'Currency', value: drawing?.currency?.code || drawing?.projectId?.currency || "-", bold: true,fontSize:20 },
        { key: 'unitPrice', label: 'Unit Price', value: `$${grandTotalWithMarkup.toFixed(2)}`, bold: true,fontSize:20 },
        { key: 'leadTime', label: 'Lead Time', value: drawing?.leadTimeWeeks ? `${drawing.leadTimeWeeks} week(s)` : "TBD", bold: true },
        { key: 'createdAt', label: 'Quoted Date', value: drawing?.createdAt ? new Date(drawing.createdAt).toLocaleDateString() : "Not Quoted", bold: true },
        { key: 'lastEditedBy', label: 'Last Edited User', value: drawing?.lastEditedBy?.name || "No User", bold: true },
    ];

    return (
        <div style={{ padding: 24, background: '#fbf7f7ff', minHeight: '100vh' }}>
            <Card>
                <Card
                    title={
                        <>
                            <Text strong style={{ fontSize: 16 }}>
                                Drawing: {drawing?.drawingNo || "N/A"}
                            </Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 14 }}>
                                Description: {drawing?.description}
                            </Text>
                        </>
                    }

                    extra={<Dropdown overlay={menu} trigger={['click']} placement="bottomRight"><Button type="text" icon={<EllipsisOutlined />} /></Dropdown>}
                    style={{ marginBottom: 16, background: '#f4efefa5' }}
                >
                    <Row gutter={[16, 16]}>
                        {drawingDetails.map((item) => (
                            <Col xs={24} sm={12} md={8} lg={6} key={item.key}>
                                <div>
                                    <Text type="secondary" strong={item.bold}>{item.label}</Text>
                                    <br />
                                    <Text strong={item.bold} style={{ fontSize: item?.fontSize ? item?.fontSize : 13 }}>{item.value}</Text>
                                </div>
                            </Col>
                        ))}
                    </Row>
                </Card>
            </Card>

            <Card
                title={
                    <div>
                        <Text strong style={{ fontSize: 16, display: 'block' }}>Materials Costing</Text>
                        <Text type="secondary" style={{ fontSize: 14 }}>Manage your materials costing items</Text>
                    </div>
                }
                extra={
                    <Space>
                        {hasPermission('sales.mto:add_material') && (<Button type="primary" icon={<PlusOutlined />} onClick={openForAdd}>
                            Add {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Item
                        </Button>)}

                    </Space>
                }
            >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                    <Radio.Group
                        value={activeTab}
                        onChange={(e) => setActiveTab(e.target.value)}
                        optionType="button"
                        buttonStyle="solid"
                    >
                        {hasPermission('sales.mto:view_material_tab') && (<Radio.Button value="materials">Materials</Radio.Button>)}
                        {hasPermission('sales.mto:view_manhour_tab') && (<Radio.Button value="manhour">Manhour</Radio.Button>)}
                        {hasPermission('sales.mto:view_packing_tab') && (<Radio.Button value="packing">Packing</Radio.Button>)}
                    </Radio.Group>

                    {drawing?.quoteType === "box_build" && activeTab === "materials" && (
                        <Button icon={<FileExcelOutlined />} onClick={triggerFileInput} style={{ marginLeft: 'auto' }}>
                            Import {activeTab}
                        </Button>
                    )}

                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        style={{ display: 'none' }}
                        ref={fileInputRef}
                        onChange={handleFileChange}
                    />
                </div>

                <Card title="Costing Items" style={{ marginTop: 16 }}>
                    <CostingTable
                        costingItems={costingMaterialData.costingItems || []}
                        activeTab={activeTab}
                        onDelete={handleDeleteItem}
                        onEdit={openForEdit}
                        loading={loading}
                        currentMarkups={markups}
                        baseMarkups={baseMarkups}
                        onMarkupChange={handleMarkupChange}
                    />
                </Card>
            </Card>

            <EraseDrawingModal
                visible={eraseModalVisible}
                onClose={() => setEraseModalVisible(false)}
                onErase={(d) => console.log('erase', d)}
                drawingName={drawing?.drawingNo || ''}
                materialsCount={costingMaterialData.costingItems.filter(i => i.quoteType === 'material').length}
                manhourCount={costingMaterialData.costingItems.filter(i => i.quoteType === 'manhour').length}
                packingCount={costingMaterialData.costingItems.filter(i => i.quoteType === 'packing').length}
            />

            <AssignProjectModal
                visible={assignModalVisible}
                onClose={() => setAssignModalVisible(false)}
                onAssign={handleAssignProject}
                projects={projects}
            />

            <DuplicateDrawingModal
                visible={duplicateModalVisible}
                onClose={() => setDuplicateModalVisible(false)}
                onDuplicate={async (newNo) => {
                    try {
                        message.loading('Duplicating drawing...', 0);
                        const resp = await DrawingService.duplicateDrawing(id, { newDrawingNumber: newNo });
                        message.destroy();
                        if (resp?.success) {
                            message.success('Drawing duplicated successfully');
                            getDrawingData();
                            setDuplicateModalVisible(false);
                        } else {
                            message.error(resp?.message || 'Failed to duplicate drawing');
                        }
                    } catch (e) {
                        message.destroy();
                        message.error('Failed to duplicate drawing');
                    }
                }}
            />

            <AddCostingItemModal
                visible={costingModalVisible}
                onClose={handleModalClose}
                onAction={handleModalAction}
                selectedQuoteType={getQuoteTypeFromActiveTab()}
                drawingName={drawing?.drawingNo}
                projectName={drawing?.projectId?.projectName}
                editData={editingItem}
                costingMaterialData={costingMaterialData}
                uoms={uoms}
                suppliers={suppliers}
                mpnList={librarys?.mpnList || []}
            />
        </div>
    );
};

export default DrawingDetails;
