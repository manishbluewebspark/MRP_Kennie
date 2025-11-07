import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import SystemSettingsService from "services/SystemSettingsService";

// ✅ Fetch settings from backend
export const fetchSystemSettings = createAsyncThunk(
  "settings/fetchSystemSettings",
  async (_, { rejectWithValue }) => {
    try {
      const response = await SystemSettingsService.getSystemSettings();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// ✅ Add or Update settings
export const saveSystemSettings = createAsyncThunk(
  "settings/saveSystemSettings",
  async (data, { rejectWithValue }) => {
    try {
      const response = await SystemSettingsService.addOrUpdateSystemSettings(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// ✅ Slice
const settingsSlice = createSlice({
  name: "settings",
  initialState: {
    workOrderSettings: {}, // 👈 for your usage
    loading: false,
    error: null,
    success: false,
  },
  reducers: {
    resetSettingsState: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Settings
      .addCase(fetchSystemSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSystemSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.workOrderSettings = action.payload || {};
      })
      .addCase(fetchSystemSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Save / Update Settings
      .addCase(saveSystemSettings.pending, (state) => {
        state.loading = true;
        state.success = false;
      })
      .addCase(saveSystemSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.workOrderSettings = action.payload || {};
      })
      .addCase(saveSystemSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { resetSettingsState } = settingsSlice.actions;
export default settingsSlice.reducer;
