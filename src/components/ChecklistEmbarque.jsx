import { useState } from 'react'
import { TIPOS_SERVICIO } from '../data/tiposServicio'
import { CheckCircle, Circle, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'

export default function ChecklistEmbarque({ tipoServicio, temperatura, onComplete }) {
  const tipo = TIPOS_SERVICIO[tipoServicio?.toUpperCase()] || TIPOS_SERVICIO['SECO']
  const [checks, setChecks] = useState({})
  const [expandido, setExpandido] = useState({ unidad: true, operador: false, documentos: false, cliente: false })

  const toggleCheck = (categoria, idx) => {
    const key = `${categoria}-${idx}`
    setChecks(c => ({ ...c, [key]: !c[key] }))
  }

  const toggle = (cat) => setExpandido(e => ({ ...e, [cat]: !e[cat] }))

  const totalItems = Object.values(tipo.equipamiento).flat().length
  const completados = Object.values(checks).filter(Boolean).length
  const pct = Math.round((completados / totalItems) * 100)

  const CATS = [
    { key: 'unidad', label: 'Unidad / Vehículo', color: 'text-brand', bg: 'bg-blue-50' },
    { key: 'operador', label: 'Operador', color: 'text-amber-600', bg: 'bg-amber-50' },
    { key: 'documentos', label: 'Documentos', color: 'text-purple-600', bg: 'bg-purple-50' },
    { key: 'cliente', label: 'Confirmaciones del cliente', color: 'text-green-600', bg: 'bg-green-50' },
  ]

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800">{tipo.label}</p>
          <p className="text-xs text-gray-400">{tipo.descripcion}</p>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold ${pct === 100 ? 'text-green-600' : pct >= 70 ? 'text-amber-500' : 'text-red-500'}`}>{pct}%</p>
          <p className="text-[10px] text-gray-400">{completados}/{totalItems} items</p>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all ${pct===100?'bg-green-500':pct>=70?'bg-amber-400':'bg-red-400'}`} style={{width:`${pct}%`}} />
      </div>

      {/* Temperatura requerida */}
      {tipo.tempRequerida && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-brand shrink-0" />
          <div>
            <p className="text-xs font-medium text-brand">Temperatura requerida</p>
            {temperatura ? (
              <p className="text-[10px] text-blue-600">Solicitada: <strong>{temperatura}</strong> · Rango: {tipo.rangTemp?.min} a {tipo.rangTemp?.max} {tipo.rangTemp?.unidad}</p>
            ) : (
              <p className="text-[10px] text-red-500">Temperatura no especificada — confirmar con cliente</p>
            )}
          </div>
        </div>
      )}

      {/* Alertas especiales */}
      {tipo.requierePermisos && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700">Este servicio puede requerir permisos especiales — verificar antes de confirmar</p>
        </div>
      )}
      {tipo.tasa0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
          <p className="text-xs text-green-700">Servicio con posible <strong>tasa 0% IVA</strong> — confirmar con cliente si descarga es en territorio americano</p>
        </div>
      )}

      {/* Checklists por categoría */}
      {CATS.map(cat => {
        const items = tipo.equipamiento[cat.key] || []
        if (!items.length) return null
        const catCompletados = items.filter((_, i) => checks[`${cat.key}-${i}`]).length
        return (
          <div key={cat.key} className={`rounded-xl border ${catCompletados===items.length?'border-green-200':'border-gray-100'}`}>
            <button onClick={() => toggle(cat.key)} className="w-full flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                {expandido[cat.key] ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                <span className={`text-xs font-semibold ${cat.color}`}>{cat.label}</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${catCompletados===items.length?'bg-green-50 text-green-700':'bg-gray-100 text-gray-500'}`}>
                {catCompletados}/{items.length}
              </span>
            </button>
            {expandido[cat.key] && (
              <div className="px-4 pb-3 space-y-2">
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
        </div>
      )}
    </div>
  )
}
