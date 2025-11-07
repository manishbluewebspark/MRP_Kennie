import fetch from "auth/FetchInterceptor";

const UserService = {};

// Create User
UserService.createUser = (data) =>
  fetch({ url: "/users", method: "post", data });

// Update User
UserService.updateUser = (userId, data) =>
  fetch({ url: `/users/${userId}`, method: "put", data });

// Delete User
UserService.deleteUser = (userId) =>
  fetch({ url: `/users/${userId}`, method: "delete" });

// Get User by ID
UserService.getUserById = (userId) =>
  fetch({ url: `/users/${userId}`, method: "get" });

// Get All Users (with pagination & filters)
UserService.getAllUsers = (params = {}) =>
  fetch({ url: "/users", method: "get", params });

export default UserService;
