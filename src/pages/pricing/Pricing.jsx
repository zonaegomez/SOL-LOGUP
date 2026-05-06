import { useEffect, useState } from 'react'
import { collection, getDocs, addDoc, serverTimestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../context/AuthContext'
import Proveedores from './Proveedores'
import Disponibilidad from './Disponibilidad'
import CotizadorInteligente from './CotizadorInteligente'
import { useSolicitudAut } from '../../hooks/useSolicitudAut'

const TABS = [
  { key: 'proveedores', label: 'Proveedores' },
  { key: 'disponibilidad', label: 'Disponibilidad' },
  { key: 'tarifas', label: 'Tarifas por ruta' },
  { key: 'cotizador', label: 'Cotizador inteligente' },
]

const TIPOS_UNIDAD = ['Tráiler', 'Caja seca', 'Caja refrigerada', 'Rabón', 'Tortón', 'Plataforma', 'Pipa']
const TIPOS_SERVICIO = ['FTL', 'LTL', 'Internacional', 'Refrigerado']

const RUTAS_COMUNES = [
  'Monterrey - CDMX', 'Monterrey - Guadalajara', 'Monterrey - Laredo',
  'Monterrey - Saltillo', 'Monterrey - Querétaro', 'Monterrey - Puebla',
  'CDMX - Guadalajara', 'Saltillo - CDMX', 'Laredo - CDMX',
]

const DISTANCIAS = {
  'Monterrey - CDMX': 910, 'Monterrey - Guadalajara': 690, 'Monterrey - Laredo': 240,
  'Monterrey - Saltillo': 87, 'Monterrey - Querétaro': 750, 'Monterrey - Puebla': 1050,
  'CDMX - Guadalajara': 540, 'Saltillo - CDMX': 980, 'Laredo - CDMX': 1150,
}

// DEMO data
const PROVEEDORES_DEMO = [
  { id:'p1', nombre:'Transportes Regio Express', contacto:'Carlos Méndez', tel:'81-2233-4455', email:'carlos@regioexpress.mx', unidades:['Tráiler','Caja seca'], rutas:['Monterrey - CDMX','Monterrey - Guadalajara'], calificacion:4.8, activo:true, _demo:true },
  { id:'p2', nombre:'Fletes del Norte S.A.', contacto:'Ana Rodríguez', tel:'81-5566-7788', email:'ana@fletesnorte.mx', unidades:['Caja refrigerada','Rabón'], rutas:['Monterrey - Laredo','Monterrey - Saltillo'], calificacion:4.5, activo:true, _demo:true },
  { id:'p3', nombre:'Logística Integral MX', contacto:'Pedro Garza', tel:'81-9900-1122', email:'pedro@logimx.com', unidades:['Tráiler','Plataforma','Tortón'], rutas:['Monterrey - CDMX','CDMX - Guadalajara'], calificacion:4.2, activo:true, _demo:true },
  { id:'p4', nombre:'Transportes Cruz Roja', contacto:'María Sánchez', tel:'83-3344-5566', email:'maria@cruztrans.mx', unidades:['Caja seca','Rabón'], rutas:['Monterrey - Querétaro','Saltillo - CDMX'], calificacion:3.9, activo:false, _demo:true },
]

const TARIFAS_DEMO = [
  { id:'t1', proveedor:'Transportes Regio Express', ruta:'Monterrey - CDMX', tipoUnidad:'Tráiler', tipoServicio:'FTL', tarifa:14500, combustible:18, _demo:true },
  { id:'t2', proveedor:'Logística Integral MX', ruta:'Monterrey - CDMX', tipoUnidad:'Tráiler', tipoServicio:'FTL', tarifa:13800, combustible:18, _demo:true },
  { id:'t3', proveedor:'Transportes Regio Express', ruta:'Monterrey - Guadalajara', tipoUnidad:'Tráiler', tipoServicio:'FTL', tarifa:11200, combustible:18, _demo:true },
  { id:'t4', proveedor:'Fletes del Norte S.A.', ruta:'Monterrey - Laredo', tipoUnidad:'Caja refrigerada', tipoServicio:'Refrigerado', tarifa:8900, combustible:20, _demo:true },
  { id:'t5', proveedor:'Logística Integral MX', ruta:'CDMX - Guadalajara', tipoUnidad:'Tráiler', tipoServicio:'FTL', tarifa:9500, combustible:18, _demo:true },
  { id:'t6', proveedor:'Fletes del Norte S.A.', ruta:'Monterrey - Saltillo', tipoUnidad:'Rabón', tipoServicio:'LTL', tarifa:3200, combustible:18, _demo:true },
]

const fmt = (n) => '$' + Number(n||0).toLocaleString('es-MX', {minimumFractionDigits:0})

// ─── PROVEEDORES ──────────────────────────────────────────────────────────────
function TabProveedores() {
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nombre:'', contacto:'', tel:'', email:'', unidades:[], rutas:[] })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchProveedores() }, [])

  const fetchProveedores = async () => {
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'proveedores'))
      const reales = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setProveedores([...PROVEEDORES_DEMO, ...reales])
    } catch(e) { setProveedores(PROVEEDORES_DEMO) }
    finally { setLoading(false) }
  }

  const guardar = async () => {
    if(!form.nombre) return
    setSaving(true)
    try {
      await addDoc(collection(db, 'proveedores'), { ...form, calificacion: 5, activo: true, createdAt: serverTimestamp() })
      setShowForm(false)
      setForm({ nombre:'', contacto:'', tel:'', email:'', unidades:[], rutas:[] })
      fetchProveedores()
    } catch(e) { console.error(e) }
    finally { setSaving(false) }
  }

  const set = (k,v) => setForm(f => ({...f, [k]: v}))

  const Stars = ({n}) => (
    <span className="text-amber-400 text-xs">
      {'★'.repeat(Math.floor(n))}{'☆'.repeat(5-Math.floor(n))}
      <span className="text-gray-400 ml-1">{n}</span>
    </span>
  )

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{proveedores.length} proveedores registrados</p>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-xs py-1.5">+ Nuevo proveedor</button>
      </div>

      {showForm && (
        <div className="card p-5 space-y-3 border-brand border">
          <p className="text-sm font-semibold text-gray-700">Nuevo proveedor</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-gray-500 mb-1">Nombre / Razón social *</label><input className="input" value={form.nombre} onChange={e=>set('nombre',e.target.value)} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Contacto</label><input className="input" value={form.contacto} onChange={e=>set('contacto',e.target.value)} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Teléfono</label><input className="input" value={form.tel} onChange={e=>set('tel',e.target.value)} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Email</label><input className="input" value={form.email} onChange={e=>set('email',e.target.value)} /></div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-2">Tipos de unidad que opera</label>
            <div className="flex flex-wrap gap-2">
              {TIPOS_UNIDAD.map(t => (
                <button key={t} onClick={() => set('unidades', form.unidades.includes(t) ? form.unidades.filter(x=>x!==t) : [...form.unidades, t])}
                  className={`px-2 py-1 rounded text-xs border transition-colors ${form.unidades.includes(t) ? 'bg-brand text-white border-brand' : 'border-gray-200 text-gray-600'}`}
                >{t}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="btn-secondary text-xs py-1.5">Cancelar</button>
            <button onClick={guardar} disabled={saving} className="btn-primary text-xs py-1.5">{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? <p className="text-gray-400 text-sm col-span-2">Cargando...</p> : proveedores.map(p => (
          <div key={p.id} className={`card p-4 ${!p.activo ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-800">{p.nombre}</p>
                  {p._demo && <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100">DEMO</span>}
                  {!p.activo && <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Inactivo</span>}
                </div>
                <Stars n={p.calificacion} />
              </div>
              <div className="text-right text-xs text-gray-500">
                <p>{p.contacto}</p>
                <p>{p.tel}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {(p.unidades||[]).map(u => <span key={u} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{u}</span>)}
            </div>
            <div className="flex flex-wrap gap-1">
              {(p.rutas||[]).map(r => <span key={r} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{r}</span>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── TARIFAS ──────────────────────────────────────────────────────────────────
function TabTarifas() {
  const { perfil } = useAuth()
  const { SolicitudModal, solicitarAut } = useSolicitudAut(perfil)
  const [tarifas, setTarifas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filtroRuta, setFiltroRuta] = useState('')
  const [form, setForm] = useState({ proveedor:'', ruta:'', tipoUnidad:'Tráiler', tipoServicio:'FTL', tarifa:'', combustible:18 })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchTarifas() }, [])

  const fetchTarifas = async () => {
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'tarifas'))
      const reales = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setTarifas([...TARIFAS_DEMO, ...reales])
    } catch(e) { setTarifas(TARIFAS_DEMO) }
    finally { setLoading(false) }
  }

  const guardar = async () => {
    if(!form.proveedor || !form.ruta || !form.tarifa) return
    setSaving(true)
    try {
      await addDoc(collection(db, 'tarifas'), { ...form, tarifa: Number(form.tarifa), createdAt: serverTimestamp() })
      setShowForm(false)
      setForm({ proveedor:'', ruta:'', tipoUnidad:'Tráiler', tipoServicio:'FTL', tarifa:'', combustible:18 })
      fetchTarifas()
    } catch(e) { console.error(e) }
    finally { setSaving(false) }
  }

  const set = (k,v) => setForm(f => ({...f, [k]: v}))
  const filtradas = filtroRuta ? tarifas.filter(t => t.ruta === filtroRuta) : tarifas
  const rutasUnicas = [...new Set(tarifas.map(t => t.ruta))]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <select className="input text-xs py-1.5 w-auto" value={filtroRuta} onChange={e => setFiltroRuta(e.target.value)}>
            <option value="">Todas las rutas</option>
            {rutasUnicas.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-xs py-1.5">+ Nueva tarifa</button>
      </div>

      {showForm && (
        <div className="card p-5 space-y-3 border-brand border">
          <p className="text-sm font-semibold text-gray-700">Registrar tarifa</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-gray-500 mb-1">Proveedor *</label><input className="input" placeholder="Nombre del transportista" value={form.proveedor} onChange={e=>set('proveedor',e.target.value)} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Ruta *</label>
              <select className="input" value={form.ruta} onChange={e=>set('ruta',e.target.value)}>
                <option value="">Seleccionar...</option>
                {RUTAS_COMUNES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div><label className="block text-xs text-gray-500 mb-1">Tipo de unidad</label>
              <select className="input" value={form.tipoUnidad} onChange={e=>set('tipoUnidad',e.target.value)}>
                {TIPOS_UNIDAD.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="block text-xs text-gray-500 mb-1">Tipo de servicio</label>
              <select className="input" value={form.tipoServicio} onChange={e=>set('tipoServicio',e.target.value)}>
                {TIPOS_SERVICIO.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="block text-xs text-gray-500 mb-1">Tarifa base (MXN) *</label><input type="number" className="input" placeholder="0.00" value={form.tarifa} onChange={e=>set('tarifa',e.target.value)} /></div>

          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="btn-secondary text-xs py-1.5">Cancelar</button>
            <button onClick={guardar} disabled={saving} className="btn-primary text-xs py-1.5">{saving ? 'Guardando...' : 'Guardar tarifa'}</button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              {['Proveedor','Ruta','Unidad','Servicio','Tarifa',''].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Cargando...</td></tr>
            ) : filtradas.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Sin tarifas para esta ruta.</td></tr>
            ) : filtradas.map(t => {
              const comb = t.tarifa * (t.combustible/100)
              const total = t.tarifa + comb
              return (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800 text-xs">
                    {t.proveedor}
                    {t._demo && <span className="ml-1 text-[9px] bg-amber-50 text-amber-600 px-1 rounded">DEMO</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{t.ruta}</td>
                  <td className="px-4 py-3"><span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{t.tipoUnidad}</span></td>
                  <td className="px-4 py-3"><span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded">{t.tipoServicio}</span></td>
                  <td className="px-4 py-3 text-xs font-bold text-brand">{fmt(t.tarifa)}</td>
                  <td className="px-4 py-3">
                    {!t._demo && <button onClick={()=>solicitarAut({
                      tipo:'eliminar_tarifa',
                      descripcion:`Eliminar tarifa: ${t.proveedor} - ${t.ruta}`,
                      datos:{ id:t.id, proveedor:t.proveedor, ruta:t.ruta, tarifa:fmt(t.tarifa) },
                    })} className="text-[10px] text-red-400 hover:text-red-600"></button>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <SolicitudModal />
    </div>
  )
}

// ─── COTIZADOR INTERNO ────────────────────────────────────────────────────────
function TabCotizador() {
  const [form, setForm] = useState({ ruta:'', tipoUnidad:'Tráiler', tipoServicio:'FTL', peso:'', pallets:'', margen:25, urgente:false })
  const [resultado, setResultado] = useState(null)
  const [tarifas, setTarifas] = useState(TARIFAS_DEMO)
  const [solicitandoAut, setSolicitandoAut] = useState(null)
  const [justificacion, setJustificacion] = useState('')
  const { perfil } = useAuth()

  useEffect(() => {
    getDocs(collection(db, 'tarifas')).then(snap => {
      const reales = snap.docs.map(d => ({id:d.id,...d.data()}))
      setTarifas([...TARIFAS_DEMO, ...reales])
    }).catch(() => {})
  }, [])

  const set = (k,v) => setForm(f => ({...f, [k]: v}))

  const cotizar = () => {
    const opciones = tarifas.filter(t =>
      t.ruta === form.ruta &&
      t.tipoUnidad === form.tipoUnidad &&
      t.tipoServicio === form.tipoServicio
    )
    if(opciones.length === 0) { setResultado({ error: 'No hay tarifas registradas para esta combinación.' }); return }

    const resultados = opciones.map(t => {
      let costoBase = t.tarifa
      if(form.urgente) costoBase *= 1.15
      const margen = costoBase * (form.margen/100)
      const precioCliente = costoBase + margen
      const distancia = DISTANCIAS[form.ruta] || 800
      return { proveedor: t.proveedor, costoBase, margen, precioCliente, distancia, _demo: t._demo }
    }).sort((a,b) => a.costoBase - b.costoBase)

    setResultado({ opciones: resultados, ruta: form.ruta, margen: form.margen })
  }

  const solicitarAutorizacion = async (opcion) => {
    try {
      await addDoc(collection(db, 'autorizaciones'), {
        tipo: 'margen_bajo',
        estado: 'pendiente',
        cliente: '(por definir)',
        vendedor: perfil?.nombre || '',
        ruta: form.ruta,
        tipoUnidad: form.tipoUnidad,
        costoProveedor: opcion.costoBase,
        precioCliente: opcion.precioCliente,
        margen: form.margen,
        justificacion: justificacion,
        creadoEn: serverTimestamp(),
      })
      setSolicitandoAut(null)
      setJustificacion('')
      alert(' Solicitud enviada al Gerente para autorización.')
    } catch(e) { console.error(e) }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="card p-5 space-y-4">
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2 mb-2">
        <p className="text-xs font-medium text-brand">Cotizador interno — Solo visible para Pricing</p>
        <p className="text-[10px] text-blue-500">Calcula el costo del proveedor. El margen de ganancia lo define Ventas con autorización del Gerente.</p>
      </div>
      <p className="text-sm font-semibold text-gray-700">Parámetros de cotización</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Ruta *</label>
            <select className="input" value={form.ruta} onChange={e=>set('ruta',e.target.value)}>
              <option value="">Seleccionar ruta...</option>
              {RUTAS_COMUNES.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipo de unidad</label>
            <select className="input" value={form.tipoUnidad} onChange={e=>set('tipoUnidad',e.target.value)}>
              {TIPOS_UNIDAD.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipo de servicio</label>
            <select className="input" value={form.tipoServicio} onChange={e=>set('tipoServicio',e.target.value)}>
              {TIPOS_SERVICIO.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Margen de ganancia (%)</label>
            <input type="number" className="input" value={form.margen} onChange={e=>set('margen',Number(e.target.value))} />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.urgente} onChange={e=>set('urgente',e.target.checked)} className="w-4 h-4 accent-brand" />
              <span className="text-xs text-gray-600"> Servicio urgente (+15%)</span>
            </label>
          </div>
        </div>
        <button onClick={cotizar} disabled={!form.ruta} className="btn-primary w-full justify-center disabled:opacity-40">
          Calcular opciones
        </button>
      </div>

      {resultado && (
        resultado.error ? (
          <div className="card p-4 bg-amber-50 border-amber-200 border">
            <p className="text-sm text-amber-700">{resultado.error}</p>
            <p className="text-xs text-amber-500 mt-1">Agrega tarifas en la pestaña "Tarifas por ruta" para esta combinación.</p>
          </div>
        ) : (
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">Opciones para {resultado.ruta}</p>
              <span className="text-xs text-gray-400">Margen: {resultado.margen}%</span>
            </div>
            {resultado.opciones.map((o, i) => (
              <div key={i} className={`rounded-xl p-4 border-2 ${i===0?'border-brand bg-blue-50':'border-gray-100'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      {i===0 && <span className="text-[10px] bg-brand text-white px-2 py-0.5 rounded-full font-medium">Mejor precio</span>}
                      {o._demo && <span className="text-[9px] bg-amber-50 text-amber-600 px-1 rounded border border-amber-100">DEMO</span>}
                    </div>
                    <p className="text-sm font-semibold text-gray-800 mt-1">{o.proveedor}</p>
                    <p className="text-[10px] text-gray-400">{o.distancia} km · ~{Math.ceil(o.distancia/65)+1}h factor trailer</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center bg-white rounded-lg p-2 border border-gray-100">
                    <p className="text-[10px] text-gray-400 mb-0.5">Costo proveedor</p>
                    <p className="text-sm font-bold text-gray-700">{fmt(o.costoBase)}</p>
                  </div>
                  <div className="text-center bg-white rounded-lg p-2 border border-gray-100">
                    <p className="text-[10px] text-gray-400 mb-0.5">Tu margen</p>
                    <p className="text-sm font-bold text-green-600">+{fmt(o.margen)}</p>
                  </div>
                  <div className={`text-center rounded-lg p-2 border ${i===0?'bg-brand border-brand':'bg-gray-50 border-gray-200'}`}>
                    <p className={`text-[10px] mb-0.5 ${i===0?'text-blue-100':'text-gray-400'}`}>Precio al cliente</p>
                    <p className={`text-sm font-bold ${i===0?'text-white':'text-brand'}`}>{fmt(o.precioCliente)}</p>
                  </div>
                </div>
                {/* Advertencia margen bajo */}
                {form.margen < 20 && (
                  <div className="mt-3">
                    {solicitandoAut === i ? (
                      <div className="space-y-2">
                        <textarea className="input text-xs resize-none" rows={2} placeholder="Justificación para el Gerente..." value={justificacion} onChange={e=>setJustificacion(e.target.value)} />
                        <div className="flex gap-2">
                          <button onClick={()=>setSolicitandoAut(null)} className="flex-1 btn-secondary text-xs py-1.5">Cancelar</button>
                          <button onClick={()=>solicitarAutorizacion(o)} disabled={!justificacion.trim()} className="flex-1 text-xs bg-amber-500 text-white py-1.5 rounded-lg hover:bg-amber-600 disabled:opacity-50">
                             Enviar al Gerente
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center justify-between">
                        <p className="text-[10px] text-amber-700"> Margen {form.margen}% requiere autorización del Gerente</p>
                        <button onClick={()=>setSolicitandoAut(i)} className="text-[10px] bg-amber-500 text-white px-2 py-1 rounded font-medium">
                          Solicitar
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}

// ─── DISPONIBILIDAD ───────────────────────────────────────────────────────────
const UNIDADES_DEMO = [
  { id:'u1', proveedor:'Transportes Regio Express', origen:'MTY', destino:'CDMX/MTY', tipoUnidad:'Termo conge/Seco', tarifa:14500, disponible:'Hoy', contacto:'Carlos Méndez', tel:'81-2233-4455', _demo:true },
  { id:'u2', proveedor:'Fletes del Norte S.A.', origen:'CDMX', destino:'CDMX/MTY', tipoUnidad:'Termo conge/Seco', tarifa:13200, disponible:'Hoy', contacto:'Ana Rodríguez', tel:'81-5566-7788', _demo:true },
  { id:'u3', proveedor:'Logística Integral MX', origen:'LEON, GTO', destino:'MTY/CDMX/PUEBLA', tipoUnidad:'Termo conge/Seco', tarifa:15800, disponible:'Hoy', contacto:'Pedro Garza', tel:'81-9900-1122', _demo:true },
  { id:'u4', proveedor:'Transportes Regio Express', origen:'MTY', destino:'CDMX/GDL', tipoUnidad:'Termo conge/Seco', tarifa:13900, disponible:'Hoy', contacto:'Carlos Méndez', tel:'81-2233-4455', _demo:true },
  { id:'u5', proveedor:'Fletes del Norte S.A.', origen:'CDMX', destino:'HERMOSILLO/CDMX/OBREGON', tipoUnidad:'Termo conge/Seco', tarifa:18500, disponible:'Hoy', contacto:'Ana Rodríguez', tel:'81-5566-7788', _demo:true },
  { id:'u6', proveedor:'Logística Integral MX', origen:'MTY', destino:'ALTAMIRA', tipoUnidad:'Caja seca', tarifa:9800, disponible:'Hoy', contacto:'Pedro Garza', tel:'81-9900-1122', _demo:true },
  { id:'u7', proveedor:'Transportes Cruz Roja', origen:'ALTAMIRA', destino:'MTY', tipoUnidad:'Caja seca', tarifa:9500, disponible:'Hoy', contacto:'María Sánchez', tel:'83-3344-5566', _demo:true },
  { id:'u8', proveedor:'Logística Integral MX', origen:'GDL', destino:'CDMX', tipoUnidad:'Tráiler', tarifa:9200, disponible:'Hoy', contacto:'Pedro Garza', tel:'81-9900-1122', _demo:true },
  { id:'u9', proveedor:'Fletes del Norte S.A.', origen:'MCALLEN', destino:'MTY', tipoUnidad:'Termo conge/Seco', tarifa:8900, disponible:'Hoy', contacto:'Ana Rodríguez', tel:'81-5566-7788', _demo:true },
]

function TabDisponibilidad({ rol }) {
  const [unidades, setUnidades] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [solicitudes, setSolicitudes] = useState([])
  const [modalSolicitud, setModalSolicitud] = useState(null)
  const [notaMensaje, setNotaMensaje] = useState('')
  const [form, setForm] = useState({ proveedor:'', origen:'', destino:'', tipoUnidad:'Tráiler', tarifa:'', contacto:'', tel:'', disponible:'Hoy' })
  const [saving, setSaving] = useState(false)
  const [filtro, setFiltro] = useState('')

  useEffect(() => { fetchUnidades(); fetchSolicitudes() }, [])

  const fetchUnidades = async () => {
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'disponibilidad'))
      const reales = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setUnidades([...UNIDADES_DEMO, ...reales])
    } catch(e) { setUnidades(UNIDADES_DEMO) }
    finally { setLoading(false) }
  }

  const fetchSolicitudes = async () => {
    try {
      const snap = await getDocs(collection(db, 'solicitudesUnidad'))
      setSolicitudes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch(e) {}
  }

  const guardar = async () => {
    if(!form.proveedor || !form.origen || !form.destino) return
    setSaving(true)
    try {
      await addDoc(collection(db, 'disponibilidad'), { ...form, tarifa: Number(form.tarifa), fecha: new Date().toISOString(), createdAt: serverTimestamp() })
      setShowForm(false)
      setForm({ proveedor:'', origen:'', destino:'', tipoUnidad:'Tráiler', tarifa:'', contacto:'', tel:'', disponible:'Hoy' })
      fetchUnidades()
    } catch(e) { console.error(e) }
    finally { setSaving(false) }
  }

  const solicitarUnidad = async (unidad) => {
    try {
      await addDoc(collection(db, 'solicitudesUnidad'), {
        unidadId: unidad.id,
        proveedor: unidad.proveedor,
        origen: unidad.origen,
        destino: unidad.destino,
        tipoUnidad: unidad.tipoUnidad,
        tarifa: unidad.tarifa,
        nota: notaMensaje,
        estado: 'pendiente',
        solicitadoEn: serverTimestamp(),
      })
      setModalSolicitud(null)
      setNotaMensaje('')
      alert(' Solicitud enviada a Pricing. Recibirás confirmación pronto.')
      fetchSolicitudes()
    } catch(e) { console.error(e) }
  }

  const set = (k,v) => setForm(f => ({...f, [k]: v}))
  const filtradas = filtro ? unidades.filter(u => u.origen.includes(filtro.toUpperCase()) || u.destino.includes(filtro.toUpperCase()) || u.tipoUnidad.toLowerCase().includes(filtro.toLowerCase())) : unidades
  const pendientes = solicitudes.filter(s => s.estado === 'pendiente').length
  const solicitudesPendientes = solicitudes.filter(s => s.estado === 'pendiente')

  const actualizarSolicitud = async (solicitudId, nuevoEstado) => {
    try {
      await updateDoc(doc(db, 'solicitudesUnidad', solicitudId), {
        estado: nuevoEstado,
        actualizadoEn: serverTimestamp(),
        confirmadoPor: nuevoEstado === 'confirmado' ? 'Pricing' : undefined,
      })
      // Si confirma y tiene embarqueId → avanzar embarque a posicionamiento
      if (nuevoEstado === 'confirmado') {
        const sol = solicitudes.find(s => s.id === solicitudId)
        if (sol?.embarqueId) {
          const { doc: fsDoc, updateDoc: fsUpdate, addDoc, collection: fsCol } = await import('firebase/firestore')
          await fsUpdate(fsDoc(db, 'embarques', sol.embarqueId), {
            etapa: 'posicionamiento',
            estadoUnidad: 'confirmado',
            proveedor_nombre: sol.proveedor || '',
            updatedAt: serverTimestamp(),
          })
          await addDoc(fsCol(db, 'embarques', sol.embarqueId, 'historico'), {
            tipo: 'unidad_confirmada',
            descripcion: `Unidad confirmada por Pricing: ${sol.tipoUnidad} ${sol.temperatura || ''}`,
            usuario: 'Pricing',
            timestamp: serverTimestamp(),
          })
        }
      }
      setSolicitudes(prev => prev.map(s => s.id === solicitudId ? {...s, estado: nuevoEstado} : s))
    } catch(e) { console.error(e) }
  }

  return (
    <div className="space-y-4">
      {/* Banner de flujo */}
      <div className="grid grid-cols-3 gap-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
        <div className="text-center">
          <div className="w-8 h-8 bg-[#1a3672] text-white rounded-full flex items-center justify-center text-xs font-bold mx-auto mb-1">1</div>
          <p className="text-xs font-semibold text-gray-700">Pricing publica</p>
          <p className="text-[10px] text-gray-400">Registra unidades disponibles del día con tarifa del proveedor</p>
        </div>
        <div className="text-center">
          <div className="w-8 h-8 bg-blue-100 text-brand rounded-full flex items-center justify-center text-xs font-bold mx-auto mb-1">2</div>
          <p className="text-xs font-semibold text-gray-700">Ventas solicita</p>
          <p className="text-[10px] text-gray-400">El vendedor ve las unidades y solicita la que necesita para su cliente</p>
        </div>
        <div className="text-center">
          <div className="w-8 h-8 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold mx-auto mb-1">3</div>
          <p className="text-xs font-semibold text-gray-700">Pricing confirma</p>
          <p className="text-[10px] text-gray-400">Pricing confirma la tarifa y asigna el proveedor</p>
        </div>
        <div className="col-span-3 border-t border-gray-200 pt-3 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-[10px] font-bold">4</div>
            <p className="text-xs font-semibold text-gray-700">Operaciones coordina y supervisa</p>
            <p className="text-[10px] text-gray-400 ml-1">— Hoja de viaje, monitoreo y seguimiento hasta entrega</p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-[#1a3672] text-white rounded-xl px-4 py-2">
            <p className="text-xs opacity-80">Unidades disponibles hoy</p>
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
          <input className="input text-xs py-1.5 w-44" placeholder="Buscar origen o destino..." value={filtro} onChange={e=>setFiltro(e.target.value)} />
          <button onClick={() => setShowForm(!showForm)} className="btn-primary text-xs py-1.5">+ Agregar unidad</button>
        </div>
      </div>

      {/* Solicitudes pendientes (solo pricing/admin) */}
      {pendientes > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-3">⏳ Solicitudes pendientes de confirmar</p>
          <div className="space-y-2">
            {solicitudesPendientes.map(s => (
              <div key={s.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-amber-100">
                <div>
                  <p className="text-xs font-medium text-gray-800">{s.origen} → {s.destino} · {s.tipoUnidad}</p>
                  <p className="text-[10px] text-gray-500">Proveedor: {s.proveedor} · {fmt(s.tarifa)}</p>
                  {s.nota && <p className="text-[10px] text-amber-700 mt-0.5">Nota: {s.nota}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => actualizarSolicitud(s.id, 'confirmado')}
                    className="text-[10px] bg-green-500 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-green-600">Confirmar</button>
                  <button
                    onClick={() => actualizarSolicitud(s.id, 'rechazado')}
                    className="text-[10px] bg-red-50 text-red-600 px-3 py-1.5 rounded-lg font-medium border border-red-200 hover:bg-red-100">Rechazar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formulario nueva unidad */}
      {showForm && (
        <div className="card p-5 space-y-3 border-brand border">
          <p className="text-sm font-semibold text-gray-700">Registrar unidad disponible</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-gray-500 mb-1">Proveedor *</label><input className="input" value={form.proveedor} onChange={e=>set('proveedor',e.target.value)} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Tipo de unidad</label>
              <select className="input" value={form.tipoUnidad} onChange={e=>set('tipoUnidad',e.target.value)}>
                {['Tráiler','Caja seca','Caja refrigerada','Termo conge/Seco','Rabón','Tortón','Plataforma'].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="block text-xs text-gray-500 mb-1">Origen *</label><input className="input uppercase" placeholder="MTY" value={form.origen} onChange={e=>set('origen',e.target.value.toUpperCase())} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Destino / Paradas *</label><input className="input uppercase" placeholder="CDMX/GDL" value={form.destino} onChange={e=>set('destino',e.target.value.toUpperCase())} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Tarifa proveedor (MXN)</label><input type="number" className="input" value={form.tarifa} onChange={e=>set('tarifa',e.target.value)} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Disponibilidad</label>
              <select className="input" value={form.disponible} onChange={e=>set('disponible',e.target.value)}>
                <option>Hoy</option><option>Mañana</option><option>Esta semana</option>
              </select>
            </div>
            <div><label className="block text-xs text-gray-500 mb-1">Contacto</label><input className="input" value={form.contacto} onChange={e=>set('contacto',e.target.value)} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Teléfono</label><input className="input" value={form.tel} onChange={e=>set('tel',e.target.value)} /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="btn-secondary text-xs py-1.5">Cancelar</button>
            <button onClick={guardar} disabled={saving} className="btn-primary text-xs py-1.5">{saving?'Guardando...':'Guardar unidad'}</button>
          </div>
        </div>
      )}

      {/* Lista de unidades */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 bg-[#1a3672] flex items-center justify-between">
          <div>
            <p className="text-white font-semibold text-sm">Unidades disponibles</p>
            <p className="text-blue-200 text-xs">Oferta de capacidad · Flota nacional · {new Date().toLocaleDateString('es-MX',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}</p>
          </div>
          <div className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-medium">{filtradas.length} unidades</div>
        </div>

        <div className="divide-y divide-gray-50">
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Cargando...</div>
          ) : filtradas.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">Sin unidades para ese filtro.</div>
          ) : filtradas.map(u => (
            <div key={u.id} className="px-5 py-3 hover:bg-gray-50 transition-colors flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
              <div className="w-28 shrink-0">
                <p className="text-sm font-bold text-gray-900">{u.origen}</p>
                <p className="text-[10px] text-gray-400 truncate">{u.proveedor}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 truncate">{u.destino}</p>
              </div>
              <div className="shrink-0">
                <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">{u.tipoUnidad}</span>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-bold text-brand">{fmt(u.tarifa)}</p>
                <p className="text-[10px] text-gray-400">costo proveedor</p>
              </div>
              <div className="shrink-0">
                <span className="text-[10px] bg-green-50 text-green-700 px-2 py-1 rounded-lg border border-green-200 font-medium">{u.disponible}</span>
              </div>
              <button
                onClick={() => setModalSolicitud(u)}
                className="shrink-0 text-[10px] bg-brand text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Solicitar →
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Modal solicitud */}
      {modalSolicitud && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Solicitar unidad a Pricing</h2>
            <p className="text-xs text-gray-500 mb-4">Se enviará una notificación al equipo de Pricing para confirmar disponibilidad y tarifa.</p>
            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-1">
              <div className="flex justify-between text-xs"><span className="text-gray-500">Proveedor</span><span className="font-medium">{modalSolicitud.proveedor}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-500">Ruta</span><span className="font-medium">{modalSolicitud.origen} → {modalSolicitud.destino}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-500">Unidad</span><span className="font-medium">{modalSolicitud.tipoUnidad}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-500">Costo proveedor</span><span className="font-bold text-brand">{fmt(modalSolicitud.tarifa)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-500">Contacto</span><span className="font-medium">{modalSolicitud.contacto} · {modalSolicitud.tel}</span></div>
            </div>
            <div className="mb-4">
              <label className="block text-xs text-gray-500 mb-1">Nota para Pricing (opcional)</label>
              <textarea className="input resize-none text-xs" rows={3} placeholder="Ej. Cliente necesita para el jueves, confirmar precio con margen 25%..." value={notaMensaje} onChange={e=>setNotaMensaje(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setModalSolicitud(null); setNotaMensaje('') }} className="flex-1 btn-secondary text-xs py-2.5">Cancelar</button>
              <button onClick={() => solicitarUnidad(modalSolicitud)} className="flex-1 btn-primary text-xs py-2.5 justify-center">
                Enviar solicitud
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MAIN ──────────────────────────────────────────────────────────────────────
export default function Pricing() {
  const [tab, setTab] = useState('proveedores')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Pricing</h1>
        <p className="text-sm text-gray-500">Gestión de tarifas, proveedores y disponibilidad</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'proveedores' && <Proveedores />}
      {tab === 'disponibilidad' && <Disponibilidad />}
      {tab === 'tarifas' && <TabTarifas />}
      {tab === 'cotizador' && <CotizadorInteligente />}
    </div>
  )
}
