import { useState, useEffect, useRef } from 'react'
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../context/AuthContext'
import { MapPin, Truck, Package, Thermometer, DollarSign, Clock, ChevronRight, Star, TrendingUp, Save, Search } from 'lucide-react'

const GOOGLE_API_KEY = 'AIzaSyDJiVM-ARVOTJu4oXLJ5h1XmOLhIqXgvFU'

const TIPOS_CARGA = ['Congelado','Refrigerado','Fresco','Seco','Combinado','Plataforma','Portacontenedor','Fronterizo','Hand Carry','Aéreo','Marítimo']
const ACCESORIOS = ['Termógrafo','Lonas','Cintas de sujeción','Cadenas','Gatas logísticas','Esquineros','Separadores','Tarimas','Stretch film','Candado de seguridad','Sello CTPAT']
const REQUERIMIENTOS = ['Licencia federal','CTPAT certificado','FAST Card','Visa láser operador','Experiencia en crucero fronterizo','EPP completo','Permiso SCT especial','Fumigación previa']

const fmt = (n) => '$' + Number(n||0).toLocaleString('es-MX', {minimumFractionDigits:0})

// Calcular distancia con Google Maps Distance Matrix API
async function calcularDistancia(origen, destino) {
  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origen)},Mexico&destinations=${encodeURIComponent(destino)},Mexico&key=${GOOGLE_API_KEY}&language=es&units=metric`
    // Usar proxy para evitar CORS — llamamos desde el cliente con modo no-cors
    const resp = await fetch(`https://cors-anywhere.herokuapp.com/${url}`)
    const data = await resp.json()
    if (data.rows?.[0]?.elements?.[0]?.status === 'OK') {
      const el = data.rows[0].elements[0]
      return {
        distanciaKm: Math.round(el.distance.value / 1000),
        tiempoMin: Math.round(el.duration.value / 60),
        distanciaTexto: el.distance.text,
        tiempoTexto: el.duration.text,
      }
    }
  } catch(e) { console.error('Google Maps error:', e) }
  // Fallback: estimación por km en línea recta
  return null
}

// Estimar distancia sin API (tabla de distancias comunes)
const DISTANCIAS_CONOCIDAS = {
  'MTY-CDMX': 910, 'CDMX-MTY': 910,
  'MTY-GDL': 690, 'GDL-MTY': 690,
  'MTY-LAR': 240, 'LAR-MTY': 240,
  'MTY-SLC': 87, 'SLC-MTY': 87,
  'MTY-QRO': 750, 'QRO-MTY': 750,
  'MTY-PUE': 1050, 'PUE-MTY': 1050,
  'CDMX-GDL': 540, 'GDL-CDMX': 540,
  'CDMX-VER': 420, 'VER-CDMX': 420,
  'MTY-VER': 1100, 'VER-MTY': 1100,
  'MTY-HMO': 1150, 'HMO-MTY': 1150,
  'MTY-CUU': 780, 'CUU-MTY': 780,
  'MTY-TIJ': 2100, 'TIJ-MTY': 2100,
  'CDMX-CAN': 1600, 'CAN-CDMX': 1600,
  'MTY-VHM': 1200, 'VHM-MTY': 1200,
}

function estimarDistancia(origen, destino) {
  const key = `${origen.slice(0,3).toUpperCase()}-${destino.slice(0,3).toUpperCase()}`
  return DISTANCIAS_CONOCIDAS[key] || null
}

export default function CotizadorInteligente() {
  const { perfil } = useAuth()
  const [paso, setPaso] = useState(1) // 1: ruta, 2: carga, 3: resultado
  const [form, setForm] = useState({
    origen: '', destino: '',
    tipoCarga: 'Refrigerado',
    pesoKg: '', bultos: '', pallets: '',
    temperatura: '', tempEspecifica: '',
    accesorios: [], requerimientos: [],
    margen: 25, urgente: false,
    notas: '',
  })
  const [distancia, setDistancia] = useState(null)
  const [calculando, setCalculando] = useState(false)
  const [proveedoresSugeridos, setProveedoresSugeridos] = useState([])
  const [cotizacionesHistoricas, setCotizacionesHistoricas] = useState([])
  const [resultado, setResultado] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)

  const set = (k, v) => setForm(f => ({...f, [k]: v}))
  const toggleArr = (k, v) => setForm(f => ({
    ...f, [k]: f[k].includes(v) ? f[k].filter(x=>x!==v) : [...f[k], v]
  }))

  const calcularRuta = async () => {
    if (!form.origen || !form.destino) return
    setCalculando(true)
    try {
      // Intentar Google Maps
      let dist = await calcularDistancia(form.origen, form.destino)
      
      // Fallback a tabla conocida
      if (!dist) {
        const km = estimarDistancia(form.origen, form.destino)
        if (km) {
          dist = {
            distanciaKm: km,
            tiempoMin: Math.round(km / 65 * 60),
            distanciaTexto: `${km} km (estimado)`,
            tiempoTexto: `~${Math.round(km/65)}h tránsito`,
          }
        } else {
          // Sin datos — dejar pasar igual
          dist = {
            distanciaKm: null,
            distanciaTexto: 'Distancia pendiente',
            tiempoTexto: 'Por confirmar',
          }
        }
      }
      setDistancia(dist)

      // Buscar proveedores con esa ruta
      const snap = await getDocs(collection(db, 'proveedores'))
      const todos = snap.docs.map(d => ({id:d.id,...d.data()}))
      const origenUp = form.origen.toUpperCase().slice(0,6)
      const destinoUp = form.destino.toUpperCase().slice(0,6)
      const sugeridos = todos.filter(p =>
        (p.rutas||[]).some(r =>
          r.origen?.toUpperCase().includes(origenUp) &&
          r.destino?.toUpperCase().includes(destinoUp)
        )
      ).map(p => ({
        ...p,
        ruta: (p.rutas||[]).find(r => r.origen?.toUpperCase().includes(origenUp) && r.destino?.toUpperCase().includes(destinoUp))
      })).sort((a,b) => Number(a.ruta?.tarifa||0) - Number(b.ruta?.tarifa||0))
      setProveedoresSugeridos(sugeridos)

      // Buscar cotizaciones históricas de esta ruta
      const cotSnap = await getDocs(collection(db, 'cotizacionesInternas'))
      const historicas = cotSnap.docs
        .map(d => ({id:d.id,...d.data()}))
        .filter(c => c.origen?.toUpperCase().includes(origenUp) && c.destino?.toUpperCase().includes(destinoUp))
        .slice(0,5)
      setCotizacionesHistoricas(historicas)

      setPaso(2) // Siempre avanzar
    } catch(e) {
      console.error(e)
      setPaso(2) // Avanzar aunque falle
    }
    finally { setCalculando(false) }
  }

  const generarCotizacion = () => {

    const mejorProveedor = proveedoresSugeridos[0]
    const tarifaBase = mejorProveedor?.ruta?.tarifa
      ? Number(mejorProveedor.ruta.tarifa)
      : distancia?.distanciaKm
        ? Math.round(distancia.distanciaKm * 15)
        : form.tipoCarga === 'Fronterizo' ? 18000
        : form.tipoCarga === 'Congelado' ? 16000
        : form.tipoCarga === 'Refrigerado' ? 14000
        : 12000 // default seco

    // Ajustes por tipo de carga
    let multiplicador = 1
    if (['Congelado','Refrigerado'].includes(form.tipoCarga)) multiplicador = 1.15
    if (form.tipoCarga === 'Fronterizo') multiplicador = 1.3
    if (form.tipoCarga === 'Plataforma') multiplicador = 1.2
    if (form.urgente) multiplicador *= 1.15

    // Cargos extra por accesorios
    const cargoAccesorios = form.accesorios.length * 200

    const costoProveedor = Math.round(tarifaBase * multiplicador) + cargoAccesorios
    const margenPesos = Math.round(costoProveedor * (form.margen / 100))
    const precioCliente = costoProveedor + margenPesos

    // Tiempo estimado de tránsito
    const horasTrans = distancia?.distanciaKm
      ? Math.ceil(distancia.distanciaKm / 65) + 1
      : 24

    setResultado({
      costoProveedor,
      margenPesos,
      precioCliente,
      tarifaBase,
      multiplicador,
      cargoAccesorios,
      horasTrans,
      mejorProveedor,
      alternativas: proveedoresSugeridos.slice(1, 4),
    })
    setPaso(3)
  }

  const guardarCotizacion = async () => {
    if (!resultado) return
    setGuardando(true)
    try {
      await addDoc(collection(db, 'cotizacionesInternas'), {
        origen: form.origen,
        destino: form.destino,
        tipoCarga: form.tipoCarga,
        pesoKg: form.pesoKg,
        temperatura: form.temperatura,
        distanciaKm: distancia?.distanciaKm,
        costoProveedor: resultado.costoProveedor,
        precioCliente: resultado.precioCliente,
        margen: form.margen,
        proveedor: resultado.mejorProveedor?.nombre || '',
        creadoPor: perfil?.nombre || '',
        creadoEn: serverTimestamp(),
      })
      setGuardado(true)
    } catch(e) { console.error(e) }
    finally { setGuardando(false) }
  }

  const reiniciar = () => {
    setPaso(1)
    setForm({ origen:'', destino:'', tipoCarga:'Refrigerado', pesoKg:'', bultos:'', pallets:'', temperatura:'', tempEspecifica:'', accesorios:[], requerimientos:[], margen:25, urgente:false, notas:'' })
    setDistancia(null)
    setProveedoresSugeridos([])
    setCotizacionesHistoricas([])
    setResultado(null)
    setGuardado(false)
  }

  const needsTemp = ['Congelado','Refrigerado','Fresco','Combinado'].includes(form.tipoCarga)

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Stepper */}
      <div className="flex items-center gap-0">
        {['Ruta y origen','Detalles de carga','Resultado'].map((label, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className={`flex items-center gap-2 flex-1 ${i < paso-1 ? 'cursor-pointer' : ''}`} onClick={() => i < paso-1 && setPaso(i+1)}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i+1 < paso ? 'bg-brand text-white' : i+1 === paso ? 'border-2 border-brand text-brand' : 'border-2 border-gray-200 text-gray-300'}`}>
                {i+1 < paso ? '✓' : i+1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${i+1 <= paso ? 'text-gray-700' : 'text-gray-300'}`}>{label}</span>
            </div>
            {i < 2 && <div className={`h-0.5 flex-1 mx-2 ${i+1 < paso ? 'bg-brand' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Paso 1: Ruta */}
      {paso === 1 && (
        <div className="card p-6 space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-1">Cotizador inteligente</p>
            <p className="text-xs text-gray-400">Ingresa la ruta y el sistema buscará proveedores, historial y calculará la distancia automáticamente</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-green-500" /> Origen *
              </label>
              <input className="input uppercase" placeholder="Ej. MONTERREY, NL" value={form.origen}
                onChange={e=>set('origen',e.target.value.toUpperCase())} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-red-500" /> Destino *
              </label>
              <input className="input uppercase" placeholder="Ej. CDMX" value={form.destino}
                onChange={e=>set('destino',e.target.value.toUpperCase())} />
            </div>
          </div>

          {/* Historial de rutas frecuentes */}
          {cotizacionesHistoricas.length > 0 && (
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-brand mb-2">Cotizaciones anteriores para esta ruta</p>
              {cotizacionesHistoricas.slice(0,3).map((c,i) => (
                <div key={i} className="flex justify-between text-[10px] py-1 border-b border-blue-100 last:border-0">
                  <span className="text-gray-600">{c.tipoCarga} · {c.proveedor}</span>
                  <span className="font-bold text-brand">{fmt(c.precioCliente)}</span>
                </div>
              ))}
            </div>
          )}

          <button onClick={calcularRuta} disabled={!form.origen||!form.destino||calculando}
            className="btn-primary w-full justify-center disabled:opacity-40">
            {calculando ? 'Calculando ruta...' : 'Calcular ruta y buscar proveedores'}
          </button>
        </div>
      )}

      {/* Paso 2: Detalles de carga */}
      {paso === 2 && (
        <div className="space-y-4">
          {/* Distancia calculada */}
          {distancia && (
            <div className="card p-4 bg-green-50 border-green-200 border">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-700">{distancia.distanciaTexto}</p>
                    <p className="text-[10px] text-green-600">Distancia</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-700">{distancia.tiempoTexto}</p>
                    <p className="text-[10px] text-green-600">Tiempo estimado</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-gray-700">{form.origen} → {form.destino}</p>
                  <p className="text-[10px] text-gray-400">{proveedoresSugeridos.length} proveedores encontrados</p>
                </div>
              </div>
            </div>
          )}

          <div className="card p-5 space-y-4">
            {/* Tipo de carga */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">Tipo de carga *</label>
              <div className="flex flex-wrap gap-2">
                {TIPOS_CARGA.map(t => (
                  <button key={t} onClick={()=>set('tipoCarga',t)}
                    className={`px-3 py-1.5 rounded-lg text-xs border-2 transition-all font-medium ${form.tipoCarga===t?'border-brand bg-blue-50 text-brand':'border-gray-100 text-gray-500 hover:border-gray-300'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Temperatura si aplica */}
            {needsTemp && (
              <div className="bg-blue-50 rounded-xl p-3 space-y-2">
                <label className="block text-xs text-blue-700 font-medium flex items-center gap-1">
                  <Thermometer className="w-3.5 h-3.5" /> Temperatura requerida
                </label>
                <div className="flex gap-2 flex-wrap">
                  {['-10°F','-5°F','0°F','28°F','34°F','38°F','Ambiente'].map(t => (
                    <button key={t} onClick={()=>set('temperatura',t)}
                      className={`px-2 py-1 rounded text-xs border ${form.temperatura===t?'bg-brand text-white border-brand':'border-gray-200 text-gray-600 bg-white'}`}>
                      {t}
                    </button>
                  ))}
                </div>
                <input className="input text-xs" placeholder="O escribe temperatura específica..." value={form.tempEspecifica}
                  onChange={e=>set('tempEspecifica',e.target.value)} />
              </div>
            )}

            {/* Peso y medidas */}
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-xs text-gray-500 mb-1">Peso total (kg)</label><input type="number" className="input" value={form.pesoKg} onChange={e=>set('pesoKg',e.target.value)} placeholder="0" /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Pallets</label><input type="number" className="input" value={form.pallets} onChange={e=>set('pallets',e.target.value)} placeholder="0" /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Bultos / Cajas</label><input type="number" className="input" value={form.bultos} onChange={e=>set('bultos',e.target.value)} placeholder="0" /></div>
            </div>

            {/* Accesorios */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">Accesorios y equipo requerido</label>
              <div className="flex flex-wrap gap-2">
                {ACCESORIOS.map(a => (
                  <button key={a} onClick={()=>toggleArr('accesorios',a)}
                    className={`px-2 py-1 rounded text-xs border transition-colors ${form.accesorios.includes(a)?'bg-amber-50 text-amber-700 border-amber-200':'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Requerimientos especiales */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">Requerimientos especiales del operador</label>
              <div className="flex flex-wrap gap-2">
                {REQUERIMIENTOS.map(r => (
                  <button key={r} onClick={()=>toggleArr('requerimientos',r)}
                    className={`px-2 py-1 rounded text-xs border transition-colors ${form.requerimientos.includes(r)?'bg-purple-50 text-purple-700 border-purple-200':'border-gray-200 text-gray-500'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Opciones */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.urgente} onChange={e=>set('urgente',e.target.checked)} className="w-4 h-4 accent-brand" />
                <span className="text-xs text-gray-600">Servicio urgente (+15%)</span>
              </label>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">Margen %</label>
                <input type="number" className="input w-20 text-xs" value={form.margen} onChange={e=>set('margen',Number(e.target.value))} />
              </div>
            </div>
          </div>

          {/* Proveedores sugeridos */}
          {proveedoresSugeridos.length > 0 && (
            <div className="card p-5">
              <p className="text-sm font-semibold text-gray-700 mb-3">Proveedores con esta ruta</p>
              <div className="space-y-2">
                {proveedoresSugeridos.map((p, i) => (
                  <div key={p.id} className={`flex items-center justify-between rounded-xl px-4 py-3 border ${i===0?'border-brand bg-blue-50':'border-gray-100'}`}>
                    <div>
                      {i===0 && <span className="text-[9px] bg-brand text-white px-1.5 py-0.5 rounded font-medium mb-1 inline-block">Mejor precio</span>}
                      <p className="text-xs font-semibold text-gray-800">{p.nombre}</p>
                      <div className="flex items-center gap-1">
                        {[1,2,3,4,5].map(s => <Star key={s} className={`w-3 h-3 ${s<=Math.round(p.calificacion||0)?'fill-amber-400 text-amber-400':'text-gray-200'}`} />)}
                        <span className="text-[10px] text-gray-400">{p.kpis?.viajes||0} viajes</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-brand">{fmt(p.ruta?.tarifa)}</p>
                      <p className="text-[10px] text-gray-400">{p.ruta?.tipoUnidad}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={()=>setPaso(1)} className="btn-secondary flex-1 justify-center">Atrás</button>
            <button onClick={generarCotizacion} className="btn-primary flex-1 justify-center">
              Generar cotización
            </button>
          </div>
        </div>
      )}

      {/* Paso 3: Resultado */}
      {paso === 3 && resultado && (
        <div className="space-y-4">
          {/* Resumen de ruta */}
          <div className="card p-4 bg-gray-50">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-gray-700">{form.origen} → {form.destino}</span>
              <span className="text-gray-400">{distancia?.distanciaTexto} · {form.tipoCarga} {form.temperatura || form.tempEspecifica ? `· ${form.temperatura||form.tempEspecifica}` : ''}</span>
            </div>
          </div>

          {/* Desglose de precio */}
          <div className="card p-5 space-y-3">
            <p className="text-sm font-semibold text-gray-700">Desglose de cotización</p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs py-2 border-b border-gray-50">
                <span className="text-gray-500">Tarifa base proveedor</span>
                <span className="font-medium">{fmt(resultado.tarifaBase)}</span>
              </div>
              {resultado.multiplicador > 1 && (
                <div className="flex justify-between text-xs py-2 border-b border-gray-50">
                  <span className="text-gray-500">Ajuste por tipo de carga ({((resultado.multiplicador-1)*100).toFixed(0)}%)</span>
                  <span className="font-medium text-amber-600">+{fmt(resultado.tarifaBase*(resultado.multiplicador-1))}</span>
                </div>
              )}
              {resultado.cargoAccesorios > 0 && (
                <div className="flex justify-between text-xs py-2 border-b border-gray-50">
                  <span className="text-gray-500">Accesorios ({form.accesorios.length} items)</span>
                  <span className="font-medium text-amber-600">+{fmt(resultado.cargoAccesorios)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs py-2 border-b border-gray-50 font-semibold">
                <span className="text-gray-700">Costo proveedor total</span>
                <span>{fmt(resultado.costoProveedor)}</span>
              </div>
              <div className="flex justify-between text-xs py-2 border-b border-gray-50">
                <span className="text-gray-500">Margen Log Up ({form.margen}%)</span>
                <span className="font-medium text-green-600">+{fmt(resultado.margenPesos)}</span>
              </div>
            </div>

            {/* Precio al cliente */}
            <div className="bg-brand rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs">Precio al cliente</p>
                <p className="text-white text-2xl font-bold">{fmt(resultado.precioCliente)}</p>
              </div>
              <div className="text-right">
                <p className="text-blue-100 text-[10px]">Tiempo estimado</p>
                <p className="text-white text-sm font-medium">~{resultado.horasTrans}h tránsito</p>
              </div>
            </div>
          </div>

          {/* Proveedor recomendado */}
          {resultado.mejorProveedor && (
            <div className="card p-5">
              <p className="text-sm font-semibold text-gray-700 mb-3">Proveedor recomendado</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-800">{resultado.mejorProveedor.nombre}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {[1,2,3,4,5].map(s => <Star key={s} className={`w-3 h-3 ${s<=Math.round(resultado.mejorProveedor.calificacion||0)?'fill-amber-400 text-amber-400':'text-gray-200'}`} />)}
                    <span className="text-[10px] text-gray-400">{resultado.mejorProveedor.kpis?.viajes||0} viajes · {resultado.mejorProveedor.kpis?.puntualidad||0}% puntual</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">{resultado.mejorProveedor.tel}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Su tarifa</p>
                  <p className="text-sm font-bold text-brand">{fmt(resultado.mejorProveedor.ruta?.tarifa)}</p>
                </div>
              </div>
              {resultado.alternativas?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-[10px] text-gray-400 mb-2">Alternativas:</p>
                  {resultado.alternativas.map((p,i) => (
                    <div key={i} className="flex justify-between text-[10px] py-1">
                      <span className="text-gray-600">{p.nombre}</span>
                      <span className="font-medium text-gray-700">{fmt(p.ruta?.tarifa)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Accesorios y requerimientos seleccionados */}
          {(form.accesorios.length > 0 || form.requerimientos.length > 0) && (
            <div className="card p-4">
              {form.accesorios.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] font-semibold text-gray-500 mb-1">Accesorios requeridos:</p>
                  <div className="flex flex-wrap gap-1">{form.accesorios.map(a=><span key={a} className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded">{a}</span>)}</div>
                </div>
              )}
              {form.requerimientos.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-500 mb-1">Requerimientos del operador:</p>
                  <div className="flex flex-wrap gap-1">{form.requerimientos.map(r=><span key={r} className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded">{r}</span>)}</div>
                </div>
              )}
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-3">
            <button onClick={reiniciar} className="btn-secondary flex-1 justify-center">Nueva cotización</button>
            <button onClick={guardarCotizacion} disabled={guardando||guardado} className={`flex-1 btn-primary justify-center ${guardado?'bg-green-600 hover:bg-green-600':''}`}>
              <Save className="w-4 h-4 mr-1" />
              {guardado ? 'Guardada en historial' : guardando ? 'Guardando...' : 'Guardar cotización'}
            </button>
          </div>
          {guardado && (
            <p className="text-xs text-center text-green-600">La próxima vez que cotices esta ruta, el sistema recordará estos datos</p>
          )}
        </div>
      )}
    </div>
  )
}
