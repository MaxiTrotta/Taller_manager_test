import { useState, useEffect } from 'react';
import { clientService } from '../../services/clientService';
import { ClientCreatorService } from '../../services/ClientCreatorService';
import { VehicleCreatorService } from '../../services/VehicleCreatorService';
import {
  IconChevronDown, IconChevronUp, IconSearch, IconSelector,
  IconPencil, IconTrash, IconEye
} from '@tabler/icons-react';
import {
  Center, Group, ScrollArea, Table, Text, TextInput, UnstyledButton,
  Modal, Button, ActionIcon, Select, Overlay
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import classes from './TableSort.module.css';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import TablePagination from '@mui/material/TablePagination';
import { validateClientPayload, validateVehiclePayload, hasAnyError } from '../../utils/validators';

import { ToastOverlay } from "../Toast/ToastOverlay";

/* =================== Helpers =================== */
function Th({ children, reversed, sorted, onSort }) {
  const Icon = sorted ? (reversed ? IconChevronUp : IconChevronDown) : IconSelector;
  return (
    <Table.Th className={classes.th}>
      <UnstyledButton onClick={onSort} className={classes.control}>
        <Group justify="space-between">
          <Text fw={500} fz="sm">{children}</Text>
          <Center className={classes.icon}><Icon size={16} stroke={1.5} /></Center>
        </Group>
      </UnstyledButton>
    </Table.Th>
  );
}

function filterData(data, search) {
  const query = search.toLowerCase().trim();
  return data.filter((item) =>
    Object.values(item).some((value) =>
      value?.toString().toLowerCase().includes(query)
    )
  );
}

function sortData(data, payload) {
  const { sortBy, reversed, search } = payload;
  if (!sortBy) return filterData(data, search);
  return filterData(
    [...data].sort((a, b) => {
      const aValue = a[sortBy] ?? '';
      const bValue = b[sortBy] ?? '';
      if (reversed) return bValue.toString().localeCompare(aValue.toString());
      return aValue.toString().localeCompare(bValue.toString());
    }),
    search
  );
}

export function CircularIndeterminate() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
      <CircularProgress color="success" />
    </Box>
  );
}

/* =================== Componente principal =================== */
export function TableSort() {
  const safe = (a) => (Array.isArray(a) ? a : []);

  /* Estados =================== */
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [blocking, setBlocking] = useState(false);

  const [editModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [addModalOpened, { open: openAddModal, close: closeAddModal }] = useDisclosure(false);
  const [viewModalOpened, { open: openViewModal, close: closeViewModal }] = useDisclosure(false);
  const [addVehicleModalOpened, { open: openAddVehicleModal, close: closeAddVehicleModal }] = useDisclosure(false);
  const [editVehicleModalOpened, { open: openEditVehicleModal, close: closeEditVehicleModal }] = useDisclosure(false);
  const [deleteVehicleModalOpened, { open: openDeleteVehicleModal, close: closeDeleteVehicleModal }] = useDisclosure(false);

  const [clientToEdit, setClientToEdit] = useState(null);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [vehicleToEdit, setVehicleToEdit] = useState(null);
  const [vehicleToDelete, setVehicleToDelete] = useState(null);

  const [search, setSearch] = useState('');
  const [clients, setClients] = useState([]);
  const [sortedData, setSortedData] = useState([]);
  const [sortBy, setSortBy] = useState(null);
  const [reverseSortDirection, setReverseSortDirection] = useState(false);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [newClient, setNewClient] = useState({
    name: '', email: '', cuitCuil: '', phone: '', address: '', city: '', province: ''
  });
  const [newClientErrors, setNewClientErrors] = useState({});
  const [editClientErrors, setEditClientErrors] = useState({});

  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  const [newVehicle, setNewVehicle] = useState({
    licensePlate: '', brand: '', model: '', year: ''
  });
  const [newVehicleErrors, setNewVehicleErrors] = useState({});
  const [editVehicleErrors, setEditVehicleErrors] = useState({});
  const [isEditingVehicle, setIsEditingVehicle] = useState(false);
  const [isDeletingVehicle, setIsDeletingVehicle] = useState(false);

  /* 🔥 LISTA GLOBAL DE PATENTES (solo frontend) */
  const [masterPlates, setMasterPlates] = useState([]);

  const paginationNumberColor = "#1976d2";

  /* =================== TOAST =================== */
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

  /* =================== MODAL DE ERROR BACKEND =================== */
  const [errorModalOpened, { open: openErrorModal, close: closeErrorModal }] = useDisclosure(false);
  const [backendError, setBackendError] = useState("");

  const showBackendError = (err) => {
    let msg = "Error inesperado en el servidor.";

    if (err?.response?.data?.message) msg = err.response.data.message;
    else if (err?.response?.data?.error) msg = err.response.data.error;
    else if (err?.message) msg = err.message;

    setBackendError(msg);
    openErrorModal();
  };

  /* =================== FETCH CLIENTES =================== */
  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await ClientCreatorService.getAll();
      const data = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
        ? response.data.data
        : [];

      setClients(data);
      setSortedData(sortData(data, { sortBy, reversed: reverseSortDirection, search }));
      return data; // Retornar los datos para usarlos inmediatamente
    } catch (err) {
      showBackendError(err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  /* =================== ARMAR LISTA GLOBAL DE PATENTES =================== */
  const buildMasterPlates = async (clientsList) => {
    try {
      // Obtener todos los vehículos de una vez (más eficiente)
      const res = await VehicleCreatorService.getAll();

      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
        ? res.data.data
        : [];

      const plates = data.map(v => v.licensePlate?.trim().toLowerCase()).filter(Boolean);
      setMasterPlates(plates);
    } catch (err) {
      // Si falla, intentar método por cliente (fallback)
      let plates = [];
      for (const c of clientsList || []) {
        try {
          const res = await VehicleCreatorService.getAllByClient(c.id);
          const data = Array.isArray(res.data)
            ? res.data
            : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
          plates.push(...data.map(v => v.licensePlate?.trim().toLowerCase()).filter(Boolean));
        } catch (_) {}
      }
      setMasterPlates(plates);
    }
  };

  /* =================== useEffect =================== */
  useEffect(() => {
    const load = async () => {
      const clientsData = await fetchClients();
      // Usar los datos directamente del fetch en lugar del estado
      if (clientsData && clientsData.length > 0) {
        await buildMasterPlates(clientsData);
      }
    };

    load();
  }, []);
  /* =================== Ordenamiento =================== */
  const setSorting = (field) => {
    const reversed = field === sortBy ? !reverseSortDirection : false;
    setReverseSortDirection(reversed);
    setSortBy(field);
    setSortedData(sortData(safe(clients), { sortBy: field, reversed, search }));
    setPage(0);
  };

  /* =================== Search =================== */
  const handleSearchChange = (event) => {
    const { value } = event.currentTarget;
    setSearch(value);
    setSortedData(sortData(safe(clients), { sortBy, reversed: reverseSortDirection, search: value }));
    setPage(0);
  };

  /* =================== Handlers Cliente =================== */

  const handleNewClientChange = (event) => {
    const { name, value } = event.currentTarget;
    setNewClient((prev) => ({ ...prev, [name]: value }));
    setNewClientErrors((p) => ({ ...p, [name]: null }));
  };

  /* 🔥 CREAR CLIENTE (validación: email + CUIT duplicado) */
  const handleAddClient = async () => {

    // ❌ Validar email duplicado
    const emailExists = clients.some(
      (c) => c.email.toLowerCase() === newClient.email.toLowerCase()
    );
    if (emailExists) {
      setNewClientErrors((p) => ({ ...p, email: "El email ya está registrado" }));
      showToast("El email ya existe ❌", "red");
      return;
    }

    // ❌ Validar CUIT/CUIL duplicado
    const cuitExists = clients.some(
      (c) => c.cuitCuil.toString() === newClient.cuitCuil.toString()
    );
    if (cuitExists) {
      setNewClientErrors((p) => ({ ...p, cuitCuil: "El CUIT/CUIL ya está registrado" }));
      showToast("El CUIT/CUIL ya existe ❌", "red");
      return;
    }

    // Validación general
    const errors = validateClientPayload(newClient);
    setNewClientErrors(errors);
    if (hasAnyError(errors)) return;

    setIsSaving(true);
    setBlocking(true);

    try {
      const response = await clientService.createClient(newClient);

      if (response.status === 201 || response.status === 200) {
        const updatedClients = await fetchClients();
        if (updatedClients && updatedClients.length > 0) {
          await buildMasterPlates(updatedClients); // 🔥 actualizar todas las patentes
        }
        closeAddModal();

        setNewClient({
          name: '', email: '', cuitCuil: '', phone: '',
          address: '', city: '', province: ''
        });

        showToast("Cliente creado correctamente ✔️");
      }
    } catch (err) {
      showBackendError(err);
    } finally {
      setIsSaving(false);
      setBlocking(false);
    }
  };

  /* 🔥 EDITAR CLIENTE (validación: email + CUIT duplicado) */
  const handleEditClient = async () => {
    if (!clientToEdit) return;

    // ❌ Email duplicado
    const emailExists = clients.some(
      (c) =>
        c.email.toLowerCase() === clientToEdit.email.toLowerCase() &&
        c.id !== clientToEdit.id
    );
    if (emailExists) {
      setEditClientErrors((p) => ({ ...p, email: "El email ya está registrado" }));
      showToast("El email ya existe ❌", "red");
      return;
    }

    // ❌ CUIT duplicado
    const cuitExists = clients.some(
      (c) =>
        c.cuitCuil.toString() === clientToEdit.cuitCuil.toString() &&
        c.id !== clientToEdit.id
    );
    if (cuitExists) {
      setEditClientErrors((p) => ({ ...p, cuitCuil: "El CUIT/CUIL ya está registrado" }));
      showToast("El CUIT/CUIL ya existe ❌", "red");
      return;
    }

    const errors = validateClientPayload(clientToEdit);
    setEditClientErrors(errors);
    if (hasAnyError(errors)) return;

    setIsEditing(true);

    try {
      const response = await clientService.updateClient(clientToEdit.id, clientToEdit);

      if (response.status === 200) {
        await fetchClients();
        closeEditModal();
        showToast("Cliente actualizado ✔️");
      }
    } catch (err) {
      showBackendError(err);
    } finally {
      setIsEditing(false);
    }
  };

  /* =================== ELIMINAR CLIENTE =================== */
  const handleDeleteClient = async () => {
    if (!clientToDelete) return;

    setIsDeleting(true);

    try {
      const response = await clientService.deleteClient(clientToDelete.id);

      if (response.status === 200 || response.status === 204) {
        const updatedClients = await fetchClients();
        if (updatedClients && updatedClients.length > 0) {
          await buildMasterPlates(updatedClients);   // 🔥 recalcular patentes globales
        }
        closeDeleteModal();
        showToast("Cliente eliminado ❌", "red");
      }
    } catch (err) {
      showBackendError(err);
    } finally {
      setIsDeleting(false);
    }
  };

  /* =================== VEHÍCULOS =================== */

  const handleNewVehicleChange = (event) => {
    const { name, value } = event.currentTarget;
    setNewVehicle(prev => ({ ...prev, [name]: value }));
    setNewVehicleErrors(p => ({ ...p, [name]: null }));
  };

  const fetchVehiclesByClient = async (clientId) => {
    setLoadingVehicles(true);
    try {
      const res = await VehicleCreatorService.getAllByClient(clientId);

      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
        ? res.data.data
        : [];

      setVehicles(data);
    } catch (err) {
      showBackendError(err);
    } finally {
      setLoadingVehicles(false);
    }
  };

  /* 🔥 CREAR VEHÍCULO (validación solo frontend → masterPlates) */
  const handleAddVehicle = async () => {
    if (!selectedClient) return;

    const normalizedPlate = newVehicle.licensePlate.trim().toLowerCase();

    // ❌ Validar patente duplicada global (solo frontend)
    if (masterPlates.includes(normalizedPlate)) {
      setNewVehicleErrors(prev => ({
        ...prev,
        licensePlate: "La patente ya está registrada"
      }));
      showToast("La patente ya existe ❌", "red");
      return;
    }

    const errors = validateVehiclePayload(newVehicle);
    setNewVehicleErrors(errors);
    if (hasAnyError(errors)) return;

    setBlocking(true);

    try {
      const payload = { ...newVehicle, clientId: selectedClient.id };
      const res = await VehicleCreatorService.create(payload);

      if (res.status === 201 || res.status === 200) {
        // Recargar todas las patentes desde el backend para mantener consistencia
        const updatedClients = await fetchClients();
        if (updatedClients && updatedClients.length > 0) {
          await buildMasterPlates(updatedClients);
        }

        await fetchVehiclesByClient(selectedClient.id);

        setNewVehicle({ licensePlate: '', brand: '', model: '', year: '' });
        closeAddVehicleModal();
        showToast("Vehículo agregado ✔️");
      }
    } catch (err) {
      // Si es un error de patente duplicada, mostrarlo en el campo también
      const errorMessage = err?.response?.data?.message || err?.message || "";
      if (errorMessage.toLowerCase().includes("patente") || errorMessage.toLowerCase().includes("ya se encuentra")) {
        setNewVehicleErrors(prev => ({
          ...prev,
          licensePlate: errorMessage
        }));
        showToast(errorMessage, "red");
      } else {
        showBackendError(err);
      }
    } finally {
      setBlocking(false);
    }
  };

  /* 🔥 EDITAR VEHÍCULO */
  const handleEditVehicle = async () => {
    if (!vehicleToEdit || !selectedClient) return;

    const normalizedPlate = vehicleToEdit.licensePlate.trim().toLowerCase();
    // Obtener la patente original del vehículo antes de editar
    const originalVehicle = vehicles.find(v => v.id === vehicleToEdit.id);
    const originalPlate = originalVehicle?.licensePlate?.trim().toLowerCase();

    // ❌ Validar patente duplicada global (excluyendo el vehículo actual)
    // Si la patente cambió, verificar que no esté duplicada
    if (normalizedPlate !== originalPlate) {
      // Verificar si la nueva patente ya existe en otro vehículo
      const plateExistsInOtherVehicle = vehicles.some(v => 
        v.id !== vehicleToEdit.id && 
        v.licensePlate?.trim().toLowerCase() === normalizedPlate
      );
      
      if (plateExistsInOtherVehicle || masterPlates.includes(normalizedPlate)) {
        setEditVehicleErrors(prev => ({
          ...prev,
          licensePlate: "La patente ya está registrada en otro vehículo"
        }));
        showToast("La patente ya existe en otro vehículo ❌", "red");
        return;
      }
    }

    const errors = validateVehiclePayload(vehicleToEdit);
    setEditVehicleErrors(errors);
    if (hasAnyError(errors)) return;

    setIsEditingVehicle(true);
    setBlocking(true);

    try {
      const payload = { 
        ...vehicleToEdit, 
        clientId: selectedClient.id 
      };
      const res = await VehicleCreatorService.update(vehicleToEdit.id, payload);

      if (res.status === 200) {
        // Recargar todas las patentes desde el backend
        const updatedClients = await fetchClients();
        if (updatedClients && updatedClients.length > 0) {
          await buildMasterPlates(updatedClients);
        }

        await fetchVehiclesByClient(selectedClient.id);
        closeEditVehicleModal();
        showToast("Vehículo actualizado ✔️");
      }
    } catch (err) {
      // Si es un error de patente duplicada, mostrarlo en el campo también
      const errorMessage = err?.response?.data?.message || err?.message || "";
      if (errorMessage.toLowerCase().includes("patente") || errorMessage.toLowerCase().includes("ya se encuentra")) {
        setEditVehicleErrors(prev => ({
          ...prev,
          licensePlate: errorMessage
        }));
        showToast(errorMessage, "red");
      } else {
        showBackendError(err);
      }
    } finally {
      setIsEditingVehicle(false);
      setBlocking(false);
    }
  };

  /* 🔥 ELIMINAR VEHÍCULO */
  const handleDeleteVehicle = async () => {
    if (!vehicleToDelete || !selectedClient) return;

    setIsDeletingVehicle(true);
    setBlocking(true);

    try {
      const res = await VehicleCreatorService.delete(vehicleToDelete.id);

      if (res.status === 200 || res.status === 204) {
        // Recargar todas las patentes desde el backend
        const updatedClients = await fetchClients();
        if (updatedClients && updatedClients.length > 0) {
          await buildMasterPlates(updatedClients);
        }

        await fetchVehiclesByClient(selectedClient.id);
        closeDeleteVehicleModal();
        showToast("Vehículo eliminado ❌", "red");
      }
    } catch (err) {
      showBackendError(err);
    } finally {
      setIsDeletingVehicle(false);
      setBlocking(false);
    }
  };
  /* =================== Filas de tabla =================== */
  const paginatedData = sortedData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const rows = paginatedData.map((row) => (
    <Table.Tr key={row.id}>
      <Table.Td>{row.name}</Table.Td>
      <Table.Td>{row.email}</Table.Td>
      <Table.Td>{row.cuitCuil}</Table.Td>
      <Table.Td>{row.phone}</Table.Td>
      <Table.Td>
        <Group gap={0} justify="flex-end">
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={() => handleOpenViewClientModal(row)}
          >
            <IconEye size={16} stroke={1.5} />
          </ActionIcon>


          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={() => {
              setClientToEdit(row);
              openEditModal();
            }}
          >
            <IconPencil size={16} stroke={1.5} />
          </ActionIcon>

          <ActionIcon
            variant="subtle"
            color="red"
            onClick={() => {
              setClientToDelete(row);
              openDeleteModal();
            }}
          >
            <IconTrash size={16} stroke={1.5} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  /* =================== Modal Ver Cliente =================== */
  const handleOpenViewClientModal = (client) => {
    setSelectedClient(client);
    fetchVehiclesByClient(client.id);
    openViewModal();
  };

  return (
    <ScrollArea>

      {/* Toast reutilizable */}
      <ToastOverlay toast={toast} />

      {/* Barra superior */}
      <Group justify="space-between" mb="sm">
        <TextInput
          placeholder="Buscar Cliente"
          leftSection={<IconSearch size={16} stroke={1.5} />}
          value={search}
          onChange={handleSearchChange}
          style={{ width: '300px' }}
        />

        <Group>
          <Button variant="filled" color="green" onClick={openAddModal}>
            Agregar Cliente
          </Button>
          <Button variant="filled" color="blue" onClick={openAddVehicleModal}>
            Agregar Vehículo
          </Button>
        </Group>
      </Group>

      {/* =================== TABLA CLIENTES =================== */}
      <Table horizontalSpacing="lg" verticalSpacing="xs" miw={700} layout="fixed">
        <Table.Thead>
          <Table.Tr>
            <Th sorted={sortBy === 'name'} reversed={reverseSortDirection} onSort={() => setSorting('name')}>Nombre</Th>
            <Th sorted={sortBy === 'email'} reversed={reverseSortDirection} onSort={() => setSorting('email')}>Email</Th>
            <Th sorted={sortBy === 'cuitCuil'} reversed={reverseSortDirection} onSort={() => setSorting('cuitCuil')}>CUIT/CUIL</Th>
            <Th sorted={sortBy === 'phone'} reversed={reverseSortDirection} onSort={() => setSorting('phone')}>Teléfono</Th>
            <Table.Th>Acciones</Table.Th>
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {loading ? (
            <Table.Tr><Table.Td colSpan={5}><CircularIndeterminate /></Table.Td></Table.Tr>
          ) : rows.length > 0 ? (
            rows
          ) : (
            <Table.Tr><Table.Td colSpan={5}><Text ta="center">No se encontraron clientes</Text></Table.Td></Table.Tr>
          )}
        </Table.Tbody>
      </Table>

      {/* =================== PAGINACIÓN =================== */}
      <TablePagination
        component="div"
        count={sortedData.length}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[5, 10, 25, 50]}
      />

      {/* =================== MODAL VER CLIENTE =================== */}
      <Modal opened={viewModalOpened} onClose={closeViewModal} title="Detalles del Cliente" centered size="xl">
        {selectedClient ? (
          <>
            <Text><b>Nombre:</b> {selectedClient.name}</Text>
            <Text><b>Email:</b> {selectedClient.email}</Text>
            <Text><b>CUIT/CUIL:</b> {selectedClient.cuitCuil}</Text>
            <Text><b>Teléfono:</b> {selectedClient.phone}</Text>
            <Text><b>Dirección:</b> {selectedClient.address}, {selectedClient.city}, {selectedClient.province}</Text>

            <Text mt="md" fw={600}>Vehículos del cliente:</Text>

            {loadingVehicles ? (
              <CircularIndeterminate />
            ) : vehicles.length > 0 ? (
              <Table horizontalSpacing="lg" verticalSpacing="xs" miw={500} layout="fixed">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Patente</Table.Th>
                    <Table.Th>Marca</Table.Th>
                    <Table.Th>Modelo</Table.Th>
                    <Table.Th>Año</Table.Th>
                    <Table.Th>Acciones</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {vehicles.map((v) => (
                    <Table.Tr key={v.id}>
                      <Table.Td>{v.licensePlate}</Table.Td>
                      <Table.Td>{v.brand}</Table.Td>
                      <Table.Td>{v.model}</Table.Td>
                      <Table.Td>{v.year}</Table.Td>
                      <Table.Td>
                        <Group gap={0} justify="flex-end">
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            onClick={() => {
                              setVehicleToEdit({ ...v }); // Crear copia para no modificar el original
                              openEditVehicleModal();
                            }}
                          >
                            <IconPencil size={16} stroke={1.5} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={() => {
                              setVehicleToDelete(v);
                              openDeleteVehicleModal();
                            }}
                          >
                            <IconTrash size={16} stroke={1.5} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            ) : (
              <Text>No tiene vehículos registrados.</Text>
            )}
          </>
        ) : (
          <Text>No hay cliente seleccionado</Text>
        )}
      </Modal>

      {/* =================== MODAL AGREGAR VEHÍCULO =================== */}
      <Modal opened={addVehicleModalOpened} onClose={closeAddVehicleModal} title="Agregar Vehículo" centered size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          <Select
            label="Seleccionar Cliente"
            placeholder="Busca un cliente..."
            searchable
            nothingFoundMessage="No se encontraron clientes"
            value={selectedClient?.id?.toString() || ''}
            onChange={(value) => {
              const client = clients.find(c => c.id.toString() === value);
              setSelectedClient(client || null);
            }}
            data={clients.map(c => ({
              value: c.id.toString(),
              label: `${c.name} - ${c.email}`,
            }))}
          />

          <TextInput
            label="Patente"
            name="licensePlate"
            value={newVehicle.licensePlate}
            onChange={handleNewVehicleChange}
            error={newVehicleErrors.licensePlate}
          />

          <TextInput
            label="Marca"
            name="brand"
            value={newVehicle.brand}
            onChange={handleNewVehicleChange}
            error={newVehicleErrors.brand}
          />

          <TextInput
            label="Modelo"
            name="model"
            value={newVehicle.model}
            onChange={handleNewVehicleChange}
            error={newVehicleErrors.model}
          />

          <TextInput
            label="Año"
            name="year"
            type="number"
            value={newVehicle.year}
            onChange={handleNewVehicleChange}
            error={newVehicleErrors.year}
          />

          <Button color="blue" onClick={handleAddVehicle} disabled={!selectedClient}>
            Guardar Vehículo
          </Button>

        </div>
      </Modal>

      {/* =================== MODAL EDITAR VEHÍCULO =================== */}
      <Modal opened={editVehicleModalOpened} onClose={closeEditVehicleModal} title="Editar Vehículo" centered size="md">
        {vehicleToEdit && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <TextInput
              label="Patente"
              name="licensePlate"
              value={vehicleToEdit.licensePlate}
              onChange={(e) => {
                setVehicleToEdit({ ...vehicleToEdit, licensePlate: e.currentTarget.value });
                setEditVehicleErrors((p) => ({ ...p, licensePlate: null }));
              }}
              error={editVehicleErrors.licensePlate}
            />

            <TextInput
              label="Marca"
              name="brand"
              value={vehicleToEdit.brand}
              onChange={(e) => {
                setVehicleToEdit({ ...vehicleToEdit, brand: e.currentTarget.value });
                setEditVehicleErrors((p) => ({ ...p, brand: null }));
              }}
              error={editVehicleErrors.brand}
            />

            <TextInput
              label="Modelo"
              name="model"
              value={vehicleToEdit.model}
              onChange={(e) => {
                setVehicleToEdit({ ...vehicleToEdit, model: e.currentTarget.value });
                setEditVehicleErrors((p) => ({ ...p, model: null }));
              }}
              error={editVehicleErrors.model}
            />

            <TextInput
              label="Año"
              name="year"
              type="number"
              value={vehicleToEdit.year}
              onChange={(e) => {
                setVehicleToEdit({ ...vehicleToEdit, year: e.currentTarget.value });
                setEditVehicleErrors((p) => ({ ...p, year: null }));
              }}
              error={editVehicleErrors.year}
            />

            <Button color="blue" onClick={handleEditVehicle} loading={isEditingVehicle}>
              Actualizar Vehículo
            </Button>
          </div>
        )}
      </Modal>

      {/* =================== MODAL ELIMINAR VEHÍCULO =================== */}
      <Modal opened={deleteVehicleModalOpened} onClose={closeDeleteVehicleModal} title="Eliminar Vehículo" centered size="sm">
        <Text>
          ¿Estás seguro que deseas eliminar el vehículo con patente <b>{vehicleToDelete?.licensePlate}</b>?
        </Text>

        <Group position="apart" mt="md">
          <Button color="red" onClick={handleDeleteVehicle} loading={isDeletingVehicle}>
            Eliminar
          </Button>
          <Button variant="outline" onClick={closeDeleteVehicleModal}>
            Cancelar
          </Button>
        </Group>
      </Modal>

      {/* =================== MODAL AGREGAR CLIENTE =================== */}
      <Modal opened={addModalOpened} onClose={closeAddModal} title="Agregar Cliente" centered size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <TextInput
            label="Nombre"
            name="name"
            value={newClient.name}
            onChange={handleNewClientChange}
            error={newClientErrors.name}
          />

          <TextInput
            label="Email"
            name="email"
            value={newClient.email}
            onChange={handleNewClientChange}
            error={newClientErrors.email}
          />

          <TextInput
            label="CUIT/CUIL"
            name="cuitCuil"
            value={newClient.cuitCuil}
            onChange={handleNewClientChange}
            error={newClientErrors.cuitCuil}
          />

          <TextInput
            label="Teléfono"
            name="phone"
            value={newClient.phone}
            onChange={handleNewClientChange}
            error={newClientErrors.phone}
          />

          <TextInput
            label="Dirección"
            name="address"
            value={newClient.address}
            onChange={handleNewClientChange}
            error={newClientErrors.address}
          />

          <TextInput
            label="Ciudad"
            name="city"
            value={newClient.city}
            onChange={handleNewClientChange}
            error={newClientErrors.city}
          />

          <TextInput
            label="Provincia"
            name="province"
            value={newClient.province}
            onChange={handleNewClientChange}
            error={newClientErrors.province}
          />

          <Button color="green" onClick={handleAddClient} loading={isSaving}>
            Guardar Cliente
          </Button>

        </div>
      </Modal>

      {/* =================== MODAL EDITAR CLIENTE =================== */}
      <Modal opened={editModalOpened} onClose={closeEditModal} title="Editar Cliente" centered size="md">
        {clientToEdit && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            <TextInput
              label="Nombre"
              value={clientToEdit.name}
              onChange={(e) => {
                setClientToEdit({ ...clientToEdit, name: e.currentTarget.value });
                setEditClientErrors((p) => ({ ...p, name: null }));
              }}
              error={editClientErrors.name}
            />

            <TextInput
              label="Email"
              value={clientToEdit.email}
              onChange={(e) => {
                setClientToEdit({ ...clientToEdit, email: e.currentTarget.value });
                setEditClientErrors((p) => ({ ...p, email: null }));
              }}
              error={editClientErrors.email}
            />

            <TextInput
              label="CUIT/CUIL"
              value={clientToEdit.cuitCuil}
              onChange={(e) => {
                setClientToEdit({ ...clientToEdit, cuitCuil: e.currentTarget.value });
                setEditClientErrors((p) => ({ ...p, cuitCuil: null }));
              }}
              error={editClientErrors.cuitCuil}
            />

            <TextInput
              label="Teléfono"
              value={clientToEdit.phone}
              onChange={(e) => {
                setClientToEdit({ ...clientToEdit, phone: e.currentTarget.value });
                setEditClientErrors((p) => ({ ...p, phone: null }));
              }}
              error={editClientErrors.phone}
            />

            <TextInput
              label="Dirección"
              value={clientToEdit.address}
              onChange={(e) => {
                setClientToEdit({ ...clientToEdit, address: e.currentTarget.value });
                setEditClientErrors((p) => ({ ...p, address: null }));
              }}
              error={editClientErrors.address}
            />

            <TextInput
              label="Ciudad"
              value={clientToEdit.city}
              onChange={(e) => {
                setClientToEdit({ ...clientToEdit, city: e.currentTarget.value });
                setEditClientErrors((p) => ({ ...p, city: null }));
              }}
              error={editClientErrors.city}
            />

            <TextInput
              label="Provincia"
              value={clientToEdit.province}
              onChange={(e) => {
                setClientToEdit({ ...clientToEdit, province: e.currentTarget.value });
                setEditClientErrors((p) => ({ ...p, province: null }));
              }}
              error={editClientErrors.province}
            />

            <Button color="blue" onClick={handleEditClient} loading={isEditing}>
              Actualizar Cliente
            </Button>
          </div>
        )}
      </Modal>

      {/* =================== MODAL ELIMINAR CLIENTE =================== */}
      <Modal opened={deleteModalOpened} onClose={closeDeleteModal} title="Eliminar Cliente" centered size="sm">
        <Text>
          ¿Estás seguro que deseas eliminar a <b>{clientToDelete?.name}</b>?
        </Text>

        <Group position="apart" mt="md">
          <Button color="red" onClick={handleDeleteClient} loading={isDeleting}>
            Eliminar
          </Button>
          <Button variant="outline" onClick={closeDeleteModal}>
            Cancelar
          </Button>
        </Group>
      </Modal>

      {/* =================== MODAL DE ERROR DEL BACKEND =================== */}
      <Modal
        opened={errorModalOpened}
        onClose={closeErrorModal}
        title="Error del servidor"
        centered
        size="md"
      >
        <Text c="red" fw={600} mb="md">
          {backendError}
        </Text>

        <Group position="right">
          <Button color="red" onClick={closeErrorModal}>
            Cerrar
          </Button>
        </Group>
      </Modal>

      {/* =================== OVERLAY GLOBAL =================== */}
      {blocking && (
        <Overlay opacity={0.5} color="#000" zIndex={1000} fixed>
          <Center style={{ height: '100vh' }}>
            <CircularProgress color="success" size={80} />
          </Center>
        </Overlay>
      )}

    </ScrollArea>
  );
}
