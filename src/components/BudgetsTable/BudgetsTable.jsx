import { useState, useEffect } from "react";
import {
    Table,
    Text,
    Group,
    Button,
    Modal,
    Select,
    TextInput,
    ScrollArea,
    ActionIcon,
    NumberInput,
    Loader,
    Center,
    Overlay,
} from "@mantine/core";
import { IconPlus, IconTrash, IconEye, IconPencil } from "@tabler/icons-react";
import TablePagination from "@mui/material/TablePagination";

import { ClientCreatorService } from "../../services/ClientCreatorService";
import { VehicleCreatorService } from "../../services/VehicleCreatorService";
import { BudgetService } from "../../services/BudgetService";

export default function BudgetsTable() {
    // ESTADOS
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // DATOS
    const [budgets, setBudgets] = useState([]); 
    const [clients, setClients] = useState([]);
    
    // Almacén de vehículos (Cache) para mostrar la patente en la tabla
    const [vehicleMap, setVehicleMap] = useState({}); // Usaremos un objeto { id: "Patente" }

    // Vehículos para el Select del modal
    const [modalVehicles, setModalVehicles] = useState([]); 
    const [loadingVehicles, setLoadingVehicles] = useState(false);

    // MODALES
    const [addModalOpened, setAddModalOpened] = useState(false);
    const [viewModalOpened, setViewModalOpened] = useState(false);
    const [editModalOpened, setEditModalOpened] = useState(false);
    const [deleteModalOpened, setDeleteModalOpened] = useState(false);

    // SELECCIONADOS
    const [selectedBudget, setSelectedBudget] = useState(null);
    const [selectedBudgetForEdit, setSelectedBudgetForEdit] = useState(null);
    const [selectedBudgetForDelete, setSelectedBudgetForDelete] = useState(null);

    // FORMULARIO NUEVO
    const [newBudget, setNewBudget] = useState({
        clientId: "",
        vehicleId: "",
        lines: [{ description: "", price: "" }],
    });
    const [errors, setErrors] = useState({ clientId: null, vehicleId: null, lines: [] });

    // PAGINACIÓN
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // =============================================================
    // 1. CARGA DE DATOS Y CRUCE (JOIN EN FRONTEND)
    // =============================================================
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Cargar Presupuestos y Clientes
            const [resBudgets, resClients] = await Promise.all([
                BudgetService.getAll(),
                ClientCreatorService.getAll()
            ]);

            const rawBudgets = resBudgets.data || [];
            setClients(resClients.data || []);

            // 2. IDENTIFICAR QUÉ CLIENTES TIENEN PRESUPUESTOS
            // Filtramos los IDs de clientes únicos para no llamar a la API repetidamente
            const uniqueClientIds = [...new Set(rawBudgets.map(b => b.idClient).filter(id => id))];

            // 3. TRAER LOS VEHÍCULOS DE ESOS CLIENTES
            // Hacemos varias peticiones en paralelo (una por cada cliente involucrado)
            const vehiclePromises = uniqueClientIds.map(clientId => 
                VehicleCreatorService.getAllByClient(clientId)
                    .then(res => res.data || [])
                    .catch(() => []) // Si falla uno, no rompemos todo
            );

            const results = await Promise.all(vehiclePromises);
            
            // 4. CREAR UN MAPA DE VEHÍCULOS (Diccionario ID -> Nombre)
            // Aplanamos todos los arrays de vehículos en uno solo
            const allVehiclesFound = results.flat();
            
            const vMap = {};
            allVehiclesFound.forEach(v => {
                // Guardamos en el mapa: clave=ID, valor="Patente - Marca Modelo"
                vMap[v.id] = `${v.licensePlate || "S/P"} - ${v.brand || ""} ${v.model || ""}`;
            });
            
            setVehicleMap(vMap);

            // 5. Ordenar presupuestos (más nuevos primero)
            const sortedBudgets = rawBudgets.sort((a, b) => b.id - a.id);
            setBudgets(sortedBudgets);

        } catch (err) {
            console.error("Error al cargar datos:", err);
        } finally {
            setLoading(false);
        }
    };

    // Helper para obtener el texto del vehículo de forma segura
    const getVehicleText = (budget) => {
        // A. Si el Backend ya trajo el nombre (caso raro en tu service actual)
        if (budget.vehicle && typeof budget.vehicle === 'string') return budget.vehicle;
        
        // B. Buscamos en nuestro mapa de vehículos cargados
        if (budget.idVehicle && vehicleMap[budget.idVehicle]) {
            return vehicleMap[budget.idVehicle];
        }
        
        return "-";
    };

    // =============================================================
    // LOGICA MODALES
    // =============================================================

    const fetchVehiclesByClientForModal = async (clientId) => {
        setLoadingVehicles(true);
        try {
            const res = await VehicleCreatorService.getAllByClient(clientId);
            setModalVehicles(res.data || []);
            return res.data || [];
        } catch (err) {
            setModalVehicles([]);
            return [];
        } finally {
            setLoadingVehicles(false);
        }
    };

    const subtotal = (newBudget.lines || []).reduce((acc, l) => {
        const p = parseFloat(l.price);
        return acc + (isNaN(p) ? 0 : p);
    }, 0);
    const totalWithVAT = subtotal * 1.21;

    const validate = () => {
        const e = { clientId: null, vehicleId: null, lines: [] };
        if (!newBudget.clientId) e.clientId = "Seleccione un cliente";
        if (!newBudget.vehicleId) e.vehicleId = "Seleccione un vehículo";

        if (!newBudget.lines || newBudget.lines.length === 0)
            e.lines = [{ general: "Agregue al menos una línea" }];
        else
            e.lines = newBudget.lines.map((l) => ({
                description: l.description && l.description.trim() ? null : "Requerido",
                price: l.price !== "" && !isNaN(parseFloat(l.price)) ? null : "Inválido",
            }));

        setErrors(e);
        const hasErrorLines = e.lines.some((ln) => Object.values(ln).some((v) => v));
        return !e.clientId && !e.vehicleId && !hasErrorLines;
    };

    // =============================================================
    // HANDLERS
    // =============================================================

    const handleSaveBudget = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            const lines = (newBudget.lines || []).map((l) => ({
                description: l.description || "",
                price: parseFloat((l.price === "" ? 0 : l.price) || 0),
            }));

            const payload = {
                idClient: parseInt(newBudget.clientId),
                idVehicle: parseInt(newBudget.vehicleId),
                description: lines.map((ln) => ln.description).join("; "),
                lines: lines,
                total_amount: parseFloat(totalWithVAT.toFixed(2)),
            };

            await BudgetService.create(payload);
            await fetchData(); // Recargamos para ver la patente nueva en la tabla
            
            setAddModalOpened(false);
            setNewBudget({ clientId: "", vehicleId: "", lines: [{ description: "", price: "" }] });
            setErrors({ clientId: null, vehicleId: null, lines: [] });
            setModalVehicles([]);
        } catch (err) {
            console.error("Error creando:", err);
        } finally {
            setSaving(false);
        }
    };

    const handleViewBudget = (budget) => {
        setSelectedBudget(budget);
        setViewModalOpened(true);
    };

    const handleEditClick = async (budget) => {
        setLoading(true);
        try {
            const res = await BudgetService.getById(budget.id);
            const b = res.data;

            // Cargar vehículos para el select antes de abrir
            if (b.idClient) {
                await fetchVehiclesByClientForModal(b.idClient);
            }

            // Normalizar líneas
            let lines = [];
            if (Array.isArray(b.lines) && b.lines.length > 0) {
                lines = b.lines.map((ln) => ({ description: ln.description || "", price: ln.price || "" }));
            } else if (typeof b.description === "string") {
                const parts = b.description.split("; ");
                lines = parts.map((p) => {
                    const cleaned = p.replace(/^\d+\)\s*/, "");
                    const [desc, price] = cleaned.split(" - ");
                    return { description: (desc || "").trim(), price: price ? price.trim() : "" };
                });
            }
            if(lines.length === 0) lines = [{ description: "", price: "" }];

            setSelectedBudgetForEdit({
                id: b.id,
                clientId: b.idClient ? b.idClient.toString() : "",
                vehicleId: b.idVehicle ? b.idVehicle.toString() : "",
                lines: lines,
                total_amount: b.total_amount,
            });
            setEditModalOpened(true);
        } catch (err) {
            console.error("Error editando:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveEditedBudget = async () => {
        if (!selectedBudgetForEdit) return;
        setSaving(true);
        try {
            const lines = (selectedBudgetForEdit.lines || []).map((l) => ({
                description: l.description || "",
                price: parseFloat((l.price === "" ? 0 : l.price) || 0),
            }));
            const subtotalEdited = lines.reduce((acc, ln) => acc + (isNaN(parseFloat(ln.price)) ? 0 : parseFloat(ln.price)), 0);
            const totalEditedWithVAT = parseFloat((subtotalEdited * 1.21).toFixed(2));

            const payload = {
                idClient: parseInt(selectedBudgetForEdit.clientId),
                idVehicle: parseInt(selectedBudgetForEdit.vehicleId),
                description: lines.map((ln) => ln.description).join("; "),
                lines: lines,
                total_amount: totalEditedWithVAT,
            };

            await BudgetService.update(selectedBudgetForEdit.id, payload);
            await fetchData();
            setEditModalOpened(false);
            setSelectedBudgetForEdit(null);
        } catch (err) {
            console.error("Error guardando:", err);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteBudget = async () => {
        if (!selectedBudgetForDelete) return;
        setSaving(true);
        try {
            await BudgetService.delete(selectedBudgetForDelete.id);
            await fetchData();
            setDeleteModalOpened(false);
            setSelectedBudgetForDelete(null);
        } catch (err) {
            console.error("Error eliminando:", err);
        } finally {
            setSaving(false);
        }
    };

    // =============================================================
    // RENDER
    // =============================================================

    const rows = budgets
        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
        .map((b) => (
            <Table.Tr key={b.id}>
                <Table.Td>{b.id}</Table.Td>
                <Table.Td>{b.client || b.clientName || "-"}</Table.Td>
                {/* AQUI MOSTRAMOS LA PATENTE USANDO EL MAPA */}
                <Table.Td style={{ fontWeight: 600 }}>
                    {getVehicleText(b)}
                </Table.Td>
                <Table.Td>{b.total_amount ? (parseFloat(b.total_amount) / 1.21).toFixed(2) : "-"}</Table.Td>
                <Table.Td>{b.total_amount ? parseFloat(b.total_amount).toFixed(2) : "-"}</Table.Td>
                <Table.Td>
                    <Group gap={0} justify="flex-end">
                        <ActionIcon color="gray" variant="subtle" onClick={() => handleViewBudget(b)}>
                            <IconEye size={16} />
                        </ActionIcon>
                        <ActionIcon color="gray" variant="subtle" onClick={() => handleEditClick(b)}>
                            <IconPencil size={16} />
                        </ActionIcon>
                        <ActionIcon color="red" variant="subtle" onClick={() => { setSelectedBudgetForDelete(b); setDeleteModalOpened(true); }}>
                            <IconTrash size={16} />
                        </ActionIcon>
                    </Group>
                </Table.Td>
            </Table.Tr>
        ));

    return (
        <div style={{ position: "relative" }}>
            {(loading || saving) && (
                <>
                    <Overlay opacity={0.6} color="#000" blur={2} zIndex={9998} />
                    <Center style={{ position: "fixed", inset: 0, zIndex: 9999 }}>
                        <Loader color="green" size={48} />
                    </Center>
                </>
            )}

            <ScrollArea>
                <Group justify="space-between" mb="sm">
                    <Text fz="xl" fw={600}>Presupuestos</Text>
                    <Button color="green" onClick={() => setAddModalOpened(true)}>Nuevo Presupuesto</Button>
                </Group>

                <Table highlightOnHover>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>ID</Table.Th>
                            <Table.Th>Cliente</Table.Th>
                            <Table.Th>Vehículo (Patente)</Table.Th>
                            <Table.Th>Total s/IVA</Table.Th>
                            <Table.Th>Total c/IVA</Table.Th>
                            <Table.Th>Acciones</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>{rows}</Table.Tbody>
                </Table>

                <TablePagination
                    component="div"
                    count={budgets.length}
                    page={page}
                    onPageChange={(e, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    sx={{ color: "white !important" }}
                />

                {/* MODAL CREAR */}
                <Modal opened={addModalOpened} onClose={() => setAddModalOpened(false)} title="Nuevo Presupuesto" centered size="lg">
                    <Select
                        label="Cliente"
                        placeholder="Buscar cliente..."
                        searchable
                        data={clients.map((c) => ({ value: c.id.toString(), label: c.name }))}
                        value={newBudget.clientId}
                        onChange={(val) => {
                            setModalVehicles([]);
                            setNewBudget({ clientId: val, vehicleId: "", lines: [{ description: "", price: "" }] });
                            if (val) fetchVehiclesByClientForModal(val);
                        }}
                        error={errors.clientId}
                    />
                    <Select
                        label="Vehículo"
                        placeholder="Seleccione vehículo"
                        searchable
                        nothingFoundMessage="No se encontró"
                        data={modalVehicles.map((v) => ({ 
                            value: v.id.toString(), 
                            label: `${v.licensePlate} - ${v.brand} ${v.model}` 
                        }))}
                        value={newBudget.vehicleId}
                        disabled={!newBudget.clientId || loadingVehicles}
                        onChange={(val) => setNewBudget(prev => ({ ...prev, vehicleId: val }))}
                        error={errors.vehicleId}
                        mt="sm"
                    />
                    
                    <Text fw={600} mt="md">Líneas</Text>
                    {newBudget.lines.map((line, i) => (
                        <Group key={i} grow mb="xs">
                            <TextInput
                                placeholder="Descripción"
                                value={line.description}
                                onChange={(e) => {
                                    const updated = [...newBudget.lines];
                                    updated[i].description = e.currentTarget.value;
                                    setNewBudget({ ...newBudget, lines: updated });
                                }}
                            />
                            <NumberInput
                                placeholder="Precio"
                                value={line.price}
                                onChange={(val) => {
                                    const updated = [...newBudget.lines];
                                    updated[i].price = val;
                                    setNewBudget({ ...newBudget, lines: updated });
                                }}
                            />
                            {i > 0 && (
                                <ActionIcon color="red" onClick={() => {
                                    const updated = newBudget.lines.filter((_, idx) => idx !== i);
                                    setNewBudget({ ...newBudget, lines: updated });
                                }}>
                                    <IconTrash size={16} />
                                </ActionIcon>
                            )}
                        </Group>
                    ))}
                    <Button variant="light" mt="xs" onClick={() => setNewBudget({...newBudget, lines: [...newBudget.lines, {description:"", price:""}]})}>
                        + Agregar línea
                    </Button>
                    <Button fullWidth mt="md" color="green" onClick={handleSaveBudget}>Guardar</Button>
                </Modal>

                {/* MODAL VER */}
                <Modal opened={viewModalOpened} onClose={() => setViewModalOpened(false)} title="Detalle" centered>
                    {selectedBudget && (
                        <>
                            <Text><b>Cliente:</b> {selectedBudget.client || selectedBudget.clientName}</Text>
                            <Text><b>Vehículo:</b> {getVehicleText(selectedBudget)}</Text>
                            <Text mt="md" fw={600}>Detalle:</Text>
                            {selectedBudget.lines?.map((l, i) => (
                                <Text key={i}>• {l.description} - ${l.price}</Text>
                            ))}
                            <Text mt="md" fw={700} ta="right">Total: ${selectedBudget.total_amount}</Text>
                        </>
                    )}
                </Modal>

                {/* MODAL EDITAR */}
                <Modal opened={editModalOpened} onClose={() => setEditModalOpened(false)} title="Editar Presupuesto" centered size="lg">
                    {selectedBudgetForEdit && (
                        <>
                            <Select
                                label="Cliente"
                                data={clients.map((c) => ({ value: c.id.toString(), label: c.name }))}
                                value={selectedBudgetForEdit.clientId}
                                onChange={(val) => {
                                    setSelectedBudgetForEdit({ ...selectedBudgetForEdit, clientId: val, vehicleId: "" });
                                    fetchVehiclesByClientForModal(val);
                                }}
                            />
                            <Select
                                label="Vehículo"
                                mt="sm"
                                data={modalVehicles.map((v) => ({ 
                                    value: v.id.toString(), 
                                    label: `${v.licensePlate} - ${v.brand} ${v.model}` 
                                }))}
                                value={selectedBudgetForEdit.vehicleId}
                                onChange={(val) => setSelectedBudgetForEdit({ ...selectedBudgetForEdit, vehicleId: val })}
                            />
                            
                            <Text fw={600} mt="md">Líneas</Text>
                            {selectedBudgetForEdit.lines.map((line, i) => (
                                <Group key={i} grow mb="xs">
                                    <TextInput
                                        value={line.description}
                                        onChange={(e) => {
                                            const updated = [...selectedBudgetForEdit.lines];
                                            updated[i].description = e.currentTarget.value;
                                            setSelectedBudgetForEdit({ ...selectedBudgetForEdit, lines: updated });
                                        }}
                                    />
                                    <NumberInput
                                        value={line.price}
                                        onChange={(val) => {
                                            const updated = [...selectedBudgetForEdit.lines];
                                            updated[i].price = val;
                                            setSelectedBudgetForEdit({ ...selectedBudgetForEdit, lines: updated });
                                        }}
                                    />
                                </Group>
                            ))}
                            <Button mt="xs" variant="light" onClick={() => setSelectedBudgetForEdit({...selectedBudgetForEdit, lines: [...selectedBudgetForEdit.lines, {description:"", price:""}]})}>
                                + Agregar línea
                            </Button>
                            <Button fullWidth mt="md" color="blue" onClick={handleSaveEditedBudget}>Guardar Cambios</Button>
                        </>
                    )}
                </Modal>

                {/* MODAL ELIMINAR */}
                <Modal opened={deleteModalOpened} onClose={() => setDeleteModalOpened(false)} title="Eliminar" centered>
                    <Text>¿Eliminar presupuesto #{selectedBudgetForDelete?.id}?</Text>
                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={() => setDeleteModalOpened(false)}>Cancelar</Button>
                        <Button color="red" onClick={handleDeleteBudget}>Eliminar</Button>
                    </Group>
                </Modal>
            </ScrollArea>
        </div>
    );
}