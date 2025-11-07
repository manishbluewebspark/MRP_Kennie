import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import PurchaseSettingService from "services/purchaseSettingService";

// Async thunks
export const getAllPurchaseSettings = createAsyncThunk(
  "purchaseSettings/getAll",
  async (params, thunkAPI) => {
    try {
      const response = await PurchaseSettingService.getAllPurchaseSettings(params);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

export const getPurchaseSettingById = createAsyncThunk(
  "purchaseSettings/getById",
  async (id, thunkAPI) => {
    try {
      const response = await PurchaseSettingService.getPurchaseSettingById(id);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

export const addOrUpdatePurchaseSetting = createAsyncThunk(
  "purchaseSettings/addOrUpdate",
  async (data, thunkAPI) => {
    try {
      const response = await PurchaseSettingService.addOrUpdatePurchaseSetting(data);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

export const deletePurchaseSetting = createAsyncThunk(
  "purchaseSettings/delete",
  async (id, thunkAPI) => {
    try {
      const response = await PurchaseSettingService.deletePurchaseSetting(id);
      return { id, ...response.data };
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  }
);

// Initial state
const initialState = {
  purchaseSettings: [],
  selectedPurchaseSetting: null,
  loading: false,
  error: null,
  success: false,
};

// Slice
const purchaseSettingSlice = createSlice({
  name: "purchaseSettings",
  initialState,
  reducers: {
    clearSelectedPurchaseSetting: (state) => {
      state.selectedPurchaseSetting = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearSuccess: (state) => {
      state.success = false;
    },
    resetPurchaseSettings: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Get all purchase settings
      .addCase(getAllPurchaseSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllPurchaseSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.purchaseSettings = action.payload;
        state.success = true;
      })
      .addCase(getAllPurchaseSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Get by ID
      .addCase(getPurchaseSettingById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getPurchaseSettingById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedPurchaseSetting = action.payload;
        state.success = true;
      })
      .addCase(getPurchaseSettingById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Add or update
      .addCase(addOrUpdatePurchaseSetting.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addOrUpdatePurchaseSetting.fulfilled, (state, action) => {
        state.loading = false;
        const updatedSetting = action.payload;
        const index = state.purchaseSettings.findIndex(
          (setting) => setting.id === updatedSetting.id
        );
        
        if (index !== -1) {
          // Update existing
          state.purchaseSettings[index] = updatedSetting;
        } else {
          // Add new
          state.purchaseSettings.push(updatedSetting);
        }
        state.success = true;
      })
      .addCase(addOrUpdatePurchaseSetting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete
      .addCase(deletePurchaseSetting.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deletePurchaseSetting.fulfilled, (state, action) => {
        state.loading = false;
        state.purchaseSettings = state.purchaseSettings.filter(
          (setting) => setting.id !== action.payload.id
        );
        state.success = true;
      })
      .addCase(deletePurchaseSetting.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearSelectedPurchaseSetting,
  clearError,
  clearSuccess,
  resetPurchaseSettings,
} = purchaseSettingSlice.actions;

export default purchaseSettingSlice.reducer;