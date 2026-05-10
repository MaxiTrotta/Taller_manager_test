import { useEffect, useState } from "react";

import "./Header.css";
import { Link } from "react-router-dom";
export function Header() {
    const [menuOpen, setMenuOpen] = useState(false); // Nuevo estado

    return (
        <header>
            <div className="container">
                <Link to="/">
                    <img src="/images/Logo.png" alt="Logo Ortiz Hnos" />
                </Link>

                {/* Botón hamburguesa */}
                <button
                    className="hamburger"
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Abrir menú"
                >
                    <span />
                    <span />
                    <span />
                </button>

                <nav className={menuOpen ? "open" : ""}>
                    <ul>
                        <li><Link to="/formulario"> Formulario </Link></li>
                       
                    </ul>
                        <div>
                            <button id="Login" ><Link to="/login"> Login </Link></button>
                            <button id ="SingUp"><Link to="/singup"> Sing Up </Link></button>
                        </div>
                </nav>

            </div>
        </header>
    );
}

export default Header;