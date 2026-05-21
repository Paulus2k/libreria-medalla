import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingCart, Archive, LogOut, BookOpen, Truck, Users, ShoppingBag } from 'lucide-react'
import { useAuth } from '../context/useAuth'

const links = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/productos',   icon: Package,          label: 'Productos' },
  { to: '/ventas',      icon: ShoppingCart,     label: 'Ventas' },
  { to: '/inventario',  icon: Archive,          label: 'Inventario' },
  { to: '/clientes',    icon: Users,            label: 'Clientes' },
  { to: '/proveedores', icon: Truck,            label: 'Proveedores' },
  { to: '/compras',     icon: ShoppingBag,      label: 'Lista de compras' },
]

export default function Sidebar() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const initiales = usuario?.nombre
    ? usuario.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : usuario?.email?.[0]?.toUpperCase() || 'U'

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-icon">
          <BookOpen size={22} color="var(--gold-light)" />
        </span>
        <h1>Librería Medalla<br />Milagrosa</h1>
        <p>Sistema de gestión</p>
      </div>

      <nav className="sidebar-nav">
        <span className="nav-section-label">Navegación</span>
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initiales}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">
              {usuario?.nombre || usuario?.email || 'Usuario'}
            </div>
            <div className="sidebar-user-role">
              {usuario?.rol || 'empleado'}
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout} title="Cerrar sesión">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}