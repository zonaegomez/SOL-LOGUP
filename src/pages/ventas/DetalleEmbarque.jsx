import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, getDoc, collection, getDocs, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../context/AuthContext'
import { Truck, FileText, Clock, ChevronLeft, Package, DollarSign, CheckCircle, XCircle, Upload, MessageSquare, ClipboardCheck, AlertTriangle, Send } from 'lucide-react'
import ChecklistEmbarque from '../../components/ChecklistEmbarque'
import ComentariosEmbarque from '../../components/ComentariosEmbarque'
import IncidentesEmbarque from '../../components/IncidentesEmbarque'

const ETAPAS = ['creado','posicionamiento','carga','transito','descarga','entregado','provisiones','porFacturar','cobrado']
const ETAPA_LABEL = { creado:'Creado', posicionamiento:'Posicionamiento', carga:'Carga', transito:'Tránsito', descarga:'Descarga', entregado:'Entregado', provisiones:'Provisiones', porFacturar:'Por facturar', cobrado:'Cobrado' }
const TIPO_LABEL = { ref:'Refrigerado', ftl:'FTL', ltl:'LTL', int:'Internacional', exp:'Exportación' }

const fmt = (n) => n ? '$' + Number(n).toLocaleString('es-MX', {minimumFractionDigits:0}) : '—'

function InfoRow({ label, value, highlight }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400">{label}</span>
      <span className={`text-xs font-medium text-right max-w-xs ${highlight || 'text-gray-800'}`}>{value || '—'}</span>
    </div>
  )
}

// Calcular días restantes de crédito
function diasRestantes(fechaETA, diasCredito) {
  if (!fechaETA || !diasCredito) return null
  const vencimiento = new Date(fechaETA)
  vencimiento.setDate(vencimiento.getDate() + Number(diasCredito))
  const hoy = new Date()
  const diff = Math.ceil((vencimiento - hoy) / (1000 * 60 * 60 * 24))
  return diff
}

export default function DetalleEmbarque() {
  const { id } = useParams()
  const { perfil, esMaestro, esAdmin } = useAuth()
  const [embarque, setEmbarque] = useState(null)
  const [historico, setHistorico] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('info')
  const [showSolicitud, setShowSolicitud] = useState(false)
  const [solicitud, setSolicitud] = useState({ tipoUnidad:'', temperatura:'', notas:'' })
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false)
  const [solicitudes, setSolicitudes] = useState([])
  const [checkRutas, setCheckRutas] = useState(false)

  useEffect(() => { fetchEmbarque() }, [id])

  const fetchEmbarque = async () => {
    setLoading(true)
    try {
      const snap = await getDoc(doc(db, 'embarques', id))
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() }
        setEmbarque(data)
        setSolicitud(s => ({ ...s, tipoUnidad: data.op_tipoUnidad || '', temperatura: data.cp_temp || '' }))
      }
      const histSnap = await getDocs(collection(db, 'embarques', id, 'historico'))
      setHistorico(histSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (b.timestamp?.seconds||0) - (a.timestamp?.seconds||0)))
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
        embarqueId: id, folio: embarque?.folio||'', cliente: embarque?.cliente||'',
        ruta: `${embarque?.origenNombre||''} → ${embarque?.destinoNombre||''}`,
        tipoUnidad: solicitud.tipoUnidad, temperatura: solicitud.temperatura,
        notas: solicitud.notas, solicitadoPor: perfil?.nombre||'',
        estado: 'pendiente', creadoEn: serverTimestamp(),
      })
      await updateDoc(doc(db, 'embarques', id), { estadoUnidad:'pendiente', updatedAt: serverTimestamp() })
      await addDoc(collection(db, 'embarques', id, 'historico'), {
        tipo: 'solicitud', descripcion: `Solicitud de unidad a Pricing: ${solicitud.tipoUnidad} ${solicitud.temperatura}`,
        usuario: perfil?.nombre||'', timestamp: serverTimestamp(),
      })
      setShowSolicitud(false)
      fetchEmbarque()
    } catch(e) { console.error(e) }
    finally { setEnviandoSolicitud(false) }
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Cargando...</div>
  if (!embarque) return <div className="p-8 text-center text-gray-400">Embarque no encontrado</div>

  const etapaIdx = ETAPAS.indexOf(embarque.etapa)
  const solicitudPendiente = solicitudes.find(s => s.estado === 'pendiente')
  const solicitudConfirmada = solicitudes.find(s => s.estado === 'confirmado')

  // Crédito cliente
  const diasRestCliente = diasRestantes(embarque.fechaETA, embarque.diasCredito)
  const diasRestProv = diasRestantes(embarque.fechaETA, embarque.diasCreditoProveedor)

  const tabs = [
    { key:'info', label:'Información', Icon: FileText },
    { key:'proveedor', label:'Proveedor', Icon: Truck },
    { key:'checklist', label:'Checklist', Icon: ClipboardCheck },
    { key:'incidentes', label:'Incidentes', Icon: AlertTriangle },
    { key:'documentos', label:'POD & Factura', Icon: Package },
    { key:'comentarios', label:'Comentarios', Icon: MessageSquare },
    { key:'historico', label:'Historial', Icon: Clock },
  ]

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/embarques" className="text-gray-400 hover:text-gray-600"><ChevronLeft className="w-4 h-4" /></Link>
            <span className="text-xs text-gray-400 font-mono">{embarque.folio}</span>
            {embarque.cp_gm && <span className="text-xs text-gray-300 font-mono">CP: {embarque.cp_gm}</span>}
            {embarque.prioridad === 'urgente' && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">URGENTE</span>}
          </div>
          <h1 className="text-xl font-semibold text-gray-900">{embarque.cliente}</h1>
          <p className="text-sm text-gray-500">{embarque.origenNombre} → {embarque.destinoNombre}</p>
        </div>
        {!solicitudConfirmada && (
          <button onClick={() => setShowSolicitud(true)} className="btn-secondary text-xs py-1.5 flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5" />
            {solicitudPendiente ? 'Solicitud enviada a Pricing' : 'Solicitar unidad a Pricing'}
          </button>
        )}
        {solicitudConfirmada && (
          <div className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg font-medium">
            <CheckCircle className="w-3.5 h-3.5" /> Unidad confirmada por Pricing
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="card p-4 overflow-x-auto">
        <div className="flex items-center gap-0 min-w-max">
          {ETAPAS.map((etapa, i) => (
            <div key={etapa} className="flex items-center">
              <div className={`flex flex-col items-center ${i <= etapaIdx ? 'text-brand' : 'text-gray-300'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${i < etapaIdx ? 'bg-brand border-brand text-white' : i === etapaIdx ? 'border-brand text-brand' : 'border-gray-200 text-gray-300'}`}>
                  {i < etapaIdx ? '✓' : i+1}
                </div>
                <span className="text-[9px] mt-1 whitespace-nowrap">{ETAPA_LABEL[etapa]}</span>
              </div>
              {i < ETAPAS.length-1 && <div className={`w-8 h-0.5 mx-1 mb-4 ${i < etapaIdx ? 'bg-brand' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Alertas */}
      {solicitudPendiente && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-xs font-medium text-amber-800">Solicitud de unidad pendiente: {solicitudPendiente.tipoUnidad} {solicitudPendiente.temperatura}</p>
        </div>
      )}
      {diasRestCliente !== null && diasRestCliente <= 3 && diasRestCliente >= 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <p className="text-xs font-medium text-red-800">Crédito cliente vence en {diasRestCliente} días — {new Date(embarque.fechaETA).setDate(new Date(embarque.fechaETA).getDate() + Number(embarque.diasCredito))}</p>
        </div>
      )}
      {diasRestProv !== null && diasRestProv <= 3 && diasRestProv >= 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-xs font-medium text-amber-800">Pago al proveedor vence en {diasRestProv} días</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${tab===t.key?'bg-white text-gray-900 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
            <t.Icon className="w-3.5 h-3.5" /> {t.label}
            {t.key === 'incidentes' && embarque._tieneIncidentesCriticos && (
              <span className="w-2 h-2 bg-red-500 rounded-full" />
            )}
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
            {embarque.diasCredito && embarque.fechaETA && (() => {
              const eta = new Date(embarque.fechaETA)
              eta.setDate(eta.getDate() + Number(embarque.diasCredito))
              const dias = diasRestCliente
              return <InfoRow label="Fecha límite cobro" value={eta.toLocaleDateString('es-MX')}
                highlight={dias !== null && dias <= 5 ? 'text-red-600 font-bold' : 'text-gray-800'} />
            })()}
          </div>
          <div className="card p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Ruta y fechas</p>
            <InfoRow label="Origen" value={`${embarque.origenNombre} (CP ${embarque.origenCP||'—'})`} />
            <InfoRow label="Destino" value={`${embarque.destinoNombre} (CP ${embarque.destinoCP||'—'})`} />
            <InfoRow label="Fecha carga" value={embarque.fechaCarga ? new Date(embarque.fechaCarga).toLocaleString('es-MX') : null} />
            <InfoRow label="ETA" value={embarque.fechaETA ? new Date(embarque.fechaETA).toLocaleString('es-MX') : null} />
            <InfoRow label="Horas libres carga" value={`${embarque.horasLibresCarga||6} hrs`} />
            <InfoRow label="Horas libres descarga" value={`${embarque.horasLibresDescarga||6} hrs`} />
            {/* Estadía automática */}
            {embarque.horasCarga && embarque.horasLibresCarga && (() => {
              const extra = Number(embarque.horasCarga) - Number(embarque.horasLibresCarga)
              if (extra <= 0) return null
              const bloques = Math.ceil(extra / 12)
              return <InfoRow label="Estadía generada" value={`${bloques} bloque(s) de 12h`} highlight="text-red-600 font-bold" />
            })()}
          </div>
          <div className="card p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Financiero</p>
            <InfoRow label="Tarifa cliente" value={fmt(embarque.tarifa_cliente)} />
            <InfoRow label="Costo proveedor" value={fmt(embarque.costo_proveedor || embarque.costo_flete)} />
            {embarque.tarifa_cliente && (embarque.costo_proveedor || embarque.costo_flete) && (() => {
              const margen = ((embarque.tarifa_cliente - (embarque.costo_proveedor || embarque.costo_flete)) / embarque.tarifa_cliente * 100).toFixed(1)
              return <InfoRow label="Margen" value={`${margen}%`} highlight={Number(margen) < 20 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'} />
            })()}
            <InfoRow label="Régimen fiscal" value={embarque.regimenFiscal === 'flete' ? 'Flete (IVA - RET 4%)' : embarque.regimenFiscal === 'exento' ? 'Exento / Tasa 0%' : 'Servicio logístico (IVA)'} />
            <InfoRow label="Moneda" value={embarque.moneda || 'MXN'} />
          </div>
          <div className="card p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Unidad y operador</p>
            <InfoRow label="Tipo unidad" value={TIPO_LABEL[embarque.categoria] || embarque.categoria} />
            <InfoRow label="Temperatura" value={embarque.cp_temp} highlight={embarque.cp_temp ? 'text-blue-600 font-bold' : ''} />
            {embarque.temp_carga && <InfoRow label="Temp. al cargar" value={embarque.temp_carga} />}
            {embarque.temp_descarga && <InfoRow label="Temp. al descargar" value={embarque.temp_descarga} />}
            {embarque.temp_desviacion && <InfoRow label="Desviación temp." value={embarque.temp_desviacion} highlight="text-red-600" />}
            <InfoRow label="Operador" value={embarque.op_nombre} />
            <InfoRow label="Teléfono" value={embarque.op_tel} />
            <InfoRow label="Placas" value={embarque.placasTractor || embarque.op_placas} />
          </div>
        </div>
      )}

      {/* Tab Proveedor */}
      {tab === 'proveedor' && (
        <div className="space-y-4">
          {solicitudConfirmada ? (
            <div className="card p-5 space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <p className="text-sm font-semibold text-green-700">Unidad confirmada por Pricing</p>
              </div>
              <InfoRow label="Proveedor" value={embarque.proveedor_nombre} />
              <InfoRow label="Tarifa proveedor" value={fmt(embarque.costo_proveedor || embarque.costo_flete)} />
              <InfoRow label="Operador" value={embarque.op_nombre} />
              <InfoRow label="Teléfono" value={embarque.op_tel} />
              <InfoRow label="Días crédito proveedor" value={embarque.diasCreditoProveedor ? `${embarque.diasCreditoProveedor} días` : null} />
              {embarque.diasCreditoProveedor && embarque.fechaETA && (() => {
                const eta = new Date(embarque.fechaETA)
                eta.setDate(eta.getDate() + Number(embarque.diasCreditoProveedor))
                return <InfoRow label="Pago límite proveedor" value={eta.toLocaleDateString('es-MX')}
                  highlight={diasRestProv !== null && diasRestProv <= 5 ? 'text-red-600 font-bold' : ''} />
              })()}
            </div>
          ) : solicitudPendiente ? (
            <div className="card p-8 text-center">
              <Clock className="w-8 h-8 text-amber-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700">Solicitud enviada a Pricing</p>
              <p className="text-xs text-gray-400 mt-1">{solicitudPendiente.tipoUnidad} {solicitudPendiente.temperatura}</p>
            </div>
          ) : (
            <div className="card p-8 text-center">
              <Truck className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">Sin unidad asignada</p>
              <button onClick={() => setShowSolicitud(true)} className="btn-primary text-xs mt-4 inline-flex">Solicitar unidad a Pricing</button>
            </div>
          )}
        </div>
      )}

      {/* Tab Checklist */}
      {tab === 'checklist' && (
        <div className="card p-5">
          <ChecklistEmbarque
            embarqueId={id}
            tipoServicio={embarque.categoria?.toUpperCase() || embarque.op_tipoUnidad}
            temperatura={embarque.cp_temp}
            checklistGuardado={embarque.checklist || {}}
          />
        </div>
      )}

      {/* Tab Incidentes */}
      {tab === 'incidentes' && (
        <div className="card p-5">
          <IncidentesEmbarque embarqueId={id} folio={embarque.folio} />
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
                <p className="text-xs text-gray-400">Evidencia de entrega al cliente</p>
              </div>
              {embarque.pod_url
                ? <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-lg font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Recibido</span>
                : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-lg">Pendiente</span>}
            </div>
            {embarque.pod_url ? (
              <a href={embarque.pod_url} target="_blank" rel="noreferrer" className="btn-secondary text-xs inline-flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Ver POD
              </a>
            ) : (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                <Upload className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Agrega el enlace del POD</p>
                <input className="input mt-3 text-xs" placeholder="URL del POD..." id="pod-url-input" />
                <button className="btn-primary text-xs mt-2 py-1.5" onClick={async () => {
                  const val = document.getElementById('pod-url-input').value
                  if(val) { await updateDoc(doc(db,'embarques',id),{pod_url:val,updatedAt:serverTimestamp()}); fetchEmbarque() }
                }}>Guardar POD</button>
              </div>
            )}
          </div>

          {/* Factura proveedor */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-800">Factura del proveedor</p>
                <p className="text-xs text-gray-400">Documento fiscal del transportista</p>
              </div>
              {embarque.factura_proveedor_url
                ? <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-lg font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Recibida</span>
                : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-lg">Pendiente</span>}
            </div>
            {embarque.factura_proveedor_url ? (
              <div className="space-y-2">
                <a href={embarque.factura_proveedor_url} target="_blank" rel="noreferrer" className="btn-secondary text-xs inline-flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Ver factura
                </a>
                {embarque.diasCreditoProveedor && embarque.fechaETA && (() => {
                  const eta = new Date(embarque.fechaETA)
                  eta.setDate(eta.getDate() + Number(embarque.diasCreditoProveedor))
                  return (
                    <div className={`rounded-lg px-3 py-2 ${diasRestProv !== null && diasRestProv <= 5 ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-100'}`}>
                      <p className="text-[10px] text-amber-700">Pago límite: {eta.toLocaleDateString('es-MX')} ({embarque.diasCreditoProveedor} días)</p>
                    </div>
                  )
                })()}
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                <div className="flex gap-2 mt-3">
                  <input className="input flex-1 text-xs" placeholder="URL o folio de factura..." id="fact-prov-input" />
                  <button className="btn-primary text-xs py-1.5" onClick={async () => {
                    const val = document.getElementById('fact-prov-input').value
                    if(val) { await updateDoc(doc(db,'embarques',id),{factura_proveedor_url:val,updatedAt:serverTimestamp()}); fetchEmbarque() }
                  }}>Guardar</button>
                </div>
              </div>
            )}
          </div>

          {/* Factura cliente */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-gray-800">Factura al cliente</p>
                <p className="text-xs text-gray-400">Documento fiscal emitido</p>
              </div>
              {embarque.factura_cliente_url
                ? <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-lg font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Emitida</span>
                : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-lg">Pendiente</span>}
            </div>
            {embarque.factura_cliente_url ? (
              <div className="space-y-2">
                <a href={embarque.factura_cliente_url} target="_blank" rel="noreferrer" className="btn-secondary text-xs inline-flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Ver factura
                </a>
                {embarque.diasCredito && embarque.fechaETA && (() => {
                  const eta = new Date(embarque.fechaETA)
                  eta.setDate(eta.getDate() + Number(embarque.diasCredito))
                  return (
                    <div className={`rounded-lg px-3 py-2 ${diasRestCliente !== null && diasRestCliente <= 5 ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-100'}`}>
                      <p className="text-[10px] text-brand">Cobro límite: {eta.toLocaleDateString('es-MX')} ({embarque.diasCredito} días)</p>
                    </div>
                  )
                })()}
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                <div className="flex gap-2 mt-3">
                  <input className="input flex-1 text-xs" placeholder="URL o folio de factura..." id="fact-cli-input" />
                  <button className="btn-primary text-xs py-1.5" onClick={async () => {
                    const val = document.getElementById('fact-cli-input').value
                    if(val) { await updateDoc(doc(db,'embarques',id),{factura_cliente_url:val,updatedAt:serverTimestamp()}); fetchEmbarque() }
                  }}>Guardar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Comentarios */}
      {tab === 'comentarios' && (
        <div className="card p-5">
          <ComentariosEmbarque embarqueId={id} />
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

      {/* Modal solicitud unidad */}
      {showSolicitud && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Solicitar unidad a Pricing</h2>
            <p className="text-xs text-gray-400 mb-4">Pricing recibirá esta solicitud y confirmará disponibilidad</p>
            <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-1">
              <div className="flex justify-between text-xs"><span className="text-gray-400">Embarque</span><span className="font-medium">{embarque.folio}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-400">Cliente</span><span className="font-medium">{embarque.cliente}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-400">Ruta</span><span className="font-medium">{embarque.origenNombre} → {embarque.destinoNombre}</span></div>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tipo de unidad *</label>
                <select className="input" value={solicitud.tipoUnidad} onChange={e => setSolicitud(s => ({...s, tipoUnidad:e.target.value}))}>
                  <option value="">Seleccionar...</option>
                  {["Tráiler","Caja seca","Caja refrigerada","Reefer 53'","Rabón","Tortón","Full"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Temperatura requerida</label>
                <input className="input" placeholder="Ej. -5°F, 32°F, ambiente..." value={solicitud.temperatura}
                  onChange={e => setSolicitud(s => ({...s, temperatura:e.target.value}))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Notas para Pricing</label>
                <textarea className="input resize-none text-xs" rows={2} value={solicitud.notas}
                  onChange={e => setSolicitud(s => ({...s, notas:e.target.value}))} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowSolicitud(false)} className="flex-1 btn-secondary text-xs py-2.5">Cancelar</button>
              <button onClick={enviarSolicitudUnidad} disabled={!solicitud.tipoUnidad || enviandoSolicitud}
                className="flex-1 btn-primary text-xs py-2.5 justify-center disabled:opacity-40 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5" />
                {enviandoSolicitud ? 'Enviando...' : 'Enviar a Pricing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
