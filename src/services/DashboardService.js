import { api } from './api';

export const DashboardService = {
  // Obtener tareas más realizadas
  getMostPerformedTasks: async () => {
    try {
      const response = await api.get('/dashboard/tasks-performed');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Obtener sectores con más trabajos
  getSectorStats: async () => {
    try {
      const response = await api.get('/dashboard/sector-stats');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Obtener cantidad de órdenes por día (últimas 30 días)
  getOrdersPerDay: async () => {
    try {
      const response = await api.get('/dashboard/orders-per-day');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Obtener estado general de órdenes (pendientes, en proceso, finalizadas)
  getOrdersStatus: async () => {
    try {
      const response = await api.get('/dashboard/orders-status');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Obtener clientes con más órdenes
  getTopClients: async () => {
    try {
      const response = await api.get('/dashboard/top-clients');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Obtener resumen general
  getSummary: async () => {
    try {
      const response = await api.get('/dashboard/summary');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};
