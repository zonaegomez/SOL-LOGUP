import { useEffect, useState } from 'react'
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const COLS = [
  { key: 'embarcadoCreado', label: 'Creado' },
  { key: 'posicionamiento', label: 'Posicionamiento' },
  { key: 'carga', label: 'Carga' },
  { key: 'transito', label: 'Tránsito' },
  { key: 'descarga', label: 'Descarga' },
  { key: 'entregado', label: 'Entregado' },
  { key: 'provisiones', label: 'Provisiones' },
  { key: 'porFacturar', label: 'Por facturar' },
  { key: 'cobrado', label: 'Cobrado' },
]

const TIPO_COLOR = {
  ftl: 'bg-blue-50 text-blue-700', ltl: 'bg-amber-50 text-amber-700',
  int: 'bg-purple-50 text-purple-700', imp: 'bg-purple-50 text-purple-700',
  ref: 'bg-green-50 text-green-700', exp: 'bg-pink-50 text-pink-700',
}
const TIPO_TAG = { ftl: 'FTL', ltl: 'LTL', int: 'INT', imp: 'IMP', ref: 'REF', exp: 'EXP' }

export default function Board() {
  const [embarques, setEmbarques] = useState([])
  const [loading, setLoading] = useState(true)
  const { perfil, user } = useAuth()

  useEffect(() => { fetchEmbarques() }, [])

  const fetchEmbarques = async () => {
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'embarques'))
      setEmbarques(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const avanzarEtapa = async (embarque, e) => {
    e.preventDefault(); e.stopPropagation()
    const idx = COLS.findIndex(c => c.key === embarque.etapa)
    if (idx >= COLS.length - 1) return
    const nueva = COLS[idx + 1]
    await updateDoc(doc(db, 'embarques', embarque.id), { etapa: nueva.key, updatedAt: serverTimestamp() })
    await addDoc(collection(db, 'embarques', embarque.id, 'historico'), {
      etapa: nueva.label, usuario: perfil?.nombre || user?.email,
      timestamp: serverTimestamp(), tipo: 'etapa',
    })
    setEmbarques(prev => prev.map(em => em.id === embarque.id ? { ...em, etapa: nueva.key } : em))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Operaciones</h1>
          <p className="text-sm text-gray-500">Board de seguimiento en tiempo real</p>
        </div>
        <button onClick={fetchEmbarques} className="btn-secondary text-xs">↻ Actualizar</button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando embarques...</div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max">
            {COLS.map(col => {
              const cards = embarques.filter(e => e.etapa === col.key)
              return (
                <div key={col.key} className="w-48 shrink-0">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{col.label}</span>
                    <span className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{cards.length}</span>
                  </div>
                  <div className="space-y-2 min-h-24">
                    {cards.map(em => (
                      <Link
                        key={em.id}
                        to={`/embarques/${em.id}`}
                        className={`block bg-white rounded-xl border p-3 hover:border-brand transition-colors ${
                          em.prioridad === 'urgente' ? 'border-l-2 border-l-red-400 border-gray-100' : 'border-gray-100'
                        }`}
                      >
                        <p className="text-[10px] font-mono text-gray-400 mb-1">{em.folio || em.id.slice(0,10)}</p>
                        <p className="text-xs font-semibold text-gray-800 leading-tight mb-1.5 truncate">{em.cliente || '—'}</p>
                        <p className="text-[10px] text-gray-400 mb-2 truncate">{em.origenNombre || em.origen} → {em.destinoNombre || em.destino}</p>
                        <div className="flex items-center justify-between">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${TIPO_COLOR[em.categoria] || 'bg-gray-100 text-gray-500'}`}>
                            {TIPO_TAG[em.categoria] || em.categoria || '—'}
                          </span>
                          {em.etapa !== 'cobrado' && (
                            <button
                              onClick={(e) => avanzarEtapa(em, e)}
                              className="text-[9px] text-brand hover:bg-blue-50 px-1.5 py-0.5 rounded transition-colors"
                            >
                              → sig
                            </button>
                          )}
                        </div>
                      </Link>
                    ))}
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
    </div>
  )
}
