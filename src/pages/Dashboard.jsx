import { useEffect, useState } from 'react'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'

const DIAS_SEMANA = ['Vi', 'Sa', 'Do', 'Lu', 'Ma', 'Mi', 'Ju']

// Obtiene el viernes más reciente (inicio de semana Log Up)
function getInicioSemana() {
  const hoy = new Date()
  const dia = hoy.getDay() // 0=Dom, 1=Lun, ..., 5=Vi, 6=Sa
  const diasDesdeViernes = (dia + 2) % 7 // dias desde el viernes anterior
  const viernes = new Date(hoy)
  viernes.setDate(hoy.getDate() - diasDesdeViernes)
  viernes.setHours(0, 0, 0, 0)
  return viernes
}

function getDiasSemana() {
  const inicio = getInicioSemana()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(inicio)
    d.setDate(inicio.getDate() + i)
    return d
  })
}

// Dashboard VENTAS
function DashboardVentas({ perfil }) {
  const dias = getDiasSemana()
  const hoy = new Date()

  // Datos demo de la semana actual basados en la pizarrón
  const datosDemo = [13000, 8000, 0, 22969, 21780, 6500, 0]
  const viajesDemo = [3, 2, 0, 3, 5, 2, 0]
  const META_SEMANAL = 190729
  const META_DIARIA = 27247

  const totalSemana = datosDemo.reduce((a, b) => a + b, 0)
  const totalViajes = viajesDemo.reduce((a, b) => a + b, 0)
  const diasTranscurridos = dias.filter(d => d <= hoy).length
  const proyeccionDiaria = diasTranscurridos > 0 ? totalSemana / diasTranscurridos : 0
  const proyeccionSemanal = proyeccionDiaria * 7
  const pctMeta = Math.min((totalSemana / META_SEMANAL) * 100, 100)
  const faltaMeta = Math.max(META_SEMANAL - totalSemana, 0)

  const fmt = (n) => '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0 })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Buen día, {perfil?.nombre?.split(' ')[0] || 'vendedor'} 👋
          </h1>
          <p className="text-sm text-gray-500">
            Semana del {dias[0].toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} al {dias[6].toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <Link to="/embarques/nuevo" className="btn-primary">+ Nuevo embarque</Link>
      </div>

      {/* Tabla semanal tipo pizarrón */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-gray-700">Resumen semanal — Logística</p>
          <span className="text-xs text-gray-400">Semana Vi→Ju</span>
        </div>

        {/* Días */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <td className="text-xs text-gray-400 w-20 pb-2"></td>
                {dias.map((d, i) => (
                  <td key={i} className={`text-center pb-2 ${d.toDateString() === hoy.toDateString() ? 'text-brand font-bold' : 'text-gray-500'}`}>
                    <div className="text-xs font-semibold">{DIAS_SEMANA[i]}</div>
                    <div className="text-[10px] text-gray-400">{d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</div>
                  </td>
                ))}
                <td className="text-center pb-2 text-xs font-bold text-gray-700">Total</td>
              </tr>
            </thead>
            <tbody>
              {/* Ingresos */}
              <tr>
                <td className="text-xs text-gray-500 py-2 font-medium">Ingresos</td>
                {datosDemo.map((v, i) => (
                  <td key={i} className={`text-center py-1 px-1`}>
                    <div className={`rounded-lg py-2 text-xs font-bold ${
                      dias[i] > hoy ? 'bg-gray-50 text-gray-300' :
                      v === 0 ? 'bg-gray-50 text-gray-300' :
                      v >= META_DIARIA ? 'bg-green-50 text-green-700' :
                      v >= META_DIARIA * 0.7 ? 'bg-amber-50 text-amber-700' :
                      'bg-red-50 text-red-600'
                    }`}>
                      {v > 0 ? fmt(v) : '—'}
                    </div>
                  </td>
                ))}
                <td className="text-center">
                  <div className="bg-brand text-white rounded-lg py-2 text-xs font-bold">{fmt(totalSemana)}</div>
                </td>
              </tr>
              {/* Viajes */}
              <tr>
                <td className="text-xs text-gray-500 py-2 font-medium">Viajes</td>
                {viajesDemo.map((v, i) => (
                  <td key={i} className="text-center py-1 px-1">
                    <div className={`rounded-lg py-2 text-sm font-bold ${
                      dias[i] > hoy ? 'bg-gray-50 text-gray-300' :
                      v === 0 ? 'bg-gray-50 text-gray-300' :
                      'bg-blue-50 text-brand'
                    }`}>
                      {dias[i] > hoy ? '—' : v === 0 ? '—' : v}
                    </div>
                  </td>
                ))}
                <td className="text-center">
                  <div className="bg-blue-100 text-brand rounded-lg py-2 text-sm font-bold">{totalViajes}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-400 mb-1">Proyección diaria</p>
          <p className="text-lg font-bold text-gray-800">{fmt(proyeccionDiaria)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Meta: {fmt(META_DIARIA)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-400 mb-1">Proyección semanal</p>
          <p className="text-lg font-bold text-gray-800">{fmt(proyeccionSemanal)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Meta: {fmt(META_SEMANAL)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-400 mb-1">Avance vs meta</p>
          <p className={`text-lg font-bold ${pctMeta >= 100 ? 'text-green-600' : pctMeta >= 70 ? 'text-amber-500' : 'text-red-500'}`}>
            {pctMeta.toFixed(1)}%
          </p>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1.5">
            <div className={`h-1.5 rounded-full ${pctMeta >= 100 ? 'bg-green-500' : pctMeta >= 70 ? 'bg-amber-400' : 'bg-red-400'}`}
              style={{ width: `${pctMeta}%` }} />
          </div>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-400 mb-1">Falta para meta</p>
          <p className={`text-lg font-bold ${faltaMeta === 0 ? 'text-green-600' : 'text-red-500'}`}>
            {faltaMeta === 0 ? '✅ Meta lograda' : fmt(faltaMeta)}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">{totalViajes} viajes esta semana</p>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Acciones rápidas</h2>
          <div className="space-y-2">
            <Link to="/embarques/nuevo" className="btn-primary w-full justify-center">+ Nuevo embarque</Link>
            <Link to="/embarques" className="btn-secondary w-full justify-center">Ver mis embarques</Link>
            <Link to="/pricing" className="btn-secondary w-full justify-center">Ver disponibilidad de unidades</Link>
          </div>
        </div>
        <div className="card p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Esta semana</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm py-1 border-b border-gray-50">
              <span className="text-gray-500">Mejor día</span>
              <span className="font-medium text-gray-800">Lu {fmt(22969)}</span>
            </div>
            <div className="flex justify-between text-sm py-1 border-b border-gray-50">
              <span className="text-gray-500">Promedio por viaje</span>
              <span className="font-medium text-gray-800">{totalViajes > 0 ? fmt(totalSemana / totalViajes) : '—'}</span>
            </div>
            <div className="flex justify-between text-sm py-1 border-b border-gray-50">
              <span className="text-gray-500">Días restantes</span>
              <span className="font-medium text-gray-800">{7 - diasTranscurridos} días</span>
            </div>
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-500">Necesitas por día</span>
              <span className={`font-bold ${faltaMeta / Math.max(7 - diasTranscurridos, 1) > META_DIARIA ? 'text-red-500' : 'text-green-600'}`}>
                {7 - diasTranscurridos > 0 ? fmt(faltaMeta / (7 - diasTranscurridos)) : '✅'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Dashboard ADMIN/DUEÑO
function DashboardAdmin({ perfil }) {
  const dias = getDiasSemana()
  const hoy = new Date()
  const fmt = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })

  const [stats, setStats] = useState({ total: 0, activos: 0, criticos: 0, porFacturar: 0 })
  const [recientes, setRecientes] = useState([])

  useEffect(() => {
    const fetch = async () => {
      try {
        const snap = await getDocs(collection(db, 'embarques'))
        const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        setStats({
          total: todos.length,
          activos: todos.filter(e => !['cobrado', 'cancelado'].includes(e.etapa)).length,
          criticos: todos.filter(e => e.prioridad === 'urgente').length,
          porFacturar: todos.filter(e => e.etapa === 'porFacturar').length,
        })
        setRecientes(todos.slice(0, 5))
      } catch (e) { console.error(e) }
    }
    fetch()
  }, [])

  // Datos semana demo
  const ingresosSemana = [13000, 8000, 0, 22969, 21780, 6500, 0]
  const viajesSemana = [3, 2, 0, 3, 5, 2, 0]
  const META_SEMANAL = 190729
  const totalSemana = ingresosSemana.reduce((a, b) => a + b, 0)
  const totalViajes = viajesSemana.reduce((a, b) => a + b, 0)
  const pctMeta = Math.min((totalSemana / META_SEMANAL) * 100, 100)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Buen día, {perfil?.nombre?.split(' ')[0] || 'Admin'} 👋</h1>
        <p className="text-sm text-gray-500">Resumen ejecutivo · {hoy.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ingresos semana', value: fmt(totalSemana), sub: `Meta: ${fmt(META_SEMANAL)}`, color: 'text-brand', bg: 'bg-blue-50' },
          { label: 'Viajes semana', value: totalViajes, sub: 'Logística tercerizada', color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Avance meta', value: `${pctMeta.toFixed(1)}%`, sub: `Faltan ${fmt(Math.max(META_SEMANAL - totalSemana, 0))}`, color: pctMeta >= 70 ? 'text-amber-500' : 'text-red-500', bg: 'bg-amber-50' },
          { label: 'Por facturar', value: stats.porFacturar, sub: 'embarques pendientes', color: 'text-amber-500', bg: 'bg-amber-50' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
              <span className={`text-lg font-bold ${s.color}`}>{s.value}</span>
            </div>
            <p className="text-xs font-medium text-gray-700">{s.label}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabla semanal compacta */}
      <div className="card p-5">
        <p className="text-sm font-semibold text-gray-700 mb-4">Semana actual — Logística</p>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <td className="text-xs text-gray-400 w-20 pb-2"></td>
                {dias.map((d, i) => (
                  <td key={i} className={`text-center pb-2 text-xs ${d.toDateString() === hoy.toDateString() ? 'text-brand font-bold' : 'text-gray-500'}`}>
                    <div className="font-semibold">{DIAS_SEMANA[i]}</div>
                    <div className="text-[10px] text-gray-400">{d.getDate()}</div>
                  </td>
                ))}
                <td className="text-center pb-2 text-xs font-bold text-gray-700">Total</td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-xs text-gray-500 py-1.5">Ingresos</td>
                {ingresosSemana.map((v, i) => (
                  <td key={i} className="text-center py-1 px-0.5">
                    <div className={`rounded py-1.5 text-[10px] font-bold ${v > 0 ? 'bg-blue-50 text-brand' : 'bg-gray-50 text-gray-300'}`}>
                      {v > 0 ? fmt(v) : '—'}
                    </div>
                  </td>
                ))}
                <td className="text-center"><div className="bg-brand text-white rounded py-1.5 text-[10px] font-bold">{fmt(totalSemana)}</div></td>
              </tr>
              <tr>
                <td className="text-xs text-gray-500 py-1.5">Viajes</td>
                {viajesSemana.map((v, i) => (
                  <td key={i} className="text-center py-1 px-0.5">
                    <div className={`rounded py-1.5 text-xs font-bold ${v > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-300'}`}>
                      {v > 0 ? v : '—'}
                    </div>
                  </td>
                ))}
                <td className="text-center"><div className="bg-green-100 text-green-700 rounded py-1.5 text-xs font-bold">{totalViajes}</div></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Embarques + accesos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Estado de operaciones</h2>
          <div className="space-y-2">
            {[
              { label: 'Total embarques', val: stats.total, color: 'text-brand' },
              { label: 'Activos', val: stats.activos, color: 'text-green-600' },
              { label: 'Críticos / Urgentes', val: stats.criticos, color: 'text-red-500' },
              { label: 'Por facturar', val: stats.porFacturar, color: 'text-amber-500' },
            ].map(s => (
              <div key={s.label} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-xs text-gray-500">{s.label}</span>
                <span className={`text-sm font-bold ${s.color}`}>{s.val}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-2">
            <Link to="/operaciones" className="btn-secondary w-full justify-center text-xs">Ver board de operaciones</Link>
            <Link to="/embarques" className="btn-secondary w-full justify-center text-xs">Ver todos los embarques</Link>
          </div>
        </div>
        <div className="card p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Embarques recientes</h2>
          {recientes.length === 0 ? (
            <p className="text-sm text-gray-400">Sin embarques registrados.</p>
          ) : (
            <div className="space-y-2">
              {recientes.map(e => (
                <Link key={e.id} to={`/embarques/${e.id}`} className="flex items-center justify-between py-1.5 border-b border-gray-50 hover:bg-gray-50 px-1 rounded transition-colors">
                  <div>
                    <p className="text-xs font-medium text-gray-800">{e.folio || e.id.slice(0, 10)}</p>
                    <p className="text-[10px] text-gray-400">{e.cliente}</p>
                  </div>
                  <span className="text-[10px] bg-blue-50 text-brand px-2 py-0.5 rounded-full capitalize">{e.etapa}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Dashboard OPERACIONES
function DashboardOperaciones({ perfil }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Buen día, {perfil?.nombre?.split(' ')[0] || 'usuario'} 👋</h1>
        <p className="text-sm text-gray-500">Resumen operativo</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Acciones rápidas</h2>
          <div className="space-y-2">
            <Link to="/operaciones" className="btn-primary w-full justify-center">Ver board de operaciones</Link>
            <Link to="/embarques" className="btn-secondary w-full justify-center">Buscar embarque</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// Dashboard PRICING
function DashboardPricing({ perfil }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Buen día, {perfil?.nombre?.split(' ')[0] || 'usuario'} 👋</h1>
        <p className="text-sm text-gray-500">Resumen de pricing</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Acciones rápidas</h2>
          <div className="space-y-2">
            <Link to="/pricing" className="btn-primary w-full justify-center">Ver disponibilidad de unidades</Link>
            <Link to="/pricing" className="btn-secondary w-full justify-center">Cotizador interno</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// MAIN
export default function Dashboard() {
  const { perfil } = useAuth()
  const rol = perfil?.rol || 'ventas'

  if (rol === 'ventas') return <DashboardVentas perfil={perfil} />
  if (rol === 'admin') return <DashboardAdmin perfil={perfil} />
  if (rol === 'operaciones') return <DashboardOperaciones perfil={perfil} />
  if (rol === 'pricing') return <DashboardPricing perfil={perfil} />
  return <DashboardAdmin perfil={perfil} />
}
