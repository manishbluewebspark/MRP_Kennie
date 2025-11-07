import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import CurrencyService from 'services/CurrencyService';

// Async thunks
export const addCurrency = createAsyncThunk(
  'currency/addCurrency',
  async (currencyData, { rejectWithValue }) => {
    try {
      const response = await CurrencyService.addCurrency(currencyData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const getAllCurrencies = createAsyncThunk(
  'currency/getAllCurrencies',
  async (params, { rejectWithValue }) => {
    try {
      const response = await CurrencyService.getAllCurrencies(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const getCurrencyById = createAsyncThunk(
  'currency/getCurrencyById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await CurrencyService.getCurrencyById(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const updateCurrency = createAsyncThunk(
  'currency/updateCurrency',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await CurrencyService.updateCurrency(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const deleteCurrency = createAsyncThunk(
  'currency/deleteCurrency',
  async (id, { rejectWithValue }) => {
    try {
      await CurrencyService.deleteCurrency(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const currencySlice = createSlice({
  name: 'currency',
  initialState: {
    currencies: [],
    currentCurrency: null,
    loading: false,
    error: null,
    success: false,
    operation: null, // 'add', 'update', 'delete', 'fetch'
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSuccess: (state) => {
      state.success = false;
    },
    clearCurrentCurrency: (state) => {
      state.currentCurrency = null;
    },
    resetOperation: (state) => {
      state.operation = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Add Currency
      .addCase(addCurrency.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.operation = 'add';
      })
      .addCase(addCurrency.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.currencies.push(action.payload);
        state.operation = null;
      })
      .addCase(addCurrency.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.operation = null;
      })
      // Get All Currencies
      .addCase(getAllCurrencies.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.operation = 'fetch';
      })
      .addCase(getAllCurrencies.fulfilled, (state, action) => {
        state.loading = false;
        state.currencies = action.payload;
        state.operation = null;
      })
      .addCase(getAllCurrencies.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.operation = null;
      })
      // Get Currency By ID
      .addCase(getCurrencyById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCurrencyById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCurrency = action.payload;
      })
      .addCase(getCurrencyById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Currency
      .addCase(updateCurrency.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.operation = 'update';
      })
      .addCase(updateCurrency.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        const index = state.currencies.findIndex(currency => currency.id === action.payload.id);
        if (index !== -1) {
          state.currencies[index] = action.payload;
        }
        state.currentCurrency = action.payload;
        state.operation = null;
      })
      .addCase(updateCurrency.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.operation = null;
      })
      // Delete Currency
      .addCase(deleteCurrency.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.success = false;
        state.operation = 'delete';
      })
      .addCase(deleteCurrency.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.currencies = state.currencies.filter(currency => currency.id !== action.payload);
        state.operation = null;
      })
      .addCase(deleteCurrency.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.operation = null;
      });
  },
});

export const { 
  clearError, 
  clearSuccess, 
  clearCurrentCurrency, 
  resetOperation 
} = currencySlice.actions;

export default currencySlice.reducer;