import { useState, useEffect } from 'react'
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const CATEGORIAS = [
  { value: 'ftl', label: 'FT - Flete Terrestre Completo' },
  { value: 'ltl', label: 'LTL - Carga Parcial' },
  { value: 'int', label: 'ET - Exportación Terrestre' },
  { value: 'imp', label: 'IT - Importación Terrestre' },
  { value: 'ref', label: 'RF - Refrigerado / Temperatura controlada' },
]

const UNIDADES_SAT = [
  { clave: 'KGM', desc: 'Kilogramo' },
  { clave: 'MTR', desc: 'Metro' },
  { clave: 'LTR', desc: 'Litro' },
  { clave: 'XBX', desc: 'Caja' },
  { clave: 'PZA', desc: 'Pieza' },
  { clave: 'PAL', desc: 'Pallet' },
]

export default function NuevoEmbarque() {
  const navigate = useNavigate()
  const { user, perfil } = useAuth()
  const [loading, setLoading] = useState(false)
  const [ubicaciones, setUbicaciones] = useState([])
  const [clientes, setClientes] = useState([])
  const [step, setStep] = useState(1)

  const [form, setForm] = useState({
    // Datos generales
    cliente: '', clienteRFC: '', referencia: '', categoria: 'ftl', prioridad: 'normal',
    vendedor: perfil?.nombre || user?.email || '',
    seguimiento: '',
    observaciones: '',
    // Ruta
    origenId: '', origenNombre: '', origenCP: '',
    destinoId: '', destinoNombre: '', destinoCP: '',
    fechaCarga: '', fechaETA: '',
    // Carta Porte
    cp_peso: '', cp_unidadPeso: 'KGM', cp_pallets: '',
    cp_descripcion: '', cp_claveSAT: '', cp_valorMercancia: '',
    cp_moneda: 'MXN', cp_seguro: '',
    // Operador/unidad
    op_nombre: '', op_licencia: '', op_placas: '', op_tipoUnidad: '',
  })

  useEffect(() => {
    const fetchCatalogos = async () => {
      const [uSnap, cSnap] = await Promise.all([
        getDocs(collection(db, 'ubicaciones')),
        getDocs(collection(db, 'clientes'))
      ])
      setUbicaciones(uSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setClientes(cSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    }
    fetchCatalogos()
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleUbicacion = (tipo, id) => {
    const ub = ubicaciones.find(u => u.id === id)
    if (!ub) return
    if (tipo === 'origen') {
      set('origenId', id); set('origenNombre', ub.nombre); set('origenCP', ub.cp)
    } else {
      set('destinoId', id); set('destinoNombre', ub.nombre); set('destinoCP', ub.cp)
    }
  }

  const generarFolio = () => {
    const now = new Date()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const yy = String(now.getFullYear()).slice(2)
    const rand = Math.floor(Math.random() * 90000 + 10000)
    return `DT-${yy}${mm}-${rand}`
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const folio = generarFolio()
      const docRef = await addDoc(collection(db, 'embarques'), {
        ...form,
        folio,
        etapa: 'embarcadoCreado',
        status: 'En operación',
        creadoPor: user?.uid,
        creadoPorNombre: perfil?.nombre || user?.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      // Registrar en histórico
      await addDoc(collection(db, 'embarques', docRef.id, 'historico'), {
        etapa: 'Embarque creado',
        usuario: perfil?.nombre || user?.email,
        timestamp: serverTimestamp(),
        tipo: 'sistema',
      })
      navigate(`/embarques/${docRef.id}`)
    } catch (e) {
      console.error(e)
      alert('Error al guardar. Verifica la conexión.')
    } finally {
      setLoading(false)
    }
  }

  const STEPS = ['Datos generales', 'Ruta y fechas', 'Carta Porte', 'Operador / Unidad']

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Nuevo embarque</h1>
          <p className="text-sm text-gray-500">Completa la información para registrar el embarque</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1">
            <button
              onClick={() => setStep(i + 1)}
              className={`flex items-center gap-2 text-xs font-medium transition-colors ${
                step === i + 1 ? 'text-brand' : step > i + 1 ? 'text-green-600' : 'text-gray-400'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 transition-colors ${
                step === i + 1 ? 'border-brand bg-brand text-white' :
                step > i + 1 ? 'border-green-500 bg-green-500 text-white' :
                'border-gray-300 text-gray-400'
              }`}>{step > i + 1 ? '✓' : i + 1}</span>
              <span className="hidden sm:inline">{s}</span>
            </button>
            {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-2 ${step > i + 1 ? 'bg-green-400' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      <div className="card p-6 space-y-5">

        {/* Step 1: Datos generales */}
        {step === 1 && (
          <>
            <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Datos generales</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Cliente *</label>
                {clientes.length > 0 ? (
                  <>
                    <select className="input" value={form.cliente} onChange={e => {
                      const c = clientes.find(x => x.razonSocial === e.target.value)
                      set('cliente', e.target.value)
                      if (c) {
                        // Precargar todos los datos del cliente
                        set('clienteRFC', c.rfc || '')
                        set('clienteId', c.id || '')
                        // Si tiene rutas pactadas, precargar la primera
                        const ruta = (c.rutasPactadas || []).find(r => r.origen)
                        if (ruta) {
                          set('categoria', ruta.tipoServicio?.toLowerCase() || form.categoria)
                          // Buscar ubicaciones por nombre
                          const origen = ubicaciones.find(u => u.nombre?.toUpperCase().includes(ruta.origen?.toUpperCase()))
                          const destino = ubicaciones.find(u => u.nombre?.toUpperCase().includes(ruta.destino?.toUpperCase()))
                          if (origen) { set('origenId', origen.id); set('origenNombre', origen.nombre); set('origenCP', origen.cp) }
                          if (destino) { set('destinoId', destino.id); set('destinoNombre', destino.nombre); set('destinoCP', destino.cp) }
                          if (ruta.tipoUnidad) set('op_tipoUnidad', ruta.tipoUnidad)
                        }
                        // Temperatura si aplica
                        if (c.requiereTemp) {
                          set('cp_temp', c.tempMinF ? `${c.tempMinF}°F` : '')
                        }
                        // Notas del cliente
                        if (c.notas) set('observaciones', c.notas)
                      }
                    }}>
                      <option value="">Seleccionar cliente...</option>
                      {clientes.map(c => <option key={c.id} value={c.razonSocial}>{c.razonSocial}{c.nombreComercial ? ` (${c.nombreComercial})` : ''}</option>)}
                    </select>
                    {/* Badge de datos precargados */}
                    {form.clienteId && (() => {
                      const c = clientes.find(x => x.id === form.clienteId)
                      if (!c) return null
                      return (
                        <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 flex items-start gap-3 flex-wrap">
                          {c.rfc && <span className="text-[10px] text-brand"><strong>RFC:</strong> {c.rfc}</span>}
                          {c.contactoNombre && <span className="text-[10px] text-brand"><strong>Contacto:</strong> {c.contactoNombre} {c.contactoTel ? `· ${c.contactoTel}` : ''}</span>}
                          {c.creditoDias && <span className="text-[10px] text-brand"><strong>Crédito:</strong> {c.creditoDias} días</span>}
                          {c.requiereCTPAT && <span className="text-[10px] bg-brand text-white px-1.5 rounded">CTPAT</span>}
                          {c.requiereTemp && <span className="text-[10px] bg-cyan-500 text-white px-1.5 rounded">❄️ {c.tempMinF}°F</span>}
                          {(c.rutasPactadas||[]).filter(r=>r.origen).length > 0 && (
                            <span className="text-[10px] text-brand"><strong>Rutas:</strong> {(c.rutasPactadas||[]).filter(r=>r.origen).map(r=>`${r.origen}→${r.destino}`).join(', ')}</span>
                          )}
                        </div>
                      )
                    })()}
                  </>
                ) : (
                  <input className="input" placeholder="Razón social del cliente" value={form.cliente} onChange={e => set('cliente', e.target.value)} />
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">RFC del cliente</label>
                <input className="input" placeholder="RFC" value={form.clienteRFC} onChange={e => set('clienteRFC', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Referencia del cliente</label>
                <input className="input" placeholder="Ej. DESPACHOS DEL NORTE" value={form.referencia} onChange={e => set('referencia', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Categoría *</label>
                <select className="input" value={form.categoria} onChange={e => set('categoria', e.target.value)}>
                  {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Prioridad</label>
                <select className="input" value={form.prioridad} onChange={e => set('prioridad', e.target.value)}>
                  <option value="normal">Normal</option>
                  <option value="urgente">🔴 Urgente</option>
                  <option value="economico">🟢 Económico</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Vendedor</label>
                <input className="input" value={form.vendedor} onChange={e => set('vendedor', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Responsable de seguimiento</label>
                <input className="input" placeholder="correo@logup.mx" value={form.seguimiento} onChange={e => set('seguimiento', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Observaciones</label>
                <textarea className="input resize-none" rows={3} placeholder="Notas o instrucciones especiales..." value={form.observaciones} onChange={e => set('observaciones', e.target.value)} />
              </div>
            </div>
          </>
        )}

        {/* Step 2: Ruta */}
        {step === 2 && (
          <>
            <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Ruta y fechas</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Punto de origen *</label>
                {ubicaciones.length > 0 ? (
                  <select className="input" onChange={e => handleUbicacion('origen', e.target.value)}>
                    <option value="">Seleccionar ubicación...</option>
                    {ubicaciones.map(u => <option key={u.id} value={u.id}>{u.nombre} — {u.municipio}, {u.estado} (CP {u.cp})</option>)}
                  </select>
                ) : (
                  <input className="input" placeholder="Ciudad, Estado" value={form.origenNombre} onChange={e => set('origenNombre', e.target.value)} />
                )}
                {form.origenNombre && <p className="text-xs text-green-600 mt-1">✓ {form.origenNombre} · CP {form.origenCP}</p>}
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Punto de destino *</label>
                {ubicaciones.length > 0 ? (
                  <select className="input" onChange={e => handleUbicacion('destino', e.target.value)}>
                    <option value="">Seleccionar ubicación...</option>
                    {ubicaciones.map(u => <option key={u.id} value={u.id}>{u.nombre} — {u.municipio}, {u.estado} (CP {u.cp})</option>)}
                  </select>
                ) : (
                  <input className="input" placeholder="Ciudad, Estado" value={form.destinoNombre} onChange={e => set('destinoNombre', e.target.value)} />
                )}
                {form.destinoNombre && <p className="text-xs text-green-600 mt-1">✓ {form.destinoNombre} · CP {form.destinoCP}</p>}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Fecha y hora de carga *</label>
                <input type="datetime-local" className="input" value={form.fechaCarga} onChange={e => set('fechaCarga', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Fecha ETA (entrega estimada)</label>
                <input type="datetime-local" className="input" value={form.fechaETA} onChange={e => set('fechaETA', e.target.value)} />
              </div>
            </div>
          </>
        )}

        {/* Step 3: Carta Porte */}
        {step === 3 && (
          <>
            <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">
              Complemento Carta Porte 3.1
              <span className="ml-2 text-[10px] font-normal text-brand bg-blue-50 px-2 py-0.5 rounded-full">SAT</span>
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Descripción de la mercancía *</label>
                <input className="input" placeholder="Ej. Partes automotrices de aluminio" value={form.cp_descripcion} onChange={e => set('cp_descripcion', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Clave SAT mercancía *</label>
                <input className="input font-mono" placeholder="Ej. 25172100" value={form.cp_claveSAT} onChange={e => set('cp_claveSAT', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Peso bruto total *</label>
                <input type="number" className="input" placeholder="kg" value={form.cp_peso} onChange={e => set('cp_peso', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Unidad de medida (SAT)</label>
                <select className="input" value={form.cp_unidadPeso} onChange={e => set('cp_unidadPeso', e.target.value)}>
                  {UNIDADES_SAT.map(u => <option key={u.clave} value={u.clave}>{u.clave} — {u.desc}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Cantidad de pallets</label>
                <input type="number" className="input" placeholder="0" value={form.cp_pallets} onChange={e => set('cp_pallets', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Valor de la mercancía *</label>
                <input type="number" className="input" placeholder="0.00" value={form.cp_valorMercancia} onChange={e => set('cp_valorMercancia', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Moneda</label>
                <select className="input" value={form.cp_moneda} onChange={e => set('cp_moneda', e.target.value)}>
                  <option value="MXN">MXN — Peso mexicano</option>
                  <option value="USD">USD — Dólar americano</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Seguro de carga (prima)</label>
                <input type="number" className="input" placeholder="0.00" value={form.cp_seguro} onChange={e => set('cp_seguro', e.target.value)} />
              </div>
            </div>
          </>
        )}

        {/* Step 4: Operador */}
        {step === 4 && (
          <>
            <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Operador y unidad</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Nombre del operador</label>
                <input className="input" placeholder="Nombre completo" value={form.op_nombre} onChange={e => set('op_nombre', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">No. de licencia</label>
                <input className="input font-mono" placeholder="Ej. CURP o número" value={form.op_licencia} onChange={e => set('op_licencia', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Placas de la unidad</label>
                <input className="input font-mono uppercase" placeholder="Ej. ABC1234" value={form.op_placas} onChange={e => set('op_placas', e.target.value.toUpperCase())} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tipo de unidad</label>
                <select className="input" value={form.op_tipoUnidad} onChange={e => set('op_tipoUnidad', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  <option value="torton">Tortón</option>
                  <option value="rabon">Rabón</option>
                  <option value="trailer">Tráiler completo</option>
                  <option value="caja_seca">Caja seca</option>
                  <option value="caja_ref">Caja refrigerada</option>
                  <option value="plataforma">Plataforma</option>
                  <option value="pipa">Pipa</option>
                </select>
              </div>
            </div>

            {/* Resumen */}
            <div className="bg-gray-50 rounded-xl p-4 mt-2 space-y-2">
              <p className="text-xs font-medium text-gray-600 mb-2">Resumen del embarque</p>
              {[
                ['Cliente', form.cliente || '—'],
                ['Categoría', CATEGORIAS.find(c => c.value === form.categoria)?.label || '—'],
                ['Ruta', form.origenNombre && form.destinoNombre ? `${form.origenNombre} → ${form.destinoNombre}` : '—'],
                ['Mercancía', form.cp_descripcion || '—'],
                ['Peso', form.cp_peso ? `${form.cp_peso} ${form.cp_unidadPeso}` : '—'],
                ['Operador', form.op_nombre || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span className="text-gray-500">{k}</span>
                  <span className="text-gray-800 font-medium text-right max-w-48 truncate">{v}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Navegación */}
      <div className="flex justify-between">
        <button
          onClick={() => step > 1 ? setStep(s => s - 1) : navigate(-1)}
          className="btn-secondary"
        >
          ← {step === 1 ? 'Cancelar' : 'Anterior'}
        </button>
        {step < 4 ? (
          <button onClick={() => setStep(s => s + 1)} className="btn-primary">
            Siguiente →
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={loading} className="btn-primary">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Guardando...
              </span>
            ) : '✓ Crear embarque'}
          </button>
        )}
      </div>
    </div>
  )
}
