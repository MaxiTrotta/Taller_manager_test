import './App.css'
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';

import { PrivateRoute, PublicRoute, MecanicRoute } from "./Routes";

import { LoginPage } from "./pages/LoginPage/LoginPage";
import { RegisterPage } from "./pages/RegisterPage/RegisterPage";
import { TableSort } from './components/TableSort/TableSort'
import EmployeesTable from './components/EmployeesTable/EmployeesTable';
import WorkOrdersTable from './components/WorkOrdersTable/WorkOrdersTable';
import ClosedWorkOrdersTable from './components/WorkOrdersTable/ClosedWorkOrdersTable';
import MecanicPage from './pages/MacanicPage/MecanicPage';
import UsersTable from './components/UsersTable/UsersTable';
import { TasksTable } from './components/TasksTable/TasksTable';
import Dashboard from './components/Dashboard/Dashboard';
import BudgetsTable from './components/BudgetsTable/BudgetsTable';

function App() {
	return (
		<MantineProvider defaultColorScheme="white" forceColorScheme='dark'>
			<BrowserRouter>
				<Routes>
					{/* RUTAS PUBLICAS */}
					<Route element={<PublicRoute />}>
						<Route path="/" element={<LoginPage />} />
						<Route path="/login" element={<LoginPage />} />
					</Route>

				{/* RUTAS SOLO ADMIN */}
				<Route element={<PrivateRoute />}>
					<Route path="/home" element={<Dashboard />} />
					<Route path="/dashboard" element={<Dashboard />} />
					<Route path="/usuarios" element={<UsersTable />} />
					<Route path="/register" element={<RegisterPage />} />
					<Route path="/empleado" element={<EmployeesTable />} />
					<Route path="/ordenes" element={<WorkOrdersTable />} />
					<Route path="/cliente" element={<TableSort />} />
					<Route path="/tareas" element={<TasksTable />} />
					<Route path="/presupuesto" element={<BudgetsTable />} />
					<Route path="/ordenes_cerradas" element={<ClosedWorkOrdersTable />} />
					
				</Route>					{/* RUTA SOLO MECANICOS */}
					<Route element={<MecanicRoute />}>
						<Route path="/mecanico" element={<MecanicPage />} />
					</Route>
				</Routes>

			</BrowserRouter>
		</MantineProvider>
	)
}

export default App;
