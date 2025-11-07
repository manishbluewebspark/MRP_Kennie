import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import SkillLevelCostingService from "services/SkillLevelCostingService";

// 📄 Get all (with pagination, search, sorting)
export const fetchSkillLevelCostings = createAsyncThunk(
  "skillLevelCosting/fetchAll",
  async (params, { rejectWithValue }) => {
    try {
      const response = await SkillLevelCostingService.getAllSkillLevelCostings(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// ➕ Add
export const addSkillLevelCosting = createAsyncThunk(
  "skillLevelCosting/add",
  async (data, { rejectWithValue }) => {
    try {
      const response = await SkillLevelCostingService.addSkillLevelCosting(data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// ✏️ Update
export const updateSkillLevelCosting = createAsyncThunk(
  "skillLevelCosting/update",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await SkillLevelCostingService.updateSkillLevelCosting(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// 🗑️ Delete
export const deleteSkillLevelCosting = createAsyncThunk(
  "skillLevelCosting/delete",
  async (id, { rejectWithValue }) => {
    try {
      const response = await SkillLevelCostingService.deleteSkillLevelCosting(id);
      return { id, message: response.message };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const skillLevelCostingSlice = createSlice({
  name: "skillLevelCosting",
  initialState: {
    list: [],
    total: 0,
    page: 1,
    limit: 10,
    loading: false,
    error: null,
    selected: null,
  },
  reducers: {
    clearSelected: (state) => {
      state.selected = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get all
      .addCase(fetchSkillLevelCostings.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSkillLevelCostings.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.data || [];
        state.total = action.payload.total || 0;
        state.page = action.payload.page || 1;
        state.limit = action.payload.limit || 10;
      })
      .addCase(fetchSkillLevelCostings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Add
      .addCase(addSkillLevelCosting.fulfilled, (state, action) => {
        state.list.unshift(action.payload.data);
      })
      // Update
      .addCase(updateSkillLevelCosting.fulfilled, (state, action) => {
        const index = state.list.findIndex(
          (item) => item._id === action.payload.data._id
        );
        if (index >= 0) state.list[index] = action.payload.data;
      })
      // Delete
      .addCase(deleteSkillLevelCosting.fulfilled, (state, action) => {
        state.list = state.list.filter((item) => item._id !== action.payload.id);
      });
  },
});

export const { clearSelected } = skillLevelCostingSlice.actions;
export default skillLevelCostingSlice.reducer;
