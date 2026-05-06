import { useEffect, useState } from 'react'
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, serverTimestamp, query, where, orderBy } from 'firebase/firestore'
import { AlertTriangle, Lock, BarChart2, UserCog, FileText, CheckCircle, XCircle, Clock } from 'lucide-react'
import { db } from '../../firebase'
import { useAuth } from '../../context/AuthContext'

const TIPOS = {
  'margen_bajo':        { label: 'Margen bajo del 20%',     Icon: BarChart2,  color: 'bg-amber-50 border-amber-200 text-amber-800' },
  'eliminar_embarque':  { label: 'Eliminar embarque',       Icon: FileText,   color: 'bg-red-50 border-red-200 text-red-800' },
  'cancelar_embarque':  { label: 'Cancelar embarque',       Icon: XCircle,    color: 'bg-red-50 border-red-200 text-red-800' },
  'tarifa_pactada':     { label: 'Cambio de tarifa',        Icon: Lock,       color: 'bg-red-50 border-red-200 text-red-800' },
  'eliminar_tarifa':    { label: 'Eliminar tarifa',         Icon: Lock,       color: 'bg-red-50 border-red-200 text-red-800' },
  'eliminar_proveedor': { label: 'Eliminar proveedor',      Icon: FileText,   color: 'bg-red-50 border-red-200 text-red-800' },
  'cambio_rol':         { label: 'Cambio de rol',           Icon: UserCog,    color: 'bg-purple-50 border-purple-200 text-purple-800' },
  'otro':               { label: 'Solicitud especial',      Icon: FileText,   color: 'bg-gray-50 border-gray-200 text-gray-700' },
}

const fmt = (n) => '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })

export default function Autorizaciones() {
  const { perfil, puedeAutorizar } = useAuth()
  const [autorizaciones, setAutorizaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('pendiente')
  const [procesando, setProcesando] = useState(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [showRechazo, setShowRechazo] = useState(null)

  useEffect(() => { fetchAutorizaciones() }, [filtro])

  const fetchAutorizaciones = async () => {
    setLoading(true)
    try {
      const q = filtro === 'todas'
        ? query(collection(db, 'autorizaciones'), orderBy('creadoEn', 'desc'))
        : query(collection(db, 'autorizaciones'), where('estado', '==', filtro), orderBy('creadoEn', 'desc'))
      const snap = await getDocs(q)
      setAutorizaciones(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const aprobar = async (aut) => {
    setProcesando(aut.id)
    try {
      await updateDoc(doc(db, 'autorizaciones', aut.id), {
        estado: 'aprobado',
        autorizadoPor: perfil?.nombre || '',
        autorizadoEn: serverTimestamp(),
      })

      const d = aut.datos || {}

      // Ejecutar la acción automáticamente al aprobar
      if (aut.tipo === 'cambio_rol' && aut.usuarioId && aut.rolNuevo) {
        await updateDoc(doc(db, 'usuarios', aut.usuarioId), { rol: aut.rolNuevo, updatedAt: serverTimestamp() })
      }
      else if (aut.tipo === 'eliminar_embarque' && d.id) {
        await deleteDoc(doc(db, 'embarques', d.id))
      }
      else if (aut.tipo === 'cancelar_embarque' && d.id) {
        await updateDoc(doc(db, 'embarques', d.id), { etapa: 'cancelado', updatedAt: serverTimestamp() })
      }
      else if (aut.tipo === 'eliminar_tarifa' && d.id) {
        await deleteDoc(doc(db, 'tarifas', d.id))
      }
      else if (aut.tipo === 'eliminar_proveedor' && d.id) {
        await deleteDoc(doc(db, 'proveedores', d.id))
      }

      fetchAutorizaciones()
    } catch(e) { console.error(e) }
    finally { setProcesando(null) }
  }

  const rechazar = async (aut) => {
    if (!motivoRechazo.trim()) return
    setProcesando(aut.id)
    try {
      await updateDoc(doc(db, 'autorizaciones', aut.id), {
        estado: 'rechazado',
        rechazadoPor: perfil?.nombre || '',
        rechazadoEn: serverTimestamp(),
        motivoRechazo: motivoRechazo.trim(),
      })
      setShowRechazo(null)
      setMotivoRechazo('')
      fetchAutorizaciones()
    } catch(e) { console.error(e) }
    finally { setProcesando(null) }
  }

  const pendientes = autorizaciones.filter(a => a.estado === 'pendiente').length

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Autorizaciones</h1>
          <p className="text-sm text-gray-500">Solicitudes que requieren aprobación del Gerente</p>
        </div>
        {pendientes > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-center">
            <p className="text-2xl font-bold text-red-600">{pendientes}</p>
            <p className="text-xs text-red-500">pendientes</p>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: 'pendiente', label: 'Pendientes' },
          { key: 'aprobado', label: '✅ Aprobadas' },
          { key: 'rechazado', label: '❌ Rechazadas' },
          { key: 'todas', label: 'Todas' },
        ].map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filtro === f.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="card p-8 text-center text-gray-400">Cargando...</div>
      ) : autorizaciones.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <p className="text-3xl mb-3">✅</p>
          <p className="font-medium">Sin solicitudes {filtro === 'pendiente' ? 'pendientes' : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {autorizaciones.map(aut => {
            const tipo = TIPOS[aut.tipo] || TIPOS['otro']
            const isPendiente = aut.estado === 'pendiente'
            return (
              <div key={aut.id} className={`card p-5 border ${isPendiente ? 'border-amber-200' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {(() => { const TipoIcon = tipo.Icon; return (
                        <span className={`text-[10px] px-2 py-0.5 rounded-lg border font-medium flex items-center gap-1 w-fit ${tipo.color}`}>
                          {TipoIcon && <TipoIcon className="w-3 h-3" />} {tipo.label}
                        </span>
                      )})()}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        aut.estado==='pendiente'?'bg-amber-100 text-amber-700':
                        aut.estado==='aprobado'?'bg-green-100 text-green-700':
                        'bg-red-100 text-red-600'
                      }`}>
                        {aut.estado==='pendiente'?'Pendiente':aut.estado==='aprobado'?'Aprobada':'Rechazada'}
                      </span>
                    </div>

                    {/* Datos */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-3">
                      {aut.cliente && <div className="flex gap-2 text-xs"><span className="text-gray-400">Cliente</span><span className="font-medium text-gray-800">{aut.cliente}</span></div>}
                      {aut.vendedor && <div className="flex gap-2 text-xs"><span className="text-gray-400">Solicita</span><span className="font-medium text-gray-800">{aut.vendedor}</span></div>}
                      {aut.solicitadoPor && <div className="flex gap-2 text-xs"><span className="text-gray-400">Solicita</span><span className="font-medium text-gray-800">{aut.solicitadoPor}</span></div>}
                      {aut.ruta && <div className="flex gap-2 text-xs"><span className="text-gray-400">Ruta</span><span className="font-medium text-gray-800">{aut.ruta}</span></div>}
                      {aut.tipoUnidad && <div className="flex gap-2 text-xs"><span className="text-gray-400">Unidad</span><span className="font-medium text-gray-800">{aut.tipoUnidad}</span></div>}
                      {aut.usuarioNombre && <div className="flex gap-2 text-xs"><span className="text-gray-400">Usuario</span><span className="font-medium text-gray-800">{aut.usuarioNombre}</span></div>}
                      {aut.rolActual && <div className="flex gap-2 text-xs"><span className="text-gray-400">Rol actual</span><span className="font-medium text-gray-800">{aut.rolActual}</span></div>}
                      {aut.rolNuevo && <div className="flex gap-2 text-xs"><span className="text-gray-400">Rol nuevo</span><span className="font-bold text-purple-700">{aut.rolNuevo}</span></div>}
                      {aut.descripcion && <div className="col-span-2 flex gap-2 text-xs"><span className="text-gray-400">Detalle</span><span className="font-medium text-gray-800">{aut.descripcion}</span></div>}
                    </div>

                    {/* Números */}
                    {(aut.costoProveedor || aut.precioCliente || aut.margen !== undefined) && (
                      <div className="flex gap-4 bg-gray-50 rounded-xl px-4 py-3 mb-3">
                        {aut.costoProveedor && <div className="text-center"><p className="text-[10px] text-gray-400">Costo proveedor</p><p className="text-sm font-bold text-gray-700">{fmt(aut.costoProveedor)}</p></div>}
                        {aut.precioCliente && <div className="text-center"><p className="text-[10px] text-gray-400">Precio al cliente</p><p className="text-sm font-bold text-gray-700">{fmt(aut.precioCliente)}</p></div>}
                        {aut.margen !== undefined && (
                          <div className="text-center">
                            <p className="text-[10px] text-gray-400">Margen</p>
                            <p className={`text-sm font-bold ${aut.margen < 20 ? 'text-red-600' : 'text-green-600'}`}>{aut.margen}%</p>
                          </div>
                        )}
                        {aut.tarifaActual && <div className="text-center"><p className="text-[10px] text-gray-400">Tarifa actual</p><p className="text-sm font-bold text-gray-700">{fmt(aut.tarifaActual)}</p></div>}
                        {aut.tarifaNueva && <div className="text-center"><p className="text-[10px] text-gray-400">Tarifa nueva</p><p className="text-sm font-bold text-red-600">{fmt(aut.tarifaNueva)}</p></div>}
                      </div>
                    )}

                    {/* Justificación */}
                    {aut.justificacion && (
                      <div className="bg-blue-50 rounded-lg px-3 py-2 mb-3">
                        <p className="text-[10px] text-brand font-medium mb-0.5">Justificación del vendedor:</p>
                        <p className="text-xs text-blue-800">{aut.justificacion}</p>
                      </div>
                    )}

                    {/* Resultado */}
                    {aut.estado === 'aprobado' && (
                      <p className="text-xs text-green-600">Aprobada por {aut.autorizadoPor} · {aut.autorizadoEn?.toDate?.()?.toLocaleString('es-MX') || ''}</p>
                    )}
                    {aut.estado === 'rechazado' && (
                      <div>
                        <p className="text-xs text-red-500">Rechazada por {aut.rechazadoPor}</p>
                        {aut.motivoRechazo && <p className="text-xs text-red-400 mt-0.5">Motivo: {aut.motivoRechazo}</p>}
                      </div>
                    )}

                    {/* Modal motivo rechazo */}
                    {showRechazo === aut.id && (
                      <div className="mt-3 space-y-2">
                        <textarea className="input resize-none text-xs" rows={2} placeholder="Motivo del rechazo (requerido)..." value={motivoRechazo} onChange={e=>setMotivoRechazo(e.target.value)} />
                        <div className="flex gap-2">
                          <button onClick={()=>{setShowRechazo(null);setMotivoRechazo('')}} className="btn-secondary text-xs py-1.5 flex-1">Cancelar</button>
                          <button onClick={()=>rechazar(aut)} disabled={!motivoRechazo.trim()||procesando===aut.id} className="flex-1 text-xs bg-red-500 text-white py-1.5 rounded-lg hover:bg-red-600 disabled:opacity-50">
                            {procesando===aut.id?'Rechazando...':'Confirmar rechazo'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  {isPendiente && puedeAutorizar && showRechazo !== aut.id && (
                    <div className="flex flex-col gap-2 shrink-0">
                      <button onClick={()=>aprobar(aut)} disabled={procesando===aut.id}
                        className="bg-green-500 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 whitespace-nowrap">
                        {procesando===aut.id?'...':'Aprobar'}
                      </button>
                      <button onClick={()=>{setShowRechazo(aut.id);setMotivoRechazo('')}}
                        className="bg-red-50 text-red-600 border border-red-200 text-xs font-medium px-4 py-2 rounded-lg hover:bg-red-100 whitespace-nowrap">
                        Rechazar
                      </button>
                    </div>
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
