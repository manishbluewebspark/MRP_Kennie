import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import LibraryService from "../../services/libraryService";

/**
 * ----------------------------
 * Thunks for MPN
 * ----------------------------
 */
export const fetchAllMpn = createAsyncThunk("library/fetchAllMpn", async (params, thunkAPI) => {
  try {
    return await LibraryService.getAllMpn(params);
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data || err.message);
  }
});

export const addMpn = createAsyncThunk("library/addMpn", async (data, thunkAPI) => {
  try {
    return await LibraryService.addMpn(data);
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data || err.message);
  }
});

export const updateMpn = createAsyncThunk("library/updateMpn", async ({ id, data }, thunkAPI) => {
  try {
    return await LibraryService.updateMpn(id, data);
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data || err.message);
  }
});

export const deleteMpn = createAsyncThunk("library/deleteMpn", async (id, thunkAPI) => {
  try {
    return await LibraryService.deleteMpn(id);
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data || err.message);
  }
});

/**
 * ----------------------------
 * Thunks for Child
 * ----------------------------
 */
export const fetchAllChild = createAsyncThunk("library/fetchAllChild", async (params, thunkAPI) => {
  try {
    return await LibraryService.getAllChild(params);
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data || err.message);
  }
});

export const addChild = createAsyncThunk("library/addChild", async (data, thunkAPI) => {
  try {
    return await LibraryService.addChild(data);
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data || err.message);
  }
});

export const updateChild = createAsyncThunk("library/updateChild", async ({ id, data }, thunkAPI) => {
  try {
    return await LibraryService.updateChild(id, data);
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data || err.message);
  }
});

export const deleteChild = createAsyncThunk("library/deleteChild", async (id, thunkAPI) => {
  try {
    return await LibraryService.deleteChild(id);
  } catch (err) {
    return thunkAPI.rejectWithValue(err.response?.data || err.message);
  }
});

/**
 * ----------------------------
 * Slice
 * ----------------------------
 */
const librarySlice = createSlice({
  name: "library",
  initialState: {
    mpnList: [],
    childList: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch MPN
      .addCase(fetchAllMpn.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAllMpn.fulfilled, (state, action) => {
        state.loading = false;
        state.mpnList = action.payload.data;
      })
      .addCase(fetchAllMpn.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch Child
      .addCase(fetchAllChild.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAllChild.fulfilled, (state, action) => {
        state.loading = false;
        state.childList = action.payload;
      })
      .addCase(fetchAllChild.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError } = librarySlice.actions;

export default librarySlice.reducer;
