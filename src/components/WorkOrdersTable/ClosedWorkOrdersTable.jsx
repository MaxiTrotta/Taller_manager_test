import { useState, useEffect } from "react";
import {
  Table,
  Badge,
  Group,
  ActionIcon,
  Loader,
  Center,
  TextInput,
  Text,
  ScrollArea,
  Button,
  Modal,
} from "@mantine/core";
import { IconEye } from "@tabler/icons-react";
import TablePagination from "@mui/material/TablePagination";

import { WorkOrderCreatorService } from "../../services/WorkOrderCreatorService";

const stateNumberToText = (n) =>
  n === 1 ? "Pendiente" : n === 2 ? "En proceso" : n === 3 ? "Finalizado" : n === 4 ? "Cerrado" : "Pendiente";

export default function ClosedWorkOrdersTable() {
  const [loading, setLoading] = useState(false);
  const [workOrders, setWorkOrders] = useState([]);

  // filters & pagination (copied from WorkOrdersTable to keep same look)
  const _today = new Date();
  const _todayStr = _today.toISOString().slice(0, 10);
  const _sevenDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const _sevenDaysAgoStr = _sevenDaysAgo.toISOString().slice(0, 10);

  const [searchFilter, setSearchFilter] = useState("");
  const [startDate, setStartDate] = useState(_sevenDaysAgoStr);
  const [endDate, setEndDate] = useState(_todayStr);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // view modal
  const [viewModalOpened, setViewModalOpened] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await WorkOrderCreatorService.getAll();
      const orders = Array.isArray(res.data) ? res.data : [];
      // normalize + filter closed
      const closed = orders
        .map((o) => {
          const vehicle = o.vehicle || o.vehicleData || {};
          const vehicleBrand = o.vehicleBrand || o.vehicle_brand || vehicle.brand || o.brand || "";
          const vehicleModel = o.vehicleModel || o.vehicle_model || vehicle.model || o.model || "";
          return { ...o, vehicleBrand, vehicleModel };
        })
        .filter((o) => o.state === 4);

      setWorkOrders(closed);
    } catch (err) {
      console.error("Error al cargar órdenes cerradas:", err);
      setWorkOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleViewOrder = async (id) => {
    setLoading(true);
    try {
      const res = await WorkOrderCreatorService.getById(id);
      setSelectedOrder(res.data);
      setViewModalOpened(true);
    } catch (err) {
      console.error("Error al traer orden:", err);
    } finally {
      setLoading(false);
    }
  };

  // filtering logic (simple copy adapted)
  const filtered = workOrders
    .filter((o) => {

      const d = (o.creationDate || "").slice(0, 10);
      if (!startDate && !endDate && !searchFilter) return bySearch;
      const byDate = (() => {
        if (!startDate && !endDate) return true;
        if (!o.creationDate) return false;
        try {
          const dd = new Date(o.creationDate).toISOString().slice(0, 10);
          if (startDate && endDate) return dd >= startDate && dd <= endDate;
          if (startDate) return dd >= startDate;
          if (endDate) return dd <= endDate;
          return true;
        } catch {
          return false;
        }
      })();

      const bySearch = searchFilter
        ? `${o.client || ""} ${o.vehicle || ""} ${o.vehicleBrand || ""} ${o.vehicleModel || ""}`
          .toLowerCase()
          .includes(searchFilter.toLowerCase())
        : true;

      return bySearch && byDate;
    })
    .sort((a, b) => {
      const ta = a.modifiedAt ? new Date(a.modifiedAt).getTime() : (a.creationDate ? new Date(a.creationDate).getTime() : 0);
      const tb = b.modifiedAt ? new Date(b.modifiedAt).getTime() : (b.creationDate ? new Date(b.creationDate).getTime() : 0);
      return tb - ta;
    });

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  if (loading) {
    return (
      <Center style={{ padding: 20 }}>
        <Loader />
      </Center>
    );
  }

  return (
    <div>
      <ScrollArea>
        <Group justify="space-between" mb="sm">
          <Text fz="xl" fw={600}>
            Órdenes Cerradas
          </Text>
        </Group>

        <Group mb="sm">
          <TextInput
            placeholder="Buscar cliente, patente, marca o modelo..."
            value={searchFilter}
            onChange={(e) => {
              setSearchFilter(e.currentTarget.value);
              setPage(0);
            }}
            style={{ width: 420 }}
          />

          <TextInput
            type="date"
            label="Desde"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.currentTarget.value);
              setPage(0);
            }}
            style={{ width: 200 }}
          />
          <TextInput
            type="date"
            label="Hasta"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.currentTarget.value);
              setPage(0);
            }}
            style={{ width: 200 }}
          />

          <Button
            variant="outline"
            color="gray"
            onClick={() => {
           setSearchFilter("");
              setStartDate(_sevenDaysAgoStr);
              setEndDate(_todayStr);
              setPage(0);
            }}
          >
            Limpiar filtros
          </Button>
        </Group>

        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>ID</Table.Th>
              <Table.Th>Cliente</Table.Th>
              <Table.Th>Vehículo</Table.Th>
              <Table.Th>Fecha de creación</Table.Th>
              <Table.Th>Fecha de modificación</Table.Th>
              <Table.Th>Estado</Table.Th>
              <Table.Th>Acciones</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {paginated.map((order) => (
              <Table.Tr key={order.id}>
                <Table.Td>{order.id}</Table.Td>
                <Table.Td>{order.client}</Table.Td>
                <Table.Td>{order.vehicle}</Table.Td>
                <Table.Td>
                  {order.creationDate
                    ? new Date(order.creationDate).toLocaleString("es-ES", { hour12: false })
                    : "-"}
                </Table.Td>
                <Table.Td>
                  {order.modifiedAt
                    ? new Date(order.modifiedAt).toLocaleString("es-ES", { hour12: false })
                    : "-"}
                </Table.Td>
                <Table.Td>
                  <Badge color={order.state === 4 ? "violet" : "gray"} variant="filled">
                    {stateNumberToText(order.state)}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap={0} justify="flex-end">
                    <ActionIcon color="gray" variant="subtle" onClick={() => handleViewOrder(order.id)}>
                      <IconEye size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        <TablePagination
          component="div"
          className="table-pagination-contrast"
          count={filtered.length}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
          sx={{
            color: "white !important",
          }}
        />
      </ScrollArea>

      <Modal opened={viewModalOpened} onClose={() => setViewModalOpened(false)} title="Detalle de Orden de Trabajo" centered size="xl">
        {selectedOrder ? (
          <>
            <Text>
              <b>Cliente:</b> {selectedOrder.client}
            </Text>
            <Text>
              <b>Vehículo:</b> {selectedOrder.vehicle}
            </Text>
            {selectedOrder.vehicleBrand || selectedOrder.vehicleModel ? (
              <Text>
                <b>Marca / Modelo:</b> {selectedOrder.vehicleBrand || "-"} {selectedOrder.vehicleModel || ""}
              </Text>
            ) : null}

            <Text mt="sm">
              <b>Creado por:</b> {selectedOrder.createdBy || "-"}
            </Text>
            <Text>
              <b>Creado el:</b> {selectedOrder.creationDate || "-"}
            </Text>
            <Text>
              <b>Última modificación por:</b> {selectedOrder.modifiedBy || "-"}
            </Text>
            <Text>
              <b>Última modificación el:</b> {selectedOrder.modifiedAt || "-"}
            </Text>

            <Group gap="xs" align="center" mt="sm">
              <Text fw={500}>Estado:</Text>
              <Badge color={selectedOrder.state === 4 ? "violet" : "gray"} variant="filled">
                {stateNumberToText(selectedOrder.state)}
              </Badge>
            </Group>

            <Text mt="md" fw={600}>
              Tareas
            </Text>
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Sector</Table.Th>
                  <Table.Th>Trabajo a realizar</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th>Detalles / Observaciones </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {selectedOrder.tasks?.length > 0 ? (
                  selectedOrder.tasks.map((t, i) => (
                    <Table.Tr key={i}>
                      <Table.Td>{t.sectorName}</Table.Td>
                      <Table.Td>{t.taskDescription}</Table.Td>
                      <Table.Td>
                        <Badge color={t.state === 1 ? "red" : t.state === 2 ? "yellow" : "green"} variant="filled">
                          {t.state || "Sin estado"}
                        </Badge>
                      </Table.Td>
                      <Table.Td style={{ maxWidth: "400px", whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "break-word" }}>
                        {t.note || "-"}
                      </Table.Td>
                    </Table.Tr>
                  ))
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={4} align="center">
                      Sin tareas
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </>
        ) : (
          <Text>Cargando orden...</Text>
        )}
      </Modal>
    </div>
  );
}
