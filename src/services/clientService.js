import { api } from "./api";

export const clientService = {
  // Obtener todos los clientes
  getAllClients: () => api.get("/clients"),

  // Obtener un cliente por ID
  getClientById: (id) => api.get("/clients/" + id),

  // Crear un nuevo cliente
  createClient: (payload) => 
    api.post("/clients", payload, { 
      headers: { "Content-Type": "application/json" } 
    }),

  // Modifica un cliente
  updateClient: (id, payload) => 
    api.put("/clients/" + id, payload, { 
      headers: { "Content-Type": "application/json" } 
    }),

  // Eliminar un cliente
  deleteClient: (id) => api.delete("/clients/" + id),
};
