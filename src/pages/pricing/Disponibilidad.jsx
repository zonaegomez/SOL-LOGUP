import { useEffect, useState, useCallback } from 'react'
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, query, where, orderBy } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../context/AuthContext'
import { Clock, Truck, Search, Plus, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react'

const TIPOS_UNIDAD = ['Reefer 53\'','Caja seca 53\'','Rabón','Tortón','Plataforma','Portacontenedor','Full','Van']
const VIGENCIA_MIN = 30 // minutos de vigencia por defecto

function fmt(n) { return n ? '$' + Number(n).toLocaleString('es-MX') : '—' }

// Calcular minutos restantes desde la publicación
function minutosRestantes(creadoEn, vigenciaMin = VIGENCIA_MIN) {
  if (!creadoEn) return vigenciaMin
  const ahora = Date.now()
  const creado = creadoEn?.toDate?.()?.getTime() || creadoEn
  const transcurridos = (ahora - creado) / 60000
  return Math.max(0, vigenciaMin - transcurridos)
}

// Semáforo según tiempo restante
function Semaforo({ minutos, vigencia = VIGENCIA_MIN, onConfirmar, onVencer }) {
  const [mins, setMins] = useState(minutos)

  useEffect(() => {
    const interval = setInterval(() => {
      setMins(m => {
        const nuevo = Math.max(0, m - (1/60))
        if (nuevo === 0) onVencer?.()
        return nuevo
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const pct = (mins / vigencia) * 100
  const color = pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-amber-400' : 'bg-red-500'
  const textColor = pct > 50 ? 'text-green-700' : pct > 20 ? 'text-amber-700' : 'text-red-600'
  const bg = pct > 50 ? 'bg-green-50' : pct > 20 ? 'bg-amber-50' : 'bg-red-50'

  if (mins <= 0) return (
    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-lg font-medium">Vencida</span>
  )

  const minInt = Math.floor(mins)
  const seg = Math.floor((mins - minInt) * 60)

  return (
    <div className={`flex items-center gap-2 ${bg} rounded-lg px-3 py-1.5`}>
      <div className="w-16 bg-gray-200 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full transition-all ${color}`} style={{width:`${pct}%`}} />
      </div>
      <span className={`text-[10px] font-bold tabular-nums ${textColor}`}>{minInt}:{seg.toString().padStart(2,'0')}</span>
      {pct <= 30 && onConfirmar && (
        <button onClick={onConfirmar} className="text-[10px] bg-brand text-white px-2 py-0.5 rounded font-medium">
          Confirmar
        </button>
      )}
    </div>
  )
}

export default function Disponibilidad() {
  const { perfil } = useAuth()
  const [unidades, setUnidades] = useState([])
  const [solicitudes, setSolicitudes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filtro, setFiltro] = useState('')
  const [form, setForm] = useState({
    proveedor: '', origen: '', destino: '', tipoUnidad: "Reefer 53'",
    tarifa: '', contacto: '', tel: '', disponible: 'Hoy', vigenciaMin: 30, notas: ''
  })
  const [saving, setSaving] = useState(false)
  const [modalSolicitud, setModalSolicitud] = useState(null)
  const [notaMensaje, setNotaMensaje] = useState('')

  useEffect(() => { fetchTodo() }, [])

  // Refrescar cada minuto
  useEffect(() => {
    const interval = setInterval(() => fetchTodo(), 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchTodo = async () => {
    setLoading(true)
    try {
      // Solo unidades de hoy y vigentes
      const hoy = new Date(); hoy.setHours(0,0,0,0)
      const snap = await getDocs(query(collection(db,'disponibilidad'), orderBy('creadoEn','desc')))
      const todas = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      // Filtrar vigentes (creadas hoy y no vencidas)
      const vigentes = todas.filter(u => {
        const creado = u.creadoEn?.toDate?.()
        if (!creado) return true
        const mins = minutosRestantes(u.creadoEn, u.vigenciaMin || VIGENCIA_MIN)
        return creado >= hoy && mins > 0
      })
      setUnidades(vigentes)
      const solSnap = await getDocs(query(collection(db,'solicitudesUnidad'), where('estado','==','pendiente')))
      setSolicitudes(solSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const publicar = async () => {
    if (!form.proveedor || !form.origen || !form.destino) return
    setSaving(true)
    try {
      await addDoc(collection(db,'disponibilidad'), {
        ...form, tarifa: Number(form.tarifa),
        vigenciaMin: Number(form.vigenciaMin) || VIGENCIA_MIN,
        publicadoPor: perfil?.nombre || '',
        creadoEn: serverTimestamp(),
      })
      setShowForm(false)
      setForm({ proveedor:'', origen:'', destino:'', tipoUnidad:"Reefer 53'", tarifa:'', contacto:'', tel:'', disponible:'Hoy', vigenciaMin:30, notas:'' })
      fetchTodo()
    } catch(e) { console.error(e) }
    finally { setSaving(false) }
  }

  const confirmarVigencia = async (unidadId) => {
    try {
      await updateDoc(doc(db,'disponibilidad',unidadId), {
        creadoEn: serverTimestamp(), // Reset timer
        confirmadoEn: serverTimestamp(),
      })
      fetchTodo()
    } catch(e) { console.error(e) }
  }

  const eliminarUnidad = async (id) => {
    try {
      await deleteDoc(doc(db,'disponibilidad',id))
      setUnidades(u => u.filter(x => x.id !== id))
    } catch(e) { console.error(e) }
  }

  const solicitarUnidad = async (unidad) => {
    try {
      await addDoc(collection(db,'solicitudesUnidad'), {
        unidadId: unidad.id,
        proveedor: unidad.proveedor,
        origen: unidad.origen,
        destino: unidad.destino,
        tipoUnidad: unidad.tipoUnidad,
        tarifa: unidad.tarifa,
        nota: notaMensaje,
        estado: 'pendiente',
        solicitadoPor: perfil?.nombre || '',
        solicitadoEn: serverTimestamp(),
      })
      setModalSolicitud(null)
      setNotaMensaje('')
      fetchTodo()
      alert('Solicitud enviada a Pricing.')
    } catch(e) { console.error(e) }
  }

  const set = (k,v) => setForm(f => ({...f,[k]:v}))
  const filtradas = filtro
    ? unidades.filter(u => u.origen?.toUpperCase().includes(filtro.toUpperCase()) || u.destino?.toUpperCase().includes(filtro.toUpperCase()) || u.tipoUnidad?.toLowerCase().includes(filtro.toLowerCase()))
    : unidades
  const pendientes = solicitudes.length

  return (
    <div className="space-y-4">
      {/* Banner flujo */}
      <div className="grid grid-cols-4 gap-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
        {[
          { n:1, label:'Pricing publica', desc:'Unidades disponibles del día con timer de vigencia', color:'bg-[#1a3672] text-white' },
          { n:2, label:'Timer 30 min', desc:'Semáforo verde→amarillo→rojo. Pricing confirma si sigue disponible', color:'bg-amber-100 text-amber-800' },
          { n:3, label:'Ventas solicita', desc:'Ve las unidades y solicita la que necesita para su cliente', color:'bg-blue-100 text-brand' },
          { n:4, label:'Pricing confirma', desc:'Asigna el proveedor y el embarque avanza a Posicionamiento', color:'bg-green-100 text-green-700' },
        ].map(s => (
          <div key={s.n} className="text-center">
            <div className={`w-7 h-7 ${s.color} rounded-full flex items-center justify-center text-xs font-bold mx-auto mb-1`}>{s.n}</div>
            <p className="text-[10px] font-semibold text-gray-700">{s.label}</p>
            <p className="text-[9px] text-gray-400 mt-0.5">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-[#1a3672] text-white rounded-xl px-4 py-2">
            <p className="text-xs opacity-70">Disponibles ahora</p>
            <p className="text-2xl font-bold">{filtradas.length}</p>
          </div>
          {pendientes > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
              <p className="text-xs text-amber-600">Solicitudes pendientes</p>
              <p className="text-2xl font-bold text-amber-600">{pendientes}</p>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input className="input pl-9 text-xs py-1.5 w-44" placeholder="Buscar origen o destino..." value={filtro} onChange={e=>setFiltro(e.target.value)} />
          </div>
          <button onClick={fetchTodo} className="btn-secondary text-xs py-1.5 flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" /> Actualizar</button>
          <button onClick={()=>setShowForm(!showForm)} className="btn-primary text-xs py-1.5 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Publicar unidad</button>
        </div>
      </div>

      {/* Solicitudes pendientes */}
      {pendientes > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Solicitudes de unidades recibidas
          </p>
          <div className="space-y-2">
            {solicitudes.map(s => (
              <div key={s.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-amber-100">
                <div>
                  <p className="text-xs font-medium text-gray-800">{s.origen} → {s.destino} · {s.tipoUnidad}</p>
                  <p className="text-[10px] text-gray-500">Solicitado por: {s.solicitadoPor} · {fmt(s.tarifa)}</p>
                  {s.nota && <p className="text-[10px] text-amber-700 mt-0.5">Nota: {s.nota}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={async()=>{
                    await updateDoc(doc(db,'solicitudesUnidad',s.id),{estado:'confirmado',confirmadoEn:serverTimestamp()})
                    if(s.embarqueId){
                      await updateDoc(doc(db,'embarques',s.embarqueId),{etapa:'posicionamiento',estadoUnidad:'confirmado',updatedAt:serverTimestamp()})
                    }
                    fetchTodo()
                  }} className="text-[10px] bg-green-500 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Confirmar
                  </button>
                  <button onClick={async()=>{
                    await updateDoc(doc(db,'solicitudesUnidad',s.id),{estado:'rechazado',rechazadoEn:serverTimestamp()})
                    fetchTodo()
                  }} className="text-[10px] bg-red-50 text-red-600 px-3 py-1.5 rounded-lg font-medium border border-red-200 hover:bg-red-100 flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form publicar */}
      {showForm && (
        <div className="card p-5 space-y-3 border-brand border">
          <p className="text-sm font-semibold text-gray-700">Publicar unidad disponible</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-gray-400 mb-1">Proveedor *</label><input className="input text-xs" value={form.proveedor} onChange={e=>set('proveedor',e.target.value)} /></div>
            <div><label className="block text-xs text-gray-400 mb-1">Tipo de unidad</label>
              <select className="input text-xs" value={form.tipoUnidad} onChange={e=>set('tipoUnidad',e.target.value)}>
                {TIPOS_UNIDAD.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="block text-xs text-gray-400 mb-1">Origen *</label><input className="input text-xs uppercase" value={form.origen} onChange={e=>set('origen',e.target.value.toUpperCase())} /></div>
            <div><label className="block text-xs text-gray-400 mb-1">Destino *</label><input className="input text-xs uppercase" value={form.destino} onChange={e=>set('destino',e.target.value.toUpperCase())} /></div>
            <div><label className="block text-xs text-gray-400 mb-1">Tarifa proveedor $</label><input type="number" className="input text-xs" value={form.tarifa} onChange={e=>set('tarifa',e.target.value)} /></div>
            <div><label className="block text-xs text-gray-400 mb-1">Vigencia (minutos)</label>
              <select className="input text-xs" value={form.vigenciaMin} onChange={e=>set('vigenciaMin',e.target.value)}>
                {[15,30,45,60,90,120].map(m=><option key={m} value={m}>{m} min</option>)}
              </select>
            </div>
            <div><label className="block text-xs text-gray-400 mb-1">Contacto</label><input className="input text-xs" value={form.contacto} onChange={e=>set('contacto',e.target.value)} /></div>
            <div><label className="block text-xs text-gray-400 mb-1">Teléfono</label><input className="input text-xs" value={form.tel} onChange={e=>set('tel',e.target.value)} /></div>
          </div>
          <div><label className="block text-xs text-gray-400 mb-1">Notas</label><input className="input text-xs" value={form.notas} onChange={e=>set('notas',e.target.value)} placeholder="Temperatura disponible, condición especial..." /></div>
          <div className="flex gap-2 justify-end">
            <button onClick={()=>setShowForm(false)} className="btn-secondary text-xs py-1.5">Cancelar</button>
            <button onClick={publicar} disabled={saving||!form.proveedor||!form.origen||!form.destino} className="btn-primary text-xs py-1.5 disabled:opacity-40">{saving?'Publicando...':'Publicar unidad'}</button>
          </div>
        </div>
      )}

      {/* Lista de unidades */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 bg-[#1a3672] flex items-center justify-between">
          <div>
            <p className="text-white font-semibold text-sm">Unidades disponibles hoy</p>
            <p className="text-blue-200 text-xs">{new Date().toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'})} · Se actualizan automáticamente</p>
          </div>
          <div className="bg-white/20 text-white text-xs px-3 py-1 rounded-full">{filtradas.length} unidades</div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : filtradas.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Truck className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Sin unidades disponibles en este momento</p>
            <button onClick={()=>setShowForm(true)} className="btn-primary text-xs mt-3 inline-flex">Publicar primera unidad</button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtradas.map(u => {
              const mins = minutosRestantes(u.creadoEn, u.vigenciaMin || VIGENCIA_MIN)
              return (
                <div key={u.id} className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50">
                  <div className="w-28 shrink-0">
                    <p className="text-sm font-bold text-gray-900">{u.origen}</p>
                    <p className="text-[10px] text-gray-400 truncate">{u.proveedor}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">{u.destino}</p>
                    {u.notas && <p className="text-[10px] text-gray-400">{u.notas}</p>}
                  </div>
                  <span className="text-[10px] bg-blue-50 text-brand px-2 py-0.5 rounded shrink-0">{u.tipoUnidad}</span>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-bold text-brand">{fmt(u.tarifa)}</p>
                    <p className="text-[9px] text-gray-400">costo proveedor</p>
                  </div>
                  {/* Semáforo de vigencia */}
                  <Semaforo
                    minutos={mins}
                    vigencia={u.vigenciaMin || VIGENCIA_MIN}
                    onConfirmar={() => confirmarVigencia(u.id)}
                    onVencer={() => eliminarUnidad(u.id)}
                  />
                  <button onClick={()=>setModalSolicitud(u)}
                    className="shrink-0 text-[10px] bg-brand text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 font-medium">
                    Solicitar
                  </button>
                  <button onClick={()=>eliminarUnidad(u.id)} className="shrink-0 text-gray-300 hover:text-red-400">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal solicitud */}
      {modalSolicitud && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Solicitar esta unidad</h2>
            <p className="text-xs text-gray-400 mb-4">Pricing recibirá la solicitud y coordinará la asignación</p>
            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-1">
              <div className="flex justify-between text-xs"><span className="text-gray-400">Proveedor</span><span className="font-medium">{modalSolicitud.proveedor}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-400">Ruta</span><span className="font-medium">{modalSolicitud.origen} → {modalSolicitud.destino}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-400">Unidad</span><span className="font-medium">{modalSolicitud.tipoUnidad}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-400">Costo proveedor</span><span className="font-bold text-brand">{fmt(modalSolicitud.tarifa)}</span></div>
            </div>
            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-1">Nota para Pricing</label>
              <textarea className="input resize-none text-xs" rows={3} placeholder="Embarque, cliente, fecha requerida..." value={notaMensaje} onChange={e=>setNotaMensaje(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button onClick={()=>{setModalSolicitud(null);setNotaMensaje('')}} className="flex-1 btn-secondary text-xs py-2.5">Cancelar</button>
              <button onClick={()=>solicitarUnidad(modalSolicitud)} className="flex-1 btn-primary text-xs py-2.5 justify-center">Enviar solicitud</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
