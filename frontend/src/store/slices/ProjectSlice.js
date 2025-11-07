import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import ProjectService from "services/ProjectService";

// -------------------- Thunks --------------------

// Get all projects with pagination & search
// EXPECTED API RESPONSE: { data: [...], pagination: { total, page, limit, pages } }
export const fetchProjects = createAsyncThunk(
  "projects/fetchProjects",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await ProjectService.getAllProjects(params);
      return res.data; // keep as-is; reducers expect { data, pagination }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// Get project by ID
// EXPECTED API RESPONSE: { data: { ...project } }
export const fetchProjectById = createAsyncThunk(
  "projects/fetchProjectById",
  async (projectId, { rejectWithValue }) => {
    try {
      const res = await ProjectService.getProjectById(projectId);
      return res.data; // reducers will use .data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// Create project
// EXPECTED API RESPONSE: { data: { ...createdProject } }
export const createProject = createAsyncThunk(
  "projects/createProject",
  async (projectData, { rejectWithValue }) => {
    try {
      const res = await ProjectService.createProject(projectData);
      return res.data; // reducers will use .data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// Update project
// EXPECTED API RESPONSE: { data: { ...updatedProject } }
export const updateProject = createAsyncThunk(
  "projects/updateProject",
  async ({ projectId, data }, { rejectWithValue }) => {
    try {
      const res = await ProjectService.updateProject(projectId, data);
      return res.data; // reducers will use .data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// Delete project
// EXPECTED API RESPONSE: { success: true, message?: string }
export const deleteProject = createAsyncThunk(
  "projects/deleteProject",
  async ({ projectId, updatedBy }, { rejectWithValue }) => {
    try {
      const res = await ProjectService.deleteProject(projectId, { updatedBy });
      // only need projectId in reducer to filter list
      return { projectId, ...(res.data || {}) };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// -------------------- Slice --------------------

const projectSlice = createSlice({
  name: "projects",
  initialState: {
    list: [],
    selectedProject: null,
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
    resetProjects: (state) => {
      state.list = [];
      state.selectedProject = null;
      state.error = null;
      state.pagination = { total: 0, page: 1, limit: 10, pages: 0 };
    },
    // optional: local update without API (optimistic UI)
    upsertProjectLocal: (state, action) => {
      const proj = action.payload;
      const idx = state.list.findIndex((p) => p._id === proj._id);
      if (idx !== -1) state.list[idx] = proj;
      else state.list.unshift(proj);
    },
  },
  extraReducers: (builder) => {
    // Fetch all
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload?.data || [];
        state.pagination = action.payload?.pagination || {
          total: 0,
          page: 1,
          limit: 10,
          pages: 0,
        };
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch projects";
      });

    // Fetch by ID
    builder
      .addCase(fetchProjectById.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchProjectById.fulfilled, (state, action) => {
        state.selectedProject = action.payload?.data || null;
      })
      .addCase(fetchProjectById.rejected, (state, action) => {
        state.error = action.payload || "Failed to fetch project";
      });

    // Create
    builder
      .addCase(createProject.pending, (state) => {
        state.error = null;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        if (action.payload?.data) state.list.unshift(action.payload.data);
        state.pagination.total += 1;
      })
      .addCase(createProject.rejected, (state, action) => {
        state.error = action.payload || "Failed to create project";
      });

    // Update
    builder
      .addCase(updateProject.pending, (state) => {
        state.error = null;
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        const updated = action.payload?.data;
        if (!updated) return;
        const idx = state.list.findIndex((p) => p._id === updated._id);
        if (idx !== -1) state.list[idx] = updated;
        // also reflect in selectedProject if it's the same
        if (state.selectedProject?._id === updated._id) {
          state.selectedProject = updated;
        }
      })
      .addCase(updateProject.rejected, (state, action) => {
        state.error = action.payload || "Failed to update project";
      });

    // Delete
    builder
      .addCase(deleteProject.pending, (state) => {
        state.error = null;
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        const { projectId } = action.payload || {};
        state.list = state.list.filter((p) => p._id !== projectId);
        if (state.selectedProject?._id === projectId) {
          state.selectedProject = null;
        }
        state.pagination.total = Math.max(0, state.pagination.total - 1);
      })
      .addCase(deleteProject.rejected, (state, action) => {
        state.error = action.payload || "Failed to delete project";
      });
  },
});

export const { resetProjects, upsertProjectLocal } = projectSlice.actions;

// -------------------- Selectors --------------------
export const selectProjects = (s) => s.projects.list;
export const selectProjectsLoading = (s) => s.projects.loading;
export const selectProjectsError = (s) => s.projects.error;
export const selectProjectsPagination = (s) => s.projects.pagination;
export const selectSelectedProject = (s) => s.projects.selectedProject;
export const selectProjectById =
  (id) =>
  (s) =>
    s.projects.list.find((p) => p._id === id);

// -------------------- Reducer --------------------
export default projectSlice.reducer;
