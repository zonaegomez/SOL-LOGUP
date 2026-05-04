import { useEffect, useState } from 'react'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../context/AuthContext'
import { Link } from 'react-router-dom'

const ETAPAS = ['embarcadoCreado','posicionamiento','carga','transito','descarga','entregado','provisiones','porFacturar','cobrado']

export default function Dashboard() {
  const { perfil } = useAuth()
  const [stats, setStats] = useState({ total: 0, activos: 0, criticos: 0, porFacturar: 0 })
  const [recientes, setRecientes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const snap = await getDocs(collection(db, 'embarques'))
        const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        const activos = todos.filter(e => !['cobrado','cancelado'].includes(e.etapa))
        const criticos = todos.filter(e => e.prioridad === 'urgente')
        const porFacturar = todos.filter(e => e.etapa === 'porFacturar')
        setStats({ total: todos.length, activos: activos.length, criticos: criticos.length, porFacturar: porFacturar.length })
        setRecientes(todos.slice(0, 5))
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const STAT_CARDS = [
    { label: 'Total embarques', value: stats.total, color: 'text-brand', bg: 'bg-blue-50' },
    { label: 'Activos', value: stats.activos, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Críticos / Urgentes', value: stats.criticos, color: 'text-red-500', bg: 'bg-red-50' },
    { label: 'Por facturar', value: stats.porFacturar, color: 'text-amber-500', bg: 'bg-amber-50' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          Buen día, {perfil?.nombre?.split(' ')[0] || 'usuario'} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Resumen operativo del día</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(s => (
          <div key={s.label} className="card p-4">
            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
              <span className={`text-xl font-bold ${s.color}`}>{loading ? '—' : s.value}</span>
            </div>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-4">Acciones rápidas</h2>
          <div className="space-y-2">
            <Link to="/embarques/nuevo" className="btn-primary w-full justify-center">
              + Nuevo embarque
            </Link>
            <Link to="/operaciones" className="btn-secondary w-full justify-center">
              Ver board de operaciones
            </Link>
            <Link to="/embarques" className="btn-secondary w-full justify-center">
              Buscar embarque
            </Link>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-4">Embarques recientes</h2>
          {loading ? (
            <p className="text-sm text-gray-400">Cargando...</p>
          ) : recientes.length === 0 ? (
            <p className="text-sm text-gray-400">Sin embarques registrados aún.</p>
          ) : (
            <div className="space-y-2">
              {recientes.map(e => (
                <Link key={e.id} to={`/embarques/${e.id}`} className="flex items-center justify-between py-2 border-b border-gray-50 hover:bg-gray-50 px-1 rounded transition-colors">
                  <div>
                    <p className="text-xs font-medium text-gray-800">{e.folio || e.id}</p>
                    <p className="text-[11px] text-gray-400">{e.cliente}</p>
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
