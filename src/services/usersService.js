import { api } from "./api";

export const usersService = {
  getAll: () => api.get("/users"),
  update: (email, payload) =>
    api.put(`/users/${email}`, payload, {
      headers: { "Content-Type": "application/json" },
    }),
  delete: (email) => api.delete(`/users/${email}`),
};
