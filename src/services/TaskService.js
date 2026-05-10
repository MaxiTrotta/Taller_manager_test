// src/services/TaskService.js
import { api } from "./api";

export const TaskService = {
  getAll: () => api.get("/tasks"),
  getById: (id) => api.get(`/tasks/${id}`),
  create: (payload) => api.post("/tasks", payload, {
    headers: { "Content-Type": "application/json" },
  }),
  update: (id, payload) => api.put(`/tasks/${id}`, payload, {
    headers: { "Content-Type": "application/json" },
  }),
  delete: (id) => api.delete(`/tasks/${id}`),
};
