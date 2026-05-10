import { useState, useEffect } from "react";
import { employeesService } from "../../services/employeeService";
import { sectorsService } from "../../services/sectorsService";

import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Group,
  Modal,
  ScrollArea,
  Table,
  Text,
  TextInput,
  Select,
  Overlay,
  Center,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPencil, IconTrash, IconEye, IconSearch } from "@tabler/icons-react";
import CircularProgress from "@mui/material/CircularProgress";
import TablePagination from "@mui/material/TablePagination";
import { validateEmployeePayload, hasAnyError } from "../../utils/validators";

import { ToastOverlay } from "../Toast/ToastOverlay"; // <<--- 🔥 NUEVO

const jobColors = {
  reparacion: "blue",
  alineacion: "red",
  cardan: "gray",
  suspension: "green",
  administracion: "orange",
};

export function EmployeesTable() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sectors, setSectors] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [addModalOpened, { open: openAdd, close: closeAdd }] = useDisclosure(false);
  const [editModalOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [viewModalOpened, { open: openView, close: closeView }] = useDisclosure(false);

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [newEmployee, setNewEmployee] = useState({
    idSector: "",
    name: "",
    cuilCuit: "",
    phone: "",
    email: "",
    address: "",
  });
  const [newEmployeeErrors, setNewEmployeeErrors] = useState({});
  const [editEmployeeErrors, setEditEmployeeErrors] = useState({});

  // Estado de bloqueo
  const [blocking, setBlocking] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Procesando...");

  // =================== 🔥 TOAST ===================
  const [toast, setToast] = useState({
    open: false,
    message: "",
    color: "green",
  });

  const showToast = (message, color = "green") => {
    setToast({ open: true, message, color });

    setTimeout(() => {
      setToast({ open: false, message: "", color });
    }, 4000);
  };
  // =================================================

  // =================== FETCH ===================
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await employeesService.getAllEmployees();
      setEmployees(response.data ?? []);
    } catch (err) {
      console.error("Error al cargar empleados:", err);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSectors = async () => {
    try {
      const response = await sectorsService.getAllSectors();
      setSectors(response.data ?? []);
    } catch (err) {
      console.error("Error al cargar sectores:", err);
      setSectors([]);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchSectors();
  }, []);

  // =================== FILTRO ===================
  const filtered = employees.filter((emp) =>
    Object.values(emp).some((val) =>
      val?.toString().toLowerCase().includes(search.toLowerCase())
    )
  );

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // =================== HANDLERS ===================
  const handleAddEmployee = async () => {
    const errors = validateEmployeePayload(newEmployee);
    setNewEmployeeErrors(errors);
    if (hasAnyError(errors)) return;

    setLoadingMessage("Guardando empleado...");
    setBlocking(true);

    try {
      const response = await employeesService.createEmployed(newEmployee);
      if (response.status === 201 || response.status === 200) {
        closeAdd();
        setNewEmployee({
          idSector: "",
          name: "",
          cuilCuit: "",
          phone: "",
          email: "",
          address: "",
          avatar: "",
        });
        setNewEmployeeErrors({});
        await fetchEmployees();

        showToast("Empleado creado correctamente ✔️"); // 🔥
      }
    } catch (err) {
      console.error("Error al crear empleado:", err);
      showToast("Error al crear empleado ❌", "red"); // 🔥
    } finally {
      setBlocking(false);
    }
  };

  const handleUpdateEmployee = async () => {
    const errors = validateEmployeePayload(selectedEmployee || {});
    setEditEmployeeErrors(errors);
    if (hasAnyError(errors)) return;

    setLoadingMessage("Actualizando empleado...");
    setBlocking(true);

    try {
      const response = await employeesService.updateEmployed(
        selectedEmployee.id,
        selectedEmployee
      );
      if (response.status === 200) {
        closeEdit();
        setEditEmployeeErrors({});
        await fetchEmployees();

        showToast("Empleado actualizado ✔️", "green"); // 🔥
      }
    } catch (err) {
      console.error("Error al actualizar empleado:", err);
      showToast("Error al actualizar empleado ❌", "red"); // 🔥
    } finally {
      setBlocking(false);
    }
  };

  const handleDeleteEmployee = async () => {
    setLoadingMessage("Eliminando empleado...");
    setBlocking(true);

    try {
      const response = await employeesService.deleteEmployed(selectedEmployee.id);
      if (response.status === 200 || response.status === 204) {
        closeDelete();
        await fetchEmployees();

        showToast("Empleado eliminado ❌", "red"); // 🔥
      }
    } catch (err) {
      console.error("Error al eliminar empleado:", err);
      showToast("Error al eliminar empleado ❌", "red"); // 🔥
    } finally {
      setBlocking(false);
    }
  };

  // =================== RENDER ROWS ===================
  const rows = paginated.map((emp) => {
    const sector = sectors.find((s) => s.id === emp.idSector)?.name ?? "Desconocido";
    return (
      <Table.Tr key={emp.id}>
        <Table.Td>
          <Group gap="sm">
            <Avatar size={30} src={emp.avatar} radius={30} />
            <Text fz="sm" fw={500}>
              {emp.name}
            </Text>
          </Group>
        </Table.Td>
        <Table.Td>
          <Badge color={jobColors[sector.toLowerCase()] ?? "gray"} variant="light">
            {sector}
          </Badge>
        </Table.Td>
        <Table.Td>{emp.email}</Table.Td>
        <Table.Td>{emp.phone}</Table.Td>
        <Table.Td>
          <Group gap={0} justify="flex-end">
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => {
                setSelectedEmployee(emp);
                openView();
              }}
            >
              <IconEye size={16} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => {
                setSelectedEmployee(emp);
                openEdit();
              }}
            >
              <IconPencil size={16} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={() => {
                setSelectedEmployee(emp);
                openDelete();
              }}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        </Table.Td>
      </Table.Tr>
    );
  });

  // =================== RENDER ===================
  return (
    <ScrollArea>

      {/* 🔥 TOAST */}
      <ToastOverlay toast={toast} />

      <Group justify="space-between" mb="sm">
        <TextInput
          placeholder="Buscar empleado"
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => {
            setSearch(e.currentTarget.value);
            setPage(0);
          }}
          style={{ width: "300px" }}
        />
        <Button color="green" onClick={openAdd}>
          Agregar Empleado
        </Button>
      </Group>

      {/* Tabla */}
      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Empleado</Table.Th>
            <Table.Th>Sector</Table.Th>
            <Table.Th>Email</Table.Th>
            <Table.Th>Teléfono</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {loading ? (
            <Table.Tr>
              <Table.Td colSpan={5} style={{ textAlign: "center" }}>
                <CircularProgress color="success" />
              </Table.Td>
            </Table.Tr>
          ) : rows.length > 0 ? (
            rows
          ) : (
            <Table.Tr>
              <Table.Td colSpan={5} style={{ textAlign: "center" }}>
                No se encontraron empleados
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>

      {/* Paginación */}
      <TablePagination
        component="div"
        count={filtered.length}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[5, 10, 25]}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
      />

      {/* =================== MODALES =================== */}

      {/* Ver Empleado */}
      <Modal opened={viewModalOpened} onClose={closeView} title="Detalles del empleado" centered>
        {selectedEmployee && (
          <>
            <Text><b>Nombre:</b> {selectedEmployee.name}</Text>
            <Text><b>CUIL/CUIT:</b> {selectedEmployee.cuilCuit}</Text>
            <Text><b>Email:</b> {selectedEmployee.email}</Text>
            <Text><b>Teléfono:</b> {selectedEmployee.phone}</Text>
            <Text><b>Dirección:</b> {selectedEmployee.address}</Text>
            <Text><b>Sector:</b> {sectors.find((s) => s.id === selectedEmployee.idSector)?.name}</Text>
          </>
        )}
      </Modal>

      {/* Agregar Empleado */}
      <Modal opened={addModalOpened} onClose={closeAdd} title="Agregar empleado" centered>
        <TextInput
          label="Nombre"
          value={newEmployee.name}
          onChange={(e) => {
            setNewEmployee({ ...newEmployee, name: e.currentTarget.value });
            setNewEmployeeErrors((p) => ({ ...p, name: null }));
          }}
          error={newEmployeeErrors.name}
        />
        <TextInput
          label="CUIL/CUIT"
          value={newEmployee.cuilCuit}
          onChange={(e) => {
            setNewEmployee({ ...newEmployee, cuilCuit: e.currentTarget.value });
            setNewEmployeeErrors((p) => ({ ...p, cuilCuit: null }));
          }}
          error={newEmployeeErrors.cuilCuit}
        />
        <TextInput
          label="Teléfono"
          value={newEmployee.phone}
          onChange={(e) => {
            setNewEmployee({ ...newEmployee, phone: e.currentTarget.value });
            setNewEmployeeErrors((p) => ({ ...p, phone: null }));
          }}
          error={newEmployeeErrors.phone}
        />
        <TextInput
          label="Email"
          value={newEmployee.email}
          onChange={(e) => {
            setNewEmployee({ ...newEmployee, email: e.currentTarget.value });
            setNewEmployeeErrors((p) => ({ ...p, email: null }));
          }}
          error={newEmployeeErrors.email}
        />
        <TextInput
          label="Dirección"
          value={newEmployee.address}
          onChange={(e) => {
            setNewEmployee({ ...newEmployee, address: e.currentTarget.value });
            setNewEmployeeErrors((p) => ({ ...p, address: null }));
          }}
          error={newEmployeeErrors.address}
        />
        <Select
          label="Sector"
          placeholder="Seleccionar sector"
          data={(Array.isArray(sectors) ? sectors : []).map((s) => ({
            value: s.id.toString(),
            label: s.name,
          }))}
          value={newEmployee.idSector.toString()}
          onChange={(val) => {
            setNewEmployee({ ...newEmployee, idSector: parseInt(val) });
            setNewEmployeeErrors((p) => ({ ...p, idSector: null }));
          }}
          error={newEmployeeErrors.idSector}
        />

        <Button mt="md" color="green" onClick={handleAddEmployee}>
          Guardar
        </Button>
      </Modal>

      {/* Editar Empleado */}
      <Modal opened={editModalOpened} onClose={closeEdit} title="Editar empleado" centered>
        {selectedEmployee && (
          <>
            <TextInput
              label="Nombre"
              value={selectedEmployee.name}
              onChange={(e) => {
                setSelectedEmployee({ ...selectedEmployee, name: e.currentTarget.value });
                setEditEmployeeErrors((p) => ({ ...p, name: null }));
              }}
              error={editEmployeeErrors.name}
            />
            <TextInput
              label="CUIL/CUIT"
              value={selectedEmployee.cuilCuit}
              onChange={(e) => {
                setSelectedEmployee({ ...selectedEmployee, cuilCuit: e.currentTarget.value });
                setEditEmployeeErrors((p) => ({ ...p, cuilCuit: null }));
              }}
              error={editEmployeeErrors.cuilCuit}
            />
            <TextInput
              label="Teléfono"
              value={selectedEmployee.phone}
              onChange={(e) => {
                setSelectedEmployee({ ...selectedEmployee, phone: e.currentTarget.value });
                setEditEmployeeErrors((p) => ({ ...p, phone: null }));
              }}
              error={editEmployeeErrors.phone}
            />
            <TextInput
              label="Email"
              value={selectedEmployee.email}
              onChange={(e) => {
                setSelectedEmployee({ ...selectedEmployee, email: e.currentTarget.value });
                setEditEmployeeErrors((p) => ({ ...p, email: null }));
              }}
              error={editEmployeeErrors.email}
            />
            <TextInput
              label="Dirección"
              value={selectedEmployee.address}
              onChange={(e) => {
                setSelectedEmployee({ ...selectedEmployee, address: e.currentTarget.value });
                setEditEmployeeErrors((p) => ({ ...p, address: null }));
              }}
              error={editEmployeeErrors.address}
            />
            <Select
              label="Sector"
              placeholder="Seleccionar sector"
              data={(Array.isArray(sectors) ? sectors : []).map((s) => ({
                value: s.id.toString(),
                label: s.name,
              }))}
              value={selectedEmployee.idSector.toString()}
              onChange={(val) => {
                setSelectedEmployee({ ...selectedEmployee, idSector: parseInt(val) });
                setEditEmployeeErrors((p) => ({ ...p, idSector: null }));
              }}
              error={editEmployeeErrors.idSector}
            />

            <Button mt="md" color="blue" onClick={handleUpdateEmployee}>
              Guardar cambios
            </Button>
          </>
        )}
      </Modal>

      {/* Eliminar Empleado */}
      <Modal opened={deleteModalOpened} onClose={closeDelete} title="Eliminar empleado" centered size="sm">
        {selectedEmployee && (
          <>
            <Text>
              ¿Seguro que quieres eliminar a <b>{selectedEmployee.name}</b>?
            </Text>
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeDelete}>
                Cancelar
              </Button>
              <Button color="red" onClick={handleDeleteEmployee}>
                Eliminar
              </Button>
            </Group>
          </>
        )}
      </Modal>

      {/* 🔒 Overlay global con spinner */}
      {blocking && (
        <Overlay opacity={0.5} color="#000" zIndex={5000} fixed blur={5}>
          <Center style={{ flexDirection: "column", height: "100vh" }}>
            <CircularProgress color="success" size={80} />
          </Center>
        </Overlay>
      )}
    </ScrollArea>
  );
}

export default EmployeesTable;
