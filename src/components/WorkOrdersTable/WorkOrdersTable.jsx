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
  ActionIcon,
  Loader,
  Center,
  Overlay,
  Badge,
} from "@mantine/core";
import { IconPlus, IconTrash, IconEye, IconPencil, IconCheck } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import TablePagination from "@mui/material/TablePagination";
import CircularProgress from "@mui/material/CircularProgress";

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

// =================== HELPERS ESTADO ===================
const stateTextToNumber = (s) => {
  const t = (s || "").toString().toLowerCase();
  if (t === "pendiente" || t === "1") return 1;
  if (t.includes("proceso") || t === "2") return 2;
  if (t === "finalizado" || t === "3") return 3;
  if (t === "cerrado" || t === "4") return 4;
  return 1;
};


const stateNumberToText = (n) =>
  n === 1 ? "Pendiente" : n === 2 ? "En proceso" : n === 3 ? "Finalizado" : n === 4 ? "Cerrado" : "Pendiente";

export default function WorkOrdersTable() {

  // TOAST SUPERIOR ✔️
  const [toast, setToast] = useState({
    open: false,
    message: "",
    color: "green",
  });

  const showToast = (message, color = "green") => {
    setToast({ open: true, message, color });

    setTimeout(() => {
      setToast({ open: false, message: "", color });
    }, 10000); // 10 segundos
  };
  // FLAGS
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [blocking, setBlocking] = useState(false);

  // DATA
  const [workOrders, setWorkOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [sectors, setSectors] = useState([]);

  // SELECCIONADAS
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState(null);
  const [selectedOrderForDelete, setSelectedOrderForDelete] = useState(null);

  // MODALES
  const [addModalOpened, { open: openAdd, close: closeAdd }] =
    useDisclosure(false);
  const [viewModalOpened, { open: openView, close: closeView }] =
    useDisclosure(false);
  const [editModalOpened, { open: openEdit, close: closeEdit }] =
    useDisclosure(false);
  const [deleteModalOpened, { open: openDelete, close: closeDelete }] =
    useDisclosure(false);

  // NUEVA ORDEN
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

  // EDICIÓN ORDEN
  const [editOrderErrors, setEditOrderErrors] = useState({ tasks: [] });

  // FILTROS

  const [searchFilter, setSearchFilter] = useState("");

  // const [vehicleFilter, setVehicleFilter] = useState("");
  const [dateFilter, setDateFilter] = useState(""); // YYYY-MM-DD
  // default date range: last 7 days
  const _today = new Date();
  const _todayStr = _today.toISOString().slice(0, 10);
  const _sevenDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const _sevenDaysAgoStr = _sevenDaysAgo.toISOString().slice(0, 10);

  // const [nameFilter, setNameFilter] = useState("");
  const [taskIdFilter, setTaskIdFilter] = useState("");
  const [startDate, setStartDate] = useState(_sevenDaysAgoStr); // YYYY-MM-DD
  const [endDate, setEndDate] = useState(_todayStr); // YYYY-MM-DD

  // VEHÍCULOS POR CLIENTE
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  // PAGINACIÓN
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // =================== HELPERS ===================
  const hasErrors = (obj) => {
    if (obj === null || obj === undefined) return false;
    if (typeof obj === "string") return obj.trim() !== "";
    if (Array.isArray(obj)) return obj.some((v) => hasErrors(v));
    if (typeof obj === "object") return Object.values(obj).some((v) => hasErrors(v));
    return false;
  };

  const validateNewOrder = () => {
    const errors = validateNewOrderPayload(newOrder);
    setNewOrderErrors(errors);
    return !hasErrors(errors);
  };

  const validateEditedOrder = () => {
    const errors = validateEditedTasksPayload(
      selectedOrderForEdit || { tasks: [] }
    );
    setEditOrderErrors(errors);
    return !hasErrors(errors);
  };

  // =================== FETCH ===================
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await WorkOrderCreatorService.getAll();
      const orders = Array.isArray(res.data) ? res.data : [];

      const normalized = orders.map((o) => {
        const vehicle = o.vehicle || o.vehicleData || {};
        const vehicleBrand =
          o.vehicleBrand || o.vehicle_brand || vehicle.brand || o.brand || "";
        const vehicleModel =
          o.vehicleModel || o.vehicle_model || vehicle.model || o.model || "";
        return { ...o, vehicleBrand, vehicleModel };
      });

      setWorkOrders(normalized);
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
      setClients(res.data || []);
    } catch {
      setClients([]);
    }
  };

  const fetchVehiclesByClient = async (idClient) => {
    setLoadingVehicles(true);
    try {
      const res = await VehicleCreatorService.getAllByClient(idClient);
      setVehicles(res.data || []);
    } catch {
      setVehicles([]);
    } finally {
      setLoadingVehicles(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await TaskService.getAll();
      setTasks(res.data || []);
    } catch {
      setTasks([]);
    }
  };

  const fetchSectors = async () => {
    try {
      const res = await sectorsService.getAllSectors();
      setSectors(res.data || []);
    } catch {
      setSectors([]);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchClients();
    fetchTasks();
    fetchSectors();

    // Auto-refresh cada 60s
    const interval = setInterval(() => {
      fetchOrders();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // =================== CREAR ORDEN ===================
  const handleAddOrder = async () => {
    if (!validateNewOrder()) return;

    setSaving(true);
    setBlocking(true);

    try {
      const payloadOrder = {
        idClient: parseInt(newOrder.idClient),
        idVehicle: parseInt(newOrder.idVehicle),
        idOrderTask: 0,
        deleted: 0,
        createdBy: localStorage.getItem("userName") || null,
      };

      const response = await WorkOrderCreatorService.create(payloadOrder);
      const newOrderId = response.data?.id;

      if (newOrderId) {
        for (const t of newOrder.tasks) {
          if (!t.idTask || !t.idSector) continue;

          await OrderTaskService.create({
            idOrder: newOrderId,
            idTask: parseInt(t.idTask),
            idSector: parseInt(t.idSector),
            state: 1,
            note: t.note || "",
            deleted: 0,
          });
        }
      }

      await fetchOrders();
      showToast("Orden creada correctamente ✔️", "green");
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
      setBlocking(false);
    }
  };

  // =================== VER ORDEN ===================
  const handleViewOrder = async (id) => {
    setLoading(true);
    try {
      const res = await WorkOrderCreatorService.getById(id);
      setSelectedOrder(res.data);
      openView();
    } catch (err) {
      console.error("Error al traer orden:", err);
    } finally {
      setLoading(false);
    }
  };

  // =================== CERRAR ORDEN ===================
  const handleCloseOrder = async (order) => {
    if (!order || !order.id) return;
    const confirmClose = window.confirm(
      `¿Confirmas cerrar la orden #${order.id}? Esta acción marcará la orden como cerrada.`
    );
    if (!confirmClose) return;
    setBlocking(true);
    try {
      // Obtener la orden completa para extraer idClient / idVehicle
      const res = await WorkOrderCreatorService.getById(order.id);
      const fullOrder = res.data || {};
      let idClient = fullOrder.idClient || fullOrder.id_client || null;
      let idVehicle = fullOrder.idVehicle || fullOrder.id_vehicle || null;

      // Si no vienen los ids, intentar resolver por nombre/patente
      if (!idClient) {
        // buscar en clients cargados en el componente
        const foundClient = clients.find((c) => c.name === fullOrder.client || c.name === order.client);
        if (foundClient) idClient = foundClient.id;
        else {
          // intentar cargar todos los clientes y buscar
          try {
            const resClients = await ClientCreatorService.getAll();
            const allClients = resClients.data || [];
            const fc = allClients.find((c) => c.name === fullOrder.client || c.name === order.client);
            if (fc) idClient = fc.id;
          } catch (e) {
            // ignore
          }
        }
      }

      if (!idVehicle) {
        // si tenemos idClient, buscar vehículos del cliente
        if (idClient) {
          try {
            const resVehicles = await VehicleCreatorService.getAllByClient(idClient);
            const vehs = Array.isArray(resVehicles.data) ? resVehicles.data : (resVehicles.data?.data || []);
            const fv = vehs.find((v) => v.licensePlate === fullOrder.vehicle || v.licensePlate === order.vehicle);
            if (fv) idVehicle = fv.id;
          } catch (e) {
            // ignore
          }
        }
      }

      if (!idClient || !idVehicle) {
        showToast("No se pudo determinar idClient o idVehicle de la orden", "red");
        setBlocking(false);
        return;
      }

      const payload = {
        idClient: parseInt(idClient),
        idVehicle: parseInt(idVehicle),
        idOrderTask: 0,
        modifiedBy: localStorage.getItem("userName") || null,
      };

      // Ejecutar close en backend para persistir isClosed flag
      await WorkOrderCreatorService.close(order.id, payload);

      // Actualizar inmediatamente la UI localmente para mostrar estado cerrado
      setWorkOrders((prev) =>
        prev.map((o) =>
          o.id === order.id ? { ...o, state: 4, isClosed: true } : o
        )
      );

      // Refrescar la lista en segundo plano por si hay otros cambios
      fetchOrders();
      showToast(`Orden #${order.id} cerrada correctamente`, "green");
    } catch (err) {
      console.error("Error cerrando orden:", err);
      showToast("No se pudo cerrar la orden", "red");
    } finally {
      setBlocking(false);
    }
  };

  // =================== EDITAR ORDEN ===================
  const handleEditClick = async (id) => {
    setLoading(true);
    try {
      const resOrder = await WorkOrderCreatorService.getById(id);
      const order = resOrder.data;

      const [resOTAll, resTasksAll, resSectors] = await Promise.all([
        OrderTaskService.getAll(),
        TaskService.getAll(),
        sectorsService.getAllSectors(),
      ]);

      const realOrderTasks = Array.isArray(resOTAll.data) ? resOTAll.data : [];
      const allTasks = resTasksAll.data || [];
      const allSectors = resSectors.data || [];

      // reconstruir idTask / idSector y normalizar estado
      const rebuilt = (order.tasks || []).map((t) => {
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
            s.name.trim().toLowerCase() ===
            t.sectorName.trim().toLowerCase()
        );

        return {
          ...t,
          idTask: foundTask ? foundTask.id : t.idTask,
          idSector: foundSector ? foundSector.id : t.idSector,
          state: stateTextToNumber(t.state), // 🔥 normalizado a número
        };
      });

      // emparejar con orderTasks reales para obtener id de la tabla real
      const used = new Set();
      const merged = rebuilt.map((pt) => {
        const candidates = realOrderTasks.filter(
          (rt) =>
            Number(rt.idOrder) === Number(order.id) &&
            Number(rt.idTask) === Number(pt.idTask) &&
            Number(rt.idSector) === Number(pt.idSector)
        );

        if (candidates.length === 0) return pt;

        let match = candidates.find(
          (rt) =>
            !used.has(rt.id) &&
            (rt.note || "").trim() === (pt.note || "").trim()
        );

        if (!match) match = candidates.find((rt) => !used.has(rt.id));

        if (match) {
          used.add(match.id);
          return { ...pt, id: match.id };
        }

        return pt;
      });

      setSelectedOrderForEdit({
        ...order,
        tasks: merged,
      });

      setEditOrderErrors({
        tasks: merged.map(() => ({
          idSector: null,
          idTask: null,
          state: null,
          note: null,
        })),
      });

      openEdit();
    } catch (err) {
      console.error("Error al traer orden para editar:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEditedTasks = async () => {
    if (!selectedOrderForEdit || !selectedOrderForEdit.tasks) return;
    if (!validateEditedOrder()) return;

    setSaving(true);
    setBlocking(true);

    try {
      // tareas originales (vista proyección de la orden)
      const resOriginal = await WorkOrderCreatorService.getById(
        selectedOrderForEdit.id
      );
      const originalTasks = resOriginal.data.tasks || [];

      // detectamos las que ya no están
      const deletedTasks = originalTasks.filter(
        (orig) =>
          !selectedOrderForEdit.tasks.some((curr) => curr.id === orig.id)
      );

      // actualizar / crear
      for (const t of selectedOrderForEdit.tasks) {
        const stateNumber = stateTextToNumber(t.state);

        if (t.id) {
          await OrderTaskService.update(t.id, {
            idOrder: selectedOrderForEdit.id,
            idTask: t.idTask,
            idSector: t.idSector,
            state: stateNumber,
            note: t.note || "",
            modifiedBy: localStorage.getItem("userName") || null,
          });
        } else if (t.idTask && t.idSector) {
          await OrderTaskService.create({
            idOrder: selectedOrderForEdit.id,
            idTask: parseInt(t.idTask),
            idSector: parseInt(t.idSector),
            state: 1,
            note: t.note || "",
            deleted: 0,
            modifiedBy: localStorage.getItem("userName") || null,
          });
        }
      }

      // eliminar quitadas
      for (const t of deletedTasks) {
        if (t.id) await OrderTaskService.delete(t.id);
      }

      // refrescar y traer orden actualizada
      const resUpdated = await WorkOrderCreatorService.getById(
        selectedOrderForEdit.id
      );
      const updatedOrder = resUpdated.data;
      // reflect the modification timestamp and user locally
      updatedOrder.modifiedAt = new Date().toISOString();
      updatedOrder.modifiedBy = localStorage.getItem("userName") || null;

      setWorkOrders((prev) => {
        const rest = prev.filter((o) => o.id !== updatedOrder.id);
        return [updatedOrder, ...rest];
      });
      setPage(0);
      showToast("Orden modificada correctamente ✔️", "green");
      closeEdit();
    } catch (err) {
      console.error("Error al guardar tareas:", err);
    } finally {
      setSaving(false);
      setBlocking(false);
    }
  };

  // =================== ELIMINAR ORDEN ===================
  const handleDeleteOrder = async () => {
    if (!selectedOrderForDelete) return;

    setSaving(true);
    setBlocking(true);

    try {
      await WorkOrderCreatorService.delete(selectedOrderForDelete.id);
      await fetchOrders();
      showToast("Orden eliminada correctamente ❌", "red");

      closeDelete();
    } catch (err) {
      console.error("Error al eliminar orden:", err);
    } finally {
      setSaving(false);
      setBlocking(false);
    }
  };

  // =================== TABLA / FILTROS ===================
  const filteredAndSorted = (workOrders || [])
    .filter((o) => {
      // const byVehicle = vehicleFilter
      //   ? (o.vehicle || "")
      //     .toString()
      //     .toLowerCase()
      //     .includes(vehicleFilter.toLowerCase())
      //   : true;
      const bySearch = searchFilter
        ? `${o.client || ""} ${o.vehicle || ""} ${o.vehicleBrand || ""} ${o.vehicleModel || ""}`
          .toLowerCase()
          .includes(searchFilter.toLowerCase())
        : true;

      const byDate = (() => {
        if (!startDate && !endDate) return true;
        if (!o.creationDate) return false;
        try {
          const d = new Date(o.creationDate).toISOString().slice(0, 10);
          if (startDate && endDate) return d >= startDate && d <= endDate;
          if (startDate) return d >= startDate;
          if (endDate) return d <= endDate;
          return true;
        } catch {
          return false;
        }
      })();

      // const byName = nameFilter
      //   ? (o.client || "")
      //     .toString()
      //     .toLowerCase()
      //     .includes(nameFilter.toLowerCase())
      //   : true;

      const byTaskId = taskIdFilter
        ? (o.tasks || []).some((t) => {
          const candidates = [t?.idTask, t?.id, t?.taskId, t?.idTask];
          return candidates.some((v) => v !== undefined && v !== null && String(v) === String(taskIdFilter));
        })
        : true;

      const notClosed = Number(o.state) !== 4;
      return bySearch && byDate && byTaskId && notClosed;
    })
    .sort((a, b) => {
      const ta = a.modifiedAt ? new Date(a.modifiedAt).getTime() : (a.creationDate ? new Date(a.creationDate).getTime() : 0);
      const tb = b.modifiedAt ? new Date(b.modifiedAt).getTime() : (b.creationDate ? new Date(b.creationDate).getTime() : 0);
      return tb - ta; // ordenar por última modificación (más reciente primero)
    });

  const paginated = filteredAndSorted.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const rows = paginated.map((order) => (
    <Table.Tr key={order.id}>
      <Table.Td>{order.id}</Table.Td>
      <Table.Td>{order.client}</Table.Td>
      <Table.Td>{order.vehicle}</Table.Td>
      <Table.Td>
        {order.creationDate
          ? new Date(order.creationDate).toLocaleString("es-ES", {
            hour12: false,
          })
          : "-"}
      </Table.Td>
      <Table.Td>
        {order.modifiedAt
          ? new Date(order.modifiedAt).toLocaleString("es-ES", {
            hour12: false,
          })
          : "-"}
      </Table.Td>
      <Table.Td>
        <Badge
          color={
            order.state === 1
              ? "red"
              : order.state === 2
                ? "yellow"
                : order.state === 3
                  ? "green"
                  : order.state === 4
                    ? "violet"
                    : "gray"
          }
          variant="filled"
        >
          {stateNumberToText(order.state)}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Group gap={0} justify="flex-end">
          <ActionIcon
            color="gray"
            variant="subtle"
            onClick={() => handleViewOrder(order.id)}
          >
            <IconEye size={16} />
          </ActionIcon>
          {/* Close order button: left of edit */}
          <ActionIcon
            color="teal"
            variant="subtle"
            title="Cerrar orden"
            onClick={() => handleCloseOrder(order)}
            disabled={order.isClosed || order.state !== 3}
          >
            <IconCheck size={16} />
          </ActionIcon>
          <ActionIcon
            color="gray"
            variant="subtle"
            onClick={() => handleEditClick(order.id)}
          >
            <IconPencil size={16} />
          </ActionIcon>
          <ActionIcon
            color="red"
            variant="subtle"
            onClick={() => {
              setSelectedOrderForDelete(order);
              openDelete();
            }}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  // =================== RENDER ===================
  return (
    <div style={{ position: "relative" }}>
      {(loading || saving || blocking) && (
        <>
          <Overlay opacity={0.6} color="#000" blur={2} zIndex={9998} />
          <Center style={{ position: "fixed", inset: 0, zIndex: 9999 }}>
            <CircularProgress color="success" size={80} />
          </Center>
        </>
      )}
      {/* TOAST SUPERIOR */}
      {toast.open && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: toast.color === "green" ? "#2ecc71" : "#e74c3c",
            color: "white",
            padding: "12px 24px",
            borderRadius: "8px",
            boxShadow: "0px 4px 12px rgba(0,0,0,0.3)",
            zIndex: 99999,
            fontSize: "16px",
            fontWeight: "600",
          }}
        >
          {toast.message}
        </div>
      )}

      <ScrollArea>
        {/* Header */}
        <Group justify="space-between" mb="sm">
          <Text fz="xl" fw={600}>
            Órdenes de Trabajo
          </Text>
          <Button color="green" onClick={openAdd}>
            Nueva Orden
          </Button>
        </Group>

        {/* Filtros */}
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
          {/* <TextInput
            type="date"
            label="Fecha creación"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.currentTarget.value);
              setPage(0);
            }}
            style={{ width: 200 }}
          /> */}

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

        {/* Tabla */}
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
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>

        {/* Paginación */}
        <TablePagination
          component="div"
          className="table-pagination-contrast"
          count={filteredAndSorted.length}
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
            "& .MuiTablePagination-toolbar, & .MuiTablePagination-root": {
              color: "white !important",
            },
            "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows, & .MuiTablePagination-select":
              { color: "white !important" },
            "& .MuiSvgIcon-root, & .MuiIconButton-root, & .MuiButtonBase-root, & .MuiSelect-icon":
              { color: "white !important" },
            "& .MuiSelect-select, & .MuiInputBase-input, & .MuiMenuItem-root, & .MuiTypography-root":
              { color: "white !important" },
          }}
        />

        {/* =================== MODALES =================== */}

        {/* CREAR ORDEN */}
        <Modal
          opened={addModalOpened}
          onClose={closeAdd}
          title="Crear nueva orden de trabajo"
          centered
          size="xl"
        >
          <Select
            label="Cliente"
            placeholder="Buscar cliente..."
            searchable
            nothingFoundMessage="No se encontró"
            data={clients.map((c) => ({
              value: c.id.toString(),
              label: c.name,
            }))}
            value={newOrder.idClient}
            onChange={(val) => {
              setVehicles([]);
              setNewOrder({
                idClient: val,
                idVehicle: "",
                tasks: [{ idSector: "", idTask: "", note: "" }],
              });
              setNewOrderErrors({ idClient: null, idVehicle: null, tasks: [] });

              if (val) fetchVehiclesByClient(val);
            }}
            error={newOrderErrors.idClient}
          />


          <Select
            key={newOrder.idClient}
            label="Vehículo"
            placeholder="Buscar vehículo..."
            searchable
            nothingFoundMessage="No se encontró"
            data={vehicles.map((v) => ({
              value: v.id.toString(),
              label: `${v.licensePlate} - ${v.brand} ${v.model}`,
            }))}
            value={newOrder.idVehicle}
            rightSection={loadingVehicles ? <Loader size={16} color="green" /> : null}
            disabled={!newOrder.idClient || loadingVehicles}
            onChange={(val) => {
              setNewOrder((prev) => ({ ...prev, idVehicle: val }));
              setNewOrderErrors((prev) => ({ ...prev, idVehicle: null }));
            }}
            error={newOrderErrors.idVehicle}
          />


          <Text fw={600} mt="lg">
            TRABAJOS A REALIZAR
          </Text>
          {newOrderErrors.tasks &&
            newOrderErrors.tasks[0] &&
            newOrderErrors.tasks[0].general ? (
            <Text c="red">{newOrderErrors.tasks[0].general}</Text>
          ) : null}

          {newOrder.tasks.map((t, i) => (
            <Group key={i} grow>
              <Select
                label="SECTOR "
                data={sectors.map((s) => ({
                  value: s.id.toString(),
                  label: s.name,
                }))}
                value={t.idSector}
                onChange={(val) => {
                  const updated = [...newOrder.tasks];
                  updated[i].idSector = val;
                  setNewOrder((prev) => ({ ...prev, tasks: updated }));
                  setNewOrderErrors((prev) => {
                    const ts = (prev.tasks || []).slice();
                    ts[i] = { ...(ts[i] || {}), idSector: null };
                    return { ...prev, tasks: ts };
                  });
                }}
                error={
                  (newOrderErrors.tasks &&
                    newOrderErrors.tasks[i] &&
                    newOrderErrors.tasks[i].idSector) ||
                  null
                }
              />
              <Select
                label={`Trabajo a realizar ${i + 1}`}
                placeholder="Buscar tarea..."
                searchable
                nothingFoundMessage="No se encontró"
                data={
                  ((tasks.some((tk) => tk && tk.idSector !== undefined && tk.idSector !== null) && t.idSector)
                    ? tasks.filter((tk) => String(tk.idSector) === String(t.idSector))
                    : tasks
                  ).map((task) => ({ value: task.id.toString(), label: task.description }))
                }
                value={t.idTask}
                onChange={(val) => {
                  const updated = [...newOrder.tasks];
                  updated[i].idTask = val;
                  setNewOrder((prev) => ({ ...prev, tasks: updated }));
                  setNewOrderErrors((prev) => {
                    const ts = (prev.tasks || []).slice();
                    ts[i] = { ...(ts[i] || {}), idTask: null };
                    return { ...prev, tasks: ts };
                  });
                }}
                error={
                  (newOrderErrors.tasks &&
                    newOrderErrors.tasks[i] &&
                    newOrderErrors.tasks[i].idTask) ||
                  null
                }
              />
              <Textarea
                label="Detalle / Observaciones"
                value={t.note}
                minRows={3}
                onChange={(e) => {
                  const updated = [...newOrder.tasks];
                  updated[i].note = e.currentTarget.value;
                  setNewOrder((prev) => ({ ...prev, tasks: updated }));
                  setNewOrderErrors((prev) => {
                    const ts = (prev.tasks || []).slice();
                    ts[i] = { ...(ts[i] || {}), note: null };
                    return { ...prev, tasks: ts };
                  });
                }}
                error={
                  (newOrderErrors.tasks &&
                    newOrderErrors.tasks[i] &&
                    newOrderErrors.tasks[i].note) ||
                  null
                }
              />
              {i > 0 && (
                <ActionIcon
                  color="red"
                  onClick={() => {
                    setNewOrder((prev) => ({
                      ...prev,
                      tasks: prev.tasks.filter((_, idx) => idx !== i),
                    }));
                    setNewOrderErrors((prev) => ({
                      ...prev,
                      tasks: (prev.tasks || []).filter(
                        (_, idx) => idx !== i
                      ),
                    }));
                  }}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              )}
            </Group>
          ))}

          <Button
            leftSection={<IconPlus size={16} />}
            mt="sm"
            variant="light"
            onClick={() => {
              setNewOrder((prev) => ({
                ...prev,
                tasks: [
                  ...prev.tasks,
                  { idSector: "", idTask: "", note: "" },
                ],
              }));
              setNewOrderErrors((prev) => ({
                ...prev,
                tasks: [
                  ...(prev.tasks || []),
                  { idSector: null, idTask: null, note: null },
                ],
              }));
            }}
          >
            Agregar tarea
          </Button>

          <Button fullWidth mt="md" color="green" onClick={handleAddOrder}>
            Guardar Orden
          </Button>
        </Modal>

        {/* VER ORDEN */}
        <Modal
          opened={viewModalOpened}
          onClose={closeView}
          title="Detalle de Orden de Trabajo"
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

              <Text mt="sm"><b>Creado por:</b> {selectedOrder.createdBy || "-"}</Text>
              <Text><b>Creado el:</b> {selectedOrder.creationDate || "-"}</Text>
              <Text><b>Última modificación por:</b> {selectedOrder.modifiedBy || "-"}</Text>
              <Text><b>Última modificación el:</b> {selectedOrder.modifiedAt || "-"}</Text>

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

        {/* EDITAR ORDEN */}
        <Modal
          opened={editModalOpened}
          onClose={closeEdit}
          title="Editar Orden de Trabajo"
          centered
          size="xl"
        >
          {selectedOrderForEdit ? (
            <>

              <Text fw={600} mb="md">
                Editar tareas de la orden #{selectedOrderForEdit.id}
                <Text>
                  <b>Cliente:</b> {selectedOrderForEdit.client}
                </Text>
                <Text>
                  <b>Vehículo:</b> {selectedOrderForEdit.vehicle}
                </Text>
                {selectedOrderForEdit.vehicleBrand || selectedOrderForEdit.vehicleModel ? (
                  <Text>
                    <b>Marca / Modelo:</b> {selectedOrderForEdit.vehicleBrand || "-"} {selectedOrderForEdit.vehicleModel || ""}
                  </Text>
                ) : null}
              </Text>
              <Table highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Sector</Table.Th>
                    <Table.Th>Trabajo a realizar</Table.Th>
                    <Table.Th>Estado</Table.Th>
                    <Table.Th>Detalles / Observaciones</Table.Th>
                    <Table.Th>Acciones</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {selectedOrderForEdit.tasks?.length > 0 ? (
                    selectedOrderForEdit.tasks.map((t, i) => (
                      <Table.Tr key={i}>
                        <Table.Td>
                          <Select
                            data={sectors.map((s) => ({
                              value: s.id.toString(),
                              label: s.name,
                            }))}
                            value={t.idSector?.toString() || ""}
                            onChange={(val) => {
                              const updated = [
                                ...selectedOrderForEdit.tasks,
                              ];
                              updated[i].idSector = val;
                              setSelectedOrderForEdit((prev) => ({
                                ...prev,
                                tasks: updated,
                              }));
                            }}
                            error={
                              (editOrderErrors.tasks &&
                                editOrderErrors.tasks[i] &&
                                editOrderErrors.tasks[i].idSector) ||
                              null
                            }
                          />
                        </Table.Td>
                        <Table.Td>
                          <Select
                            placeholder="Buscar tarea..."
                            searchable
                            nothingFoundMessage="No se encontró"
                            data={
                              ((tasks.some((tk) => tk && tk.idSector !== undefined && tk.idSector !== null) && t.idSector)
                                ? tasks.filter((tk) => String(tk.idSector) === String(t.idSector))
                                : tasks
                              ).map((tk) => ({ value: tk.id.toString(), label: tk.description }))
                            }
                            value={t.idTask?.toString() || ""}
                            onChange={(val) => {
                              const updated = [
                                ...selectedOrderForEdit.tasks,
                              ];
                              updated[i].idTask = val;
                              setSelectedOrderForEdit((prev) => ({
                                ...prev,
                                tasks: updated,
                              }));
                            }}
                            error={
                              (editOrderErrors.tasks &&
                                editOrderErrors.tasks[i] &&
                                editOrderErrors.tasks[i].idTask) ||
                              null
                            }
                          />
                        </Table.Td>
                        <Table.Td>
                          <Select
                            data={[
                              { value: "1", label: "Pendiente" },
                              { value: "2", label: "En proceso" },
                              { value: "3", label: "Finalizado" },
                            ]}
                            value={t.state?.toString() || "1"}
                            onChange={(val) => {
                              const updated = [
                                ...selectedOrderForEdit.tasks,
                              ];
                              updated[i].state = parseInt(val);
                              setSelectedOrderForEdit((prev) => ({
                                ...prev,
                                tasks: updated,
                              }));
                            }}
                            error={
                              (editOrderErrors.tasks &&
                                editOrderErrors.tasks[i] &&
                                editOrderErrors.tasks[i].state) ||
                              null
                            }
                          />
                        </Table.Td>
                        <Table.Td>
                          <Textarea
                            value={t.note || ""}
                            minRows={3}
                            onChange={(e) => {
                              const updated = [...selectedOrderForEdit.tasks];
                              updated[i].note = e.currentTarget.value;
                              setSelectedOrderForEdit((prev) => ({
                                ...prev,
                                tasks: updated,
                              }));
                            }}
                            error={
                              (editOrderErrors.tasks &&
                                editOrderErrors.tasks[i] &&
                                editOrderErrors.tasks[i].note) ||
                              null
                            }
                          />
                        </Table.Td>
                        <Table.Td>
                          <ActionIcon
                            color="red"
                            variant="subtle"
                            onClick={() => {
                              setSelectedOrderForEdit((prev) => ({
                                ...prev,
                                tasks: prev.tasks.filter(
                                  (_, idx) => idx !== i
                                ),
                              }));
                            }}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  ) : (
                    <Table.Tr>
                      <Table.Td colSpan={5} align="center">
                        Sin tareas
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
              <Group justify="space-between" mt="md">
                <Button
                  variant="light"
                  leftSection={<IconPlus size={16} />}
                  onClick={() => {
                    setSelectedOrderForEdit((prev) => ({
                      ...prev,
                      tasks: [
                        ...(prev.tasks || []),
                        { idSector: "", idTask: "", state: 1, note: "" },
                      ],
                    }));
                    setEditOrderErrors((prev) => ({
                      ...prev,
                      tasks: [
                        ...(prev.tasks || []),
                        {
                          idSector: null,
                          idTask: null,
                          state: null,
                          note: null,
                        },
                      ],
                    }));
                  }}
                >
                  Agregar tarea
                </Button>
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
              </Group>
            </>
          ) : (
            <Text>Cargando orden...</Text>
          )}
        </Modal>

        {/* ELIMINAR ORDEN */}
        <Modal
          opened={deleteModalOpened}
          onClose={closeDelete}
          title="Eliminar Orden"
          centered
          size="sm"
        >
          {selectedOrderForDelete && (
            <>
              <Text>
                ¿Seguro que quieres eliminar la orden #
                {selectedOrderForDelete.id}?
              </Text>
              <Group justify="flex-end" mt="md">
                <Button variant="default" onClick={closeDelete}>
                  Cancelar
                </Button>
                <Button color="red" onClick={handleDeleteOrder}>
                  Eliminar
                </Button>
              </Group>
            </>
          )}
        </Modal>
      </ScrollArea>
    </div>
  );
}
