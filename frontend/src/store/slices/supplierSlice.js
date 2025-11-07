import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import SupplierService from "services/SupplierService";

// Fetch all suppliers
export const fetchSuppliers = createAsyncThunk(
  "supplier/fetchAll",
  async (params, { rejectWithValue }) => {
    try {
      const response = await SupplierService.getAllSuppliers(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Add supplier
export const addSupplier = createAsyncThunk(
  "supplier/add",
  async (data, { rejectWithValue }) => {
    try {
      const response = await SupplierService.addSupplier(data);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Update supplier
export const updateSupplier = createAsyncThunk(
  "supplier/update",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await SupplierService.updateSupplier(id, data);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Delete supplier
export const deleteSupplier = createAsyncThunk(
  "supplier/delete",
  async (id, { rejectWithValue }) => {
    try {
      const response = await SupplierService.deleteSupplier(id);
      return { id }; // return deleted id
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const supplierSlice = createSlice({
  name: "supplier",
  initialState: {
    suppliers: [],
    pagination: {},
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSuppliers.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSuppliers.fulfilled, (state, action) => {
        state.loading = false;
        state.suppliers = action.payload.data || [];
        state.pagination = action.payload.pagination || {};
      })
      .addCase(fetchSuppliers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(addSupplier.fulfilled, (state, action) => {
        state.suppliers.push(action.payload);
      })
      .addCase(updateSupplier.fulfilled, (state, action) => {
        const index = state.suppliers.findIndex(s => s._id === action.payload._id);
        if (index !== -1) state.suppliers[index] = action.payload;
      })
      .addCase(deleteSupplier.fulfilled, (state, action) => {
        state.suppliers = state.suppliers.filter(s => s._id !== action.payload.id);
      });
  },
});

export default supplierSlice.reducer;
