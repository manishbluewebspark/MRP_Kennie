import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import QuoteService from 'services/QuoteService';

// -------------------- Thunks --------------------

// Fetch all quotes
export const fetchQuotes = createAsyncThunk(
  'quotes/fetchQuotes',
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await QuoteService.getAllQuotes(params);
      return res.data; // { data: [...], pagination: {...} }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// Fetch quote by ID
export const fetchQuoteById = createAsyncThunk(
  'quotes/fetchQuoteById',
  async (quoteId, { rejectWithValue }) => {
    try {
      const res = await QuoteService.getQuoteById(quoteId);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// Create quote
export const createQuote = createAsyncThunk(
  'quotes/createQuote',
  async (data, { rejectWithValue }) => {
    try {
      const res = await QuoteService.createQuote(data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// Update quote
export const updateQuote = createAsyncThunk(
  'quotes/updateQuote',
  async ({ quoteId, data }, { rejectWithValue }) => {
    try {
      const res = await QuoteService.updateQuote(quoteId, data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// Delete quote
export const deleteQuote = createAsyncThunk(
  'quotes/deleteQuote',
  async ({ quoteId, updatedBy }, { rejectWithValue }) => {
    try {
      const res = await QuoteService.deleteQuote(quoteId, { updatedBy });
      return { quoteId, ...res.data };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// Update status
export const updateQuoteStatus = createAsyncThunk(
  'quotes/updateQuoteStatus',
  async ({ quoteId, status }, { rejectWithValue }) => {
    try {
      const res = await QuoteService.updateQuoteStatus(quoteId, { status });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// -------------------- Slice --------------------
const quoteSlice = createSlice({
  name: 'quotes',
  initialState: {
    list: [],
    selectedQuote: null,
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
    resetQuotes: (state) => {
      state.list = [];
      state.selectedQuote = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all quotes
      .addCase(fetchQuotes.pending, (state) => { state.loading = true; })
      .addCase(fetchQuotes.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchQuotes.rejected, (state, action) => { state.loading = false; state.error = action.payload; })

      // Fetch quote by ID
      .addCase(fetchQuoteById.fulfilled, (state, action) => { state.selectedQuote = action.payload; })
      .addCase(fetchQuoteById.rejected, (state, action) => { state.error = action.payload; })

      // Create quote
      .addCase(createQuote.fulfilled, (state, action) => { state.list.unshift(action.payload); })
      .addCase(createQuote.rejected, (state, action) => { state.error = action.payload; })

      // Update quote
      .addCase(updateQuote.fulfilled, (state, action) => {
        const idx = state.list.findIndex((q) => q._id === action.payload._id);
        if (idx !== -1) state.list[idx] = action.payload;
      })
      .addCase(updateQuote.rejected, (state, action) => { state.error = action.payload; })

      // Delete quote
      .addCase(deleteQuote.fulfilled, (state, action) => {
        state.list = state.list.filter((q) => q._id !== action.payload.quoteId);
      })
      .addCase(deleteQuote.rejected, (state, action) => { state.error = action.payload; })

      // Update quote status
      .addCase(updateQuoteStatus.fulfilled, (state, action) => {
        const idx = state.list.findIndex((q) => q._id === action.payload._id);
        if (idx !== -1) state.list[idx].status = action.payload.status;
        if (state.selectedQuote && state.selectedQuote._id === action.payload._id) {
          state.selectedQuote.status = action.payload.status;
        }
      })
      .addCase(updateQuoteStatus.rejected, (state, action) => { state.error = action.payload; });
  },
});

export const { resetQuotes } = quoteSlice.actions;
export default quoteSlice.reducer;
