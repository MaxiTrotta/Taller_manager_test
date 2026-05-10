import { api } from "./api";

export const employeesService = {
  // Listar todos los empleados con sectorName incluido
  getAllEmployees: async () => {
    return api.get("/employees"); // llama a EmployeesGetController.php
  },

  // Obtener un empleado por ID
  getEmployeeById: async (id) => {
    return api.get(`/employees?id=${id}`); // llama a EmployedGetController.php
  },

  // Crear empleado
  createEmployed: async (employee) => {
    return api.post("/employees", employee);
  },

  // Actualizar empleado
  updateEmployed: async (id, employee) => {
  return api.put(`/employees/${id}`, employee);
  },

  // Eliminar empleado
  deleteEmployed: async (id) => {
  return api.delete(`/employees/${id}`);
  },
};
