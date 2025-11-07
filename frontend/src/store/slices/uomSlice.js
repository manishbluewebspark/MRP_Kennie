import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import UOMService from 'services/UOMService';

// Async thunks
export const addUOM = createAsyncThunk(
  'uom/addUOM',
  async (uomData, { rejectWithValue }) => {
    try {
      const response = await UOMService.addUOM(uomData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const getAllUOMs = createAsyncThunk(
  'uom/getAllUOMs',
  async (params, { rejectWithValue }) => {
    try {
      const response = await UOMService.getAllUOMs(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const getUOMById = createAsyncThunk(
  'uom/getUOMById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await UOMService.getUOMById(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const updateUOM = createAsyncThunk(
  'uom/updateUOM',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await UOMService.updateUOM(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const deleteUOM = createAsyncThunk(
  'uom/deleteUOM',
  async (id, { rejectWithValue }) => {
    try {
      await UOMService.deleteUOM(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const uomSlice = createSlice({
  name: 'uom',
  initialState: {
    uoms: [],
    currentUOM: null,
    loading: false,
    error: null,
    success: false,
    operation: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSuccess: (state) => {
      state.success = false;
    },
    clearCurrentUOM: (state) => {
      state.currentUOM = null;
    },
    resetOperation: (state) => {
      state.operation = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Add UOM
      .addCase(addUOM.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.operation = 'add';
      })
      .addCase(addUOM.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.uoms.push(action.payload);
        state.operation = null;
      })
      .addCase(addUOM.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.operation = null;
      })
      // Get All UOMs
      .addCase(getAllUOMs.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.operation = 'fetch';
      })
      .addCase(getAllUOMs.fulfilled, (state, action) => {
        state.loading = false;
        state.uoms = action.payload;
        state.operation = null;
      })
      .addCase(getAllUOMs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.operation = null;
      })
      // Get UOM By ID
      .addCase(getUOMById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUOMById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUOM = action.payload;
      })
      .addCase(getUOMById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update UOM
      .addCase(updateUOM.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.operation = 'update';
      })
      .addCase(updateUOM.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const index = state.uoms.findIndex(uom => uom._id === action.payload._id);
        if (index !== -1) {
          state.uoms[index] = action.payload;
        }
        state.currentUOM = action.payload;
        state.operation = null;
      })
      .addCase(updateUOM.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.operation = null;
      })
      // Delete UOM
      .addCase(deleteUOM.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.operation = 'delete';
      })
      .addCase(deleteUOM.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.uoms = state.uoms.filter(uom => uom._id !== action.payload);
        state.operation = null;
      })
      .addCase(deleteUOM.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.operation = null;
      });
  },
});

export const { 
  clearError, 
  clearSuccess, 
  clearCurrentUOM, 
  resetOperation 
} = uomSlice.actions;

export default uomSlice.reducer;