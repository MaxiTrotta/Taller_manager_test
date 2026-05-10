import { useEffect, useState } from "react";
import {
  Table,
  Text,
  Group,
  Button,
  Modal,
  Badge,
  ActionIcon,
  ScrollArea,
  TextInput,
  Select,
  Center,
  Overlay,
  UnstyledButton,
  PasswordInput,
  Checkbox,
} from "@mantine/core";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  IconTrash,
  IconShield,
  IconSearch,
  IconChevronDown,
  IconChevronUp,
  IconSelector,
  IconKey,
  IconPlus,
} from "@tabler/icons-react";

import CircularProgress from "@mui/material/CircularProgress";
import TablePagination from "@mui/material/TablePagination";

import { usersService } from "../../services/usersService";
import { authService } from "../../services/authService";
import { ToastOverlay } from "../Toast/ToastOverlay";
import classes from "../TableSort/TableSort.module.css";

// =============== Helpers Visuales (Th ordenable) ===============
function Th({ children, sorted, reversed, onSort }) {
  const Icon = sorted ? (reversed ? IconChevronUp : IconChevronDown) : IconSelector;

  return (
    <Table.Th className={classes.th}>
      <UnstyledButton onClick={onSort} className={classes.control}>
        <Group justify="space-between">
          <Text fw={500} fz="sm">
            {children}
          </Text>
          <Center className={classes.icon}>
            <Icon size={16} stroke={1.5} />
          </Center>
        </Group>
      </UnstyledButton>
    </Table.Th>
  );
}

// =================== Filtro ===================
function filterData(data, search, filterRole) {
  let result = Array.isArray(data) ? data : [];

  const q = search.toLowerCase().trim();
  if (q !== "") {
    result = result.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }

  if (filterRole === "admin") result = result.filter((u) => Number(u.admin) === 1);
  if (filterRole === "mecanico") result = result.filter((u) => Number(u.admin) === 0);

  return result;
}

// =================== Ordenamiento ===================
function sortData(data, { sortBy, reversed, search, filterRole }) {
  let result = [...filterData(data, search, filterRole)];

  if (!sortBy) return result;

  return result.sort((a, b) => {
    const aVal = a[sortBy]?.toString().toLowerCase() ?? "";
    const bVal = b[sortBy]?.toString().toLowerCase() ?? "";

    return reversed ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
  });
}

// =====================================================
//                    COMPONENTE
// =====================================================

// Schema de validación para el formulario de registro
const UserSchema = z.object({
  name: z
    .string("Ingresa un nombre válido")
    .min(4, "Debe tener mínimo 4 caracteres")
    .max(32, "Debe tener máximo 32 caracteres"),
  email: z
    .email("El correo electrónico no es válido")
    .max(48, "Debe tener máximo 48 caracteres"),
  password: z
    .string("La contraseña no es válida")
    .min(4, "Debe tener mínimo 4 caracteres")
    .max(32, "Debe tener máximo 32 caracteres"),
  admin: z.boolean(),
});

export default function UsersTable() {
  const [users, setUsers] = useState([]);
  const [sortedUsers, setSortedUsers] = useState([]);

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("todos");

  const [sortBy, setSortBy] = useState(null);
  const [reverseSortDirection, setReverseSortDirection] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [modalDelete, setModalDelete] = useState(false);
  const [modalRole, setModalRole] = useState(false);
  const [modalPassword, setModalPassword] = useState(false);
  const [modalRegister, setModalRegister] = useState(false);
  const [confirmAdminModal, setConfirmAdminModal] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [registerError, setRegisterError] = useState("");

  const [blocking, setBlocking] = useState(false);

  // =================== TOAST ===================
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

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Formulario de registro
  const registerForm = useForm({
    resolver: zodResolver(UserSchema),
    defaultValues: { admin: false },
  });

  // =================== TRAER USUARIOS ===================
  async function loadUsers() {
    setBlocking(true);
    try {
      const response = await usersService.getAll();
      const arr = Array.isArray(response.data) ? response.data : [];
      setUsers(arr);
      setSortedUsers(
        sortData(arr, {
          sortBy,
          reversed: reverseSortDirection,
          search,
          filterRole,
        })
      );
    } catch (err) {
      console.error("Error al cargar usuarios:", err);
      setUsers([]);
      setSortedUsers([]);
    } finally {
      setBlocking(false);
    }
  }

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =================== Sorting ===================
  const setSorting = (field) => {
    const reversed = field === sortBy ? !reverseSortDirection : false;
    setReverseSortDirection(reversed);
    setSortBy(field);
    setSortedUsers(
      sortData(users, {
        sortBy: field,
        reversed,
        search,
        filterRole,
      })
    );
    setPage(0);
  };

  // =================== Filtros dinámicos ===================
  useEffect(() => {
    setSortedUsers(
      sortData(users, {
        sortBy,
        reversed: reverseSortDirection,
        search,
        filterRole,
      })
    );
    setPage(0);
  }, [users, search, filterRole, sortBy, reverseSortDirection]);

  const paginated = sortedUsers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // =================== Acciones ===================
  async function toggleRole() {
    if (!selectedUser) return;
    setBlocking(true);
    try {
      await usersService.update(selectedUser.email, {
        name: selectedUser.name,
        email: selectedUser.email,
        password: selectedUser.password,
        admin: Number(selectedUser.admin) === 1 ? 0 : 1,
      });

      setModalRole(false);
      await loadUsers();
      showToast("Rol de usuario actualizado ✔️", "green");
    } catch (e) {
      console.error("Error al cambiar rol:", e);
      showToast("Error al cambiar el rol ❌", "red");
    } finally {
      setBlocking(false);
    }
  }

  async function deleteUser() {
    if (!selectedUser) return;
    setBlocking(true);
    try {
      await usersService.delete(selectedUser.email);
      setModalDelete(false);
      await loadUsers();
      showToast("Usuario eliminado correctamente ❌", "red");
    } catch (e) {
      console.error("Error al eliminar usuario:", e);
      showToast("Error al eliminar el usuario ❌", "red");
    } finally {
      setBlocking(false);
    }
  }

  async function changePassword() {
    if (!selectedUser) return;

    // Validaciones
    setPasswordError("");
    
    if (!newPassword || newPassword.trim() === "") {
      setPasswordError("La contraseña no puede estar vacía");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden");
      return;
    }

    setBlocking(true);
    try {
      await usersService.update(selectedUser.email, {
        name: selectedUser.name,
        email: selectedUser.email,
        password: newPassword, // El backend hasheará esta contraseña
        admin: Number(selectedUser.admin),
      });

      setModalPassword(false);
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
      await loadUsers();
      showToast("Contraseña actualizada correctamente ✔️", "green");
    } catch (e) {
      console.error("Error al cambiar contraseña:", e);
      setPasswordError("Error al cambiar la contraseña. Intente nuevamente.");
      showToast("Error al cambiar la contraseña ❌", "red");
    } finally {
      setBlocking(false);
    }
  }

  // =================== REGISTRAR USUARIO ===================
  function handleAdminToggle(e) {
    const checked = e.currentTarget.checked;

    if (checked) {
      setConfirmAdminModal(true);
    } else {
      registerForm.setValue("admin", false);
    }
  }

  function confirmAdmin() {
    registerForm.setValue("admin", true);
    setConfirmAdminModal(false);
  }

  function cancelAdmin() {
    registerForm.setValue("admin", false);
    setConfirmAdminModal(false);
  }

  async function handleRegister(formData) {
    try {
      setRegisterError("");
      
      // Validar email duplicado antes de enviar
      const emailExists = users.some(
        (u) => u.email.toLowerCase() === formData.email.toLowerCase()
      );
      
      if (emailExists) {
        setRegisterError("El email ya está registrado");
        registerForm.setError("email", {
          type: "manual",
          message: "El email ya está registrado",
        });
        showToast("El email ya está registrado ❌", "red");
        return;
      }

      setBlocking(true);

      const response = await authService.register(formData);

      if (response.status === 200 || response.status === 201) {
        setModalRegister(false);
        registerForm.reset();
        setConfirmAdminModal(false);
        await loadUsers();
        showToast("Usuario creado correctamente ✔️", "green");
      } else {
        throw new Error("Ocurrió un error inesperado");
      }
    } catch (error) {
      console.error("Error al registrar usuario:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Error al registrar el usuario. El email puede estar en uso.";
      
      setRegisterError(errorMessage);
      
      // Si el error es de email duplicado del backend
      if (errorMessage.toLowerCase().includes("email") || 
          errorMessage.toLowerCase().includes("ya se encuentra")) {
        registerForm.setError("email", {
          type: "manual",
          message: errorMessage,
        });
        showToast("El email ya está registrado ❌", "red");
      } else {
        showToast("Error al registrar el usuario ❌", "red");
      }
    } finally {
      setBlocking(false);
    }
  }

  // =====================================================
  //                      RENDER
  // =====================================================
  return (
    <div style={{ position: "relative" }}>
      {/* Toast reutilizable */}
      <ToastOverlay toast={toast} />

      {/* ================= BLOQUEO SOLO DEL CONTENEDOR ================= */}
      {blocking && (
        <>
          <Overlay
            opacity={0.5}
            color="#000"
            blur={2}
            zIndex={5}
            style={{ position: "absolute", inset: 0, borderRadius: "8px" }}
          />
          <Center
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10,
              flexDirection: "column",
            }}
          >
            <CircularProgress color="success" size={70} />
          </Center>
        </>
      )}

      {/* ================= HEADERS ================= */}
      <Group justify="space-between" mb="sm">
        <TextInput
          placeholder="Buscar usuario..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          style={{ width: "300px" }}
        />

        <Group>
          <Select
            placeholder="Filtrar rol"
            value={filterRole}
            onChange={setFilterRole}
            data={[
              { value: "todos", label: "Todos" },
              { value: "admin", label: "Administradores" },
              { value: "mecanico", label: "Mecánicos" },
            ]}
            style={{ width: 220 }}
          />
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => {
              setModalRegister(true);
              registerForm.reset();
              setRegisterError("");
            }}
            color="green"
          >
            Agregar Usuario
          </Button>
        </Group>
      </Group>

      {/* ================= TABLA ================= */}
      <ScrollArea>
        <Table
          horizontalSpacing="lg"
          verticalSpacing="xs"
          highlightOnHover
          layout="fixed"
        >
          <Table.Thead>
            <Table.Tr>
              <Th
                sorted={sortBy === "id"}
                reversed={reverseSortDirection}
                onSort={() => setSorting("id")}
              >
                ID
              </Th>

              <Th
                sorted={sortBy === "name"}
                reversed={reverseSortDirection}
                onSort={() => setSorting("name")}
              >
                Nombre
              </Th>

              <Th
                sorted={sortBy === "email"}
                reversed={reverseSortDirection}
                onSort={() => setSorting("email")}
              >
                Email
              </Th>

              <Th
                sorted={sortBy === "admin"}
                reversed={reverseSortDirection}
                onSort={() => setSorting("admin")}
              >
                Rol
              </Th>

              <Table.Th>Acciones</Table.Th>
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {paginated.length > 0 ? (
              paginated.map((u) => (
                <Table.Tr key={u.id}>
                  <Table.Td>{u.id}</Table.Td>
                  <Table.Td>{u.name}</Table.Td>
                  <Table.Td>{u.email}</Table.Td>

                  <Table.Td>
                    <Badge
                      color={Number(u.admin) === 1 ? "red" : "blue"}
                      variant="filled"
                    >
                      {Number(u.admin) === 1
                        ? "ADMINISTRACIÓN"
                        : "MECÁNICO"}
                    </Badge>
                  </Table.Td>

                  <Table.Td>
                    <Group gap={0} justify="flex-end">
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        onClick={() => {
                          setSelectedUser(u);
                          setModalPassword(true);
                          setNewPassword("");
                          setConfirmPassword("");
                          setPasswordError("");
                        }}
                        title="Cambiar contraseña"
                      >
                        <IconKey size={18} />
                      </ActionIcon>

                      <ActionIcon
                        variant="subtle"
                        color={Number(u.admin) === 1 ? "blue" : "red"}
                        onClick={() => {
                          setSelectedUser(u);
                          setModalRole(true);
                        }}
                        title="Cambiar rol"
                      >
                        <IconShield size={18} />
                      </ActionIcon>

                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => {
                          setSelectedUser(u);
                          setModalDelete(true);
                        }}
                        title="Eliminar usuario"
                      >
                        <IconTrash size={18} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))
            ) : (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text ta="center" fw={500}>
                    No se encontraron usuarios
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      {/* ================= PAGINACIÓN ================= */}
      <TablePagination
        component="div"
        count={sortedUsers.length}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[5, 10, 25, 50]}
        sx={{
          color: "#1976d2",
          ".MuiSvgIcon-root, .MuiIconButton-root": { color: "#1976d2" },
          ".MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows, .MuiSelect-select":
            { color: "#1976d2" },
        }}
      />

      {/* ================= MODAL CAMBIAR ROL ================= */}
      <Modal
        opened={modalRole}
        onClose={() => setModalRole(false)}
        centered
        title="Cambiar rol"
      >
        <Text>
          ¿Cambiar rol de <b>{selectedUser?.name}</b>?
        </Text>

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => setModalRole(false)}>
            Cancelar
          </Button>

          <Button color="blue" onClick={toggleRole}>
            Confirmar
          </Button>
        </Group>
      </Modal>

      {/* ================= MODAL ELIMINAR ================= */}
      <Modal
        opened={modalDelete}
        onClose={() => setModalDelete(false)}
        centered
        title="Eliminar usuario"
      >
        <Text>
          ¿Eliminar a <b>{selectedUser?.name}</b>?
        </Text>

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => setModalDelete(false)}>
            Cancelar
          </Button>

          <Button color="red" onClick={deleteUser}>
            Eliminar
          </Button>
        </Group>
      </Modal>

      {/* ================= MODAL CAMBIAR CONTRASEÑA ================= */}
      <Modal
        opened={modalPassword}
        onClose={() => {
          setModalPassword(false);
          setNewPassword("");
          setConfirmPassword("");
          setPasswordError("");
        }}
        centered
        title="Cambiar contraseña"
      >
        <Text mb="md">
          Cambiar contraseña para <b>{selectedUser?.name}</b> ({selectedUser?.email})
        </Text>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <PasswordInput
            label="Nueva contraseña"
            placeholder="Ingrese la nueva contraseña"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.currentTarget.value);
              setPasswordError("");
            }}
            error={passwordError && !confirmPassword ? passwordError : null}
          />

          <PasswordInput
            label="Confirmar contraseña"
            placeholder="Confirme la nueva contraseña"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.currentTarget.value);
              setPasswordError("");
            }}
            error={passwordError && confirmPassword ? passwordError : null}
          />

          {passwordError && (
            <Text c="red" size="sm">
              {passwordError}
            </Text>
          )}
        </div>

        <Group justify="flex-end" mt="md">
          <Button
            variant="default"
            onClick={() => {
              setModalPassword(false);
              setNewPassword("");
              setConfirmPassword("");
              setPasswordError("");
            }}
          >
            Cancelar
          </Button>

          <Button color="blue" onClick={changePassword}>
            Cambiar contraseña
          </Button>
        </Group>
      </Modal>

      {/* ================= MODAL REGISTRAR USUARIO ================= */}
      <Modal
        opened={modalRegister}
        onClose={() => {
          setModalRegister(false);
          registerForm.reset();
          setRegisterError("");
          setConfirmAdminModal(false);
        }}
        centered
        title="Registrar nuevo usuario"
        size="md"
      >
        <form>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <TextInput
              label="Nombre"
              placeholder="Nombre"
              error={registerForm.formState.errors.name?.message}
              {...registerForm.register("name")}
              size="md"
              radius="md"
            />

            <TextInput
              label="Correo electrónico"
              placeholder="usuario@gmail.com"
              error={registerForm.formState.errors.email?.message || registerError}
              {...registerForm.register("email", {
                onChange: () => {
                  // Limpiar error cuando el usuario empiece a escribir
                  if (registerError) {
                    setRegisterError("");
                  }
                },
              })}
              size="md"
              radius="md"
            />

            <PasswordInput
              label="Contraseña"
              placeholder="Contraseña"
              error={registerForm.formState.errors.password?.message}
              {...registerForm.register("password")}
              size="md"
              radius="md"
            />

            <Checkbox
              label="¿Es administrador?"
              checked={registerForm.watch("admin")}
              onChange={handleAdminToggle}
            />

            {registerError && (
              <Text c="red" size="sm">
                {registerError}
              </Text>
            )}
          </div>

          <Group justify="flex-end" mt="md">
            <Button
              variant="default"
              onClick={() => {
                setModalRegister(false);
                registerForm.reset();
                setRegisterError("");
                setConfirmAdminModal(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              color="green"
              onClick={registerForm.handleSubmit(handleRegister)}
              loading={registerForm.formState.isSubmitting || blocking}
            >
              Registrar Usuario
            </Button>
          </Group>
        </form>
      </Modal>

      {/* ================= MODAL CONFIRMAR ADMINISTRADOR ================= */}
      <Modal
        opened={confirmAdminModal}
        onClose={cancelAdmin}
        title="Confirmar administrador"
        centered
      >
        <Text>
          Estás por marcar a este usuario como <strong>administrador</strong>.
          Esto le dará acceso completo al sistema.
        </Text>

        <Group justify="flex-end" mt="md">
          <Button variant="outline" color="gray" onClick={cancelAdmin}>
            Cancelar
          </Button>
          <Button color="red" onClick={confirmAdmin}>
            Confirmar
          </Button>
        </Group>
      </Modal>
    </div>
  );
}
