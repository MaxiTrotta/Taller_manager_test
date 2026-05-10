import { api } from "./api";

export const authService = {
  login: (payload) =>
    api.post("/users/login", payload, {
      headers: { "Content-Type": "application/json" },
    }),

  register: (payload) =>
    api.post("/users", payload, {
      headers: { "Content-Type": "application/json" },
    }),
};
