// Validadores simples reutilizables para formularios
export const isNonEmpty = (v) => (v !== undefined && v !== null && String(v).trim() !== "");
export const maxLength = (v, n) => (typeof v === 'string' ? v.trim().length <= n : true);
export const minLength = (v, n) => (typeof v === 'string' ? v.trim().length >= n : true);
export const isValidState = (v) => {
  const n = typeof v === 'number' ? v : parseInt(v);
  return [1, 2, 3].includes(n);
};

export function validateNewOrderPayload(order) {
  const errors = { idClient: null, idVehicle: null, tasks: [] };
  if (!isNonEmpty(order.idClient)) errors.idClient = 'Debe seleccionar un cliente';
  if (!isNonEmpty(order.idVehicle)) errors.idVehicle = 'Debe seleccionar un vehículo';

  if (!Array.isArray(order.tasks) || order.tasks.length === 0) {
    errors.tasks = [{ general: 'Debe agregar al menos una tarea' }];
    return errors;
  }

  errors.tasks = order.tasks.map((t) => {
    const te = { idSector: null, idTask: null, note: null };
    if (!isNonEmpty(t.idSector)) te.idSector = 'Seleccione un sector';
    if (!isNonEmpty(t.idTask)) te.idTask = 'Seleccione una tarea';
    if (t.note && !maxLength(t.note, 500)) te.note = 'La nota debe tener máximo 500 caracteres';
    return te;
  });

  return errors;
}

export function validateEditedTasksPayload(order) {
  const errors = { tasks: [] };
  if (!order || !Array.isArray(order.tasks)) return { tasks: [{ general: 'Orden inválida' }] };

  errors.tasks = order.tasks.map((t) => {
    const te = { idSector: null, idTask: null, state: null, note: null };
    if (!isNonEmpty(t.idSector)) te.idSector = 'Seleccione un sector';
    if (!isNonEmpty(t.idTask)) te.idTask = 'Seleccione una tarea';
    if (!isValidState(t.state)) te.state = 'Estado inválido';
    if (t.note && !maxLength(t.note, 500)) te.note = 'La nota debe tener máximo 500 caracteres';
    return te;
  });

  return errors;
}

export function validateEmployeePayload(emp) {
  const errors = { name: null, cuilCuit: null, phone: null, email: null, address: null, idSector: null };
  if (!isNonEmpty(emp.name)) errors.name = 'Debe ingresar el nombre';
  if (!isNonEmpty(emp.cuilCuit)) errors.cuilCuit = 'Debe ingresar CUIL/CUIT';
  if (!isNonEmpty(emp.phone)) errors.phone = 'Debe ingresar teléfono';
  if (!isNonEmpty(emp.email)) errors.email = 'Debe ingresar un correo electrónico';
  if (emp.email && emp.email.indexOf('@') === -1) errors.email = 'Correo inválido';
  if (!isNonEmpty(emp.address)) errors.address = 'Debe ingresar dirección';
  if (!isNonEmpty(emp.idSector)) errors.idSector = 'Seleccione un sector';
  return errors;
}

export function hasAnyError(obj) {
  if (!obj) return false;
  if (typeof obj === 'string') return obj.trim() !== '';
  if (Array.isArray(obj)) return obj.some((v) => hasAnyError(v));
  if (typeof obj === 'object') return Object.values(obj).some((v) => hasAnyError(v));
  return false;
}

export function validateClientPayload(client) {
  const errors = { name: null, email: null, cuitCuil: null, phone: null, address: null, city: null, province: null };
  if (!isNonEmpty(client.name)) errors.name = 'Debe ingresar el nombre';
  if (!isNonEmpty(client.email)) errors.email = 'Debe ingresar un correo';
  if (client.email && client.email.indexOf('@') === -1) errors.email = 'Correo inválido';
  if (!isNonEmpty(client.cuitCuil)) errors.cuitCuil = 'Debe ingresar CUIT/CUIL';
  if (!isNonEmpty(client.phone)) errors.phone = 'Debe ingresar teléfono';
  if (!isNonEmpty(client.address)) errors.address = 'Debe ingresar dirección';
  if (!isNonEmpty(client.city)) errors.city = 'Debe ingresar la ciudad';
  if (!isNonEmpty(client.province)) errors.province = 'Debe ingresar la provincia';
  return errors;
}

export function validateVehiclePayload(vehicle) {
  const errors = { licensePlate: null, brand: null, model: null, year: null };
  if (!isNonEmpty(vehicle.licensePlate)) errors.licensePlate = 'Debe ingresar la patente';
  if (!isNonEmpty(vehicle.brand)) errors.brand = 'Debe ingresar la marca';
  if (!isNonEmpty(vehicle.model)) errors.model = 'Debe ingresar el modelo';
  if (!isNonEmpty(vehicle.year)) errors.year = 'Debe ingresar el año';
  return errors;
}
