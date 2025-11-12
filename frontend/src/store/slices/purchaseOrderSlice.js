// purchaseOrderSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import PurchaseOrderService from "services/PurchaseOrderService";

// 🎯 Async Thunks

// 📄 Get All Purchase Orders
export const fetchPurchaseOrders = createAsyncThunk(
  "purchaseOrders/fetchPurchaseOrders",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await PurchaseOrderService.getAllPurchaseOrders(params);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// 🔍 Get Purchase Order by ID
export const fetchPurchaseOrderById = createAsyncThunk(
  "purchaseOrders/fetchPurchaseOrderById",
  async (id, { rejectWithValue }) => {
    try {
      const res = await PurchaseOrderService.getPurchaseOrderById(id);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// ➕ Create Purchase Order
export const createPurchaseOrder = createAsyncThunk(
  "purchaseOrders/createPurchaseOrder",
  async (data, { rejectWithValue }) => {
    try {
      const res = await PurchaseOrderService.addPurchaseOrder(data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// ✏️ Update Purchase Order
export const updatePurchaseOrder = createAsyncThunk(
  "purchaseOrders/updatePurchaseOrder",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await PurchaseOrderService.updatePurchaseOrder(id, data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// 🗑️ Delete Purchase Order
export const deletePurchaseOrder = createAsyncThunk(
  "purchaseOrders/deletePurchaseOrder",
  async (id, { rejectWithValue }) => {
    try {
      const res = await PurchaseOrderService.deletePurchaseOrder(id);
      return { id, message: res.data?.message || "Deleted successfully" };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// 📊 Get Purchase Orders Summary
export const fetchPurchaseOrdersSummary = createAsyncThunk(
  "purchaseOrders/fetchPurchaseOrdersSummary",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await PurchaseOrderService.getPurchaseOrdersSummaryByPeriod(params);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// 📈 Get Purchase Orders History
export const fetchPurchaseOrdersHistory = createAsyncThunk(
  "purchaseOrders/fetchPurchaseOrdersHistory",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await PurchaseOrderService.getPurchaseOrdersHistory(params);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// ✉️ Send Purchase Order Mail
export const sendPurchaseOrderMail = createAsyncThunk(
  "purchaseOrders/sendPurchaseOrderMail",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await PurchaseOrderService.sendPurchaseOrderMail(id, data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// 🏪 Initial State
const initialState = {
  // List data
  purchaseOrders: [],
  selectedPurchaseOrder: null,
  
  // Summary data
  summary: {
    totalCount: 0,
    sumSubTotal: 0,
    sumFreight: 0,
    sumTax: 0,
    sumFinal: 0,
    activeSuppliersCount: 0,
    avgOrderValue: 0
  },
  
  // History data
  history: {
    data: [],
    period: "",
    total: 0,
    page: 1,
    limit: 10
  },
  
  // Loading states
  loading: false,
  creating: false,
  updating: false,
  deleting: false,
  loadingSummary: false,
  loadingHistory: false,
  sendingMail: false,
  
  // Error states
  error: null,
  createError: null,
  updateError: null,
  deleteError: null,
  summaryError: null,
  historyError: null,
  mailError: null,
  
  // Pagination
  pagination: {
    current: 1,
    pageSize: 10,
    total: 0
  }
};

// 🎯 Create Slice
const purchaseOrderSlice = createSlice({
  name: "purchaseOrders",
  initialState,
  reducers: {
    // 🔄 Clear selected purchase order
    clearSelectedPurchaseOrder: (state) => {
      state.selectedPurchaseOrder = null;
    },
    
    // 🔄 Clear errors
    clearErrors: (state) => {
      state.error = null;
      state.createError = null;
      state.updateError = null;
      state.deleteError = null;
      state.summaryError = null;
      state.historyError = null;
      state.mailError = null;
    },
    
    // 🔄 Clear all data
    clearPurchaseOrders: (state) => {
      state.purchaseOrders = [];
      state.selectedPurchaseOrder = null;
      state.summary = initialState.summary;
      state.history = initialState.history;
    },
    
    // 🔄 Update pagination
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    
    // 🔄 Manually update purchase order in list (for optimistic updates)
    updatePurchaseOrderInList: (state, action) => {
      const { id, updates } = action.payload;
      const index = state.purchaseOrders.findIndex(po => po._id === id);
      if (index !== -1) {
        state.purchaseOrders[index] = { ...state.purchaseOrders[index], ...updates };
      }
      
      // Also update selected purchase order if it's the same
      if (state.selectedPurchaseOrder && state.selectedPurchaseOrder._id === id) {
        state.selectedPurchaseOrder = { ...state.selectedPurchaseOrder, ...updates };
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // 📄 Fetch All Purchase Orders
      .addCase(fetchPurchaseOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPurchaseOrders.fulfilled, (state, action) => {
        state.loading = false;
        
        // Handle different response structures
        if (Array.isArray(action.payload)) {
          state.purchaseOrders = action.payload;
          state.pagination.total = action.payload.length;
        } else if (action.payload?.data) {
          state.purchaseOrders = action.payload.data;
          state.pagination.total = action.payload.total || action.payload.data.length;
          state.pagination.current = action.payload.page || 1;
          state.pagination.pageSize = action.payload.limit || 10;
        } else {
          state.purchaseOrders = [];
          state.pagination.total = 0;
        }
      })
      .addCase(fetchPurchaseOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // 🔍 Fetch Purchase Order by ID
      .addCase(fetchPurchaseOrderById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPurchaseOrderById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedPurchaseOrder = action.payload.data || action.payload;
      })
      .addCase(fetchPurchaseOrderById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // ➕ Create Purchase Order
      .addCase(createPurchaseOrder.pending, (state) => {
        state.creating = true;
        state.createError = null;
      })
      .addCase(createPurchaseOrder.fulfilled, (state, action) => {
        state.creating = false;
        const newOrder = action.payload.data || action.payload;
        state.purchaseOrders.unshift(newOrder);
        state.pagination.total += 1;
      })
      .addCase(createPurchaseOrder.rejected, (state, action) => {
        state.creating = false;
        state.createError = action.payload;
      })
      
      // ✏️ Update Purchase Order
      .addCase(updatePurchaseOrder.pending, (state) => {
        state.updating = true;
        state.updateError = null;
      })
      .addCase(updatePurchaseOrder.fulfilled, (state, action) => {
        state.updating = false;
        const updatedOrder = action.payload.data || action.payload;
        const index = state.purchaseOrders.findIndex(po => po._id === updatedOrder._id);
        
        if (index !== -1) {
          state.purchaseOrders[index] = updatedOrder;
        }
        
        if (state.selectedPurchaseOrder && state.selectedPurchaseOrder._id === updatedOrder._id) {
          state.selectedPurchaseOrder = updatedOrder;
        }
      })
      .addCase(updatePurchaseOrder.rejected, (state, action) => {
        state.updating = false;
        state.updateError = action.payload;
      })
      
      // 🗑️ Delete Purchase Order
      .addCase(deletePurchaseOrder.pending, (state) => {
        state.deleting = true;
        state.deleteError = null;
      })
      .addCase(deletePurchaseOrder.fulfilled, (state, action) => {
        state.deleting = false;
        state.purchaseOrders = state.purchaseOrders.filter(po => po._id !== action.payload.id);
        state.pagination.total -= 1;
        
        if (state.selectedPurchaseOrder && state.selectedPurchaseOrder._id === action.payload.id) {
          state.selectedPurchaseOrder = null;
        }
      })
      .addCase(deletePurchaseOrder.rejected, (state, action) => {
        state.deleting = false;
        state.deleteError = action.payload;
      })
      
      // 📊 Fetch Summary
      .addCase(fetchPurchaseOrdersSummary.pending, (state) => {
        state.loadingSummary = true;
        state.summaryError = null;
      })
      .addCase(fetchPurchaseOrdersSummary.fulfilled, (state, action) => {
        state.loadingSummary = false;
        state.summary = action.payload.summary || action.payload;
      })
      .addCase(fetchPurchaseOrdersSummary.rejected, (state, action) => {
        state.loadingSummary = false;
        state.summaryError = action.payload;
        state.summary = initialState.summary;
      })
      
      // 📈 Fetch History
      .addCase(fetchPurchaseOrdersHistory.pending, (state) => {
        state.loadingHistory = true;
        state.historyError = null;
      })
      .addCase(fetchPurchaseOrdersHistory.fulfilled, (state, action) => {
        state.loadingHistory = false;
        
        if (action.payload?.data) {
          state.history.data = action.payload.data;
          state.history.total = action.payload.total || 0;
          state.history.page = action.payload.page || 1;
          state.history.limit = action.payload.limit || 10;
          state.history.period = action.payload.period || "";
        } else {
          state.history.data = Array.isArray(action.payload) ? action.payload : [];
          state.history.total = Array.isArray(action.payload) ? action.payload.length : 0;
        }
      })
      .addCase(fetchPurchaseOrdersHistory.rejected, (state, action) => {
        state.loadingHistory = false;
        state.historyError = action.payload;
        state.history.data = [];
        state.history.total = 0;
      })
      
      // ✉️ Send Mail
      .addCase(sendPurchaseOrderMail.pending, (state) => {
        state.sendingMail = true;
        state.mailError = null;
      })
      .addCase(sendPurchaseOrderMail.fulfilled, (state) => {
        state.sendingMail = false;
      })
      .addCase(sendPurchaseOrderMail.rejected, (state, action) => {
        state.sendingMail = false;
        state.mailError = action.payload;
      });
  }
});

// 🔄 Export Actions
export const {
  clearSelectedPurchaseOrder,
  clearErrors,
  clearPurchaseOrders,
  setPagination,
  updatePurchaseOrderInList
} = purchaseOrderSlice.actions;

// 📦 Export Reducer
export default purchaseOrderSlice.reducer;