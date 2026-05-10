import { api } from "./api";

export const VehicleCreatorService = {
  getAll: () => api.get("/vehicles"),
  getAllByClient: (clientId) => api.get(`/vehicles?clientId=${clientId}`),
  getById: (id) => api.get(`/vehicles/${id}`),
  create: (payload) => api.post("/vehicles", payload, { headers: { "Content-Type": "application/json" } }),
  update: (id, payload) => api.put(`/vehicles/${id}`, payload, { headers: { "Content-Type": "application/json" } }),
  delete: (id) => api.delete(`/vehicles/${id}`)
};
