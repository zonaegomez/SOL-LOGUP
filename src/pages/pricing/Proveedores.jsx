import { useEffect, useState } from 'react'
import { collection, getDocs, addDoc, doc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../context/AuthContext'
import { Search, Star, MapPin, Phone, Mail, FileText, TrendingUp, Clock, ChevronDown, ChevronRight, Plus, X, Check } from 'lucide-react'

const TIPOS_UNIDAD = ['Reefer 53\'','Caja seca 53\'','Rabón','Tortón','Plataforma','Portacontenedor','Full','Van']
const DOCS_REQUERIDOS = ['Licencia federal','Seguro de responsabilidad civil','Póliza de carga','CAAT','Permiso SCT','Alta SAT','INE operador','Tarjeta de circulación']

function Stars({ n, onChange }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <button key={i} onClick={() => onChange?.(i)} className={onChange ? 'cursor-pointer' : 'cursor-default'}>
          <Star className={`w-3.5 h-3.5 ${i <= n ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
        </button>
      ))}
    </div>
  )
}

// ── Perfil completo del proveedor ─────────────────────────────────────────────
function PerfilProveedor({ proveedor, onClose, onGuardado }) {
  const [tab, setTab] = useState('info')
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState({ ...proveedor })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const guardar = async () => {
    setSaving(true)
    try {
      await updateDoc(doc(db, 'proveedores', proveedor.id), { ...form, updatedAt: serverTimestamp() })
      onGuardado?.()
      setEditando(false)
    } catch(e) { console.error(e) }
    finally { setSaving(false) }
  }

  const kpis = proveedor.kpis || { puntualidad: 0, incidencias: 0, estadias: 0, viajes: 0, calificacion: 0 }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-base font-semibold text-gray-900">{proveedor.nombre}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Stars n={proveedor.calificacion || 0} />
              <span className="text-xs text-gray-400">{proveedor.calificacion?.toFixed(1) || '—'} · {kpis.viajes || 0} viajes</span>
            </div>
          </div>
          <div className="flex gap-2">
            {editando ? (
              <>
                <button onClick={() => setEditando(false)} className="btn-secondary text-xs py-1.5">Cancelar</button>
                <button onClick={guardar} disabled={saving} className="btn-primary text-xs py-1.5">{saving?'Guardando...':'Guardar'}</button>
              </>
            ) : (
              <button onClick={() => setEditando(true)} className="btn-secondary text-xs py-1.5">Editar</button>
            )}
            <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 border-b border-gray-100 overflow-x-auto">
          {[
            { key: 'info', label: 'Información' },
            { key: 'rutas', label: 'Rutas y tarifas' },
            { key: 'documentos', label: 'Documentación' },
            { key: 'kpis', label: 'KPIs' },
            { key: 'contactos', label: 'Contactos' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`pb-2 px-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${tab===t.key?'border-brand text-brand':'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Tab Info */}
          {tab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Razón social / Nombre', 'nombre'],
                  ['RFC', 'rfc'],
                  ['Teléfono principal', 'tel'],
                  ['Email', 'email'],
                  ['Ciudad base', 'ciudad'],
                  ['Estado', 'estado'],
                ].map(([label, key]) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-400 mb-1">{label}</label>
                    {editando
                      ? <input className="input text-xs" value={form[key]||''} onChange={e=>set(key,e.target.value)} />
                      : <p className="text-xs font-medium text-gray-800">{proveedor[key]||'—'}</p>
                    }
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Tipos de unidad que opera</label>
                {editando ? (
                  <div className="flex flex-wrap gap-2">
                    {TIPOS_UNIDAD.map(t => (
                      <button key={t} onClick={() => set('unidades', (form.unidades||[]).includes(t) ? (form.unidades||[]).filter(x=>x!==t) : [...(form.unidades||[]),t])}
                        className={`px-2 py-1 rounded text-xs border transition-colors ${(form.unidades||[]).includes(t)?'bg-brand text-white border-brand':'border-gray-200 text-gray-600'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {(proveedor.unidades||[]).map(u => <span key={u} className="text-[10px] bg-blue-50 text-brand px-2 py-0.5 rounded">{u}</span>)}
                  </div>
                )}
              </div>
              {editando && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Notas internas</label>
                  <textarea className="input resize-none text-xs" rows={3} value={form.notas||''} onChange={e=>set('notas',e.target.value)} />
                </div>
              )}
              {proveedor.notas && !editando && (
                <div className="bg-amber-50 rounded-xl px-4 py-2">
                  <p className="text-xs text-amber-700">{proveedor.notas}</p>
                </div>
              )}
            </div>
          )}

          {/* Tab Rutas y tarifas */}
          {tab === 'rutas' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-600">Rutas y tarifas negociadas</p>
                {editando && (
                  <button onClick={() => set('rutas', [...(form.rutas||[]), { origen:'', destino:'', tipoUnidad:'', tarifa:'', notas:'' }])}
                    className="text-xs text-brand hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Agregar ruta
                  </button>
                )}
              </div>
              {(editando ? form.rutas||[] : proveedor.rutas||[]).length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">Sin rutas registradas</p>
              ) : (editando ? form.rutas||[] : proveedor.rutas||[]).map((r, i) => (
                <div key={i} className={`rounded-xl border p-4 ${editando?'border-blue-100 bg-blue-50':'border-gray-100'}`}>
                  {editando ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="block text-[10px] text-gray-400 mb-0.5">Origen</label><input className="input text-xs py-1" value={r.origen} onChange={e=>{const rs=[...form.rutas];rs[i]={...rs[i],origen:e.target.value};set('rutas',rs)}} /></div>
                      <div><label className="block text-[10px] text-gray-400 mb-0.5">Destino</label><input className="input text-xs py-1" value={r.destino} onChange={e=>{const rs=[...form.rutas];rs[i]={...rs[i],destino:e.target.value};set('rutas',rs)}} /></div>
                      <div><label className="block text-[10px] text-gray-400 mb-0.5">Tipo unidad</label><input className="input text-xs py-1" value={r.tipoUnidad} onChange={e=>{const rs=[...form.rutas];rs[i]={...rs[i],tipoUnidad:e.target.value};set('rutas',rs)}} /></div>
                      <div><label className="block text-[10px] text-gray-400 mb-0.5">Tarifa $</label><input type="number" className="input text-xs py-1" value={r.tarifa} onChange={e=>{const rs=[...form.rutas];rs[i]={...rs[i],tarifa:e.target.value};set('rutas',rs)}} /></div>
                      <div className="col-span-2 flex justify-end"><button onClick={()=>{const rs=form.rutas.filter((_,j)=>j!==i);set('rutas',rs)}} className="text-xs text-red-400 hover:text-red-600">Eliminar ruta</button></div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-800">{r.origen} → {r.destino}</p>
                        <p className="text-[10px] text-gray-400">{r.tipoUnidad}</p>
                      </div>
                      <p className="text-sm font-bold text-brand">${Number(r.tarifa||0).toLocaleString('es-MX')}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Tab Documentación */}
          {tab === 'documentos' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400">Documentos requeridos para operar. Marca los que están vigentes.</p>
              {DOCS_REQUERIDOS.map((doc, i) => {
                const vigente = (proveedor.documentos||{})[doc]
                return (
                  <div key={i} className={`flex items-center justify-between rounded-xl px-4 py-3 border ${vigente?'bg-green-50 border-green-200':'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center gap-2">
                      {vigente ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-gray-300" />}
                      <p className="text-xs font-medium text-gray-700">{doc}</p>
                    </div>
                    {editando && (
                      <button onClick={() => {
                        const docs = { ...(form.documentos||{}), [doc]: !form.documentos?.[doc] }
                        set('documentos', docs)
                      }} className={`text-[10px] px-2 py-1 rounded font-medium ${(form.documentos||{})[doc]?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>
                        {(form.documentos||{})[doc] ? 'Vigente' : 'Marcar vigente'}
                      </button>
                    )}
                    {!editando && <span className={`text-[10px] font-medium ${vigente?'text-green-600':'text-gray-400'}`}>{vigente?'Vigente':'Pendiente'}</span>}
                  </div>
                )
              })}
            </div>
          )}

          {/* Tab KPIs */}
          {tab === 'kpis' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Calificación general', val: `${kpis.calificacion?.toFixed(1)||'—'}/5`, color: 'text-amber-500' },
                  { label: 'Viajes realizados', val: kpis.viajes||0, color: 'text-brand' },
                  { label: 'Puntualidad', val: `${kpis.puntualidad||0}%`, color: kpis.puntualidad>=90?'text-green-600':kpis.puntualidad>=70?'text-amber-500':'text-red-500' },
                  { label: 'Incidencias', val: kpis.incidencias||0, color: kpis.incidencias===0?'text-green-600':'text-red-500' },
                  { label: 'Estadías generadas', val: kpis.estadias||0, color: 'text-amber-500' },
                  { label: 'Cancelaciones', val: kpis.cancelaciones||0, color: kpis.cancelaciones===0?'text-green-600':'text-red-500' },
                ].map(s => (
                  <div key={s.label} className="card p-4 text-center">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
                    <p className="text-xs text-gray-400 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              {kpis.puntualidad >= 0 && (
                <div className="card p-4">
                  <p className="text-xs font-medium text-gray-600 mb-2">Puntualidad</p>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div className={`h-3 rounded-full ${kpis.puntualidad>=90?'bg-green-500':kpis.puntualidad>=70?'bg-amber-400':'bg-red-400'}`} style={{width:`${kpis.puntualidad||0}%`}} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{kpis.puntualidad||0}% de viajes a tiempo</p>
                </div>
              )}
            </div>
          )}

          {/* Tab Contactos */}
          {tab === 'contactos' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400 mb-2">Contactos de escalación — en caso de incidente contactar en este orden</p>
              {editando && (
                <button onClick={() => set('contactos', [...(form.contactos||[]), { nombre:'', puesto:'', tel:'', email:'', nivel:'' }])}
                  className="text-xs text-brand hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Agregar contacto
                </button>
              )}
              {(editando ? form.contactos||[] : proveedor.contactos||[]).length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">Sin contactos de escalación registrados</p>
              ) : (editando ? form.contactos||[] : proveedor.contactos||[]).map((c, i) => (
                <div key={i} className="card p-4">
                  {editando ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="block text-[10px] text-gray-400 mb-0.5">Nombre</label><input className="input text-xs py-1" value={c.nombre} onChange={e=>{const cs=[...form.contactos];cs[i]={...cs[i],nombre:e.target.value};set('contactos',cs)}} /></div>
                      <div><label className="block text-[10px] text-gray-400 mb-0.5">Puesto</label><input className="input text-xs py-1" value={c.puesto} onChange={e=>{const cs=[...form.contactos];cs[i]={...cs[i],puesto:e.target.value};set('contactos',cs)}} /></div>
                      <div><label className="block text-[10px] text-gray-400 mb-0.5">Teléfono</label><input className="input text-xs py-1" value={c.tel} onChange={e=>{const cs=[...form.contactos];cs[i]={...cs[i],tel:e.target.value};set('contactos',cs)}} /></div>
                      <div><label className="block text-[10px] text-gray-400 mb-0.5">Nivel escalación</label>
                        <select className="input text-xs py-1" value={c.nivel} onChange={e=>{const cs=[...form.contactos];cs[i]={...cs[i],nivel:e.target.value};set('contactos',cs)}}>
                          <option value="">Seleccionar</option>
                          <option value="1">1 - Operador</option>
                          <option value="2">2 - Dispatcher</option>
                          <option value="3">3 - Gerente</option>
                          <option value="4">4 - Dueño</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-brand/10 text-brand px-1.5 py-0.5 rounded font-bold">Nivel {c.nivel}</span>
                          <p className="text-xs font-semibold text-gray-800">{c.nombre}</p>
                          <p className="text-[10px] text-gray-400">{c.puesto}</p>
                        </div>
                        <div className="flex gap-3 mt-1">
                          {c.tel && <a href={`tel:${c.tel}`} className="text-[10px] text-brand flex items-center gap-1"><Phone className="w-3 h-3"/>{c.tel}</a>}
                          {c.email && <a href={`mailto:${c.email}`} className="text-[10px] text-gray-400 flex items-center gap-1"><Mail className="w-3 h-3"/>{c.email}</a>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Buscador de proveedores por ruta ──────────────────────────────────────────
function BuscadorRutas({ proveedores }) {
  const [origen, setOrigen] = useState('')
  const [destino, setDestino] = useState('')
  const [resultados, setResultados] = useState(null)

  const buscar = () => {
    if (!origen && !destino) return
    const origenUp = origen.toUpperCase().trim()
    const destinoUp = destino.toUpperCase().trim()

    const conRuta = proveedores.filter(p => {
      const rutas = p.rutas || []
      return rutas.some(r =>
        (!origenUp || r.origen?.toUpperCase().includes(origenUp)) &&
        (!destinoUp || r.destino?.toUpperCase().includes(destinoUp))
      )
    }).map(p => ({ ...p, _tieneRuta: true, _ruta: (p.rutas||[]).find(r => (!origenUp||r.origen?.toUpperCase().includes(origenUp))&&(!destinoUp||r.destino?.toUpperCase().includes(destinoUp))) }))

    // Proveedores sin esa ruta registrada pero que operan en esas zonas
    const sinRuta = proveedores.filter(p => !conRuta.find(r => r.id === p.id)).filter(p => {
      const todasRutas = (p.rutas||[])
      return todasRutas.some(r => r.origen?.toUpperCase().includes(origenUp) || r.destino?.toUpperCase().includes(destinoUp))
    }).map(p => ({ ...p, _tieneRuta: false }))

    setResultados({ conRuta, sinRuta })
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <p className="text-sm font-semibold text-gray-700 mb-3">Buscar proveedor por ruta</p>
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-32">
            <label className="block text-xs text-gray-400 mb-1">Origen</label>
            <input className="input uppercase" placeholder="Ej. VERACRUZ" value={origen} onChange={e=>setOrigen(e.target.value.toUpperCase())} onKeyDown={e=>e.key==='Enter'&&buscar()} />
          </div>
          <div className="flex-1 min-w-32">
            <label className="block text-xs text-gray-400 mb-1">Destino</label>
            <input className="input uppercase" placeholder="Ej. CDMX" value={destino} onChange={e=>setDestino(e.target.value.toUpperCase())} onKeyDown={e=>e.key==='Enter'&&buscar()} />
          </div>
          <div className="flex items-end">
            <button onClick={buscar} className="btn-primary py-2">Buscar</button>
          </div>
        </div>
      </div>

      {resultados && (
        <div className="space-y-3">
          {resultados.conRuta.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-green-700 mb-2">Con ruta registrada ({resultados.conRuta.length})</p>
              {resultados.conRuta.map(p => (
                <div key={p.id} className="card p-4 border-green-100 border mb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{p.nombre}</p>
                      <p className="text-[10px] text-gray-400">{p.tel}</p>
                    </div>
                    <div className="text-right">
                      <Stars n={p.calificacion||0} />
                      {p._ruta?.tarifa && <p className="text-xs font-bold text-brand mt-0.5">${Number(p._ruta.tarifa).toLocaleString('es-MX')}</p>}
                    </div>
                  </div>
                  {p._ruta && <p className="text-[10px] text-green-600 mt-1">{p._ruta.origen} → {p._ruta.destino} · {p._ruta.tipoUnidad}</p>}
                </div>
              ))}
            </div>
          )}
          {resultados.sinRuta.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-600 mb-2">Operan en zonas cercanas — sin ruta exacta ({resultados.sinRuta.length})</p>
              {resultados.sinRuta.map(p => (
                <div key={p.id} className="card p-4 border-amber-100 border mb-2 opacity-80">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{p.nombre}</p>
                      <p className="text-[10px] text-gray-400">{p.tel} · Sin tarifa registrada para esta ruta</p>
                    </div>
                    <Stars n={p.calificacion||0} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {resultados.conRuta.length === 0 && resultados.sinRuta.length === 0 && (
            <div className="card p-8 text-center text-gray-400">
              <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Sin proveedores para esta ruta</p>
              <p className="text-xs mt-1">Considera agregar un proveedor nuevo o ampliar la búsqueda</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Proveedores() {
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [vistaActiva, setVistaActiva] = useState('catalogo') // catalogo | buscador
  const [perfilAbierto, setPerfilAbierto] = useState(null)
  const [showNuevo, setShowNuevo] = useState(false)
  const [formNuevo, setFormNuevo] = useState({ nombre:'', tel:'', email:'', calificacion:5, unidades:[], rutas:[], contactos:[], documentos:{} })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchProveedores() }, [])

  const fetchProveedores = async () => {
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'proveedores'))
      setProveedores(snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(p => !p._demo)
        .sort((a,b) => (a.nombre||'').localeCompare(b.nombre||'')))
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const guardarNuevo = async () => {
    if (!formNuevo.nombre) return
    setSaving(true)
    try {
      await addDoc(collection(db, 'proveedores'), { ...formNuevo, _importado: false, createdAt: serverTimestamp() })
      setShowNuevo(false)
      setFormNuevo({ nombre:'', tel:'', email:'', calificacion:5, unidades:[], rutas:[], contactos:[], documentos:{} })
      fetchProveedores()
    } catch(e) { console.error(e) }
    finally { setSaving(false) }
  }

  const filtrados = busqueda
    ? proveedores.filter(p => p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || p.tel?.includes(busqueda))
    : proveedores

  // Sugerencias del día — proveedores habituales que suelen tener dispo hoy
  const diaSemana = new Date().getDay()
  const sugerencias = proveedores.filter(p => (p.kpis?.viajes||0) > 5).slice(0,3)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Proveedores</h2>
          <p className="text-sm text-gray-400">{proveedores.length} proveedores activos</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button onClick={()=>setVistaActiva('catalogo')} className={`px-3 py-1.5 rounded text-xs font-medium ${vistaActiva==='catalogo'?'bg-white shadow-sm text-gray-900':'text-gray-500'}`}>Catálogo</button>
            <button onClick={()=>setVistaActiva('buscador')} className={`px-3 py-1.5 rounded text-xs font-medium ${vistaActiva==='buscador'?'bg-white shadow-sm text-gray-900':'text-gray-500'}`}>Buscar por ruta</button>
          </div>
          <button onClick={()=>setShowNuevo(true)} className="btn-primary text-xs py-1.5">+ Nuevo proveedor</button>
        </div>
      </div>

      {vistaActiva === 'buscador' ? (
        <BuscadorRutas proveedores={proveedores} />
      ) : (
        <>
          {/* Sugerencias del día */}
          {sugerencias.length > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-brand mb-2">Sugerencias para hoy — proveedores habituales</p>
              <div className="flex gap-3 flex-wrap">
                {sugerencias.map(p => (
                  <button key={p.id} onClick={()=>setPerfilAbierto(p)}
                    className="bg-white border border-blue-100 rounded-lg px-3 py-2 text-left hover:border-brand transition-colors">
                    <p className="text-xs font-medium text-gray-800">{p.nombre}</p>
                    <p className="text-[10px] text-gray-400">{p.kpis?.viajes||0} viajes · {p.tel}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Búsqueda */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input className="input pl-9" placeholder="Buscar por nombre o teléfono..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} />
          </div>

          {/* Grid proveedores */}
          {loading ? (
            <p className="text-center text-gray-400 text-sm py-8">Cargando...</p>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">Sin proveedores registrados</p>
              <button onClick={()=>setShowNuevo(true)} className="btn-primary text-xs mt-3 inline-flex">+ Agregar proveedor</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtrados.map(p => (
                <button key={p.id} onClick={()=>setPerfilAbierto(p)}
                  className="card p-4 text-left hover:border-brand border border-transparent transition-all hover:shadow-md">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{p.nombre}</p>
                      <Stars n={p.calificacion||0} />
                    </div>
                    <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ml-2 ${p.activo!==false?'bg-green-400':'bg-gray-300'}`} />
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(p.unidades||[]).slice(0,3).map(u => <span key={u} className="text-[9px] bg-blue-50 text-brand px-1.5 py-0.5 rounded">{u}</span>)}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[10px] text-gray-400">{(p.rutas||[]).length} rutas · {p.kpis?.viajes||0} viajes</p>
                    {p.tel && <p className="text-[10px] text-gray-400">{p.tel}</p>}
                  </div>
                  {/* Docs incompletos */}
                  {p.documentos && Object.values(p.documentos).filter(Boolean).length < DOCS_REQUERIDOS.length && (
                    <div className="mt-2 text-[9px] text-amber-600 bg-amber-50 px-2 py-1 rounded">
                      Documentación incompleta
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Perfil abierto */}
      {perfilAbierto && (
        <PerfilProveedor
          proveedor={perfilAbierto}
          onClose={() => setPerfilAbierto(null)}
          onGuardado={() => { fetchProveedores(); setPerfilAbierto(null) }}
        />
      )}

      {/* Modal nuevo proveedor */}
      {showNuevo && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Nuevo proveedor</h2>
            <div className="space-y-3">
              <div><label className="block text-xs text-gray-400 mb-1">Nombre / Razón social *</label><input className="input" value={formNuevo.nombre} onChange={e=>setFormNuevo(f=>({...f,nombre:e.target.value}))} /></div>
              <div><label className="block text-xs text-gray-400 mb-1">Teléfono</label><input className="input" value={formNuevo.tel} onChange={e=>setFormNuevo(f=>({...f,tel:e.target.value}))} /></div>
              <div><label className="block text-xs text-gray-400 mb-1">Email</label><input className="input" value={formNuevo.email} onChange={e=>setFormNuevo(f=>({...f,email:e.target.value}))} /></div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Tipos de unidad</label>
                <div className="flex flex-wrap gap-1">
                  {TIPOS_UNIDAD.map(t => (
                    <button key={t} onClick={()=>setFormNuevo(f=>({...f,unidades:(f.unidades||[]).includes(t)?f.unidades.filter(x=>x!==t):[...(f.unidades||[]),t]}))}
                      className={`px-2 py-1 rounded text-xs border ${(formNuevo.unidades||[]).includes(t)?'bg-brand text-white border-brand':'border-gray-200 text-gray-600'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={()=>setShowNuevo(false)} className="flex-1 btn-secondary text-xs">Cancelar</button>
              <button onClick={guardarNuevo} disabled={saving||!formNuevo.nombre} className="flex-1 btn-primary text-xs justify-center">{saving?'Guardando...':'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
