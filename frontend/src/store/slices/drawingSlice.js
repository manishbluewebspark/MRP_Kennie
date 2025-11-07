// drawingSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import DrawingService from "services/DrawingService";

// Thunks
export const fetchDrawings = createAsyncThunk(
  "drawings/fetchDrawings",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await DrawingService.getAllDrawings(params);
      // Expecting res.data to be { data: [...], pagination: {...} } or array
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchDrawingById = createAsyncThunk(
  "drawings/fetchDrawingById",
  async (drawingId, { rejectWithValue }) => {
    try {
      const res = await DrawingService.getDrawingById(drawingId);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const createDrawing = createAsyncThunk(
  "drawings/createDrawing",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await DrawingService.createDrawing(payload);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updateDrawing = createAsyncThunk(
  "drawings/updateDrawing",
  async ({ drawingId, data }, { rejectWithValue }) => {
    try {
      const res = await DrawingService.updateDrawing(drawingId, data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const deleteDrawing = createAsyncThunk(
  "drawings/deleteDrawing",
  async (drawingId, { rejectWithValue }) => {
    try {
      const res = await DrawingService.deleteDrawing(drawingId);
      return { drawingId, ...res.data };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const importDrawings = createAsyncThunk(
  "drawings/importDrawings",
  async (formData, { rejectWithValue }) => {
    try {
      const res = await DrawingService.importDrawings(formData);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const exportDrawings = createAsyncThunk(
  "drawings/exportDrawings",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await DrawingService.exportDrawings(params);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// Slice
const drawingSlice = createSlice({
  name: "drawings",
  initialState: {
    list: [],
    selectedDrawing: null,
    loading: false,
    error: null,
    pagination: {
      total: 0,
      page: 1,
      limit: 10,
      pages: 0,
    },
  },
  reducers: {
    resetDrawings: (state) => {
      state.list = [];
      state.selectedDrawing = null;
      state.error = null;
      state.pagination = { total: 0, page: 1, limit: 10, pages: 0 };
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchDrawings
      .addCase(fetchDrawings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDrawings.fulfilled, (state, action) => {
        state.loading = false;
        // support two shapes: { data, pagination } or direct array
        if (action.payload && action.payload.data) {
          state.list = action.payload.data;
          state.pagination = action.payload.pagination || state.pagination;
        } else if (Array.isArray(action.payload)) {
          state.list = action.payload;
        } else {
          state.list = [];
        }
      })
      .addCase(fetchDrawings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // fetchDrawingById
      .addCase(fetchDrawingById.fulfilled, (state, action) => {
        state.selectedDrawing = action.payload;
      })
      .addCase(fetchDrawingById.rejected, (state, action) => {
        state.error = action.payload;
      })

      // createDrawing
      .addCase(createDrawing.fulfilled, (state, action) => {
        // action.payload might be the created object
        if (action.payload) state.list.unshift(action.payload);
      })
      .addCase(createDrawing.rejected, (state, action) => {
        state.error = action.payload;
      })

      // updateDrawing
      .addCase(updateDrawing.fulfilled, (state, action) => {
        const idx = state.list.findIndex((d) => d._id === action.payload._id || d.key === action.payload._id);
        if (idx !== -1) state.list[idx] = action.payload;
      })
      .addCase(updateDrawing.rejected, (state, action) => {
        state.error = action.payload;
      })

      // deleteDrawing
      .addCase(deleteDrawing.fulfilled, (state, action) => {
        state.list = state.list.filter((d) => d._id !== action.payload.drawingId && d.key !== action.payload.drawingId);
      })
      .addCase(deleteDrawing.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { resetDrawings } = drawingSlice.actions;
export default drawingSlice.reducer;
