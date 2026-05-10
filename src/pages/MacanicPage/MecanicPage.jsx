import { useState, useEffect } from "react";
import {
  Table,
  Text,
  Group,
  Button,
  Modal,
  Select,
  TextInput,
  Textarea,
  ScrollArea,
  Loader,
  Center,
  Overlay,
  Badge,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import {
  IconPlus,
  IconEye,
  IconPencil,
  IconTrash,
  IconKey,
  IconXboxX,
  IconWreckingBall,
  IconNut,
  IconCheck,
  IconSearch,
} from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import TablePagination from "@mui/material/TablePagination";

import { WorkOrderCreatorService } from "../../services/WorkOrderCreatorService";
import { ClientCreatorService } from "../../services/ClientCreatorService";
import { VehicleCreatorService } from "../../services/VehicleCreatorService";
import { TaskService } from "../../services/TaskService";
import { OrderTaskService } from "../../services/OrderTaskService";
import { sectorsService } from "../../services/sectorsService";
import {
  validateNewOrderPayload,
  validateEditedTasksPayload,
} from "../../utils/validators";

export default function MecanicPage() {
  const [userName, setUserName] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workOrders, setWorkOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState(null);
  const [selectedOrderForDelete, setSelectedOrderForDelete] =
    useState(null);

  const [addModalOpened, { open: openAdd, close: closeAdd }] =
    useDisclosure(false);
  const [viewModalOpened, { open: openView, close: closeView }] =
    useDisclosure(false);
  const [editModalOpened, { open: openEdit, close: closeEdit }] =
    useDisclosure(false);
  const [deleteModalOpened, { open: openDelete, close: closeDelete }] =
    useDisclosure(false);
  const [
    logoutModalOpened,
    { open: openLogoutModal, close: closeLogoutModal },
  ] = useDisclosure(false);

  const [newOrder, setNewOrder] = useState({
    idClient: "",
    idVehicle: "",
    tasks: [{ idSector: "", idTask: "", note: "" }],
  });
  const [newOrderErrors, setNewOrderErrors] = useState({
    idClient: null,
    idVehicle: null,
    tasks: [],
  });

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [search, setSearch] = useState("");

  // Confirmar finalización de tarea
  const [confirmFinishOpened, setConfirmFinishOpened] = useState(false);
  const [taskIndexToFinish, setTaskIndexToFinish] = useState(null);

  // =================== HELPERS ===================
  const stateTextToNumber = (s) => {
    const t = (s || "").toString().toLowerCase();
    if (t === "pendiente" || t === "1") return 1;
    if (t.includes("proceso") || t === "2") return 2;
    if (t === "finalizado" || t === "3") return 3;
    return 1;
  };

  const stateNumberToText = (n) =>
    n === 1 ? "Pendiente" : n === 2 ? "En proceso" : "Finalizado";

  const formatDate = (value) => {
    if (!value) return "";
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return String(value);
      return d.toLocaleString();
    } catch {
      return String(value);
    }
  };

  // =================== FETCH ===================
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await WorkOrderCreatorService.getAll();
      const orders = Array.isArray(res.data) ? res.data : [];
      // Normalizar campos de vehículo (por si el backend los devuelve en distintas formas)
      const normalized = orders.map((o) => {
        const vehicle = o.vehicle || o.vehicleData || {};
        const vehicleBrand =
          o.vehicleBrand ||
          o.vehicle_brand ||
          vehicle.brand ||
          o.brand ||
          "";
        const vehicleModel =
          o.vehicleModel ||
          o.vehicle_model ||
          vehicle.model ||
          o.model ||
          "";
        return { ...o, vehicleBrand, vehicleModel };
      });

      // Ordenar por fecha más reciente (más reciente primero)
      const sortedOrders = normalized.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.creationDate || 0);
        const dateB = new Date(b.createdAt || b.creationDate || 0);
        return dateB - dateA; // Más reciente primero
      });
      setWorkOrders(sortedOrders);
    } catch (err) {
      console.error("Error al cargar órdenes:", err);
      setWorkOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await ClientCreatorService.getAll();
      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
          ? res.data.data
          : [];
      setClients(data);
    } catch {
      setClients([]);
    }
  };

  const fetchVehiclesByClient = async (idClient) => {
    try {
      const res = await VehicleCreatorService.getAllByClient(idClient);
      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
          ? res.data.data
          : [];
      setVehicles(data);
    } catch {
      setVehicles([]);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await TaskService.getAll();
      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
          ? res.data.data
          : [];
      setTasks(data);
    } catch {
      setTasks([]);
    }
  };

  const fetchSectors = async () => {
    try {
      const res = await sectorsService.getAllSectors();
      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
          ? res.data.data
          : [];
      setSectors(data);
    } catch {
      setSectors([]);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchClients();
    fetchTasks();
    fetchSectors();

    // Obtener el nombre del usuario desde localStorage
    const name = localStorage.getItem("userName") || "Usuario";
    setUserName(name);

    // Auto-refresh cada 10 minutos
    const interval = setInterval(() => {
      fetchOrders();
    }, 600000);

    return () => clearInterval(interval);
  }, []);

  // =================== LOGOUT ===================
  const handleLogout = () => {
    showNotification({
      color: "green",
      icon: <IconCheck />,
      message: "Sesión cerrada correctamente.",
      position: "bottom-right",
    });
    setTimeout(() => {
      localStorage.clear();
      window.location.href = "/login";
    }, 1200);
  };

  // =================== CREAR ORDEN ===================
  const handleAddOrder = async () => {
    const errors = validateNewOrderPayload(newOrder);
    setNewOrderErrors(errors);
    if (Object.values(errors).some((e) => e)) return;
    setSaving(true);
    try {
      const payloadOrder = {
        idClient: parseInt(newOrder.idClient),
        idVehicle: parseInt(newOrder.idVehicle),
        idOrderTask: 0,
        deleted: 0,
        createdBy: localStorage.getItem("userName") || null,
      };
      await WorkOrderCreatorService.create(payloadOrder);

      const allOrders = await WorkOrderCreatorService.getAll();
      const lastOrder =
        Array.isArray(allOrders.data) && allOrders.data.length > 0
          ? allOrders.data[allOrders.data.length - 1]
          : null;
      const newOrderId = lastOrder?.id;

      if (newOrderId) {
        for (const task of newOrder.tasks) {
          if (task.idTask && task.idSector) {
            const payloadTask = {
              idOrder: newOrderId,
              idTask: parseInt(task.idTask),
              idSector: parseInt(task.idSector),
              state: "Pendiente",
              note: task.note || "",
              deleted: 0,
            };
            await OrderTaskService.create(payloadTask);
          }
        }
      }

      await fetchOrders();
      closeAdd();
      setNewOrder({
        idClient: "",
        idVehicle: "",
        tasks: [{ idSector: "", idTask: "", note: "" }],
      });
      setNewOrderErrors({ idClient: null, idVehicle: null, tasks: [] });
    } catch (err) {
      console.error("Error al crear orden:", err);
    } finally {
      setSaving(false);
    }
  };

  // =================== EDITAR ORDEN (TRAER CON TAREAS) ===================
  const handleEditClick = async (id) => {
    setLoading(true);
    try {
      const resOrder = await WorkOrderCreatorService.getById(id);
      const order = resOrder.data;

      const [resTasksAll, resTasksCatalog, resSectors] = await Promise.all([
        OrderTaskService.getAll(),
        TaskService.getAll(),
        sectorsService.getAllSectors(),
      ]);

      const allOrderTasks = Array.isArray(resTasksAll.data)
        ? resTasksAll.data
        : Array.isArray(resTasksAll.data?.data)
          ? resTasksAll.data.data
          : [];

      const allTasks = resTasksCatalog.data || [];
      const allSectors = resSectors.data || [];

      const rebuiltProjection = (order.tasks || []).map((t) => {
        const foundTask = allTasks.find(
          (tk) =>
            tk.description &&
            t.taskDescription &&
            tk.description.trim().toLowerCase() ===
            t.taskDescription.trim().toLowerCase()
        );
        const foundSector = allSectors.find(
          (s) =>
            s.name &&
            t.sectorName &&
            s.name.trim().toLowerCase() === t.sectorName.trim().toLowerCase()
        );
        return {
          ...t,
          idTask: foundTask ? foundTask.id : t.idTask || null,
          idSector: foundSector ? foundSector.id : t.idSector || null,
        };
      });

      const usedIds = new Set();
      const mergedTasks = rebuiltProjection.map((pt) => {
        const candidates = allOrderTasks.filter(
          (rt) =>
            Number(rt.idOrder) === Number(order.id) &&
            Number(rt.idTask) === Number(pt.idTask) &&
            Number(rt.idSector) === Number(pt.idSector)
        );

        if (candidates.length === 0) return pt;

        let match = candidates.find(
          (rt) =>
            !usedIds.has(rt.id) &&
            (rt.note || "").trim() === (pt.note || "").trim()
        );

        if (!match) {
          match = candidates.find((rt) => !usedIds.has(rt.id));
        }

        if (match) {
          usedIds.add(match.id);
          return { ...pt, id: match.id };
        }

        return pt;
      });

      setSelectedOrderForEdit({ ...order, tasks: mergedTasks });
      openEdit();
    } catch (err) {
      console.error("Error al traer orden para editar:", err);
    } finally {
      setLoading(false);
    }
  };

  // =================== VER ORDEN (solo vista) ===================
  const handleViewOrder = async (id) => {
    setLoading(true);
    try {
      const res = await WorkOrderCreatorService.getById(id);
      setSelectedOrder(res.data);
      openView();
    } catch (err) {
      console.error("Error al traer orden para ver:", err);
      setSelectedOrder(null);
    } finally {
      setLoading(false);
    }
  };

  // =================== GUARDAR TAREAS ===================
  const handleSaveEditedTasks = async () => {
    if (!selectedOrderForEdit || !selectedOrderForEdit.tasks) return;
    setSaving(true);
    try {
      for (const t of selectedOrderForEdit.tasks) {
        if (!t.id) {
          console.warn("⚠️ Tarea sin id, se omite:", t);
          continue;
        }

        // Recalcular ids por las dudas
        if (!t.idSector && t.sectorName && Array.isArray(sectors)) {
          const foundSector = sectors.find(
            (s) =>
              s.name &&
              t.sectorName &&
              s.name.trim().toLowerCase() ===
              t.sectorName.trim().toLowerCase()
          );
          if (foundSector) t.idSector = foundSector.id;
        }

        if (!t.idTask && t.taskDescription && Array.isArray(tasks)) {
          const foundTask = tasks.find(
            (tk) =>
              tk.description &&
              t.taskDescription &&
              tk.description.trim().toLowerCase() ===
              t.taskDescription.trim().toLowerCase()
          );
          if (foundTask) t.idTask = foundTask.id;
        }

        if (!t.idSector || !t.idTask) {
          console.warn(
            "⚠️ Falta idSector o idTask, se omite update de:",
            t
          );
          continue;
        }

        const stateNumber =
          typeof t.state === "number"
            ? t.state
            : (t.state || "").toLowerCase() === "pendiente"
              ? 1
              : (t.state || "").toLowerCase().includes("proceso")
                ? 2
                : 3;

        await OrderTaskService.update(t.id, {
          idOrder: selectedOrderForEdit.id,
          idTask: t.idTask,
          idSector: t.idSector,
          state: stateNumber,
          note: t.note || "",
          updatedAt: new Date().toISOString(),
          finalizedAt:
            stateNumber === 3
              ? t.finalizedAt || new Date().toISOString()
              : null,
          modifiedBy: localStorage.getItem("userName") || null,
        });

        // Notificación por cada tarea que se finaliza
        if (
          stateNumber === 3 &&
          (t.state || "").toString().toLowerCase() !== "finalizado"
        ) {
          showNotification({
            color: "green",
            icon: <IconCheck />,
            message: `Tarea finalizada: ${t.taskDescription}`,
            position: "bottom-right",
          });
        }
      }

      // Actualizar la fecha de creación de la orden al modificar tareas
      // Necesitamos obtener los IDs reales de la orden
      try {
        // Buscar el cliente por nombre para obtener su ID
        const foundClient = clients.find(
          (c) => c.name === selectedOrderForEdit.client
        );

        if (foundClient) {
          // Obtener vehículos del cliente para buscar el vehículo por patente
          const clientVehicles = await VehicleCreatorService.getAllByClient(foundClient.id);
          const vehiclesData = Array.isArray(clientVehicles.data)
            ? clientVehicles.data
            : Array.isArray(clientVehicles.data?.data)
              ? clientVehicles.data.data
              : [];

          const foundVehicle = vehiclesData.find(
            (v) => v.licensePlate === selectedOrderForEdit.vehicle
          );

          if (foundVehicle) {
            await WorkOrderCreatorService.update(selectedOrderForEdit.id, {
              idClient: foundClient.id,
              idVehicle: foundVehicle.id,
              idOrderTask: 0,
              modifiedBy: localStorage.getItem("userName") || null,
            });
          }
        }
      } catch (err) {
        console.error("Error al actualizar fecha de orden:", err);
      }

      try {
        const resUpdated = await WorkOrderCreatorService.getById(
          selectedOrderForEdit.id
        );
  const updatedOrder = resUpdated.data;
  updatedOrder.modifiedAt = new Date().toISOString();
  updatedOrder.modifiedBy = localStorage.getItem("userName") || null;

        // Si todas las tareas quedaron finalizadas, marcamos la orden como finalizada en el FRONT
        const allFinished = (updatedOrder.tasks || []).every((tt) => {
          const st = (tt.state || "").toString().toLowerCase();
          return st === "finalizado" || Number(tt.state) === 3;
        });

        if (allFinished) {
          updatedOrder.state = 3;
        }

        // Ordenar por fecha más reciente después de actualizar
        setWorkOrders((prev) => {
          const updated = prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
          return updated.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.creationDate || 0);
            const dateB = new Date(b.createdAt || b.creationDate || 0);
            return dateB - dateA; // Más reciente primero
          });
        });
      } catch (err) {
        console.error(
          "Error al obtener orden actualizada, recargando todas:",
          err
        );
        await fetchOrders();
      }

      closeEdit();
      showNotification({
        color: "green",
        icon: <IconCheck />,
        message: "Tareas actualizadas correctamente.",
        position: "bottom-right",
      });
    } catch (err) {
      console.error("Error al actualizar tareas:", err);
      showNotification({
        color: "red",
        message: "Error al actualizar tareas.",
        position: "bottom-right",
      });
    } finally {
      setSaving(false);
    }
  };

  // =================== ELIMINAR ORDEN ===================
  const handleDeleteOrder = async () => {
    if (!selectedOrderForDelete) return;
    setSaving(true);
    try {
      await WorkOrderCreatorService.delete(selectedOrderForDelete.id);
      await fetchOrders();
      closeDelete();
    } catch (err) {
      console.error("Error al eliminar orden:", err);
    } finally {
      setSaving(false);
    }
  };

  // =================== FILTRO Y BÚSQUEDA ===================
const filteredOrders = workOrders.filter((order) => {
  // Ocultar órdenes finalizadas en la vista de mecánico
  const isHidden =
    typeof order.state === "number"
      ? order.state === 3 || order.state === 4
      : ["finalizado", "Cerrado"].includes(
          (order.state || "").toString().toLowerCase()
        );

  if (isHidden) return false;

  if (!search || search.trim() === "") return true;

  const searchLower = search.toLowerCase().trim();

  const clientMatch = (order.client || "")
    .toLowerCase()
    .includes(searchLower);

  const vehicleMatch = (order.vehicle || "")
    .toLowerCase()
    .includes(searchLower);

  return clientMatch || vehicleMatch;
});

// =================== FILAS ===================
  const paginated = filteredOrders.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const rows = paginated.map((order) => {
    const isFinal =
      typeof order.state === "number"
        ? order.state === 3
        : (order.state || "").toString().toLowerCase() === "finalizado";

    return (
      <Table.Tr key={order.id}>
        <Table.Td>{order.client}</Table.Td>
        <Table.Td>
          {order.vehicle}
          {(order.vehicleBrand || order.vehicleModel) && (
            <div style={{ fontSize: 12, color: '#666' }}>
              {order.vehicleBrand || ''} {order.vehicleModel || ''}
            </div>
          )}
        </Table.Td>
        <Table.Td>{formatDate(order.createdAt ?? order.creationDate)}</Table.Td>
        <Table.Td>
          <Badge
            color={
              order.state === 1
                ? "red"
                : order.state === 2
                  ? "yellow"
                  : order.state === 3
                    ? "green"
                    : "gray"
            }
            variant="filled"
          >
            {order.state === 1
              ? "Pendiente"
              : order.state === 2
                ? "En proceso"
                : order.state === 3
                  ? "Finalizado"
                  : "Sin tareas"}
          </Badge>
        </Table.Td>
        <Table.Td style={{ textAlign: "center" }}>
          <Group position="center" spacing="xs">
            <Button
              color="gray"
              size="xs"
              leftSection={<IconEye size={14} />}
              onClick={() => handleViewOrder(order.id)}
              title="Ver orden"
            >
              Ver
            </Button>
            <Button
              color={isFinal ? "gray" : "green"}
              size="xs"
              leftSection={<IconPencil size={14} />}
              onClick={() => handleEditClick(order.id)}
              disabled={isFinal}
              title={
                isFinal
                  ? "La orden está finalizada y no puede modificarse"
                  : "Modificar orden"
              }
            >
              Modificar
            </Button>
          </Group>
        </Table.Td>
      </Table.Tr>
    );
  });

  // =================== UI ===================
  return (
    <div style={{ position: "relative" }}>
      {(loading || saving) && (
        <>
          <Overlay opacity={0.6} color="#000" blur={2} zIndex={9998} />
          <Center style={{ position: "fixed", inset: 0, zIndex: 9999 }}>
            <Loader size="xl" color="green" />
          </Center>
        </>
      )}

      <ScrollArea>
        <Group justify="space-between" align="center" mb="sm" mt="sm">
          <div>
            <Text fz="xl" fw={600}>
              Órdenes de Trabajo
            </Text>
            <Text size="sm" c="dimmed" mt={4}>
              Bienvenido, {userName}
            </Text>
          </div>
          <Button
            color="red"
            leftSection={<IconXboxX size={16} />}
            onClick={openLogoutModal}
            variant="filled"
          >
            Cerrar sesión
          </Button>
        </Group>

        {/* Buscador */}
        <TextInput
          placeholder="Buscar por cliente o patente..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => {
            setSearch(e.currentTarget.value);
            setPage(0); // Resetear página al buscar
          }}
          mb="md"
          style={{ maxWidth: "400px" }}
        />

        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Cliente</Table.Th>
              <Table.Th>Vehículo</Table.Th>
              <Table.Th>Fecha creación / Modificación</Table.Th>
              <Table.Th>Estado</Table.Th>
              <Table.Th style={{ textAlign: "center" }}>Acciones</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>

        <TablePagination
          component="div"
          count={filteredOrders.length}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]} 
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
        {/* 🔴 Modal Cerrar Sesión */}
        <Modal
          opened={logoutModalOpened}
          onClose={closeLogoutModal}
          title="Confirmar cierre de sesión"
          centered
          size="sm"
        >
          <Text>¿Seguro que deseas cerrar la sesión actual?</Text>
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeLogoutModal}>
              Cancelar
            </Button>
            <Button color="red" onClick={handleLogout}>
              Cerrar sesión
            </Button>
          </Group>
        </Modal>

        {/* � Modal Ver (solo lectura) */}
        <Modal
          opened={viewModalOpened}
          onClose={closeView}
          title="Detalle de Orden"
          centered
          size="xl"
        >
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


              <Group gap="xs" align="center" mt="sm">
                <Text fw={500}>Estado:</Text>
                <Badge
                  color={
                    selectedOrder.state === 1
                      ? "red"
                      : selectedOrder.state === 2
                        ? "yellow"
                        : "green"
                  }
                  variant="filled"
                >
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
                          <Badge
                            color={
                              stateTextToNumber(t.state) === 1
                                ? "red"
                                : stateTextToNumber(t.state) === 2
                                  ? "yellow"
                                  : "green"
                            }
                            variant="filled"
                          >
                            {t.state || "Sin estado"}
                          </Badge>
                        </Table.Td>
                        <Table.Td
                          style={{
                            maxWidth: "400px",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            overflowWrap: "break-word",
                          }}
                        >
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

        {/* �🟢 Modal Editar */}
        <Modal
          opened={editModalOpened}
          onClose={closeEdit}
          title="DETALLE DE ORDEN"
          centered
          size="xl"
        >
          {selectedOrderForEdit ? (
            <>
              <Text fw={600} mb="sm">
                Cliente: {selectedOrderForEdit.client} <br />
                Vehículo: {selectedOrderForEdit.vehicle}
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
                  {selectedOrderForEdit.tasks?.length > 0 ? (
                    selectedOrderForEdit.tasks.map((t, i) => {
                      const isFinal =
                        (t.state || "").toString().toLowerCase() ===
                        "finalizado" || t.state === 3;

                      return (
                        <Table.Tr key={i}>
                          <Table.Td>{t.sectorName}</Table.Td>
                          <Table.Td>{t.taskDescription}</Table.Td>
                          <Table.Td>
                            <Select
                              data={[
                                { value: "1", label: "Pendiente" },
                                { value: "2", label: "En proceso" },
                                { value: "3", label: "Finalizado" },
                              ]}
                              value={
                                (t.state || "").toLowerCase() === "pendiente"
                                  ? "1"
                                  : (t.state || "").toLowerCase() ===
                                    "en proceso"
                                    ? "2"
                                    : (t.state || "").toLowerCase() ===
                                      "finalizado"
                                      ? "3"
                                      : ""
                              }
                              disabled={isFinal}
                              onChange={(val) => {
                                // Si NO está finalizando, cambiar sin preguntar
                                if (val !== "3") {
                                  const updated = [
                                    ...selectedOrderForEdit.tasks,
                                  ];
                                  updated[i].state =
                                    stateNumberToText(Number(val));
                                  setSelectedOrderForEdit((prev) => ({
                                    ...prev,
                                    tasks: updated,
                                  }));
                                  return;
                                }

                                // Si va a finalizar → abrir modal de confirmación
                                setTaskIndexToFinish(i);
                                setConfirmFinishOpened(true);
                              }}
                            />
                            {isFinal && (
                              <Badge
                                mt={4}
                                color="gray"
                                variant="light"
                                size="sm"
                              >
                                Edición bloqueada (finalizado)
                              </Badge>
                            )}
                          </Table.Td>
                          <Table.Td>
                            <Textarea
                              value={t.note || ""}
                              disabled={isFinal}
                              autosize
                              minRows={2}
                              maxRows={6}
                              resize="none"
                              placeholder="Agregar observaciones..."
                              onChange={(e) => {
                                const updated = [...selectedOrderForEdit.tasks];
                                updated[i].note = e.currentTarget.value;
                                setSelectedOrderForEdit((prev) => ({
                                  ...prev,
                                  tasks: updated,
                                }));
                              }}
                            />
                          </Table.Td>
                        </Table.Tr>
                      );
                    })
                  ) : (
                    <Table.Tr>
                      <Table.Td colSpan={4} align="center">
                        Sin tareas
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
              {selectedOrderForEdit.tasks?.length > 0 && (
                <Button
                  fullWidth
                  mt="md"
                  color="blue"
                  onClick={handleSaveEditedTasks}
                >
                  Guardar todos los cambios
                </Button>
              )}
            </>
          ) : (
            <Text>Cargando orden...</Text>
          )}
        </Modal>

        {/* MODAL — Confirmar finalización de tarea */}
        <Modal
          opened={confirmFinishOpened}
          onClose={() => setConfirmFinishOpened(false)}
          centered
          title="Confirmar finalización"
        >
          <Text>
            ¿Seguro que deseas marcar esta tarea como{" "}
            <b>FINALIZADA</b>? Una vez finalizada no podra MODIFICARSE.
          </Text>

          <Group justify="flex-end" mt="md">
            <Button
              variant="default"
              onClick={() => setConfirmFinishOpened(false)}
            >
              Cancelar
            </Button>

            <Button
              color="green"
              onClick={() => {
                if (
                  taskIndexToFinish === null ||
                  !selectedOrderForEdit?.tasks
                )
                  return;

                const updated = [...selectedOrderForEdit.tasks];
                updated[taskIndexToFinish].state = "Finalizado";

                setSelectedOrderForEdit((prev) => ({
                  ...prev,
                  tasks: updated,
                }));

                setConfirmFinishOpened(false);
              }}
            >
              Confirmar
            </Button>
          </Group>
        </Modal>
      </ScrollArea>
    </div>
  );
}
