import { api } from "./api";

export const OrderTaskCreatorService = {
  getAll: () => api.get("/ordertasks"),
  getById: (id) => api.get(`/ordertasks/${id}`),
  create: (payload) => api.post("/ordertasks", payload, { headers: { "Content-Type": "application/json" } }),
  update: (id, payload) => api.put(`/ordertasks/${id}`, payload, { headers: { "Content-Type": "application/json" } }),
  delete: (id) => api.delete(`/ordertasks/${id}`)
};
