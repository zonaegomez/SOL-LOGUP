import { useState, useEffect } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { TIPOS_SERVICIO } from '../data/tiposServicio'
import { CheckCircle, Circle, ChevronDown, ChevronRight, AlertTriangle, Thermometer } from 'lucide-react'

export default function ChecklistEmbarque({ embarqueId, tipoServicio, temperatura, checklistGuardado }) {
  const tipo = TIPOS_SERVICIO[tipoServicio?.toUpperCase()] || TIPOS_SERVICIO['SECO']
  const [checks, setChecks] = useState(checklistGuardado || {})
  const [expandido, setExpandido] = useState({ unidad: true, operador: false, documentos: false, cliente: false })
  const [tempCarga, setTempCarga] = useState('')
  const [tempDescarga, setTempDescarga] = useState('')
  const [desviacion, setDesviacion] = useState('')
  const [guardando, setGuardando] = useState(false)

  // Persistir checks en Firestore automáticamente
  const toggleCheck = async (categoria, idx) => {
    const key = `${categoria}-${idx}`
    const nuevos = { ...checks, [key]: !checks[key] }
    setChecks(nuevos)
    if (!embarqueId) return
    try {
      await updateDoc(doc(db, 'embarques', embarqueId), {
        checklist: nuevos,
        checklistUpdated: serverTimestamp(),
      })
    } catch(e) { console.error(e) }
  }

  // Guardar temperaturas
  const guardarTemperaturas = async () => {
    if (!embarqueId) return
    setGuardando(true)
    try {
      await updateDoc(doc(db, 'embarques', embarqueId), {
        temp_carga: tempCarga,
        temp_descarga: tempDescarga,
        temp_desviacion: desviacion,
        tempUpdated: serverTimestamp(),
      })
    } catch(e) { console.error(e) }
    finally { setGuardando(false) }
  }

  const toggle = (cat) => setExpandido(e => ({ ...e, [cat]: !e[cat] }))

  const totalItems = Object.values(tipo.equipamiento || {}).flat().length
  const completados = Object.values(checks).filter(Boolean).length
  const pct = totalItems > 0 ? Math.round((completados / totalItems) * 100) : 0
  const needsTemp = tipo.tempRequerida

  const CATS = [
    { key: 'unidad', label: 'Unidad / Vehículo', color: 'text-brand', border: 'border-blue-200' },
    { key: 'operador', label: 'Operador', color: 'text-amber-600', border: 'border-amber-200' },
    { key: 'documentos', label: 'Documentos', color: 'text-purple-600', border: 'border-purple-200' },
    { key: 'cliente', label: 'Confirmaciones del cliente', color: 'text-green-600', border: 'border-green-200' },
  ]

  return (
    <div className="space-y-4">
      {/* Header con progreso */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800">{tipo.label}</p>
          <p className="text-xs text-gray-400">{tipo.descripcion}</p>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-bold ${pct === 100 ? 'text-green-600' : pct >= 70 ? 'text-amber-500' : 'text-red-500'}`}>{pct}%</p>
          <p className="text-[10px] text-gray-400">{completados}/{totalItems}</p>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="w-full bg-gray-100 rounded-full h-2.5">
        <div className={`h-2.5 rounded-full transition-all duration-300 ${pct===100?'bg-green-500':pct>=70?'bg-amber-400':'bg-red-400'}`}
          style={{width:`${pct}%`}} />
      </div>

      {/* Registro de temperatura — CRÍTICO para refrigerado/congelado */}
      {needsTemp && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-brand" />
            <p className="text-xs font-semibold text-brand">Registro de temperatura</p>
            {temperatura && <span className="text-[10px] bg-brand text-white px-2 py-0.5 rounded-full">Requerida: {temperatura}</span>}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] text-gray-500 mb-1">Temp. al cargar</label>
              <input className="input text-xs py-1.5" placeholder="Ej. -6°F" value={tempCarga}
                onChange={e => setTempCarga(e.target.value)} />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1">Temp. al descargar</label>
              <input className="input text-xs py-1.5" placeholder="Ej. -4°F" value={tempDescarga}
                onChange={e => setTempDescarga(e.target.value)} />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1">Desviación / Nota</label>
              <input className="input text-xs py-1.5" placeholder="Sin desviación" value={desviacion}
                onChange={e => setDesviacion(e.target.value)} />
            </div>
          </div>
          {/* Alerta si hay desviación */}
          {desviacion && desviacion.toLowerCase() !== 'sin desviación' && desviacion.trim() !== '' && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <p className="text-[10px] text-red-700 font-medium">Desviación de temperatura registrada — notificar al cliente</p>
            </div>
          )}
          <button onClick={guardarTemperaturas} disabled={guardando}
            className="btn-primary text-xs py-1.5 disabled:opacity-50">
            {guardando ? 'Guardando...' : 'Guardar temperaturas'}
          </button>
        </div>
      )}

      {/* Alertas especiales */}
      {tipo.requierePermisos && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700">Requiere permisos especiales — verificar antes de confirmar</p>
        </div>
      )}
      {tipo.tasa0 && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2">
          <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
          <p className="text-xs text-green-700">Posible <strong>tasa 0% IVA</strong> — confirmar con cliente</p>
        </div>
      )}

      {/* Checklists por categoría */}
      {CATS.map(cat => {
        const items = (tipo.equipamiento || {})[cat.key] || []
        if (!items.length) return null
        const catComp = items.filter((_, i) => checks[`${cat.key}-${i}`]).length
        const completo = catComp === items.length
        return (
          <div key={cat.key} className={`rounded-xl border ${completo ? 'border-green-200 bg-green-50' : 'border-gray-100'}`}>
            <button onClick={() => toggle(cat.key)} className="w-full flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                {expandido[cat.key]
                  ? <ChevronDown className="w-4 h-4 text-gray-400" />
                  : <ChevronRight className="w-4 h-4 text-gray-400" />}
                <span className={`text-xs font-semibold ${completo ? 'text-green-700' : cat.color}`}>{cat.label}</span>
                {completo && <CheckCircle className="w-3.5 h-3.5 text-green-600" />}
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${completo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {catComp}/{items.length}
              </span>
            </button>
            {expandido[cat.key] && (
              <div className="px-4 pb-3 space-y-1.5">
                {items.map((item, i) => {
                  const checked = checks[`${cat.key}-${i}`]
                  return (
                    <button key={i} onClick={() => toggleCheck(cat.key, i)}
                      className={`w-full flex items-start gap-2.5 text-left rounded-lg px-2 py-1.5 transition-colors ${checked ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                      {checked
                        ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        : <Circle className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" />}
                      <span className={`text-xs ${checked ? 'text-green-700 line-through' : 'text-gray-600'}`}>{item}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {pct === 100 && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center">
          <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
          <p className="text-xs font-semibold text-green-700">Checklist completo — listo para operar</p>
          <p className="text-[10px] text-green-600 mt-0.5">Guardado automáticamente</p>
        </div>
      )}
    </div>
  )
}
