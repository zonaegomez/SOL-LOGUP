import { useEffect, useState } from 'react'
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const COLS = [
  { key: 'embarcadoCreado', label: 'Creado', icon: '📋' },
  { key: 'posicionamiento', label: 'Posicionamiento', icon: '📍' },
  { key: 'carga', label: 'Carga', icon: '📦' },
  { key: 'transito', label: 'Tránsito', icon: '🚛' },
  { key: 'descarga', label: 'Descarga', icon: '🏭' },
  { key: 'entregado', label: 'Entregado', icon: '✅' },
  { key: 'provisiones', label: 'Provisiones', icon: '💰' },
  { key: 'porFacturar', label: 'Por facturar', icon: '🧾' },
  { key: 'cobrado', label: 'Cobrado', icon: '💳' },
]

const LIMITES_ETAPA = {
  embarcadoCreado: null, posicionamiento: 4, carga: 6,
  transito: null, descarga: 6, entregado: null,
  provisiones: null, porFacturar: 48, cobrado: null,
}

const DEMO_EMBARQUES = [
  {
    id: 'demo-001', folio: 'DT-2605-44821', cliente: 'Schaeffler Transmission',
    origenNombre: 'Monterrey', destinoNombre: 'CDMX',
    categoria: 'ftl', etapa: 'transito', prioridad: 'urgente',
    fechaCarga: new Date(Date.now() - 6 * 3600000).toISOString(),
    fechaETA: new Date(Date.now() + 8 * 3600000).toISOString(),
    etapaEntradaAt: new Date(Date.now() - 6 * 3600000).toISOString(),
    horasLibresCarga: 6, horasLibresDescarga: 6, distanciaKm: 910, _demo: true
  },
  {
    id: 'demo-002', folio: 'DT-2605-33190', cliente: 'Johnson Controls Ent.',
    origenNombre: 'Saltillo', destinoNombre: 'Querétaro',
    categoria: 'ltl', etapa: 'carga', prioridad: 'normal',
    fechaCarga: new Date(Date.now() - 7 * 3600000).toISOString(),
    fechaETA: new Date(Date.now() + 2 * 3600000).toISOString(),
    etapaEntradaAt: new Date(Date.now() - 7 * 3600000).toISOString(),
    horasLibresCarga: 6, horasLibresDescarga: 6, distanciaKm: 800, _demo: true
  },
  {
    id: 'demo-003', folio: 'DT-2605-71045', cliente: 'Hisense Monterrey',
    origenNombre: 'Monterrey', destinoNombre: 'Guadalajara',
    categoria: 'ftl', etapa: 'posicionamiento', prioridad: 'normal',
    fechaCarga: new Date(Date.now() + 2 * 3600000).toISOString(),
    fechaETA: new Date(Date.now() + 18 * 3600000).toISOString(),
    etapaEntradaAt: new Date(Date.now() - 1 * 3600000).toISOString(),
    horasLibresCarga: 6, horasLibresDescarga: 6, distanciaKm: 690, _demo: true
  },
  {
    id: 'demo-004', folio: 'DT-2605-58302', cliente: 'ALL IN ONE Logistics',
    origenNombre: 'Laredo', destinoNombre: 'CDMX',
    categoria: 'ref', etapa: 'transito', prioridad: 'normal',
    fechaCarga: new Date(Date.now() - 14 * 3600000).toISOString(),
    fechaETA: new Date(Date.now() + 1 * 3600000).toISOString(),
    etapaEntradaAt: new Date(Date.now() - 14 * 3600000).toISOString(),
    horasLibresCarga: 6, horasLibresDescarga: 6, distanciaKm: 1150, _demo: true
  },
  {
    id: 'demo-005', folio: 'DT-2605-92011', cliente: 'Hutchinson Autopartes',
    origenNombre: 'Monterrey', destinoNombre: 'Puebla',
    categoria: 'ftl', etapa: 'descarga', prioridad: 'normal',
    fechaCarga: new Date(Date.now() - 22 * 3600000).toISOString(),
    fechaETA: new Date(Date.now() - 1 * 3600000).toISOString(),
    etapaEntradaAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    horasLibresCarga: 6, horasLibresDescarga: 6, distanciaKm: 1050, _demo: true
  },
  {
    id: 'demo-006', folio: 'DT-2605-10472', cliente: 'Butler de México S.A.',
    origenNombre: 'Guadalajara', destinoNombre: 'CDMX',
    categoria: 'ltl', etapa: 'embarcadoCreado', prioridad: 'normal',
    fechaCarga: new Date(Date.now() + 6 * 3600000).toISOString(),
    fechaETA: new Date(Date.now() + 24 * 3600000).toISOString(),
    etapaEntradaAt: new Date(Date.now() - 0.5 * 3600000).toISOString(),
    horasLibresCarga: 6, horasLibresDescarga: 6, distanciaKm: 540, _demo: true
  },
  {
    id: 'demo-007', folio: 'DT-2605-37841', cliente: 'Alfran USA Corp.',
    origenNombre: 'Monterrey', destinoNombre: 'Laredo',
    categoria: 'int', etapa: 'porFacturar', prioridad: 'normal',
    fechaCarga: new Date(Date.now() - 30 * 3600000).toISOString(),
    fechaETA: new Date(Date.now() - 10 * 3600000).toISOString(),
    etapaEntradaAt: new Date(Date.now() - 10 * 3600000).toISOString(),
    horasLibresCarga: 6, horasLibresDescarga: 6, distanciaKm: 240, _demo: true
  },
]

const TIPO_COLOR = {
  ftl: 'bg-blue-50 text-blue-700', ltl: 'bg-amber-50 text-amber-700',
  int: 'bg-purple-50 text-purple-700', imp: 'bg-purple-50 text-purple-700',
  ref: 'bg-green-50 text-green-700', exp: 'bg-pink-50 text-pink-700',
}
const TIPO_TAG = { ftl: 'FTL', ltl: 'LTL', int: 'INT', imp: 'IMP', ref: 'REF', exp: 'EXP' }
const SEMAFORO_STYLES = {
  red: { dot: 'bg-red-500', text: 'text-red-600', border: 'border-l-red-400' },
  yellow: { dot: 'bg-amber-400', text: 'text-amber-600', border: 'border-l-amber-400' },
  green: { dot: 'bg-green-400', text: 'text-green-600', border: 'border-l-green-300' },
}

function calcularHorasTransito(distanciaKm) {
  return Math.ceil(distanciaKm / 65) + (distanciaKm > 500 ? 2 : 1)
}

function semaforoETA(fechaETA) {
  if (!fechaETA) return null
  const mins = (new Date(fechaETA).getTime() - Date.now()) / 60000
  if (mins < 0) return { color: 'red', texto: `${Math.abs(Math.round(mins / 60))}h vencido` }
  if (mins < 60) return { color: 'red', texto: `${Math.round(mins)}min` }
  if (mins < 180) return { color: 'yellow', texto: `${Math.round(mins / 60)}h restantes` }
  return { color: 'green', texto: `${Math.round(mins / 60)}h restantes` }
}

function semaforoEtapa(etapa, etapaEntradaAt, horasLibresCarga, horasLibresDescarga, distanciaKm) {
  if (!etapaEntradaAt) return null
  let limiteHrs = LIMITES_ETAPA[etapa]
  if (etapa === 'carga') limiteHrs = horasLibresCarga || 6
  if (etapa === 'descarga') limiteHrs = horasLibresDescarga || 6
  if (etapa === 'transito' && distanciaKm) limiteHrs = calcularHorasTransito(distanciaKm)
  if (!limiteHrs) return null
  const horasTrans = (Date.now() - new Date(etapaEntradaAt).getTime()) / 3600000
  const pct = (horasTrans / limiteHrs) * 100
  const restantes = limiteHrs - horasTrans
  if (pct >= 100) return { color: 'red', texto: `+${Math.round(horasTrans - limiteHrs)}h estadía ⚠️`, estadia: true }
  if (pct >= 75) return { color: 'yellow', texto: `${Math.round(restantes * 60)}min libres` }
  return { color: 'green', texto: `${Math.round(restantes)}h libres` }
}

function TarjetaEmbarque({ em, onAvanzar }) {
  const semETA = semaforoETA(em.fechaETA)
  const semEtapa = semaforoEtapa(em.etapa, em.etapaEntradaAt, em.horasLibresCarga, em.horasLibresDescarga, em.distanciaKm)
  const colorDom = semETA?.color === 'red' || semEtapa?.color === 'red' ? 'red'
    : semETA?.color === 'yellow' || semEtapa?.color === 'yellow' ? 'yellow' : 'green'
  const styles = SEMAFORO_STYLES[colorDom]
  const etaTransito = em.etapa === 'transito' && em.distanciaKm ? calcularHorasTransito(em.distanciaKm) : null

  return (
    <Link to={`/embarques/${em.id}`}
      className={`block bg-white rounded-xl border border-gray-100 border-l-4 ${styles.border} p-3 hover:shadow-sm transition-all`}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-mono text-gray-400">{em.folio}</p>
        <div className="flex items-center gap-1">
          {em._demo && <span className="text-[8px] bg-amber-50 text-amber-500 px-1 rounded border border-amber-100">DEMO</span>}
          {em.prioridad === 'urgente' && <span className="text-[8px] bg-red-50 text-red-500 px-1 rounded border border-red-100">URG</span>}
        </div>
      </div>
      <p className="text-xs font-semibold text-gray-800 leading-tight mb-1 truncate">{em.cliente}</p>
      <p className="text-[10px] text-gray-400 mb-2 truncate">{em.origenNombre} → {em.destinoNombre}</p>

      {semETA && (
        <div className="flex items-center gap-1 mb-1">
          <div className={`w-2 h-2 rounded-full shrink-0 ${SEMAFORO_STYLES[semETA.color].dot}`} />
          <span className={`text-[9px] font-medium ${SEMAFORO_STYLES[semETA.color].text}`}>ETA: {semETA.texto}</span>
        </div>
      )}
      {semEtapa && (
        <div className="flex items-center gap-1 mb-2">
          <div className={`w-2 h-2 rounded-full shrink-0 ${SEMAFORO_STYLES[semEtapa.color].dot}`} />
          <span className={`text-[9px] font-medium ${SEMAFORO_STYLES[semEtapa.color].text}`}>{semEtapa.texto}</span>
        </div>
      )}
      {etaTransito && (
        <p className="text-[9px] text-gray-400 mb-2">🚛 ~{etaTransito}h · {em.distanciaKm}km · factor trailer</p>
      )}

      <div className="flex items-center justify-between">
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${TIPO_COLOR[em.categoria] || 'bg-gray-100 text-gray-500'}`}>
          {TIPO_TAG[em.categoria] || '—'}
        </span>
        {!['cobrado', 'entregado'].includes(em.etapa) && !em._demo && (
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAvanzar(em) }}
            className="text-[9px] text-brand hover:bg-blue-50 px-1.5 py-0.5 rounded"
          >→ sig</button>
        )}
      </div>
    </Link>
  )
}

export default function Board() {
  const [embarques, setEmbarques] = useState([])
  const [loading, setLoading] = useState(true)
  const [showDemo, setShowDemo] = useState(true)
  const [filtro, setFiltro] = useState('todos')
  const { perfil, user } = useAuth()

  useEffect(() => { fetchEmbarques() }, [])
  useEffect(() => {
    const t = setInterval(() => setEmbarques(p => [...p]), 60000)
    return () => clearInterval(t)
  }, [])

  const fetchEmbarques = async () => {
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'embarques'))
      setEmbarques(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const avanzarEtapa = async (embarque) => {
    const idx = COLS.findIndex(c => c.key === embarque.etapa)
    if (idx >= COLS.length - 1) return
    const nueva = COLS[idx + 1]
    await updateDoc(doc(db, 'embarques', embarque.id), {
      etapa: nueva.key, etapaEntradaAt: new Date().toISOString(), updatedAt: serverTimestamp()
    })
    await addDoc(collection(db, 'embarques', embarque.id, 'historico'), {
      etapa: nueva.label, usuario: perfil?.nombre || user?.email,
      timestamp: serverTimestamp(), tipo: 'etapa',
    })
    setEmbarques(prev => prev.map(em =>
      em.id === embarque.id ? { ...em, etapa: nueva.key, etapaEntradaAt: new Date().toISOString() } : em
    ))
  }

  const todos = [...embarques, ...(showDemo ? DEMO_EMBARQUES : [])].filter(e => {
    if (filtro === 'urgentes') return e.prioridad === 'urgente'
    if (filtro === 'criticos') return semaforoETA(e.fechaETA)?.color === 'red'
    return true
  })

  const nCriticos = todos.filter(e => semaforoETA(e.fechaETA)?.color === 'red').length
  const nAlertas = todos.filter(e => semaforoETA(e.fechaETA)?.color === 'yellow').length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Operaciones</h1>
          <p className="text-sm text-gray-500">Board de seguimiento en tiempo real</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-lg px-3 py-1.5 text-xs">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block"/>OK</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/>Alerta</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"/>Crítico</span>
          </div>
          {nCriticos > 0 && <span className="bg-red-50 text-red-600 text-xs font-medium px-2 py-1 rounded-lg">🔴 {nCriticos} crítico{nCriticos > 1 ? 's' : ''}</span>}
          {nAlertas > 0 && <span className="bg-amber-50 text-amber-600 text-xs font-medium px-2 py-1 rounded-lg">🟡 {nAlertas} alerta{nAlertas > 1 ? 's' : ''}</span>}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {[{ key: 'todos', label: 'Todos' }, { key: 'urgentes', label: '🔴 Urgentes' }, { key: 'criticos', label: '⚠️ Críticos' }].map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filtro === f.key ? 'bg-brand text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >{f.label}</button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setShowDemo(!showDemo)}
            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${showDemo ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-gray-200 text-gray-500'}`}
          >{showDemo ? '👁 Ocultar demo' : '👁 Ver demo'}</button>
          <button onClick={fetchEmbarques} className="btn-secondary text-xs py-1">↻ Actualizar</button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando embarques...</div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max">
            {COLS.map(col => {
              const cards = todos.filter(e => e.etapa === col.key)
              const criticos = cards.filter(e => semaforoETA(e.fechaETA)?.color === 'red').length
              return (
                <div key={col.key} className="w-52 shrink-0">
                  <div className={`flex items-center justify-between mb-2 px-2 py-1.5 rounded-lg ${criticos > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                    <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">{col.icon} {col.label}</span>
                    <div className="flex items-center gap-1">
                      {criticos > 0 && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                      <span className="text-[10px] bg-white text-gray-500 rounded-full px-1.5 border border-gray-200">{cards.length}</span>
                    </div>
                  </div>
                  <div className="space-y-2 min-h-24">
                    {cards.map(em => <TarjetaEmbarque key={em.id} em={em} onAvanzar={avanzarEtapa} />)}
                    {cards.length === 0 && (
                      <div className="border-2 border-dashed border-gray-100 rounded-xl h-16 flex items-center justify-center">
                        <span className="text-[10px] text-gray-300">vacío</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {showDemo && <p className="text-[11px] text-gray-400 text-center">Embarques DEMO para ilustrar el semáforo — se ocultan con el botón arriba.</p>}
    </div>
  )
}
