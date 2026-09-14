import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../firebase'
import { Link } from 'react-router-dom'
import { Clock, CheckCircle, AlertTriangle, Truck, DollarSign } from 'lucide-react'

const fmt = (n) => '$' + Number(n||0).toLocaleString('es-MX', {minimumFractionDigits:0})

function horasRestantes(fechaETA) {
  if (!fechaETA) return null
  const eta = new Date(fechaETA)
  const ahora = new Date()
  const diff = (eta - ahora) / (1000 * 60 * 60)
  return diff
}

function semaforo(horas) {
  if (horas === null) return 'gray'
  if (horas < 0) return 'red'
  if (horas < 2) return 'red'
  if (horas < 6) return 'amber'
  return 'green'
}

const COLOR = {
  red: 'bg-red-500',
  amber: 'bg-amber-400',
  green: 'bg-green-500',
  gray: 'bg-gray-300',
}

export default function EntregasDelDia() {
  const [embarques, setEmbarques] = useState([])
  const [creditosVencidos, setCreditosVencidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('hoy') // hoy | manana | semana

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'embarques'))
      const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }))

      const hoy = new Date(); hoy.setHours(0,0,0,0)
      const manana = new Date(hoy); manana.setDate(manana.getDate() + 1)
      const pasadoManana = new Date(hoy); pasadoManana.setDate(pasadoManana.getDate() + 7)

      // Embarques activos con ETA
      const activos = todos.filter(e => !['cobrado','cancelado'].includes(e.etapa) && e.fechaETA)
      setEmbarques(activos.sort((a,b) => new Date(a.fechaETA) - new Date(b.fechaETA)))

      // Créditos próximos a vencer (cliente y proveedor)
      const alertas = []
      todos.forEach(e => {
        if (e.fechaETA && e.diasCredito) {
          const vence = new Date(e.fechaETA)
          vence.setDate(vence.getDate() + Number(e.diasCredito))
          const diasRestantes = Math.ceil((vence - new Date()) / (1000*60*60*24))
          if (diasRestantes >= 0 && diasRestantes <= 5) {
            alertas.push({ ...e, tipo: 'cliente', diasRestantes, fechaVencimiento: vence })
          }
        }
        if (e.fechaETA && e.diasCreditoProveedor) {
          const vence = new Date(e.fechaETA)
          vence.setDate(vence.getDate() + Number(e.diasCreditoProveedor))
          const diasRestantes = Math.ceil((vence - new Date()) / (1000*60*60*24))
          if (diasRestantes >= 0 && diasRestantes <= 5) {
            alertas.push({ ...e, tipo: 'proveedor', diasRestantes, fechaVencimiento: vence })
          }
        }
      })
      setCreditosVencidos(alertas.sort((a,b) => a.diasRestantes - b.diasRestantes))
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const hoy = new Date(); hoy.setHours(0,0,0,0)
  const manana = new Date(hoy); manana.setDate(manana.getDate() + 1)
  const pasadoManana = new Date(hoy); pasadoManana.setDate(pasadoManana.getDate() + 2)
  const semana = new Date(hoy); semana.setDate(semana.getDate() + 7)

  const filtrados = embarques.filter(e => {
    const eta = new Date(e.fechaETA)
    if (filtro === 'hoy') return eta >= hoy && eta < manana
    if (filtro === 'manana') return eta >= manana && eta < pasadoManana
    return eta >= hoy && eta < semana
  })

  const etiquetaETA = (fechaETA) => {
    const horas = horasRestantes(fechaETA)
    if (horas === null) return '—'
    if (horas < 0) return `${Math.abs(Math.round(horas))}h vencido`
    if (horas < 1) return `${Math.round(horas * 60)}min`
    return `${Math.round(horas)}h restantes`
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Entregas del día</h1>
        <p className="text-sm text-gray-400">Vista operativa ordenada por ETA</p>
      </div>

      {/* Alertas de crédito */}
      {creditosVencidos.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-red-700 flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> {creditosVencidos.length} crédito(s) próximos a vencer
          </p>
          {creditosVencidos.map((c, i) => (
            <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-red-100">
              <div>
                <p className="text-xs font-medium text-gray-800">{c.folio} — {c.cliente}</p>
                <p className="text-[10px] text-gray-500">
                  {c.tipo === 'cliente' ? 'Cobro al cliente' : 'Pago al proveedor'} · {c.fechaVencimiento.toLocaleDateString('es-MX')}
                </p>
              </div>
              <div className="text-right">
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${c.diasRestantes === 0 ? 'bg-red-600 text-white' : c.diasRestantes <= 2 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  {c.diasRestantes === 0 ? 'HOY' : `${c.diasRestantes} días`}
                </span>
                <p className="text-[10px] text-gray-400 mt-0.5">{c.tipo === 'cliente' ? fmt(c.tarifa_cliente) : fmt(c.costo_proveedor || c.costo_flete)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {[
            { key:'hoy', label:'Hoy' },
            { key:'manana', label:'Mañana' },
            { key:'semana', label:'Esta semana' },
          ].map(f => (
            <button key={f.key} onClick={() => setFiltro(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filtro===f.key?'bg-white shadow-sm text-gray-900':'text-gray-500'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400">{filtrados.length} embarques</p>
      </div>

      {/* Lista ordenada por ETA */}
      {loading ? (
        <div className="card p-8 text-center text-gray-400">Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div className="card p-10 text-center">
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Sin entregas programadas para este período</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map(e => {
            const horas = horasRestantes(e.fechaETA)
            const sColor = semaforo(horas)
            const eta = new Date(e.fechaETA)
            return (
              <Link key={e.id} to={`/embarques/${e.id}`}
                className="card p-4 flex items-center gap-4 hover:border-brand border border-transparent transition-all">
                {/* Semáforo */}
                <div className={`w-3 h-3 rounded-full shrink-0 ${COLOR[sColor]}`} />

                {/* Hora ETA */}
                <div className="text-center shrink-0 w-16">
                  <p className="text-sm font-bold text-gray-800">
                    {eta.toLocaleTimeString('es-MX', {hour:'2-digit', minute:'2-digit'})}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {eta.toLocaleDateString('es-MX', {day:'numeric', month:'short'})}
                  </p>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-mono text-gray-400">{e.folio}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      e.etapa === 'transito' ? 'bg-blue-50 text-brand' :
                      e.etapa === 'carga' ? 'bg-amber-50 text-amber-700' :
                      e.etapa === 'descarga' ? 'bg-orange-50 text-orange-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>{e.etapa}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 truncate">{e.cliente}</p>
                  <p className="text-xs text-gray-500">{e.origenNombre} → {e.destinoNombre}</p>
                </div>

                {/* ETA restante */}
                <div className="text-right shrink-0">
                  <p className={`text-xs font-bold ${sColor === 'red' ? 'text-red-600' : sColor === 'amber' ? 'text-amber-600' : 'text-green-600'}`}>
                    {etiquetaETA(e.fechaETA)}
                  </p>
                  {e.cp_temp && <p className="text-[10px] text-blue-600 font-medium">{e.cp_temp}</p>}
                  {e.op_tel && (
                    <a href={`tel:${e.op_tel}`} className="text-[10px] text-gray-400 hover:text-brand flex items-center justify-end gap-1 mt-0.5" onClick={ev => ev.stopPropagation()}>
                      {e.op_nombre || 'Operador'}
                    </a>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
