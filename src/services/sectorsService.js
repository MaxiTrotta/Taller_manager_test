import { api } from "./api"; // tu instancia de Axios

export const sectorsService = {
  getAllSectors: () => api.get("/sectors"), // endpoint que devuelve todos los sectores
};
