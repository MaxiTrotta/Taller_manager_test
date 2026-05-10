import { useState, useEffect } from 'react';
import { Container, Grid, Paper, Text, Center, Loader, Group, Card, RingProgress, Stack } from '@mantine/core';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DashboardService } from '../../services/DashboardService';
import { showNotification } from '@mantine/notifications';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [tasksPerformed, setTasksPerformed] = useState([]);
  const [sectorStats, setSectorStats] = useState([]);
  const [ordersPerDay, setOrdersPerDay] = useState([]);
  const [ordersStatus, setOrdersStatus] = useState([]);
  const [topClients, setTopClients] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [tasks, sectors, orders, status, clients, summaryData] = await Promise.all([
        DashboardService.getMostPerformedTasks(),
        DashboardService.getSectorStats(),
        DashboardService.getOrdersPerDay(),
        DashboardService.getOrdersStatus(),
        DashboardService.getTopClients(),
        DashboardService.getSummary(),
      ]);

      setTasksPerformed(tasks?.data || []);
      setSectorStats(sectors?.data || []);
      setOrdersPerDay(orders?.data || []);
      setOrdersStatus(status?.data || []);
      setTopClients(clients?.data || []);
      setSummary(summaryData?.data || {});
    } catch (err) {
      console.error('Error al cargar datos del dashboard:', err);
      showNotification({
        title: 'Error',
        message: 'No se pudieron cargar los datos del dashboard',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Center style={{ height: '100vh' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Text size="xl" fw={700} mb="xl">
        📊 Dashboard de Estadísticas
      </Text>

      {/* SUMMARY CARDS */}
      {summary && (
        <Grid mb="xl">
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card shadow="sm" p="md" radius="md" withBorder>
              <Stack gap="xs">
                <Text size="sm" c="dimmed">
                  Total de Órdenes
                </Text>
                <Text size="lg" fw={700}>
                  {summary.totalOrders || 0}
                </Text>
              </Stack>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card shadow="sm" p="md" radius="md" withBorder>
              <Stack gap="xs">
                <Text size="sm" c="dimmed">
                  Órdenes Pendientes
                </Text>
                <Text size="lg" fw={700} c="orange">
                  {summary.pendingOrders || 0}
                </Text>
              </Stack>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card shadow="sm" p="md" radius="md" withBorder>
              <Stack gap="xs">
                <Text size="sm" c="dimmed">
                  Órdenes en Proceso
                </Text>
                <Text size="lg" fw={700} c="blue">
                  {summary.inProgressOrders || 0}
                </Text>
              </Stack>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card shadow="sm" p="md" radius="md" withBorder>
              <Stack gap="xs">
                <Text size="sm" c="dimmed">
                  Órdenes Finalizadas
                </Text>
                <Text size="lg" fw={700} c="green">
                  {summary.completedOrders || 0}
                </Text>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>
      )}

      {/* CHARTS */}
      <Grid>
        {/* Órdenes por día */}
        {ordersPerDay.length > 0 && (
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper className="chartPaper" shadow="sm" p="md" radius="md" withBorder>
              <Text fw={600} mb="md">
                Órdenes por Día (últimos 30 días)
              </Text>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={ordersPerDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(0,0,0,0.7)",
                      border: "none",
                      boxShadow: "none",
                      color: "#fff"
                    }}
                    wrapperStyle={{ outline: "none" }}
                  />

                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#45B7D1" name="Órdenes" />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid.Col>
        )}

        {/* Estado de órdenes (Pie Chart) */}
        {ordersStatus.length > 0 && (
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper className="chartPaper" shadow="sm" p="md" radius="md" withBorder>
              <Text fw={600} mb="md">
                Estado de Órdenes
              </Text>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={ordersStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, count }) => `${name}: ${count}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {ordersStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value} órdenes`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid.Col>
        )}

        {/* Tareas más realizadas */}
        {tasksPerformed.length > 0 && (
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper className="chartPaper" shadow="sm" p="md" radius="md" withBorder>
              <Text fw={600} mb="md">
                Top 5 Tareas Más Realizadas
              </Text>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tasksPerformed}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="taskName" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(0,0,0,0.7)",
                      border: "none",
                      boxShadow: "none",
                      color: "#fff"
                    }}
                    wrapperStyle={{ outline: "none" }}
                  />

                  <Legend />
                  <Bar dataKey="count" fill="#f71919ff" name="Cantidad" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid.Col>
        )}

        {/* Sectores con más trabajos */}
        {sectorStats.length > 0 && (
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Paper className="chartPaper" shadow="sm" p="md" radius="md" withBorder>
              <Text fw={600} mb="md">
                Sectores con Más Trabajos
              </Text>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sectorStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="sectorName" type="category" width={100} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(0,0,0,0.7)",
                      border: "none",
                      boxShadow: "none",
                      color: "#fff"
                    }}
                    wrapperStyle={{ outline: "none" }}
                  />

                  <Legend />
                  <Bar dataKey="count" fill="#FFA07A" name="Cantidad de trabajos" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid.Col>
        )}

        {/* Top Clientes */}
        {topClients.length > 0 && (
          <Grid.Col span={{ base: 12 }}>
            <Paper className="chartPaper" shadow="sm" p="md" radius="md" withBorder>
              <Text fw={600} mb="md">
                Top 10 Clientes por Órdenes
              </Text>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topClients} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="clientName" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(0,0,0,0.7)",
                      border: "none",
                      boxShadow: "none",
                      color: "#fff"
                    }}
                    wrapperStyle={{ outline: "none" }}
                  />

                  <Legend />
                  <Bar dataKey="orderCount" fill="#45B7D1" name="Cantidad de órdenes" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid.Col>
        )}
      </Grid>
    </Container>
  );
}
