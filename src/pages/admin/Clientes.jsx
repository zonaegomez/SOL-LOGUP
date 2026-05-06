import { useEffect, useState } from 'react'
import { collection, getDocs, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'

const TIPOS_CLIENTE = ['Cliente directo', 'Broker', 'Gobierno', 'Maquiladora', 'Retail', 'Industria alimentaria', 'Otro']
const ESTADOS_MX = ['Nuevo León','CDMX','Jalisco','Guanajuato','Coahuila','Sonora','Chihuahua','Tamaulipas','Veracruz','Puebla','Querétaro','Baja California','Sinaloa','Otro']

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState('lista') // lista | nuevo | editar
  const [clienteActivo, setClienteActivo] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [msg, setMsg] = useState(null)
  const [saving, setSaving] = useState(false)

  const FORM_VACIO = {
    razonSocial: '', nombreComercial: '', rfc: '', tipo: 'Cliente directo',
    contactoNombre: '', contactoPuesto: '', contactoTel: '', contactoEmail: '',
    contacto2Nombre: '', contacto2Tel: '', contacto2Email: '',
    ciudad: '', estado: 'Nuevo León', cp: '',
    rutasPactadas: [{ origen: '', destino: '', tipoUnidad: '', tarifa: '', tipoServicio: 'FTL' }],
    creditoDias: '', limiteCredito: '', moneda: 'MXN',
    requiereCTPAT: false, requiereTemp: false, tempMinF: '', tempMaxF: '',
    notas: '', activo: true,
  }
  const [form, setForm] = useState(FORM_VACIO)

  useEffect(() => { fetchClientes() }, [])

  const fetchClientes = async () => {
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'clientes'))
      setClientes(snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.razonSocial || '').localeCompare(b.razonSocial || '')))
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const set = (k, v) => setForm(f => ({...f, [k]: v}))

  const setRuta = (i, k, v) => setForm(f => {
    const r = [...f.rutasPactadas]
    r[i] = {...r[i], [k]: v}
    return {...f, rutasPactadas: r}
  })

  const guardar = async () => {
    if (!form.razonSocial) return setMsg({ tipo: 'error', texto: 'La razón social es obligatoria' })
    setSaving(true)
    try {
      if (clienteActivo?.id) {
        await updateDoc(doc(db, 'clientes', clienteActivo.id), { ...form, updatedAt: serverTimestamp() })
        setMsg({ tipo: 'ok', texto: `✅ Cliente actualizado correctamente` })
      } else {
        await addDoc(collection(db, 'clientes'), { ...form, createdAt: serverTimestamp() })
        setMsg({ tipo: 'ok', texto: `✅ Cliente registrado correctamente` })
      }
      fetchClientes()
      setVista('lista')
      setClienteActivo(null)
      setForm(FORM_VACIO)
    } catch(e) {
      setMsg({ tipo: 'error', texto: 'Error al guardar: ' + e.message })
    } finally { setSaving(false) }
  }

  const editar = (c) => {
    setClienteActivo(c)
    setForm({ ...FORM_VACIO, ...c })
    setVista('editar')
  }

  const filtrados = busqueda
    ? clientes.filter(c =>
        c.razonSocial?.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.rfc?.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.nombreComercial?.toLowerCase().includes(busqueda.toLowerCase())
      )
    : clientes

  // ── Formulario ──────────────────────────────────────────────────────────────
  if (vista === 'nuevo' || vista === 'editar') {
    return (
      <div className="space-y-5 max-w-3xl">
        <div className="flex items-center gap-3">
          <button onClick={() => { setVista('lista'); setClienteActivo(null); setForm(FORM_VACIO) }} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{vista === 'editar' ? 'Editar cliente' : 'Nuevo cliente'}</h2>
            <p className="text-xs text-gray-500">Los datos se precargan automáticamente al crear embarques</p>
          </div>
        </div>

        {msg && (
          <div className={`rounded-xl px-4 py-3 text-sm font-medium flex justify-between ${msg.tipo==='ok'?'bg-green-50 text-green-700':'bg-red-50 text-red-600'}`}>
            {msg.texto}<button onClick={()=>setMsg(null)}>×</button>
          </div>
        )}

        {/* Datos fiscales */}
        <div className="card p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Datos fiscales</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Razón social *</label>
              <input className="input" value={form.razonSocial} onChange={e=>set('razonSocial',e.target.value)} placeholder="Ej. SIGMA ALIMENTOS COMERCIAL S.A. DE C.V." />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre comercial</label>
              <input className="input" value={form.nombreComercial} onChange={e=>set('nombreComercial',e.target.value)} placeholder="Ej. Sigma Alimentos" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">RFC</label>
              <input className="input uppercase" value={form.rfc} onChange={e=>set('rfc',e.target.value.toUpperCase())} placeholder="Ej. SAC1407175E6" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tipo de cliente</label>
              <select className="input" value={form.tipo} onChange={e=>set('tipo',e.target.value)}>
                {TIPOS_CLIENTE.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Moneda</label>
              <select className="input" value={form.moneda} onChange={e=>set('moneda',e.target.value)}>
                <option>MXN</option><option>USD</option>
              </select>
            </div>
          </div>
        </div>

        {/* Ubicación */}
        <div className="card p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Ubicación</p>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-xs text-gray-500 mb-1">Ciudad</label><input className="input" value={form.ciudad} onChange={e=>set('ciudad',e.target.value)} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Estado</label>
              <select className="input" value={form.estado} onChange={e=>set('estado',e.target.value)}>
                {ESTADOS_MX.map(e=><option key={e}>{e}</option>)}
              </select>
            </div>
            <div><label className="block text-xs text-gray-500 mb-1">CP</label><input className="input" value={form.cp} onChange={e=>set('cp',e.target.value)} /></div>
          </div>
        </div>

        {/* Contactos */}
        <div className="card p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Contacto principal</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-gray-500 mb-1">Nombre</label><input className="input" value={form.contactoNombre} onChange={e=>set('contactoNombre',e.target.value)} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Puesto</label><input className="input" value={form.contactoPuesto} onChange={e=>set('contactoPuesto',e.target.value)} placeholder="Jefe de Logística" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Teléfono</label><input className="input" value={form.contactoTel} onChange={e=>set('contactoTel',e.target.value)} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Email</label><input className="input" value={form.contactoEmail} onChange={e=>set('contactoEmail',e.target.value)} /></div>
          </div>
          <p className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2 pt-2">Contacto secundario (opcional)</p>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-xs text-gray-500 mb-1">Nombre</label><input className="input" value={form.contacto2Nombre} onChange={e=>set('contacto2Nombre',e.target.value)} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Teléfono</label><input className="input" value={form.contacto2Tel} onChange={e=>set('contacto2Tel',e.target.value)} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Email</label><input className="input" value={form.contacto2Email} onChange={e=>set('contacto2Email',e.target.value)} /></div>
          </div>
        </div>

        {/* Crédito */}
        <div className="card p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Condiciones comerciales</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-gray-500 mb-1">Días de crédito</label><input type="number" className="input" value={form.creditoDias} onChange={e=>set('creditoDias',e.target.value)} placeholder="30" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Límite de crédito $</label><input type="number" className="input" value={form.limiteCredito} onChange={e=>set('limiteCredito',e.target.value)} placeholder="100000" /></div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.requiereCTPAT} onChange={e=>set('requiereCTPAT',e.target.checked)} className="w-4 h-4 accent-brand" />
              <span className="text-xs text-gray-600">Requiere CTPAT compliance</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.requiereTemp} onChange={e=>set('requiereTemp',e.target.checked)} className="w-4 h-4 accent-brand" />
              <span className="text-xs text-gray-600">Requiere temperatura controlada</span>
            </label>
          </div>
          {form.requiereTemp && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs text-gray-500 mb-1">Temp. mínima °F</label><input type="number" className="input" value={form.tempMinF} onChange={e=>set('tempMinF',e.target.value)} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Temp. máxima °F</label><input type="number" className="input" value={form.tempMaxF} onChange={e=>set('tempMaxF',e.target.value)} /></div>
            </div>
          )}
        </div>

        {/* Rutas pactadas */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <p className="text-sm font-semibold text-gray-700">Rutas y tarifas pactadas</p>
            <p className="text-xs text-gray-400">Se precargan al crear un embarque para este cliente</p>
          </div>
          {form.rutasPactadas.map((r, i) => (
            <div key={i} className="grid grid-cols-5 gap-2 items-end">
              <div><label className="block text-xs text-gray-500 mb-1">Origen</label><input className="input text-xs" value={r.origen} onChange={e=>setRuta(i,'origen',e.target.value)} placeholder="MTY" /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Destino</label><input className="input text-xs" value={r.destino} onChange={e=>setRuta(i,'destino',e.target.value)} placeholder="CDMX" /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Tipo unidad</label><input className="input text-xs" value={r.tipoUnidad} onChange={e=>setRuta(i,'tipoUnidad',e.target.value)} placeholder="Tráiler" /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Tarifa $</label><input type="number" className="input text-xs" value={r.tarifa} onChange={e=>setRuta(i,'tarifa',e.target.value)} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Servicio</label>
                <select className="input text-xs" value={r.tipoServicio} onChange={e=>setRuta(i,'tipoServicio',e.target.value)}>
                  {['FTL','LTL','REF','INT','EXP'].map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          ))}
          <button onClick={()=>setForm(f=>({...f,rutasPactadas:[...f.rutasPactadas,{origen:'',destino:'',tipoUnidad:'',tarifa:'',tipoServicio:'FTL'}]}))}
            className="text-xs text-brand hover:underline">+ Agregar ruta</button>
        </div>

        {/* Notas */}
        <div className="card p-5">
          <p className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-3">Notas internas</p>
          <textarea className="input resize-none" rows={3} value={form.notas} onChange={e=>set('notas',e.target.value)} placeholder="Instrucciones especiales, restricciones de horario, requisitos de acceso..." />
        </div>

        <div className="flex gap-3 pb-8">
          <button onClick={()=>{setVista('lista');setClienteActivo(null);setForm(FORM_VACIO)}} className="btn-secondary flex-1 justify-center">Cancelar</button>
          <button onClick={guardar} disabled={saving} className="btn-primary flex-1 justify-center">
            {saving ? 'Guardando...' : vista==='editar' ? 'Guardar cambios' : 'Registrar cliente'}
          </button>
        </div>
      </div>
    )
  }

  // ── Lista ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500">{clientes.length} clientes registrados · Datos precargan en embarques automáticamente</p>
        </div>
        <button onClick={()=>{setForm(FORM_VACIO);setVista('nuevo')}} className="btn-primary">+ Nuevo cliente</button>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium flex justify-between ${msg.tipo==='ok'?'bg-green-50 text-green-700':'bg-red-50 text-red-600'}`}>
          {msg.texto}<button onClick={()=>setMsg(null)}>×</button>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <input className="input" placeholder="Buscar por razón social, nombre comercial o RFC..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} />
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : filtrados.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-3xl mb-3">🏢</p>
            <p className="font-medium">Sin clientes registrados</p>
            <p className="text-sm mt-1">Registra tus clientes para precargar sus datos en embarques.</p>
            <button onClick={()=>{setForm(FORM_VACIO);setVista('nuevo')}} className="btn-primary mt-4 inline-flex">+ Nuevo cliente</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                {['Cliente','RFC','Contacto','Rutas pactadas','Crédito','Estado',''].map(h=>(
                  <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.map(c => (
                <tr key={c.id} className={`hover:bg-gray-50 ${!c.activo?'opacity-50':''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800 text-xs">{c.razonSocial}</p>
                    {c.nombreComercial && <p className="text-[10px] text-gray-400">{c.nombreComercial}</p>}
                    <div className="flex gap-1 mt-1">
                      {c.requiereCTPAT && <span className="text-[9px] bg-blue-50 text-brand px-1.5 rounded">CTPAT</span>}
                      {c.requiereTemp && <span className="text-[9px] bg-cyan-50 text-cyan-700 px-1.5 rounded">❄️ TEMP</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{c.rfc || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    <p>{c.contactoNombre || '—'}</p>
                    {c.contactoTel && <p className="text-[10px] text-gray-400">{c.contactoTel}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {(c.rutasPactadas||[]).filter(r=>r.origen).slice(0,2).map((r,i)=>(
                      <div key={i} className="text-[10px] text-gray-600">{r.origen} → {r.destino} <span className="text-gray-400">{r.tipoServicio}</span></div>
                    ))}
                    {(c.rutasPactadas||[]).filter(r=>r.origen).length > 2 && (
                      <div className="text-[10px] text-gray-400">+{(c.rutasPactadas||[]).filter(r=>r.origen).length-2} más</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {c.creditoDias ? `${c.creditoDias} días` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.activo?'bg-green-50 text-green-700':'bg-gray-100 text-gray-500'}`}>
                      {c.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={()=>editar(c)} className="text-xs text-brand hover:underline font-medium">✏️ Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

