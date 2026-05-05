import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { ISOLOGO, LOGO_COMPLETO } from '../logos'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'

const NAV = [
  { label: 'Dashboard', icon: '▦', path: '/dashboard', roles: ['admin','ventas','operaciones','pricing'] },
  { label: 'Embarques', icon: '🚛', path: '/embarques', roles: ['admin','ventas','operaciones'] },
  { label: 'Cotizaciones', icon: '📄', path: '/cotizaciones', roles: ['admin','ventas'] },
  { label: 'Operaciones', icon: '📋', path: '/operaciones', roles: ['admin','operaciones'] },
  { label: 'Pricing', icon: '💲', path: '/pricing', roles: ['admin','pricing'] },
  { divider: true, label: 'Administración', roles: ['admin'] },
  { label: 'Usuarios', icon: '👤', path: '/admin/usuarios', roles: ['admin'] },
  { label: 'Catálogos', icon: '📂', path: '/admin/catalogos', roles: ['admin'] },
]

export default function Layout() {
  const { perfil, user } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const rol = perfil?.rol || 'ventas'

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-56'} bg-white border-r border-gray-100 flex flex-col transition-all duration-200 shrink-0`}>
        {/* Logo */}
        <div className="h-14 flex items-center px-3 border-b border-gray-100">
          {collapsed
            ? <img src={ISOLOGO} alt="Log Up" className="w-8 h-8 object-contain mx-auto" />
            : <img src={LOGO_COMPLETO} alt="Log Up" className="h-9 object-contain" />
          }
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV.map((item, i) => {
            if (!item.roles.includes(rol)) return null
            if (item.divider) return (
              <div key={i} className="px-4 pt-4 pb-1">
                {!collapsed && <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">{item.label}</p>}
              </div>
            )
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2 mx-2 rounded-lg text-sm transition-colors ${
                    isActive ? 'bg-brand-light text-brand font-medium' : 'text-gray-600 hover:bg-gray-50'
                  }`
                }
              >
                <span className="text-base w-5 text-center shrink-0">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            )
          })}
        </nav>

        {/* User */}
        <div className="border-t border-gray-100 p-3">
          {!collapsed && (
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-brand-light flex items-center justify-center text-brand text-xs font-semibold">
                {(perfil?.nombre || user?.email || 'U')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{perfil?.nombre || user?.email}</p>
                <p className="text-[10px] text-gray-400 capitalize">{rol}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 text-xs text-gray-500 hover:text-red-500 transition-colors px-1 py-1 rounded"
          >
            <span>⬡</span>
            {!collapsed && 'Cerrar sesión'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
          <button onClick={() => setCollapsed(!collapsed)} className="text-gray-400 hover:text-gray-600">
            ☰
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">v1.0.0</span>
            <div className="w-2 h-2 rounded-full bg-green-400" title="En línea" />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
