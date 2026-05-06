import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, getDoc, collection, getDocs, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../context/AuthContext'
import { Truck, FileText, Clock, ChevronLeft, Package, MapPin, User, Phone, DollarSign, AlertCircle, CheckCircle, XCircle, Upload, MessageSquare, ClipboardCheck } from 'lucide-react'
import ChecklistEmbarque from '../../components/ChecklistEmbarque'
import ComentariosEmbarque from '../../components/ComentariosEmbarque'

const ETAPAS = ['creado','posicionamiento','carga','transito','descarga','entregado','provisiones','porFacturar','cobrado']
const ETAPA_LABEL = { creado:'Creado', posicionamiento:'Posicionamiento', carga:'Carga', transito:'Tránsito', descarga:'Descarga', entregado:'Entregado', provisiones:'Provisiones', porFacturar:'Por facturar', cobrado:'Cobrado' }

const fmt = (n) => n ? '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0 }) : '—'

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-xs font-medium text-gray-800 text-right max-w-xs">{value || '—'}</span>
    </div>
  )
}

export default function DetalleEmbarque() {
  const { id } = useParams()
  const { perfil, esMaestro, esAdmin } = useAuth()
  const [embarque, setEmbarque] = useState(null)
  const [historico, setHistorico] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('info')
  const [showSolicitud, setShowSolicitud] = useState(false)
  const [solicitud, setSolicitud] = useState({ tipoUnidad: '', temperatura: '', ruta: '', notas: '' })
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false)
  const [solicitudes, setSolicitudes] = useState([])

  useEffect(() => { fetchEmbarque() }, [id])

  const fetchEmbarque = async () => {
    setLoading(true)
    try {
      const snap = await getDoc(doc(db, 'embarques', id))
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() }
        setEmbarque(data)
        // Pre-llenar solicitud con datos del embarque
        setSolicitud(s => ({
          ...s,
          tipoUnidad: data.op_tipoUnidad || '',
          temperatura: data.cp_temp || '',
          ruta: `${data.origenNombre || ''} → ${data.destinoNombre || ''}`,
        }))
      }
      const histSnap = await getDocs(collection(db, 'embarques', id, 'historico'))
      setHistorico(histSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)))
      // Cargar solicitudes de unidad de este embarque
      const solSnap = await getDocs(collection(db, 'solicitudesUnidad'))
      setSolicitudes(solSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => s.embarqueId === id))
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const enviarSolicitudUnidad = async () => {
    if (!solicitud.tipoUnidad) return
    setEnviandoSolicitud(true)
    try {
      await addDoc(collection(db, 'solicitudesUnidad'), {
        embarqueId: id,
        folio: embarque?.folio || '',
        cliente: embarque?.cliente || '',
        ruta: solicitud.ruta,
        tipoUnidad: solicitud.tipoUnidad,
        temperatura: solicitud.temperatura,
        notas: solicitud.notas,
        solicitadoPor: perfil?.nombre || '',
        estado: 'pendiente',
        creadoEn: serverTimestamp(),
      })
      // Actualizar embarque a estado pendiente de unidad
      await updateDoc(doc(db, 'embarques', id), {
        estadoUnidad: 'pendiente',
        updatedAt: serverTimestamp(),
      })
      await addDoc(collection(db, 'embarques', id, 'historico'), {
        tipo: 'solicitud',
        descripcion: `Solicitud de unidad enviada a Pricing: ${solicitud.tipoUnidad} ${solicitud.temperatura ? `/ ${solicitud.temperatura}` : ''}`,
        usuario: perfil?.nombre || '',
        timestamp: serverTimestamp(),
      })
      setShowSolicitud(false)
      fetchEmbarque()
      alert('Solicitud enviada a Pricing. Recibirás confirmación.')
    } catch(e) { console.error(e) }
    finally { setEnviandoSolicitud(false) }
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Cargando...</div>
  if (!embarque) return <div className="p-8 text-center text-gray-400">Embarque no encontrado</div>

  const etapaIdx = ETAPAS.indexOf(embarque.etapa)
  const estadoUnidad = embarque.estadoUnidad
  const solicitudPendiente = solicitudes.find(s => s.estado === 'pendiente')
  const solicitudConfirmada = solicitudes.find(s => s.estado === 'confirmado')

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/embarques" className="text-gray-400 hover:text-gray-600">
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <span className="text-xs text-gray-400 font-mono">{embarque.folio}</span>
            {embarque.cp_gm && <span className="text-xs text-gray-300 font-mono">CP: {embarque.cp_gm}</span>}
          </div>
          <h1 className="text-xl font-semibold text-gray-900">{embarque.cliente}</h1>
          <p className="text-sm text-gray-500">{embarque.origenNombre} → {embarque.destinoNombre}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Botón solicitar unidad a Pricing */}
          {!solicitudConfirmada && (
            <button
              onClick={() => setShowSolicitud(true)}
              className="btn-secondary text-xs py-1.5 flex items-center gap-1.5"
            >
              <Truck className="w-3.5 h-3.5" />
              {solicitudPendiente ? 'Solicitud enviada' : 'Solicitar unidad a Pricing'}
            </button>
          )}
          {solicitudConfirmada && (
            <div className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg font-medium">
              <CheckCircle className="w-3.5 h-3.5" />
              Unidad confirmada por Pricing
            </div>
          )}
        </div>
      </div>

      {/* Timeline de etapas */}
      <div className="card p-4 overflow-x-auto">
        <div className="flex items-center gap-0 min-w-max">
          {ETAPAS.map((etapa, i) => (
            <div key={etapa} className="flex items-center">
              <div className={`flex flex-col items-center ${i <= etapaIdx ? 'text-brand' : 'text-gray-300'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${i < etapaIdx ? 'bg-brand border-brand text-white' : i === etapaIdx ? 'border-brand text-brand' : 'border-gray-200 text-gray-300'}`}>
                  {i < etapaIdx ? '✓' : i + 1}
                </div>
                <span className="text-[9px] mt-1 whitespace-nowrap">{ETAPA_LABEL[etapa]}</span>
              </div>
              {i < ETAPAS.length - 1 && (
                <div className={`w-8 h-0.5 mx-1 mb-4 ${i < etapaIdx ? 'bg-brand' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Alerta solicitud pendiente */}
      {solicitudPendiente && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-800">Solicitud de unidad pendiente de respuesta</p>
            <p className="text-[10px] text-amber-600">{solicitudPendiente.tipoUnidad} {solicitudPendiente.temperatura ? `/ ${solicitudPendiente.temperatura}` : ''} · Enviada por {solicitudPendiente.solicitadoPor}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: 'info', label: 'Información', Icon: FileText },
          { key: 'proveedor', label: 'Proveedor', Icon: Truck },
          { key: 'checklist', label: 'Checklist', Icon: ClipboardCheck },
          { key: 'documentos', label: 'POD & Factura', Icon: Package },
          { key: 'comentarios', label: 'Comentarios', Icon: MessageSquare },
          { key: 'historico', label: 'Historial', Icon: Clock },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <t.Icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab Información */}
      {tab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Cliente</p>
            <InfoRow label="Razón social" value={embarque.cliente} />
            <InfoRow label="RFC" value={embarque.clienteRFC} />
            <InfoRow label="Referencia" value={embarque.referencia} />
            <InfoRow label="Vendedor" value={embarque.vendedor} />
            <InfoRow label="Días de crédito" value={embarque.diasCredito ? `${embarque.diasCredito} días` : null} />
            {embarque.diasCredito && embarque.fechaETA && (
              <InfoRow label="Fecha límite cobro" value={(() => {
                const eta = new Date(embarque.fechaETA)
                eta.setDate(eta.getDate() + Number(embarque.diasCredito))
                return eta.toLocaleDateString('es-MX')
              })()} />
            )}
          </div>
          <div className="card p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Ruta y fechas</p>
            <InfoRow label="Origen" value={`${embarque.origenNombre} (CP ${embarque.origenCP || '—'})`} />
            <InfoRow label="Destino" value={`${embarque.destinoNombre} (CP ${embarque.destinoCP || '—'})`} />
            <InfoRow label="Fecha carga" value={embarque.fechaCarga ? new Date(embarque.fechaCarga).toLocaleString('es-MX') : null} />
            <InfoRow label="ETA" value={embarque.fechaETA ? new Date(embarque.fechaETA).toLocaleString('es-MX') : null} />
            <InfoRow label="Horas libres carga" value={`${embarque.horasLibresCarga || 6} hrs`} />
            <InfoRow label="Horas libres descarga" value={`${embarque.horasLibresDescarga || 6} hrs`} />
          </div>
          <div className="card p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Financiero</p>
            <InfoRow label="Tarifa cliente" value={fmt(embarque.tarifa_cliente)} />
            <InfoRow label="Costo proveedor" value={fmt(embarque.costo_proveedor || embarque.costo_flete)} />
            {(embarque.tarifa_cliente && embarque.costo_proveedor) && (
              <InfoRow label="Margen" value={`${(((embarque.tarifa_cliente - embarque.costo_proveedor) / embarque.tarifa_cliente) * 100).toFixed(1)}%`} />
            )}
            <InfoRow label="Maniobras" value={fmt(embarque.maniobras)} />
            <InfoRow label="Estadías" value={fmt(embarque.estadias)} />
          </div>
          <div className="card p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Unidad y operador</p>
            <InfoRow label="Tipo unidad" value={embarque.op_tipoUnidad} />
            <InfoRow label="Temperatura" value={embarque.cp_temp} />
            <InfoRow label="Operador" value={embarque.op_nombre} />
            <InfoRow label="Teléfono" value={embarque.op_tel} />
            <InfoRow label="Placas caja" value={embarque.op_placas} />
            <InfoRow label="Tracto" value={embarque.placasTractor} />
          </div>
        </div>
      )}

      {/* Tab Proveedor */}
      {tab === 'proveedor' && (
        <div className="space-y-4">
          {solicitudConfirmada ? (
            <div className="card p-5 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <p className="text-sm font-semibold text-green-700">Unidad confirmada por Pricing</p>
              </div>
              <InfoRow label="Proveedor" value={embarque.proveedor_nombre || solicitudConfirmada.proveedor} />
              <InfoRow label="Tipo de unidad" value={solicitudConfirmada.tipoUnidad} />
              <InfoRow label="Temperatura" value={solicitudConfirmada.temperatura} />
              <InfoRow label="Tarifa proveedor" value={fmt(embarque.costo_proveedor || solicitudConfirmada.tarifa)} />
              <InfoRow label="Operador" value={embarque.op_nombre} />
              <InfoRow label="Teléfono" value={embarque.op_tel} />
              <InfoRow label="Días crédito proveedor" value={embarque.diasCreditoProveedor ? `${embarque.diasCreditoProveedor} días` : null} />
            </div>
          ) : solicitudPendiente ? (
            <div className="card p-5 text-center py-10">
              <Clock className="w-8 h-8 text-amber-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700">Solicitud enviada a Pricing</p>
              <p className="text-xs text-gray-400 mt-1">Esperando confirmación de disponibilidad</p>
              <p className="text-xs text-gray-400 mt-1">{solicitudPendiente.tipoUnidad} {solicitudPendiente.temperatura}</p>
            </div>
          ) : (
            <div className="card p-5 text-center py-10">
              <Truck className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">Sin unidad asignada</p>
              <p className="text-xs text-gray-400 mt-1">Solicita una unidad a Pricing para continuar</p>
              <button onClick={() => setShowSolicitud(true)} className="btn-primary text-xs mt-4 inline-flex">
                Solicitar unidad a Pricing
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab Checklist */}
      {tab === 'checklist' && (
        <div className="card p-5">
          <ChecklistEmbarque
            tipoServicio={embarque.categoria?.toUpperCase() || embarque.op_tipoUnidad}
            temperatura={embarque.cp_temp}
          />
        </div>
      )}

      {/* Tab Comentarios */}
      {tab === 'comentarios' && (
        <div className="card p-5">
          <ComentariosEmbarque embarqueId={id} />
        </div>
      )}

      {/* Tab POD & Factura */}
      {tab === 'documentos' && (
        <div className="space-y-4">
          {/* POD */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-800">POD — Prueba de entrega</p>
                <p className="text-xs text-gray-400">Evidencia fotográfica y firma del receptor</p>
              </div>
              {embarque.pod_url ? (
                <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-lg font-medium flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Recibido
                </span>
              ) : (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-lg">Pendiente</span>
              )}
            </div>
            {embarque.pod_url ? (
              <a href={embarque.pod_url} target="_blank" className="btn-secondary text-xs inline-flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Ver POD
              </a>
            ) : embarque.etapa === 'entregado' || embarque.etapa === 'provisiones' || embarque.etapa === 'porFacturar' ? (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                <Upload className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">El proveedor sube el POD desde su portal</p>
                <p className="text-[10px] text-gray-300 mt-1">O agrega el enlace manualmente</p>
                <input className="input mt-3 text-xs" placeholder="URL del POD..." onChange={async e => {
                  if(e.target.value) {
                    await updateDoc(doc(db,'embarques',id),{pod_url:e.target.value,updatedAt:serverTimestamp()})
                    fetchEmbarque()
                  }
                }} />
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">Disponible cuando el embarque sea entregado</p>
            )}
          </div>

          {/* Factura proveedor */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-800">Factura del proveedor</p>
                <p className="text-xs text-gray-400">Documento fiscal del transportista</p>
              </div>
              {embarque.factura_proveedor_url ? (
                <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-lg font-medium flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Recibida
                </span>
              ) : (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-lg">Pendiente</span>
              )}
            </div>
            {embarque.factura_proveedor_url ? (
              <div className="space-y-2">
                <a href={embarque.factura_proveedor_url} target="_blank" className="btn-secondary text-xs inline-flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Ver factura
                </a>
                {embarque.diasCreditoProveedor && embarque.fechaETA && (
                  <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-amber-700">
                      Pago al proveedor: {(() => {
                        const eta = new Date(embarque.fechaETA)
                        eta.setDate(eta.getDate() + Number(embarque.diasCreditoProveedor))
                        return eta.toLocaleDateString('es-MX')
                      })()}
                      <span className="ml-1">({embarque.diasCreditoProveedor} días crédito)</span>
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                <Upload className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Agrega el enlace o número de factura del proveedor</p>
                <div className="flex gap-2 mt-3">
                  <input className="input flex-1 text-xs" placeholder="URL o folio de factura..." id="fact-prov-url" />
                  <button onClick={async () => {
                    const val = document.getElementById('fact-prov-url').value
                    if(val) {
                      await updateDoc(doc(db,'embarques',id),{factura_proveedor_url:val,updatedAt:serverTimestamp()})
                      fetchEmbarque()
                    }
                  }} className="btn-primary text-xs py-1.5">Guardar</button>
                </div>
              </div>
            )}
          </div>

          {/* Factura al cliente */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-800">Factura al cliente</p>
                <p className="text-xs text-gray-400">Documento fiscal emitido a {embarque.cliente}</p>
              </div>
              {embarque.factura_cliente_url ? (
                <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-lg font-medium flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Emitida
                </span>
              ) : (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-lg">Pendiente</span>
              )}
            </div>
            {embarque.factura_cliente_url ? (
              <div className="space-y-2">
                <a href={embarque.factura_cliente_url} target="_blank" className="btn-secondary text-xs inline-flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Ver factura
                </a>
                {embarque.diasCredito && embarque.fechaETA && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-brand">
                      Fecha límite de cobro: {(() => {
                        const eta = new Date(embarque.fechaETA)
                        eta.setDate(eta.getDate() + Number(embarque.diasCredito))
                        return eta.toLocaleDateString('es-MX')
                      })()}
                      <span className="ml-1">({embarque.diasCredito} días crédito)</span>
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                <DollarSign className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Registra el folio de factura emitida al cliente</p>
                <div className="flex gap-2 mt-3">
                  <input className="input flex-1 text-xs" placeholder="URL o folio de factura..." id="fact-cli-url" />
                  <button onClick={async () => {
                    const val = document.getElementById('fact-cli-url').value
                    if(val) {
                      await updateDoc(doc(db,'embarques',id),{factura_cliente_url:val,updatedAt:serverTimestamp()})
                      fetchEmbarque()
                    }
                  }} className="btn-primary text-xs py-1.5">Guardar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Historial */}
      {tab === 'historico' && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-700">Historial de cambios</p>
          </div>
          {historico.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">Sin registros</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {historico.map(h => (
                <div key={h.id} className="px-5 py-3 flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-brand mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-800">{h.descripcion || h.etapa}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {h.usuario} · {h.timestamp?.toDate?.()?.toLocaleString('es-MX') || ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal solicitud de unidad a Pricing */}
      {showSolicitud && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Solicitar unidad a Pricing</h2>
            <p className="text-xs text-gray-400 mb-4">Pricing recibirá esta solicitud y confirmará disponibilidad</p>

            <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Embarque</span>
                <span className="font-medium">{embarque.folio}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Cliente</span>
                <span className="font-medium">{embarque.cliente}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Ruta</span>
                <span className="font-medium">{embarque.origenNombre} → {embarque.destinoNombre}</span>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tipo de unidad requerida *</label>
                <select className="input" value={solicitud.tipoUnidad} onChange={e=>setSolicitud(s=>({...s,tipoUnidad:e.target.value}))}>
                  <option value="">Seleccionar...</option>
                  {['Tráiler','Caja seca','Caja refrigerada','Termo conge/Seco','Rabón','Tortón','Full'].map(t=>(
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Temperatura requerida (si aplica)</label>
                <input className="input" placeholder="Ej. -5°F, 32°F, ambiente..." value={solicitud.temperatura} onChange={e=>setSolicitud(s=>({...s,temperatura:e.target.value}))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Notas adicionales para Pricing</label>
                <textarea className="input resize-none text-xs" rows={2} placeholder="Fecha requerida, instrucciones especiales..." value={solicitud.notas} onChange={e=>setSolicitud(s=>({...s,notas:e.target.value}))} />
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={()=>setShowSolicitud(false)} className="flex-1 btn-secondary text-xs py-2.5">Cancelar</button>
              <button onClick={enviarSolicitudUnidad} disabled={!solicitud.tipoUnidad||enviandoSolicitud}
                className="flex-1 btn-primary text-xs py-2.5 justify-center disabled:opacity-40">
                {enviandoSolicitud?'Enviando...':'Enviar a Pricing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
