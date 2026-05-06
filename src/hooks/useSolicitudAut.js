import { useState } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { AlertTriangle, Lock, Pencil, Building2, UserCog, BarChart2, FileText, CheckCircle2, Send, X } from 'lucide-react'

export function useSolicitudAut(perfil) {
  const [modal, setModal] = useState(null)
  const [justificacion, setJustificacion] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState(null)

  const solicitarAut = (config) => {
    setModal(config)
    setJustificacion('')
    setResultado(null)
  }

  const cerrar = () => { setModal(null); setJustificacion(''); setResultado(null) }

  const enviar = async () => {
    if (!modal) return
    setEnviando(true)
    try {
      await addDoc(collection(db, 'autorizaciones'), {
        tipo: modal.tipo,
        estado: 'pendiente',
        descripcion: modal.descripcion,
        justificacion: justificacion.trim(),
        solicitadoPor: perfil?.nombre || perfil?.email || '',
        rolSolicitante: perfil?.rol || '',
        datos: modal.datos || {},
        creadoEn: serverTimestamp(),
      })
      setResultado('ok')
      if (modal.onEnviado) modal.onEnviado()
      setTimeout(() => cerrar(), 1800)
    } catch(e) { console.error(e); setResultado('error') }
    finally { setEnviando(false) }
  }

  const TIPO_INFO = {
    'eliminar_embarque':  { label: 'Eliminar embarque',        Icon: FileText,     color: 'text-red-600',    bg: 'bg-red-50 border-red-200' },
    'cancelar_embarque':  { label: 'Cancelar embarque',        Icon: X,            color: 'text-red-600',    bg: 'bg-red-50 border-red-200' },
    'eliminar_tarifa':    { label: 'Eliminar tarifa pactada',  Icon: Lock,         color: 'text-red-600',    bg: 'bg-red-50 border-red-200' },
    'editar_tarifa':      { label: 'Editar tarifa pactada',    Icon: Pencil,       color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200' },
    'eliminar_proveedor': { label: 'Eliminar proveedor',       Icon: Building2,    color: 'text-red-600',    bg: 'bg-red-50 border-red-200' },
    'cambio_rol':         { label: 'Cambio de rol',            Icon: UserCog,      color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
    'margen_bajo':        { label: 'Margen por debajo del 20%',Icon: BarChart2,    color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200' },
    'otro':               { label: 'Solicitud especial',       Icon: FileText,     color: 'text-gray-600',   bg: 'bg-gray-50 border-gray-200' },
  }

  const SolicitudModal = () => {
    if (!modal) return null
    const info = TIPO_INFO[modal.tipo] || TIPO_INFO['otro']
    const { Icon } = info

    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
          {resultado === 'ok' ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-sm font-semibold text-green-700">Solicitud enviada al Gerente</p>
              <p className="text-xs text-gray-400 mt-1">La acción quedará pendiente hasta ser autorizada</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${info.bg}`}>
                  <Icon className={`w-5 h-5 ${info.color}`} />
                </div>
                <div>
                  <h2 className={`text-sm font-semibold ${info.color}`}>{info.label}</h2>
                  <p className="text-xs text-gray-400">Requiere autorización del Gerente</p>
                </div>
              </div>

              {modal.descripcion && (
                <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4 space-y-1.5">
                  <p className="text-xs font-medium text-gray-700">{modal.descripcion}</p>
                  {modal.datos && Object.entries(modal.datos)
                    .filter(([k]) => !k.startsWith('_') && k !== 'id')
                    .map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs">
                        <span className="text-gray-400 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                        <span className="font-medium text-gray-700">{String(v)}</span>
                      </div>
                    ))}
                </div>
              )}

              <div className="mb-5">
                <label className="block text-xs text-gray-500 mb-1.5">Justificación *</label>
                <textarea
                  className="input resize-none text-xs"
                  rows={3}
                  placeholder="Explica el motivo al Gerente..."
                  value={justificacion}
                  onChange={e => setJustificacion(e.target.value)}
                />
              </div>

              {resultado === 'error' && (
                <p className="text-xs text-red-500 mb-3">Error al enviar. Intenta de nuevo.</p>
              )}

              <div className="flex gap-2">
                <button onClick={cerrar} className="flex-1 btn-secondary text-xs py-2.5 flex items-center justify-center gap-1.5">
                  <X className="w-3.5 h-3.5" /> Cancelar
                </button>
                <button
                  onClick={enviar}
                  disabled={!justificacion.trim() || enviando}
                  className="flex-1 text-xs bg-brand text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-40 font-medium flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {enviando ? 'Enviando...' : 'Enviar al Gerente'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return { SolicitudModal, solicitarAut, cerrar }
}
