import { useState, useEffect } from 'react';
import { TaskService } from '../../services/TaskService';
import {
  IconChevronDown, IconChevronUp, IconSearch, IconSelector,
  IconPencil, IconTrash, IconPlus
} from '@tabler/icons-react';
import {
  Center, Group, ScrollArea, Table, Text, TextInput, UnstyledButton,
  Modal, Button, ActionIcon, Overlay
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import classes from '../TableSort/TableSort.module.css';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import TablePagination from '@mui/material/TablePagination';
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
export function TasksTable() {
  const safe = (a) => (Array.isArray(a) ? a : []);

  /* Estados =================== */
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [blocking, setBlocking] = useState(false);

  const [editModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);
  const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [addModalOpened, { open: openAddModal, close: closeAddModal }] = useDisclosure(false);

  const [taskToEdit, setTaskToEdit] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);

  const [search, setSearch] = useState('');
  const [tasks, setTasks] = useState([]);
  const [sortedData, setSortedData] = useState([]);
  const [sortBy, setSortBy] = useState(null);
  const [reverseSortDirection, setReverseSortDirection] = useState(false);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [newTask, setNewTask] = useState({
    description: ''
  });
  const [newTaskErrors, setNewTaskErrors] = useState({});
  const [editTaskErrors, setEditTaskErrors] = useState({});

  const [loading, setLoading] = useState(false);

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

  /* =================== FETCH TAREAS =================== */
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await TaskService.getAll();
      const data = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
        ? response.data.data
        : [];

      setTasks(data);
      setSortedData(sortData(data, { sortBy, reversed: reverseSortDirection, search }));
    } catch (err) {
      showBackendError(err);
    } finally {
      setLoading(false);
    }
  };

  /* =================== useEffect =================== */
  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    setSortedData(sortData(safe(tasks), { sortBy, reversed: reverseSortDirection, search }));
    setPage(0);
  }, [tasks, search, sortBy, reverseSortDirection]);

  /* =================== Ordenamiento =================== */
  const setSorting = (field) => {
    const reversed = field === sortBy ? !reverseSortDirection : false;
    setReverseSortDirection(reversed);
    setSortBy(field);
    setSortedData(sortData(safe(tasks), { sortBy: field, reversed, search }));
    setPage(0);
  };

  /* =================== Search =================== */
  const handleSearchChange = (event) => {
    const { value } = event.currentTarget;
    setSearch(value);
    setSortedData(sortData(safe(tasks), { sortBy, reversed: reverseSortDirection, search: value }));
    setPage(0);
  };

  /* =================== Handlers Tarea =================== */

  const handleNewTaskChange = (event) => {
    const { name, value } = event.currentTarget;
    setNewTask((prev) => ({ ...prev, [name]: value }));
    setNewTaskErrors((p) => ({ ...p, [name]: null }));
  };

  /* 🔥 CREAR TAREA */
  const handleAddTask = async () => {
    // Validación
    if (!newTask.description || newTask.description.trim() === '') {
      setNewTaskErrors({ description: 'Debe ingresar la descripción de la tarea' });
      showToast("Debe ingresar la descripción de la tarea ❌", "red");
      return;
    }

    // Validar duplicado
    const descriptionExists = tasks.some(
      (t) => t.description.toLowerCase().trim() === newTask.description.toLowerCase().trim()
    );
    if (descriptionExists) {
      setNewTaskErrors({ description: 'Esta tarea ya existe' });
      showToast("Esta tarea ya existe ❌", "red");
      return;
    }

    setIsSaving(true);
    setBlocking(true);

    try {
      const response = await TaskService.create({ description: newTask.description.trim() });

      if (response.status === 201 || response.status === 200) {
        await fetchTasks();
        closeAddModal();

        setNewTask({ description: '' });
        setNewTaskErrors({});

        showToast("Tarea creada correctamente ✔️");
      }
    } catch (err) {
      showBackendError(err);
    } finally {
      setIsSaving(false);
      setBlocking(false);
    }
  };

  /* 🔥 EDITAR TAREA */
  const handleEditTask = async () => {
    if (!taskToEdit) return;

    // Validación
    if (!taskToEdit.description || taskToEdit.description.trim() === '') {
      setEditTaskErrors({ description: 'Debe ingresar la descripción de la tarea' });
      showToast("Debe ingresar la descripción de la tarea ❌", "red");
      return;
    }

    // Validar duplicado (excluyendo la tarea actual)
    const descriptionExists = tasks.some(
      (t) =>
        t.description.toLowerCase().trim() === taskToEdit.description.toLowerCase().trim() &&
        t.id !== taskToEdit.id
    );
    if (descriptionExists) {
      setEditTaskErrors({ description: 'Esta tarea ya existe' });
      showToast("Esta tarea ya existe ❌", "red");
      return;
    }

    setIsEditing(true);
    setBlocking(true);

    try {
      const response = await TaskService.update(taskToEdit.id, { description: taskToEdit.description.trim() });

      if (response.status === 200) {
        await fetchTasks();
        closeEditModal();
        showToast("Tarea actualizada ✔️");
      }
    } catch (err) {
      showBackendError(err);
    } finally {
      setIsEditing(false);
      setBlocking(false);
    }
  };

  /* =================== ELIMINAR TAREA =================== */
  const handleDeleteTask = async () => {
    if (!taskToDelete) return;

    setIsDeleting(true);
    setBlocking(true);

    try {
      const response = await TaskService.delete(taskToDelete.id);

      if (response.status === 200 || response.status === 204) {
        await fetchTasks();
        closeDeleteModal();
        showToast("Tarea eliminada ❌", "red");
      }
    } catch (err) {
      showBackendError(err);
    } finally {
      setIsDeleting(false);
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
      <Table.Td>{row.id}</Table.Td>
      <Table.Td>{row.description}</Table.Td>
      <Table.Td>
        <Group gap={0} justify="flex-end">
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={() => {
              setTaskToEdit({ ...row });
              openEditModal();
            }}
          >
            <IconPencil size={16} stroke={1.5} />
          </ActionIcon>

          <ActionIcon
            variant="subtle"
            color="red"
            onClick={() => {
              setTaskToDelete(row);
              openDeleteModal();
            }}
          >
            <IconTrash size={16} stroke={1.5} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <ScrollArea>
      {/* Toast reutilizable */}
      <ToastOverlay toast={toast} />

      {/* Barra superior */}
      <Group justify="space-between" mb="sm">
        <TextInput
          placeholder="Buscar Tarea"
          leftSection={<IconSearch size={16} stroke={1.5} />}
          value={search}
          onChange={handleSearchChange}
          style={{ width: '300px' }}
        />

        <Button variant="filled" color="green" onClick={openAddModal}>
          Agregar Tarea
        </Button>
      </Group>

      {/* =================== TABLA TAREAS =================== */}
      <Table horizontalSpacing="lg" verticalSpacing="xs" miw={700} layout="fixed">
        <Table.Thead>
          <Table.Tr>
            <Th sorted={sortBy === 'id'} reversed={reverseSortDirection} onSort={() => setSorting('id')}>ID</Th>
            <Th sorted={sortBy === 'description'} reversed={reverseSortDirection} onSort={() => setSorting('description')}>Descripción</Th>
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {loading ? (
            <Table.Tr><Table.Td colSpan={3}><CircularIndeterminate /></Table.Td></Table.Tr>
          ) : rows.length > 0 ? (
            rows
          ) : (
            <Table.Tr><Table.Td colSpan={3}><Text ta="center">No se encontraron tareas</Text></Table.Td></Table.Tr>
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

      {/* =================== MODAL AGREGAR TAREA =================== */}
      <Modal opened={addModalOpened} onClose={closeAddModal} title="Agregar Tarea" centered size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <TextInput
            label="Descripción de la tarea"
            name="description"
            value={newTask.description}
            onChange={handleNewTaskChange}
            error={newTaskErrors.description}
            placeholder="Ej: Cambio de aceite"
          />

          <Button color="green" onClick={handleAddTask} loading={isSaving}>
            Guardar Tarea
          </Button>

        </div>
      </Modal>

      {/* =================== MODAL EDITAR TAREA =================== */}
      <Modal opened={editModalOpened} onClose={closeEditModal} title="Editar Tarea" centered size="md">
        {taskToEdit && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            <TextInput
              label="Descripción de la tarea"
              value={taskToEdit.description}
              onChange={(e) => {
                setTaskToEdit({ ...taskToEdit, description: e.currentTarget.value });
                setEditTaskErrors((p) => ({ ...p, description: null }));
              }}
              error={editTaskErrors.description}
              placeholder="Ej: Cambio de aceite"
            />

            <Button color="blue" onClick={handleEditTask} loading={isEditing}>
              Actualizar Tarea
            </Button>
          </div>
        )}
      </Modal>

      {/* =================== MODAL ELIMINAR TAREA =================== */}
      <Modal opened={deleteModalOpened} onClose={closeDeleteModal} title="Eliminar Tarea" centered size="sm">
        <Text>
          ¿Estás seguro que deseas eliminar la tarea <b>"{taskToDelete?.description}"</b>?
        </Text>

        <Group position="apart" mt="md">
          <Button color="red" onClick={handleDeleteTask} loading={isDeleting}>
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

