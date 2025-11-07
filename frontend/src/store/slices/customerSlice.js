import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import CustomerService from "services/CustomerService";

// -------------------- Thunks --------------------

// Get all customers with pagination & search
export const fetchCustomers = createAsyncThunk(
  "customers/fetchCustomers",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await CustomerService.getAllCustomers(params);
      return res.data; // API response { data: [...], total: n }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// Get customer by ID
export const fetchCustomerById = createAsyncThunk(
  "customers/fetchCustomerById",
  async (customerId, { rejectWithValue }) => {
    try {
      const res = await CustomerService.getCustomerById(customerId);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// Create customer
export const createCustomer = createAsyncThunk(
  "customers/createCustomer",
  async (customerData, { rejectWithValue }) => {
    try {
      const res = await CustomerService.createCustomer(customerData);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// Update customer
export const updateCustomer = createAsyncThunk(
  "customers/updateCustomer",
  async ({ customerId, data }, { rejectWithValue }) => {
    try {
      const res = await CustomerService.updateCustomer(customerId, data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// Delete customer
export const deleteCustomer = createAsyncThunk(
  "customers/deleteCustomer",
  async (customerId, { rejectWithValue }) => {
    try {
      const res = await CustomerService.deleteCustomer(customerId);
      return { customerId, ...res.data };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// -------------------- Slice --------------------

const customerSlice = createSlice({
  name: "customers",
  initialState: {
    list: [],
    selectedCustomer: null,
    loading: false,
    error: null,
  },
  reducers: {
    resetCustomers: (state) => {
      state.list = [];
      state.selectedCustomer = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch all customers
    builder
      .addCase(fetchCustomers.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch customer by ID
    builder
      .addCase(fetchCustomerById.fulfilled, (state, action) => {
        state.selectedCustomer = action.payload;
      })
      .addCase(fetchCustomerById.rejected, (state, action) => {
        state.error = action.payload;
      });

    // Create customer
    builder
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.list.push(action.payload);
      })
      .addCase(createCustomer.rejected, (state, action) => {
        state.error = action.payload;
      });

    // Update customer
    builder
      .addCase(updateCustomer.fulfilled, (state, action) => {
        const idx = state.list.findIndex((c) => c._id === action.payload._id);
        if (idx !== -1) state.list[idx] = action.payload;
      })
      .addCase(updateCustomer.rejected, (state, action) => {
        state.error = action.payload;
      });

    // Delete customer
    builder
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.list = state.list.filter((c) => c._id !== action.payload.customerId);
      })
      .addCase(deleteCustomer.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { resetCustomers } = customerSlice.actions;
export default customerSlice.reducer;
