import { Navigate, Outlet, useLocation } from "react-router";
import { NavbarSimpleColored } from "./components/NavbarSimpleColored/NavbarSimpleColored";

export function PublicRoute() {
    const token = localStorage.getItem("token");
    const admin = localStorage.getItem("admin");

    if (token) {
        if (admin === "1") return <Navigate to="/home" replace />;
        if (admin === "0") return <Navigate to="/mecanico" replace />;
    }

    return <Outlet />;
}


// PRIVATE ROUTE (solo usuarios logueados)
export function PrivateRoute() {
    const token = localStorage.getItem("token");
    const admin = localStorage.getItem("admin");

    if (!token) return <Navigate to="/login" replace />;

    // 🔥 MECÁNICO INTENTA ENTRAR A UNA RUTA DE ADMIN → LO SACAMOS
    if (admin === "0") return <Navigate to="/mecanico" replace />;

    return (
        <div className="contenedor_backend">
            <NavbarSimpleColored />
            <div className="contenido">
                <Outlet />
            </div>
        </div>
    );
}


export function MecanicRoute() {
    const token = localStorage.getItem("token");
    const admin = localStorage.getItem("admin");

    if (!token) return <Navigate to="/login" replace />;

    // 🔥 ADMIN NO PUEDE ENTRAR A /mecanico
    if (admin === "1") return <Navigate to="/home" replace />;

    return (
        <div className="contenedor_backend">
            <div className="contenido">
                <Outlet />
            </div>
        </div>
    );
}

