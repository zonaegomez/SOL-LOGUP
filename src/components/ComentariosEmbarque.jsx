import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, serverTimestamp, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { Send, MessageSquare } from 'lucide-react'

const AREAS = ['@Ventas', '@Pricing', '@Operaciones', '@Admin']

const ROL_COLOR = {
  ventas: 'bg-blue-50 text-brand border-blue-100',
  pricing: 'bg-purple-50 text-purple-700 border-purple-100',
  operaciones: 'bg-amber-50 text-amber-700 border-amber-100',
  admin: 'bg-gray-50 text-gray-700 border-gray-200',
  maestro: 'bg-purple-100 text-purple-800 border-purple-200',
  gerente: 'bg-green-50 text-green-700 border-green-100',
}

export default function ComentariosEmbarque({ embarqueId }) {
  const { perfil } = useAuth()
  const [comentarios, setComentarios] = useState([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => { fetchComentarios() }, [embarqueId])

  const fetchComentarios = async () => {
    try {
      const snap = await getDocs(query(
        collection(db, 'embarques', embarqueId, 'comentarios'),
        orderBy('creadoEn', 'asc')
      ))
      setComentarios(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch(e) { console.error(e) }
  }

  const enviar = async () => {
    if (!texto.trim()) return
    setEnviando(true)
    try {
      // Detectar menciones @Area
      const menciones = AREAS.filter(a => texto.includes(a)).map(a => a.replace('@','').toLowerCase())
      await addDoc(collection(db, 'embarques', embarqueId, 'comentarios'), {
        texto: texto.trim(),
        autor: perfil?.nombre || 'Usuario',
        rol: perfil?.rol || 'ventas',
        menciones,
        creadoEn: serverTimestamp(),
      })
      setTexto('')
      fetchComentarios()
    } catch(e) { console.error(e) }
    finally { setEnviando(false) }
  }

  const resaltarMenciones = (text) => {
    return text.split(/(@\w+)/g).map((part, i) =>
      AREAS.includes(part)
        ? <span key={i} className="bg-brand/10 text-brand font-semibold rounded px-0.5">{part}</span>
        : part
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare className="w-4 h-4 text-gray-400" />
        <p className="text-sm font-medium text-gray-700">Comentarios internos</p>
        <span className="text-[10px] text-gray-400">Usa @Ventas @Pricing @Operaciones para notificar</span>
      </div>

      {/* Lista de comentarios */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {comentarios.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">Sin comentarios. Sé el primero en agregar uno.</p>
        ) : comentarios.map(c => (
          <div key={c.id} className={`rounded-xl px-4 py-3 border ${ROL_COLOR[c.rol] || 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide">{c.autor}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full border capitalize ${ROL_COLOR[c.rol] || ''}`}>{c.rol}</span>
                {c.menciones?.length > 0 && (
                  <span className="text-[9px] text-gray-400">→ {c.menciones.map(m => `@${m}`).join(', ')}</span>
                )}
              </div>
              <span className="text-[9px] text-gray-400">
                {c.creadoEn?.toDate?.()?.toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) || ''}
              </span>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">{resaltarMenciones(c.texto)}</p>
          </div>
        ))}
      </div>

      {/* Input nuevo comentario */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <textarea
          className="w-full px-4 py-3 text-xs resize-none outline-none"
          rows={3}
          placeholder="Escribe un comentario... Usa @Ventas @Pricing @Operaciones para notificar al área correspondiente"
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) enviar() }}
        />
        <div className="px-4 py-2 bg-gray-50 flex items-center justify-between border-t border-gray-100">
          <div className="flex gap-1">
            {AREAS.map(a => (
              <button key={a} onClick={() => setTexto(t => t + a + ' ')}
                className="text-[10px] bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded hover:border-brand hover:text-brand transition-colors">
                {a}
              </button>
            ))}
          </div>
          <button onClick={enviar} disabled={!texto.trim() || enviando}
            className="flex items-center gap-1.5 text-xs bg-brand text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-40 font-medium">
            <Send className="w-3 h-3" />
            {enviando ? 'Enviando...' : 'Comentar'}
          </button>
        </div>
      </div>
    </div>
  )
}
