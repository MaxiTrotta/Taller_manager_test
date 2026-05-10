import { api } from "./api"; // tu instancia de axios

export const OrderCreatorService = {
  getAll: () => api.get("/orders"),
  getById: (id) => api.get(`/orders/${id}`),
  create: (payload) => api.post("/orders", payload, { headers: { "Content-Type": "application/json" } }),
  update: (id, payload) => api.put(`/orders/${id}`, payload, { headers: { "Content-Type": "application/json" } }),
  delete: (id) => api.delete(`/orders/${id}`)
};
