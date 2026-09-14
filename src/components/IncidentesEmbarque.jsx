import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, serverTimestamp, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { AlertTriangle, CheckCircle, Clock, Truck, Package, FileText, Plus } from 'lucide-react'

const TIPOS_INCIDENTE = [
  { key: 'falla_mecanica', label: 'Falla mecánica', Icon: Truck, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
  { key: 'accidente', label: 'Accidente vial', Icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
  { key: 'demora_carga', label: 'Demora en carga', Icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  { key: 'demora_descarga', label: 'Demora en descarga', Icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  { key: 'desviacion_temperatura', label: 'Desviación de temperatura', Icon: AlertTriangle, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  { key: 'problema_aduana', label: 'Problema en aduana', Icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
  { key: 'merma', label: 'Merma / Daño en mercancía', Icon: Package, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
  { key: 'robo', label: 'Robo o extravío', Icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
  { key: 'otro', label: 'Otro', Icon: FileText, color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' },
]

const SEVERIDAD = [
  { key: 'baja', label: 'Baja', color: 'bg-green-100 text-green-700' },
  { key: 'media', label: 'Media', color: 'bg-amber-100 text-amber-700' },
  { key: 'alta', label: 'Alta', color: 'bg-red-100 text-red-700' },
  { key: 'critica', label: 'Crítica', color: 'bg-red-600 text-white' },
]

export default function IncidentesEmbarque({ embarqueId, folio }) {
  const { perfil } = useAuth()
  const [incidentes, setIncidentes] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ tipo: '', severidad: 'media', descripcion: '', accion: '', clienteNotificado: false })
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { if (embarqueId) fetchIncidentes() }, [embarqueId])

  const fetchIncidentes = async () => {
    try {
      const snap = await getDocs(query(
        collection(db, 'embarques', embarqueId, 'incidentes'),
        orderBy('creadoEn', 'desc')
      ))
      setIncidentes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch(e) { console.error(e) }
  }

  const guardar = async () => {
    if (!form.tipo || !form.descripcion) return
    setGuardando(true)
    try {
      await addDoc(collection(db, 'embarques', embarqueId, 'incidentes'), {
        ...form,
        folio,
        reportadoPor: perfil?.nombre || '',
        rol: perfil?.rol || '',
        creadoEn: serverTimestamp(),
        resuelto: false,
      })
      setForm({ tipo: '', severidad: 'media', descripcion: '', accion: '', clienteNotificado: false })
      setShowForm(false)
      fetchIncidentes()
    } catch(e) { console.error(e) }
    finally { setGuardando(false) }
  }

  const tienesCriticos = incidentes.some(i => i.severidad === 'critica' || i.severidad === 'alta')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-800">Incidentes en ruta</p>
          {tienesCriticos && (
            <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Incidente crítico
            </span>
          )}
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-secondary text-xs py-1.5 flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Registrar incidente
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="card p-5 border-amber-200 border space-y-3">
          <p className="text-xs font-semibold text-amber-700">Nuevo incidente</p>
          <div>
            <label className="block text-[10px] text-gray-500 mb-1">Tipo de incidente *</label>
            <div className="flex flex-wrap gap-2">
              {TIPOS_INCIDENTE.map(t => {
                const TIcon = t.Icon
                return (
                  <button key={t.key} onClick={() => setForm(f => ({...f, tipo: t.key}))}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border-2 transition-all ${form.tipo === t.key ? `border-current ${t.bg} ${t.color}` : 'border-gray-100 text-gray-500'}`}>
                    <TIcon className="w-3.5 h-3.5" /> {t.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 mb-1">Severidad *</label>
            <div className="flex gap-2">
              {SEVERIDAD.map(s => (
                <button key={s.key} onClick={() => setForm(f => ({...f, severidad: s.key}))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${form.severidad === s.key ? `${s.color} border-current` : 'border-gray-100 text-gray-500'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 mb-1">Descripción del incidente *</label>
            <textarea className="input resize-none text-xs" rows={3}
              placeholder="Describe qué pasó, dónde, a qué hora..."
              value={form.descripcion} onChange={e => setForm(f => ({...f, descripcion: e.target.value}))} />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 mb-1">Acción tomada</label>
            <input className="input text-xs" placeholder="Qué se hizo para resolver o mitigar..."
              value={form.accion} onChange={e => setForm(f => ({...f, accion: e.target.value}))} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.clienteNotificado}
              onChange={e => setForm(f => ({...f, clienteNotificado: e.target.checked}))}
              className="w-4 h-4 accent-brand" />
            <span className="text-xs text-gray-600">Cliente notificado del incidente</span>
          </label>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 btn-secondary text-xs py-1.5">Cancelar</button>
            <button onClick={guardar} disabled={!form.tipo || !form.descripcion || guardando}
              className="flex-1 btn-primary text-xs py-1.5 justify-center disabled:opacity-40">
              {guardando ? 'Guardando...' : 'Registrar incidente'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de incidentes */}
      {incidentes.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Sin incidentes registrados</p>
          <p className="text-xs text-gray-400">Operación limpia</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidentes.map(inc => {
            const tipoInfo = TIPOS_INCIDENTE.find(t => t.key === inc.tipo) || TIPOS_INCIDENTE[8]
            const sevInfo = SEVERIDAD.find(s => s.key === inc.severidad) || SEVERIDAD[1]
            const TIcon = tipoInfo.Icon
            return (
              <div key={inc.id} className={`rounded-xl border p-4 ${tipoInfo.bg}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <TIcon className={`w-4 h-4 ${tipoInfo.color} shrink-0`} />
                    <p className={`text-xs font-semibold ${tipoInfo.color}`}>{tipoInfo.label}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${sevInfo.color}`}>{sevInfo.label}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 shrink-0">
                    {inc.creadoEn?.toDate?.()?.toLocaleString('es-MX', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) || ''}
                  </p>
                </div>
                <p className="text-xs text-gray-700 mb-1">{inc.descripcion}</p>
                {inc.accion && <p className="text-[10px] text-gray-500">Acción: {inc.accion}</p>}
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[10px] text-gray-400">Reportado por: {inc.reportadoPor}</p>
                  {inc.clienteNotificado && (
                    <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Cliente notificado</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
