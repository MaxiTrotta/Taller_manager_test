import { useState, useEffect } from 'react';
import {
  Icon2fa,
  IconListCheck,
  IconBellRinging,
  IconDatabaseImport,
  IconFingerprint,
  IconKey,
  IconLogout,
  IconReceipt2,
  IconSettings,
  IconSwitchHorizontal,
  IconChartBar,
  IconCurrencyDollar,
} from '@tabler/icons-react';
import { Code, Group, Text } from '@mantine/core';
import classes from './NavbarSimpleColored.module.css';
import ActionToggle from '../ActionToggle/ActionToggle';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';


const data = [
  { link: '/dashboard', label: 'Dashboard', icon: IconChartBar },
  { link: '/cliente', label: 'Clientes', icon: IconDatabaseImport },
  { link: '/ordenes', label: 'Ordenes De Trabajo', icon: IconReceipt2 },
  { link: '/empleado', label: 'Empleados', icon: IconFingerprint },
  { link: '/usuarios', label: 'Usuarios', icon: IconKey },
  { link: '/tareas', label: 'Tareas', icon: IconListCheck },
  { link: '/presupuesto', label: 'Presupuesto', icon: IconCurrencyDollar },
  { link: '/ordenes_cerradas', label: 'Órdenes Cerradas', icon: IconCurrencyDollar },
  
];
export function NavbarSimpleColored() {
  const navigate = useNavigate();
  const [active, setActive] = useState('Billing');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    // Obtener el nombre del usuario desde localStorage
    const name = localStorage.getItem('userName') || 'Usuario';
    setUserName(name);
  }, []);

  const links = data.map((item) => (

    <Link
      className={classes.link}
      data-active={item.label === active || undefined}
      to={item.link}
      key={item.label}
      onClick={() => setActive(item.label)}
    >
      <item.icon className={classes.linkIcon} stroke={1.5} />
      <span>{item.label}</span>
    </Link>
  ));

  return (
    <nav className={classes.navbar}>
      <div className={classes.navbarMain}>
        <Group className={classes.header} justify="space-between">

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <a href="/dashboard" style={{ display: "flex", justifyContent: "center" }}>
              <img src="/public/Logo.png" alt="Logo Ortiz Hnos" />
            </a>
            <Text 
              size="sm" 
              fw={500} 
              mt="xs"
              style={{ color: 'var(--mantine-color-text)', textAlign: 'center' }}
            >
              Bienvenido, {userName}
            </Text>
          </div> 
          <Code fw={700} className={classes.version}>
            v 1.0
          </Code>
        </Group>
        {links}
      </div>
      <div className={classes.footer}>
        <a href="#" className={classes.link} onClick={(event) => {
          event.preventDefault();
          localStorage.removeItem("token")
          navigate("/login")
        }}>
          <IconLogout className={classes.linkIcon} stroke={1.5} />
          <span>Cerrar sesión</span>
        </a>
        
      </div>
    </nav>
  );
}

export default NavbarSimpleColored;