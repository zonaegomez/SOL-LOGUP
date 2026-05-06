import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { ISOLOGO, LOGO_COMPLETO } from '../logos'
import { signOut } from 'firebase/auth'
import { auth, db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { LayoutDashboard, Truck, FileText, ClipboardList, DollarSign, Users, Building2, FolderOpen, Upload, CheckSquare, BarChart2 } from 'lucide-react'

const NAV = [
  { label: 'Dashboard',        Icon: LayoutDashboard, path: '/dashboard',                roles: ['admin','ventas','operaciones','pricing','gerente','maestro'] },
  { label: 'Embarques',        Icon: Truck,           path: '/embarques',                roles: ['admin','ventas','operaciones','maestro'] },
  { label: 'Cotizaciones',     Icon: FileText,        path: '/cotizaciones',             roles: ['admin','ventas','maestro'] },
  { label: 'Operaciones',      Icon: ClipboardList,   path: '/operaciones',              roles: ['admin','operaciones','maestro'] },
  { label: 'Pricing',          Icon: DollarSign,      path: '/pricing',                  roles: ['admin','pricing','maestro'] },
  { divider: true, label: 'Gerencia', roles: ['gerente','maestro'] },
  { label: 'Autorizaciones',   Icon: CheckSquare,     path: '/gerencia/autorizaciones',  roles: ['gerente','maestro'], badge: true },
  { label: 'Reportes',         Icon: BarChart2,       path: '/gerencia/reportes',        roles: ['gerente','maestro'] },
  { divider: true, label: 'Administración', roles: ['admin','maestro'] },
  { label: 'Usuarios',         Icon: Users,           path: '/admin/usuarios',           roles: ['admin','maestro'] },
  { label: 'Clientes',         Icon: Building2,       path: '/admin/clientes',           roles: ['admin','maestro'] },
  { label: 'Catálogos',        Icon: FolderOpen,      path: '/admin/catalogos',          roles: ['admin','maestro'] },
  { label: 'Importar maestro', Icon: Upload,          path: '/admin/importar',           roles: ['admin','maestro'] },
]

export default function Layout() {
  const { perfil, user, esMaestro } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [autPendientes, setAutPendientes] = useState(0)
  const rol = perfil?.rol || 'ventas'

  // Cargar autorizaciones pendientes para gerente/maestro
  useEffect(() => {
    if (!['gerente','maestro'].includes(rol)) return
    const fetchPendientes = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'autorizaciones'), where('estado', '==', 'pendiente')))
        setAutPendientes(snap.docs.length)
      } catch(e) {}
    }
    fetchPendientes()
    const interval = setInterval(fetchPendientes, 30000)
    return () => clearInterval(interval)
  }, [rol])

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
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
            const hasBadge = item.badge && autPendientes > 0
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
                <span className="w-5 flex items-center justify-center shrink-0 relative">
                  {item.Icon && <item.Icon className="w-4 h-4" />}
                  {hasBadge && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                      {autPendientes > 9 ? '9+' : autPendientes}
                    </span>
                  )}
                </span>
                {!collapsed && (
                  <span className="flex-1 flex items-center justify-between">
                    {item.label}
                    {hasBadge && (
                      <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        {autPendientes}
                      </span>
                    )}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* User */}
        <div className="border-t border-gray-100 p-3">
          {!collapsed && (
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                esMaestro ? 'bg-purple-100 text-purple-700' : 'bg-brand-light text-brand'
              }`}>
                {(perfil?.nombre || user?.email || 'U')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{perfil?.nombre || user?.email}</p>
                <p className={`text-[10px] capitalize ${esMaestro ? 'text-purple-500 font-medium' : 'text-gray-400'}`}>
                  {esMaestro ? '⚡ Maestro' : rol}
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-1">
            <button onClick={() => setCollapsed(!collapsed)} className="flex-1 text-[10px] text-gray-400 hover:text-gray-600 py-1 text-left px-1">
              {collapsed ? '→' : '← Colapsar'}
            </button>
            <button onClick={handleLogout} className="text-[10px] text-gray-400 hover:text-red-500 py-1 px-1">
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-white">
          <div />
          <span className="text-xs text-gray-400">v1.0.0 <span className="inline-block w-2 h-2 rounded-full bg-green-400 ml-1" /></span>
        </div>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
