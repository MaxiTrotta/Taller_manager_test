import { api } from "./api";

export const ClientCreatorService = {
  getAll: () => api.get("/clients"),
  getById: (id) => api.get(`/clients/${id}`),
  create: (payload) => api.post("/clients", payload, { headers: { "Content-Type": "application/json" } }),
  update: (id, payload) => api.put(`/clients/${id}`, payload, { headers: { "Content-Type": "application/json" } }),
  delete: (id) => api.delete(`/clients/${id}`)
};
