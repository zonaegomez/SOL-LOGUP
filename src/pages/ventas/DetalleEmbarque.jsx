import { useEffect, useState } from 'react'
import { doc, getDoc, updateDoc, collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const ETAPAS = [
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

const TIPO_TAG = { ftl: 'FTL', ltl: 'LTL', int: 'Internacional', imp: 'Importación', ref: 'Refrigerado', exp: 'Exportación' }

export default function DetalleEmbarque() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { perfil, user } = useAuth()
  const [embarque, setEmbarque] = useState(null)
  const [historico, setHistorico] = useState([])
  const [tab, setTab] = useState('info')
  const [loading, setLoading] = useState(true)
  const [updatingEtapa, setUpdatingEtapa] = useState(false)
  const [nota, setNota] = useState('')

  useEffect(() => {
    fetchEmbarque()
  }, [id])

  const fetchEmbarque = async () => {
    setLoading(true)
    try {
      const snap = await getDoc(doc(db, 'embarques', id))
      if (!snap.exists()) { navigate('/embarques'); return }
      setEmbarque({ id: snap.id, ...snap.data() })
      const histSnap = await getDocs(collection(db, 'embarques', id, 'historico'))
      const hist = histSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0))
      setHistorico(hist)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const avanzarEtapa = async () => {
    const idx = ETAPAS.findIndex(e => e.key === embarque.etapa)
    if (idx >= ETAPAS.length - 1) return
    const nueva = ETAPAS[idx + 1]
    setUpdatingEtapa(true)
    try {
      await updateDoc(doc(db, 'embarques', id), { etapa: nueva.key, updatedAt: serverTimestamp() })
      await addDoc(collection(db, 'embarques', id, 'historico'), {
        etapa: nueva.label,
        usuario: perfil?.nombre || user?.email,
        timestamp: serverTimestamp(),
        tipo: 'etapa',
      })
      setEmbarque(e => ({ ...e, etapa: nueva.key }))
      fetchEmbarque()
    } catch (e) { console.error(e) }
    finally { setUpdatingEtapa(false) }
  }

  const agregarNota = async () => {
    if (!nota.trim()) return
    await addDoc(collection(db, 'embarques', id, 'historico'), {
      etapa: 'Nota',
      detalle: nota,
      usuario: perfil?.nombre || user?.email,
      timestamp: serverTimestamp(),
      tipo: 'nota',
    })
    setNota('')
    fetchEmbarque()
  }

  if (loading) return <div className="p-12 text-center text-gray-400">Cargando embarque...</div>
  if (!embarque) return null

  const etapaIdx = ETAPAS.findIndex(e => e.key === embarque.etapa)

  const InfoRow = ({ label, value, editable }) => (
    <div className="flex items-start py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500 w-44 shrink-0">{label}</span>
      <span className="text-sm text-gray-800 font-medium flex-1">{value || '—'}</span>
    </div>
  )

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/embarques')} className="text-gray-400 hover:text-gray-600">←</button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900 font-mono">{embarque.folio}</h1>
              {embarque.prioridad === 'urgente' && (
                <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">🔴 Urgente</span>
              )}
              <span className="text-[10px] bg-blue-50 text-brand px-2 py-0.5 rounded-full">{TIPO_TAG[embarque.categoria] || embarque.categoria}</span>
            </div>
            <p className="text-xs text-gray-400">{embarque.status || 'En operación'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {etapaIdx < ETAPAS.length - 1 && (
            <button onClick={avanzarEtapa} disabled={updatingEtapa} className="btn-primary text-xs">
              {updatingEtapa ? '...' : `→ Avanzar a ${ETAPAS[etapaIdx + 1]?.label}`}
            </button>
          )}
        </div>
      </div>

      {/* Timeline de etapas */}
      <div className="card p-4">
        <div className="flex items-center justify-between overflow-x-auto gap-1">
          {ETAPAS.map((e, i) => (
            <div key={e.key} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-all ${
                  i < etapaIdx ? 'border-green-400 bg-green-400 text-white' :
                  i === etapaIdx ? 'border-brand bg-brand text-white' :
                  'border-gray-200 bg-white text-gray-300'
                }`}>
                  {i < etapaIdx ? '✓' : e.icon}
                </div>
                <span className={`text-[9px] mt-1 text-center leading-tight ${
                  i === etapaIdx ? 'text-brand font-medium' : i < etapaIdx ? 'text-green-600' : 'text-gray-300'
                }`}>{e.label}</span>
              </div>
              {i < ETAPAS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1 ${i < etapaIdx ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {['info', 'contratos', 'historico'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'info' ? 'Información' : t === 'contratos' ? 'Contratos' : 'Histórico'}
          </button>
        ))}
      </div>

      {/* Tab: Información */}
      {tab === 'info' && (
        <div className="card p-6 space-y-1">
          <InfoRow label="UUID" value={<span className="font-mono text-xs">{embarque.id}</span>} />
          <InfoRow label="Etapa" value={ETAPAS.find(e => e.key === embarque.etapa)?.label} />
          <InfoRow label="Status" value={embarque.status} />
          <InfoRow label="Cliente" value={embarque.cliente} />
          <InfoRow label="RFC cliente" value={embarque.clienteRFC} />
          <InfoRow label="Categoría" value={TIPO_TAG[embarque.categoria] || embarque.categoria} />
          <InfoRow label="Origen" value={embarque.origenNombre} />
          <InfoRow label="CP origen" value={embarque.origenCP} />
          <InfoRow label="Destino" value={embarque.destinoNombre} />
          <InfoRow label="CP destino" value={embarque.destinoCP} />
          <InfoRow label="Fecha carga" value={embarque.fechaCarga} />
          <InfoRow label="Fecha ETA" value={embarque.fechaETA} />
          <InfoRow label="Vendedor" value={embarque.vendedor} />
          <InfoRow label="Seguimiento" value={embarque.seguimiento} />
          <InfoRow label="Referencia cliente" value={embarque.referencia} />
          <InfoRow label="Observaciones" value={embarque.observaciones} />

          <div className="pt-4 border-t border-gray-100 mt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Carta Porte 3.1</p>
            <InfoRow label="Mercancía" value={embarque.cp_descripcion} />
            <InfoRow label="Clave SAT" value={embarque.cp_claveSAT} />
            <InfoRow label="Peso bruto" value={embarque.cp_peso ? `${embarque.cp_peso} ${embarque.cp_unidadPeso}` : null} />
            <InfoRow label="Pallets" value={embarque.cp_pallets} />
            <InfoRow label="Valor mercancía" value={embarque.cp_valorMercancia ? `$${Number(embarque.cp_valorMercancia).toLocaleString('es-MX')} ${embarque.cp_moneda}` : null} />
            <InfoRow label="Seguro" value={embarque.cp_seguro ? `$${Number(embarque.cp_seguro).toLocaleString('es-MX')}` : null} />
          </div>

          <div className="pt-4 border-t border-gray-100 mt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Operador / Unidad</p>
            <InfoRow label="Operador" value={embarque.op_nombre} />
            <InfoRow label="Licencia" value={embarque.op_licencia} />
            <InfoRow label="Placas" value={embarque.op_placas} />
            <InfoRow label="Tipo de unidad" value={embarque.op_tipoUnidad} />
          </div>
        </div>
      )}

      {/* Tab: Contratos / Provisiones */}
      {tab === 'contratos' && (
        <div className="card p-6">
          <p className="text-sm font-medium text-gray-700 mb-4">Provisiones (proveedores asignados)</p>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center text-sm text-amber-700">
            <p>El módulo de proveedores estará disponible próximamente.</p>
            <p className="text-xs mt-1 text-amber-500">Los proveedores podrán subir evidencias y facturas desde su portal.</p>
          </div>
        </div>
      )}

      {/* Tab: Histórico */}
      {tab === 'historico' && (
        <div className="card p-6 space-y-4">
          <div className="flex gap-3">
            <input
              className="input flex-1"
              placeholder="Agregar nota o comentario..."
              value={nota}
              onChange={e => setNota(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && agregarNota()}
            />
            <button onClick={agregarNota} className="btn-primary px-3">+ Nota</button>
          </div>

          <div className="space-y-0">
            {historico.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">Sin eventos registrados.</p>
            )}
            {historico.map((h, i) => (
              <div key={h.id} className={`flex gap-3 py-3 ${i < historico.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs ${
                  h.tipo === 'nota' ? 'bg-amber-50 text-amber-600' :
                  h.tipo === 'etapa' ? 'bg-blue-50 text-blue-600' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {h.tipo === 'nota' ? '📝' : h.tipo === 'etapa' ? '→' : '●'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-800">{h.etapa}</p>
                    <p className="text-[11px] text-gray-400">
                      {h.timestamp?.seconds ? format(new Date(h.timestamp.seconds * 1000), 'dd MMM yyyy, HH:mm', { locale: es }) : 'Ahora'}
                    </p>
                  </div>
                  {h.detalle && <p className="text-xs text-gray-500 mt-0.5">{h.detalle}</p>}
                  <p className="text-[11px] text-gray-400 mt-0.5">{h.usuario}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
