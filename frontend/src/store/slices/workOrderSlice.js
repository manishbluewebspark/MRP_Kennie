import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import WorkOrderService from "services/WorkOrderService";

// 📄 Get all work orders with pagination, search, sorting
export const fetchWorkOrders = createAsyncThunk(
  "workOrder/fetchAll",
  async (params, { rejectWithValue }) => {
    try {
      const response = await WorkOrderService.getAllWorkOrders(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// ➕ Create new work order
export const createWorkOrder = createAsyncThunk(
  "workOrder/create",
  async (workOrderData, { rejectWithValue }) => {
    try {
      const response = await WorkOrderService.createWorkOrder(workOrderData);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// ✏️ Update work order
export const updateWorkOrder = createAsyncThunk(
  "workOrder/update",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await WorkOrderService.updateWorkOrder(id, data);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// 🗑️ Delete work order
export const deleteWorkOrder = createAsyncThunk(
  "workOrder/delete",
  async (id, { rejectWithValue }) => {
    try {
      const response = await WorkOrderService.deleteWorkOrder(id);
      return { id, ...response };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// 🔄 Update work order status
export const updateWorkOrderStatus = createAsyncThunk(
  "workOrder/updateStatus",
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await WorkOrderService.updateWorkOrderStatus(id, status);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// 📊 Get work orders by project
export const fetchWorkOrdersByProject = createAsyncThunk(
  "workOrder/fetchByProject",
  async (projectId, { rejectWithValue }) => {
    try {
      const response = await WorkOrderService.getWorkOrdersByProject(projectId);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const workOrderSlice = createSlice({
  name: "workOrder",
  initialState: {
    data: [],
    currentWorkOrder: null,
    loading: false,
    error: null,
    totalCount: 0,
    currentPage: 1,
    pageSize: 10,
    filters: {},
    searchQuery: "",
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentWorkOrder: (state, action) => {
      state.currentWorkOrder = action.payload;
    },
    clearCurrentWorkOrder: (state) => {
      state.currentWorkOrder = null;
    },
    setFilters: (state, action) => {
      state.filters = action.payload;
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    setPagination: (state, action) => {
      state.currentPage = action.payload.page;
      state.pageSize = action.payload.pageSize;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all work orders
      .addCase(fetchWorkOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload.data || action.payload;
        state.totalCount = action.payload.totalCount || action.payload.total || action.payload.length;
      })
      .addCase(fetchWorkOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create work order
      .addCase(createWorkOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createWorkOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.data.unshift(action.payload.data);
      })
      .addCase(createWorkOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update work order
      .addCase(updateWorkOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateWorkOrder.fulfilled, (state, action) => {
        state.loading = false;
        const updatedWorkOrder = action.payload.data;
        const index = state.data.findIndex(item => item._id === updatedWorkOrder._id);
        if (index !== -1) {
          state.data[index] = updatedWorkOrder;
        }
        if (state.currentWorkOrder && state.currentWorkOrder._id === updatedWorkOrder._id) {
          state.currentWorkOrder = updatedWorkOrder;
        }
      })
      .addCase(updateWorkOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete work order
      .addCase(deleteWorkOrder.fulfilled, (state, action) => {
        state.data = state.data.filter(item => item._id !== action.payload.id);
      })
      // Update work order status
      .addCase(updateWorkOrderStatus.fulfilled, (state, action) => {
        const updatedWorkOrder = action.payload.data;
        const index = state.data.findIndex(item => item._id === updatedWorkOrder._id);
        if (index !== -1) {
          state.data[index] = updatedWorkOrder;
        }
      })
      // Fetch work orders by project
      .addCase(fetchWorkOrdersByProject.fulfilled, (state, action) => {
        state.data = action.payload.data || action.payload;
      });
  },
});

export const {
  clearError,
  setCurrentWorkOrder,
  clearCurrentWorkOrder,
  setFilters,
  setSearchQuery,
  setPagination,
} = workOrderSlice.actions;

export default workOrderSlice.reducer;