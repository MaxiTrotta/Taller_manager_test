import { api } from "./api";

export const BudgetService = {
  getAll: () => api.get("/budgets"),
  getById: (id) => api.get(`/budgets/${id}`),
  create: (payload) =>
    api.post("/budgets", payload, { headers: { "Content-Type": "application/json" } }),
  update: (id, payload) => api.put(`/budgets/${id}`, payload, { headers: { "Content-Type": "application/json" } }),
  delete: (id) => api.delete(`/budgets/${id}`),
};
