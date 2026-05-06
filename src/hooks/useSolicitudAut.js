import { useState } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

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
    'eliminar_embarque': { label: 'Eliminar embarque', icon: '🗑️', color: 'text-red-600' },
    'cancelar_embarque': { label: 'Cancelar embarque', icon: '❌', color: 'text-red-600' },
    'eliminar_tarifa': { label: 'Eliminar tarifa pactada', icon: '🔒', color: 'text-red-600' },
    'editar_tarifa': { label: 'Editar tarifa pactada', icon: '✏️', color: 'text-amber-600' },
    'eliminar_proveedor': { label: 'Eliminar proveedor', icon: '🏢', color: 'text-red-600' },
    'cambio_rol': { label: 'Cambio de rol', icon: '👤', color: 'text-purple-600' },
    'margen_bajo': { label: 'Margen por debajo del 20%', icon: '⚠️', color: 'text-amber-600' },
    'otro': { label: 'Solicitud especial', icon: '📋', color: 'text-gray-600' },
  }

  const SolicitudModal = () => {
    if (!modal) return null
    const info = TIPO_INFO[modal.tipo] || TIPO_INFO['otro']
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
          {resultado === 'ok' ? (
            <div className="text-center py-6">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-sm font-semibold text-green-700">Solicitud enviada al Gerente</p>
              <p className="text-xs text-gray-400 mt-1">La acción quedará pendiente hasta ser autorizada</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{info.icon}</span>
                <div>
                  <h2 className={`text-base font-semibold ${info.color}`}>{info.label}</h2>
                  <p className="text-xs text-gray-400">Requiere autorización del Gerente</p>
                </div>
              </div>
              {modal.descripcion && (
                <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4 space-y-1">
                  <p className="text-xs text-gray-600 font-medium">{modal.descripcion}</p>
                  {modal.datos && Object.entries(modal.datos)
                    .filter(([k]) => !k.startsWith('_') && k !== 'id')
                    .map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs">
                        <span className="text-gray-400 capitalize">{k.replace(/([A-Z])/g,' $1')}</span>
                        <span className="font-medium text-gray-700">{String(v)}</span>
                      </div>
                  ))}
                </div>
              )}
              <div className="mb-4">
                <label className="block text-xs text-gray-500 mb-1">Justificación *</label>
                <textarea className="input resize-none text-xs" rows={3}
                  placeholder="Explica el motivo de la solicitud al Gerente..."
                  value={justificacion} onChange={e => setJustificacion(e.target.value)} />
              </div>
              {resultado === 'error' && <p className="text-xs text-red-500 mb-3">Error al enviar. Intenta de nuevo.</p>}
              <div className="flex gap-2">
                <button onClick={cerrar} className="flex-1 btn-secondary text-xs py-2.5">Cancelar</button>
                <button onClick={enviar} disabled={!justificacion.trim() || enviando}
                  className="flex-1 text-xs bg-brand text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-40 font-medium">
                  {enviando ? '⏳ Enviando...' : '📨 Enviar al Gerente'}
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
