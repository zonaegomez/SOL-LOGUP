import { useEffect, useState } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../../firebase'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const TIPO_TAG = { ftl: 'FTL', ltl: 'LTL', int: 'Internacional', ref: 'Refrigerado', exp: 'Exportación' }
const TIPO_COLOR = {
  ftl: 'bg-blue-50 text-blue-700',
  ltl: 'bg-amber-50 text-amber-700',
  int: 'bg-purple-50 text-purple-700',
  ref: 'bg-green-50 text-green-700',
  exp: 'bg-pink-50 text-pink-700',
}

export default function Embarques() {
  const [embarques, setEmbarques] = useState([])
  const [filtrados, setFiltrados] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('activos')

  useEffect(() => {
    const hoy = new Date()
    const hace30 = new Date(hoy); hace30.setDate(hace30.getDate() - 30)
    setFechaInicio(hace30.toISOString().split('T')[0])
    setFechaFin(hoy.toISOString().split('T')[0])
    fetchEmbarques()
  }, [])

  const fetchEmbarques = async () => {
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'embarques'))
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setEmbarques(data)
      setFiltrados(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const buscar = () => {
    let res = embarques
    if (tab === 'activos') res = res.filter(e => e.etapa !== 'cancelado')
    else res = res.filter(e => e.etapa === 'cancelado')
    if (busqueda) {
      const b = busqueda.toLowerCase()
      res = res.filter(e =>
        e.folio?.toLowerCase().includes(b) ||
        e.cliente?.toLowerCase().includes(b) ||
        e.origen?.toLowerCase().includes(b) ||
        e.destino?.toLowerCase().includes(b)
      )
    }
    setFiltrados(res)
  }

  useEffect(() => { buscar() }, [busqueda, tab, embarques])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Embarques</h1>
          <p className="text-sm text-gray-500">Gestión y seguimiento de embarques</p>
        </div>
        <Link to="/embarques/nuevo" className="btn-primary">
          + Agregar
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {['activos', 'eliminados'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-brand text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >{t}</button>
        ))}
      </div>

      {/* Filtros fecha */}
      <div className="card p-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Embarques</p>
        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex flex-col gap-1 flex-1 min-w-32">
            <label className="text-xs text-gray-500">Fecha inicio</label>
            <input type="date" className="input" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-32">
            <label className="text-xs text-gray-500">Fecha final</label>
            <input type="date" className="input" value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
          </div>
          <button onClick={buscar} className="btn-primary">
            🔍 Buscar
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              className="input pl-8"
              placeholder="Buscar por folio, cliente, origen, destino..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          </div>
          <button onClick={fetchEmbarques} className="btn-secondary p-2" title="Actualizar">↻</button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Cargando embarques...</div>
        ) : filtrados.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">📦</p>
            <p className="font-medium">Sin embarques</p>
            <p className="text-sm mt-1">No hay embarques que coincidan con los filtros.</p>
            <Link to="/embarques/nuevo" className="btn-primary mt-4 inline-flex">+ Crear primer embarque</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  {['Folio','Origen','Destino','Categoría','Cliente','Etapa','Fecha',''].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrados.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-brand font-medium">{e.folio || e.id.slice(0,12)}</td>
                    <td className="px-4 py-3 text-gray-700">{e.origen || '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{e.destino || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${TIPO_COLOR[e.tipo] || 'bg-gray-100 text-gray-600'}`}>
                        {TIPO_TAG[e.tipo] || e.tipo || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-32 truncate">{e.cliente || '—'}</td>
                    <td className="px-4 py-3 capitalize text-gray-600 text-xs">{e.etapa || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {e.fechaCarga ? format(new Date(e.fechaCarga), 'dd MMM yyyy', { locale: es }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/embarques/${e.id}`} className="text-brand hover:underline text-xs font-medium">
                        Ver →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>Mostrando {filtrados.length} embarques</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
