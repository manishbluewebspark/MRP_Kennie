import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import DemandListService from "services/DemandListService";

/* =======================
   Async Thunks
======================= */

// 📤 Upload Demand List Excel
export const uploadDemandExcel = createAsyncThunk(
  "demandList/uploadExcel",
  async (formData, { rejectWithValue }) => {
    try {
      const res = await DemandListService.uploadDemandExcel(formData);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// 📄 Get all demand lists
export const fetchDemandLists = createAsyncThunk(
  "demandList/fetchAll",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await DemandListService.getAllDemandLists(params);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// 🔍 Get demand list by ID (file + items)
export const fetchDemandListById = createAsyncThunk(
  "demandList/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const res = await DemandListService.getDemandListById(id);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// ❌ Delete demand list
export const deleteDemandList = createAsyncThunk(
  "demandList/delete",
  async (id, { rejectWithValue }) => {
    try {
      await DemandListService.deleteDemandList(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// ✏️ Update demand list item
export const updateDemandItem = createAsyncThunk(
  "demandList/updateItem",
  async ({ itemId, data }, { rejectWithValue }) => {
    try {
      const res = await DemandListService.updateDemandListItem(itemId, data);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

/* =======================
   Slice
======================= */

const demandListSlice = createSlice({
  name: "demandList",
  initialState: {
    lists: [],            // file-level demand lists
    selectedList: null,   // single demand list (file)
    items: [],            // items of selected list
    loading: false,
    error: null,
    success: false,
  },

  reducers: {
    clearDemandListState: (state) => {
      state.loading = false;
      state.error = null;
      state.success = false;
    },
  },

  extraReducers: (builder) => {
    builder

      /* ===== Upload Excel ===== */
      .addCase(uploadDemandExcel.pending, (state) => {
        state.loading = true;
      })
      .addCase(uploadDemandExcel.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.lists.unshift(action.payload);
      })
      .addCase(uploadDemandExcel.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ===== Fetch All ===== */
      .addCase(fetchDemandLists.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchDemandLists.fulfilled, (state, action) => {
        state.loading = false;
        state.lists = action.payload.data || action.payload;
      })
      .addCase(fetchDemandLists.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ===== Fetch By ID ===== */
      .addCase(fetchDemandListById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchDemandListById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedList = action.payload.demandList;
        state.items = action.payload.items || [];
      })
      .addCase(fetchDemandListById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      /* ===== Delete ===== */
      .addCase(deleteDemandList.fulfilled, (state, action) => {
        state.lists = state.lists.filter(
          (list) => list._id !== action.payload
        );
      })

      /* ===== Update Item ===== */
      .addCase(updateDemandItem.fulfilled, (state, action) => {
        const idx = state.items.findIndex(
          (i) => i._id === action.payload._id
        );
        if (idx !== -1) {
          state.items[idx] = action.payload;
        }
      });
  },
});

export const { clearDemandListState } = demandListSlice.actions;
export default demandListSlice.reducer;
