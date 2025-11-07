// store/slices/markupParameterSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import MarkupParameterService from "services/MarkupParameterService";

// 🟢 Fetch all markup parameters
export const getAllMarkupParameters = createAsyncThunk(
  "markupParameter/getAll",
  async (params, { rejectWithValue }) => {
    try {
      const response = await MarkupParameterService.getAllMarkupParameters(params);
      // assuming backend returns { success: true, data: [...] }
      return response.data || [];
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// 🟢 Add or update markup parameters
export const addOrUpdateMarkupParameter = createAsyncThunk(
  "markupParameter/addOrUpdate",
  async (data, { rejectWithValue }) => {
    try {
      const response = await MarkupParameterService.addOrUpdateMarkupParameter(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// 🟡 Slice
const markupParameterSlice = createSlice({
  name: "markupParameter",
  initialState: {
    markupParameters: [],
    loading: false,
    error: null,
    successMessage: null,
  },
  reducers: {
    clearMarkupMessages: (state) => {
      state.error = null;
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // 🔹 Get all
      .addCase(getAllMarkupParameters.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAllMarkupParameters.fulfilled, (state, action) => {
        state.loading = false;
        state.markupParameters = action.payload;
      })
      .addCase(getAllMarkupParameters.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // 🔹 Add/Update
      .addCase(addOrUpdateMarkupParameter.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addOrUpdateMarkupParameter.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = "Markup parameters saved successfully";
        // Update local state if needed
        const newParams = action.payload;
        if (newParams) state.markupParameters = [newParams];
      })
      .addCase(addOrUpdateMarkupParameter.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearMarkupMessages } = markupParameterSlice.actions;

export default markupParameterSlice.reducer;
