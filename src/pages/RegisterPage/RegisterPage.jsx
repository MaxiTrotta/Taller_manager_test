import "./RegisterPage.css";
import { Link, useNavigate } from "react-router-dom";
import {
  Container,
  Title,
  Text,
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Checkbox,
  Modal
} from "@mantine/core";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { z } from "zod";
import { authService } from "../../services/authService";

import { ToastOverlay } from "../../components/Toast/ToastOverlay"; // 🔥

const UserSchema = z.object({
  name: z.string().min(4, "Debe tener mínimo 4 caracteres").max(32),
  email: z.email("El correo electrónico no es válido").max(48),
  password: z.string().min(4, "Debe tener mínimo 4 caracteres").max(32),
  admin: z.boolean(),
});

export function RegisterPage() {
  const form = useForm({
    resolver: zodResolver(UserSchema),
    defaultValues: { admin: false }
  });

  const navigate = useNavigate();
  const [error, setError] = useState(undefined);
  const [confirmAdminModal, setConfirmAdminModal] = useState(false);

  // === TOAST ===
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

  // Checkbox admin
  function handleAdminToggle(e) {
    const checked = e.currentTarget.checked;

    if (checked) setConfirmAdminModal(true);
    else form.setValue("admin", false);
  }

  function confirmAdmin() {
    form.setValue("admin", true);
    setConfirmAdminModal(false);
  }

  function cancelAdmin() {
    form.setValue("admin", false);
    setConfirmAdminModal(false);
  }

  async function onSubmit(formData) {
    try {
      setError(undefined);

      const response = await authService.register(formData);

      if (response.status === 200) {
        showToast("Usuario registrado correctamente ✔️", "green");
        setTimeout(() => navigate("/usuarios"), 1200);
      } else {
        throw new Error("Ocurrió un error inesperado");
      }

    } catch (error) {
      setError(error.message);
      showToast("Error al registrar usuario ❌", "red");
    }
  }

  return (
    <main className="wrapper">

      {/* 🔥 TOAST */}
      <ToastOverlay toast={toast} />

      <Paper className="form" radius="lg">
        <Title order={2} className="title">
          Registrar nuevo Usuario!
        </Title>

        <form>
          <TextInput
            label="Nombre"
            placeholder="Nombre"
            error={form.formState.errors.name?.message}
            {...form.register("name")}
            size="md"
            radius="md"
          />

          <TextInput
            label="Correo electrónico"
            placeholder="usuario@gmail.com"
            error={form.formState.errors.email?.message}
            {...form.register("email")}
            size="md"
            radius="md"
          />

          <PasswordInput
            label="Contraseña"
            placeholder="Contraseña"
            error={form.formState.errors.password?.message}
            {...form.register("password")}
            size="md"
            radius="md"
          />

          {/* CHECKBOX ADMIN */}
          <Checkbox
            mt="md"
            label="¿Es administrador?"
            checked={form.watch("admin")}
            onChange={handleAdminToggle}
          />

          {error ? <p className="errorMessage">{error}</p> : null}

          <Button
            fullWidth
            mt="xl"
            size="md"
            radius="md"
            variant="filled"
            onClick={form.handleSubmit(onSubmit)}
            loading={form.formState.isSubmitting}
          >
            Registrar nuevo Usuario!
          </Button>
        </form>
      </Paper>

      {/* MODAL CONFIRMAR ADMIN */}
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

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20, gap: 10 }}>
          <Button variant="outline" color="gray" onClick={cancelAdmin}>
            Cancelar
          </Button>
          <Button color="red" onClick={confirmAdmin}>
            Confirmar
          </Button>
        </div>
      </Modal>

    </main>
  );
}
