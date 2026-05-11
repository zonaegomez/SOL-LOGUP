import { useState } from 'react'
import { collection, getDocs, doc, deleteDoc, addDoc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../context/AuthContext'
import { Trash2, Database, AlertTriangle, RefreshCw } from 'lucide-react'

const DEMO_DATA = {"empresa": {"nombre": "Transportes y Logística del Centro", "rfc": "TLC980312AB3", "logoTexto": "TLC"}, "clientes": [{"razonSocial": "Grupo Industrial Norteño S.A.", "rfc": "GIN850201CD4", "contactoNombre": "Ing. Roberto Sánchez", "contactoTel": "81-2233-4455", "contactoEmail": "rsanchez@gin.com", "creditoDias": 30, "activo": true, "rutasPactadas": [{"origen": "Monterrey, NL", "destino": "Ciudad de México", "tipoServicio": "Refrigerado", "tarifa": 14500}, {"origen": "Monterrey, NL", "destino": "Guadalajara, JAL", "tipoServicio": "Congelado", "tarifa": 9800}], "_demo": true}, {"razonSocial": "Distribuidora Central de Alimentos", "rfc": "DCA010523EF5", "contactoNombre": "Lic. Patricia Medina", "contactoTel": "81-3344-5566", "contactoEmail": "pmedina@dca.mx", "creditoDias": 45, "activo": true, "rutasPactadas": [{"origen": "Monterrey, NL", "destino": "Ciudad de México", "tipoServicio": "Congelado", "tarifa": 13200}], "_demo": true}, {"razonSocial": "Procesadora de Aceites del Sur", "rfc": "PAS920714GH6", "contactoNombre": "C.P. Andrés Morales", "contactoTel": "55-4455-6677", "contactoEmail": "amorales@pas.com", "creditoDias": 60, "activo": true, "rutasPactadas": [{"origen": "Veracruz, VER", "destino": "Monterrey, NL", "tipoServicio": "Refrigerado", "tarifa": 48000}], "_demo": true}, {"razonSocial": "Manufacturas del Bajío", "rfc": "MBA850901IJ7", "contactoNombre": "Ing. Sandra Vargas", "contactoTel": "33-5566-7788", "contactoEmail": "svargas@mba.mx", "creditoDias": 30, "activo": true, "rutasPactadas": [{"origen": "León, GTO", "destino": "Monterrey, NL", "tipoServicio": "Seco", "tarifa": 8500}], "_demo": true}, {"razonSocial": "Exportaciones del Pacífico", "rfc": "EPF031205KL8", "contactoNombre": "Mtro. Carlos Ruiz", "contactoTel": "81-6677-8899", "contactoEmail": "cruiz@epf.com", "creditoDias": 15, "activo": true, "rutasPactadas": [{"origen": "Hermosillo, SON", "destino": "Monterrey, NL", "tipoServicio": "Fresco", "tarifa": 28000}], "_demo": true}, {"razonSocial": "Lácteos y Derivados del Norte", "rfc": "LDN110730MN9", "contactoNombre": "Lic. María Gutiérrez", "contactoTel": "55-7788-9900", "contactoEmail": "mgutierrez@ldn.mx", "creditoDias": 30, "activo": true, "rutasPactadas": [{"origen": "Ciudad de México", "destino": "Monterrey, NL", "tipoServicio": "Refrigerado", "tarifa": 16000}], "_demo": true}, {"razonSocial": "Comercio Internacional Frontera", "rfc": "CIF000416OP0", "contactoNombre": "Ing. José Ortega", "contactoTel": "868-1122-3344", "contactoEmail": "jortega@cif.mx", "creditoDias": 0, "activo": true, "rutasPactadas": [{"origen": "Monterrey, NL", "destino": "Laredo, TX", "tipoServicio": "Fronterizo", "tarifa": 22000}], "_demo": true}, {"razonSocial": "Alimentos y Bebidas del Centro", "rfc": "ABC951201QR1", "contactoNombre": "C.P. Fernanda Reyes", "contactoTel": "81-8899-0011", "contactoEmail": "freyes@abc.com", "creditoDias": 45, "activo": true, "rutasPactadas": [{"origen": "Monterrey, NL", "destino": "Querétaro, QRO", "tipoServicio": "Seco", "tarifa": 11500}], "_demo": true}], "proveedores": [{"nombre": "Fletes Rápidos del Norte", "tel": "81-2233-4455", "email": "ops@fletesrapidos.mx", "calificacion": 4.8, "activo": true, "unidades": ["Reefer 53'", "Caja seca 53'"], "rutas": [{"origen": "Monterrey, NL", "destino": "Ciudad de México", "tipoUnidad": "Reefer 53'", "tarifa": 14500}, {"origen": "Monterrey, NL", "destino": "Guadalajara, JAL", "tipoUnidad": "Reefer 53'", "tarifa": 9800}], "kpis": {"viajes": 148, "puntualidad": 94, "incidencias": 2, "estadias": 3, "cancelaciones": 0}, "_demo": true}, {"nombre": "Transportes Regionales S.A.", "tel": "81-5566-7788", "email": "contacto@transregional.mx", "calificacion": 4.5, "activo": true, "unidades": ["Caja refrigerada", "Rabón"], "rutas": [{"origen": "Monterrey, NL", "destino": "Ciudad de México", "tipoUnidad": "Caja refrigerada", "tarifa": 13200}, {"origen": "Monterrey, NL", "destino": "Laredo, TX", "tipoUnidad": "Rabón", "tarifa": 4500}], "kpis": {"viajes": 92, "puntualidad": 88, "incidencias": 5, "estadias": 8, "cancelaciones": 1}, "_demo": true}, {"nombre": "Logística Integral Nacional", "tel": "81-9900-1122", "email": "ventas@lognacional.com", "calificacion": 4.2, "activo": true, "unidades": ["Tráiler", "Plataforma", "Tortón"], "rutas": [{"origen": "Monterrey, NL", "destino": "Ciudad de México", "tipoUnidad": "Tráiler", "tarifa": 12000}], "kpis": {"viajes": 67, "puntualidad": 82, "incidencias": 8, "estadias": 12, "cancelaciones": 2}, "_demo": true}, {"nombre": "Refrigerados del Noreste", "tel": "81-4455-6677", "email": "info@refrinoreste.mx", "calificacion": 4.6, "activo": true, "unidades": ["Reefer 53'", "Caja refrigerada"], "rutas": [{"origen": "Ciudad de México", "destino": "Monterrey, NL", "tipoUnidad": "Reefer 53'", "tarifa": 15000}, {"origen": "Monterrey, NL", "destino": "Hermosillo, SON", "tipoUnidad": "Reefer 53'", "tarifa": 27000}], "kpis": {"viajes": 115, "puntualidad": 91, "incidencias": 3, "estadias": 5, "cancelaciones": 0}, "_demo": true}, {"nombre": "Operadora de Carga del Bajío", "tel": "33-2233-4455", "email": "ops@cargabajio.mx", "calificacion": 4.1, "activo": true, "unidades": ["Caja seca 53'", "Tortón"], "rutas": [{"origen": "León, GTO", "destino": "Ciudad de México", "tipoUnidad": "Caja seca 53'", "tarifa": 7500}, {"origen": "León, GTO", "destino": "Monterrey, NL", "tipoUnidad": "Caja seca 53'", "tarifa": 8500}], "kpis": {"viajes": 43, "puntualidad": 79, "incidencias": 6, "estadias": 9, "cancelaciones": 1}, "_demo": true}], "embarques": [{"folio": "EMB-001", "cliente": "Distribuidora Central de Alimentos", "origenNombre": "Monterrey, NL", "destinoNombre": "Ciudad de México", "categoria": "ref", "cp_temp": "-5°F", "etapa": "creado", "vendedor": "Vendedor Demo", "proveedor_nombre": "Fletes Rápidos del Norte", "costo_flete": 14500, "tarifa_cliente": 18500, "diasCredito": 30, "prioridad": "normal", "_demo": true}, {"folio": "EMB-002", "cliente": "Grupo Industrial Norteño S.A.", "origenNombre": "Monterrey, NL", "destinoNombre": "Guadalajara, JAL", "categoria": "ref", "cp_temp": "28°F", "etapa": "posicionamiento", "vendedor": "Vendedor Demo", "proveedor_nombre": "Transportes Regionales S.A.", "costo_flete": 9000, "tarifa_cliente": 12000, "diasCredito": 30, "prioridad": "normal", "_demo": true}, {"folio": "EMB-003", "cliente": "Procesadora de Aceites del Sur", "origenNombre": "Veracruz, VER", "destinoNombre": "Monterrey, NL", "categoria": "ref", "cp_temp": "34°F", "etapa": "transito", "vendedor": "Vendedor Demo", "proveedor_nombre": "Refrigerados del Noreste", "costo_flete": 48000, "tarifa_cliente": 62000, "diasCredito": 60, "prioridad": "urgente", "_demo": true}, {"folio": "EMB-004", "cliente": "Comercio Internacional Frontera", "origenNombre": "Monterrey, NL", "destinoNombre": "Laredo, TX", "categoria": "ftl", "etapa": "carga", "vendedor": "Vendedor Demo", "proveedor_nombre": "Logística Integral Nacional", "costo_flete": 22000, "tarifa_cliente": 28000, "diasCredito": 0, "prioridad": "normal", "_demo": true}, {"folio": "EMB-005", "cliente": "Lácteos y Derivados del Norte", "origenNombre": "Ciudad de México", "destinoNombre": "Monterrey, NL", "categoria": "ref", "cp_temp": "38°F", "etapa": "entregado", "vendedor": "Vendedor Demo", "proveedor_nombre": "Transportes Regionales S.A.", "costo_flete": 16000, "tarifa_cliente": 20500, "diasCredito": 30, "prioridad": "normal", "_demo": true}, {"folio": "EMB-006", "cliente": "Manufacturas del Bajío", "origenNombre": "León, GTO", "destinoNombre": "Monterrey, NL", "categoria": "ftl", "etapa": "porFacturar", "vendedor": "Vendedor Demo", "proveedor_nombre": "Operadora de Carga del Bajío", "costo_flete": 8500, "tarifa_cliente": 11000, "diasCredito": 30, "prioridad": "normal", "_demo": true}, {"folio": "EMB-007", "cliente": "Alimentos y Bebidas del Centro", "origenNombre": "Monterrey, NL", "destinoNombre": "Querétaro, QRO", "categoria": "ftl", "etapa": "descarga", "vendedor": "Vendedor Demo", "proveedor_nombre": "Fletes Rápidos del Norte", "costo_flete": 11500, "tarifa_cliente": 14800, "diasCredito": 45, "prioridad": "normal", "_demo": true}, {"folio": "EMB-008", "cliente": "Exportaciones del Pacífico", "origenNombre": "Hermosillo, SON", "destinoNombre": "Monterrey, NL", "categoria": "ref", "cp_temp": "32°F", "etapa": "cobrado", "vendedor": "Vendedor Demo", "proveedor_nombre": "Refrigerados del Noreste", "costo_flete": 28000, "tarifa_cliente": 36000, "diasCredito": 15, "prioridad": "normal", "_demo": true}], "viajes": [{"folio": "EMB-V01", "cliente": "Grupo Industrial Norteño S.A.", "origen": "Monterrey, NL", "destino": "Ciudad de México", "diaSemana": "Viernes", "fechaSalida": "01/05/2026", "tipoServicio": "REF", "ingresoMXN": 18500, "estatus": "Entregado", "semanaAnio": 18, "anio": 2026, "_demo": true}, {"folio": "EMB-V02", "cliente": "Distribuidora Central de Alimentos", "origen": "Monterrey, NL", "destino": "Ciudad de México", "diaSemana": "Viernes", "fechaSalida": "01/05/2026", "tipoServicio": "REF", "ingresoMXN": 12000, "estatus": "Entregado", "semanaAnio": 18, "anio": 2026, "_demo": true}, {"folio": "EMB-V03", "cliente": "Procesadora de Aceites del Sur", "origen": "Veracruz, VER", "destino": "Monterrey, NL", "diaSemana": "Sábado", "fechaSalida": "02/05/2026", "tipoServicio": "REF", "ingresoMXN": 62000, "estatus": "Entregado", "semanaAnio": 18, "anio": 2026, "_demo": true}, {"folio": "EMB-V04", "cliente": "Manufacturas del Bajío", "origen": "León, GTO", "destino": "Monterrey, NL", "diaSemana": "Lunes", "fechaSalida": "04/05/2026", "tipoServicio": "FTL", "ingresoMXN": 11000, "estatus": "Entregado", "semanaAnio": 18, "anio": 2026, "_demo": true}, {"folio": "EMB-V05", "cliente": "Comercio Internacional Frontera", "origen": "Monterrey, NL", "destino": "Laredo, TX", "diaSemana": "Lunes", "fechaSalida": "04/05/2026", "tipoServicio": "INT", "ingresoMXN": 28000, "estatus": "Entregado", "semanaAnio": 18, "anio": 2026, "_demo": true}, {"folio": "EMB-V06", "cliente": "Lácteos y Derivados del Norte", "origen": "Ciudad de México", "destino": "Monterrey, NL", "diaSemana": "Martes", "fechaSalida": "05/05/2026", "tipoServicio": "REF", "ingresoMXN": 20500, "estatus": "Entregado", "semanaAnio": 18, "anio": 2026, "_demo": true}, {"folio": "EMB-V07", "cliente": "Exportaciones del Pacífico", "origen": "Hermosillo, SON", "destino": "Monterrey, NL", "diaSemana": "Martes", "fechaSalida": "05/05/2026", "tipoServicio": "REF", "ingresoMXN": 36000, "estatus": "Entregado", "semanaAnio": 18, "anio": 2026, "_demo": true}, {"folio": "EMB-V08", "cliente": "Alimentos y Bebidas del Centro", "origen": "Monterrey, NL", "destino": "Querétaro, QRO", "diaSemana": "Miércoles", "fechaSalida": "06/05/2026", "tipoServicio": "FTL", "ingresoMXN": 14800, "estatus": "En tránsito", "semanaAnio": 18, "anio": 2026, "_demo": true}, {"folio": "EMB-V09", "cliente": "Grupo Industrial Norteño S.A.", "origen": "Monterrey, NL", "destino": "Guadalajara, JAL", "diaSemana": "Miércoles", "fechaSalida": "06/05/2026", "tipoServicio": "REF", "ingresoMXN": 12500, "estatus": "Programado", "semanaAnio": 18, "anio": 2026, "_demo": true}, {"folio": "EMB-V10", "cliente": "Distribuidora Central de Alimentos", "origen": "Monterrey, NL", "destino": "Ciudad de México", "diaSemana": "Jueves", "fechaSalida": "07/05/2026", "tipoServicio": "REF", "ingresoMXN": 13200, "estatus": "Programado", "semanaAnio": 18, "anio": 2026, "_demo": true}]}

const COLECCIONES = ['embarques','clientes','proveedores','viajesSemana','disponibilidad','solicitudesUnidad','cotizacionesInternas','autorizaciones']

// Logo SVG genérico — camión de carga
const LogoDemo = () => (
  <svg viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg" style={{height:36}}>
    <rect x="2" y="8" width="70" height="28" rx="4" fill="#1A56DB"/>
    <rect x="72" y="16" width="28" height="20" rx="3" fill="#1A56DB"/>
    <rect x="98" y="22" width="20" height="14" rx="2" fill="#0EA5E9"/>
    <circle cx="20" cy="36" r="5" fill="#1F2937" stroke="#fff" strokeWidth="1.5"/>
    <circle cx="55" cy="36" r="5" fill="#1F2937" stroke="#fff" strokeWidth="1.5"/>
    <circle cx="108" cy="36" r="5" fill="#1F2937" stroke="#fff" strokeWidth="1.5"/>
    <text x="7" y="26" fontSize="11" fontWeight="bold" fill="white" fontFamily="Arial">TLC</text>
  </svg>
)

export default function GestionDatos() {
  const { esMaestro } = useAuth()
  const [loading, setLoading] = useState(false)
  const [log, setLog] = useState([])
  const [confirm, setConfirm] = useState(null)
  const [texto, setTexto] = useState('')
  const [modoDemo, setModoDemo] = useState(false)

  const addLog = (msg, tipo = 'info') => setLog(l => [...l, { msg, tipo, t: new Date().toLocaleTimeString() }])

  if (!esMaestro) return (
    <div className="card p-8 text-center text-gray-400">
      <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
      <p>Solo el Maestro puede acceder a esta sección</p>
    </div>
  )

  const limpiarTodo = async () => {
    if (texto !== 'LIMPIAR TODO') return
    setLoading(true); setLog([])
    try {
      for (const col of COLECCIONES) {
        const snap = await getDocs(collection(db, col))
        if (snap.docs.length === 0) { addLog(`${col}: vacío`, 'info'); continue }
        // Borrar en batches de 400
        for (let i = 0; i < snap.docs.length; i += 400) {
          const batch = writeBatch(db)
          snap.docs.slice(i, i+400).forEach(d => batch.delete(doc(db, col, d.id)))
          await batch.commit()
        }
        addLog(`✓ ${col}: ${snap.docs.length} docs eliminados`, 'ok')
      }
      addLog('Limpieza completa', 'ok')
      setModoDemo(false)
    } catch(e) { addLog('Error: ' + e.message, 'error') }
    setConfirm(null); setTexto(''); setLoading(false)
  }

  const cargarDemo = async () => {
    setLoading(true); setLog([])
    try {
      const colecciones = [
        { nombre: 'clientes', datos: DEMO_DATA.clientes },
        { nombre: 'proveedores', datos: DEMO_DATA.proveedores },
        { nombre: 'embarques', datos: DEMO_DATA.embarques },
        { nombre: 'viajesSemana', datos: DEMO_DATA.viajes },
      ]
      for (const { nombre, datos } of colecciones) {
        for (const item of datos) {
          await addDoc(collection(db, nombre), { ...item, createdAt: serverTimestamp() })
        }
        addLog(`✓ ${datos.length} ${nombre} demo cargados`, 'ok')
      }
      addLog('Datos demo listos', 'ok')
      setModoDemo(true)
    } catch(e) { addLog('Error: ' + e.message, 'error') }
    setLoading(false)
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Gestión de datos</h1>
          <p className="text-sm text-gray-500">Solo visible para el Maestro</p>
        </div>
        {modoDemo && (
          <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg font-medium">
            Modo Demo activo
          </span>
        )}
      </div>

      {/* Vista previa logo demo */}
      <div className="card p-4 flex items-center gap-4">
        <div>
          <p className="text-xs text-gray-400 mb-2">Logo en modo demo</p>
          <div className="bg-white border border-gray-100 rounded-lg p-2 inline-block">
            <LogoDemo />
          </div>
        </div>
        <div className="text-xs text-gray-500">
          <p className="font-medium text-gray-700">Transportes y Logística del Centro</p>
          <p>RFC: TLC980312AB3</p>
          <p className="mt-1 text-gray-400">En modo demo el sistema muestra esta empresa ficticia en lugar de Log Up. El logo real se restaura al volver al modo producción.</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">Las acciones aquí son irreversibles. Limpiar borra permanentemente todos los documentos de Firestore.</p>
      </div>

      <div className="grid gap-4">
        {/* Cargar demo */}
        <div className="card p-5">
          <p className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-1">
            <Database className="w-4 h-4 text-brand" /> Cargar datos de demostración
          </p>
          <p className="text-xs text-gray-400 mb-3">Empresa ficticia "Transportes y Logística del Centro" — sin relación con Log Up</p>
          <div className="bg-blue-50 rounded-xl p-3 mb-3 text-xs text-gray-600 space-y-0.5">
            <p>• 8 clientes ficticios con rutas y tarifas realistas</p>
            <p>• 5 proveedores con KPIs inventados</p>
            <p>• 8 embarques en distintas etapas del board</p>
            <p>• 10 viajes semana 18 — total $188,000 MXN en ingresos</p>
          </div>
          <button onClick={cargarDemo} disabled={loading} className="btn-primary text-xs py-2 w-full justify-center disabled:opacity-50 flex items-center gap-1.5">
            {loading ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Cargando...</> : 'Cargar datos demo'}
          </button>
        </div>

        {/* Limpiar todo */}
        <div className="card p-5 border-red-100 border">
          <p className="text-sm font-semibold text-red-600 flex items-center gap-2 mb-1">
            <Trash2 className="w-4 h-4" /> Limpiar todas las colecciones
          </p>
          <p className="text-xs text-gray-400 mb-3">Elimina permanentemente todos los documentos. Usar antes de cargar datos reales.</p>
          {confirm !== 'limpiar' ? (
            <button onClick={() => setConfirm('limpiar')} className="text-xs bg-red-50 text-red-600 border border-red-200 py-2 px-4 rounded-lg hover:bg-red-100 w-full">
              Limpiar todo
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-red-600">Escribe <strong>LIMPIAR TODO</strong> para confirmar:</p>
              <input className="input text-xs" value={texto} onChange={e => setTexto(e.target.value)} placeholder="LIMPIAR TODO" />
              <div className="flex gap-2">
                <button onClick={() => { setConfirm(null); setTexto('') }} className="flex-1 btn-secondary text-xs py-1.5">Cancelar</button>
                <button onClick={limpiarTodo} disabled={texto !== 'LIMPIAR TODO' || loading} className="flex-1 text-xs bg-red-500 text-white py-1.5 rounded-lg hover:bg-red-600 disabled:opacity-40 font-medium">
                  {loading ? 'Limpiando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Log */}
      {log.length > 0 && (
        <div className="card p-4 space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Registro</p>
          {log.map((l, i) => (
            <div key={i} className={`flex items-center gap-2 text-xs ${l.tipo==='ok'?'text-green-700':l.tipo==='error'?'text-red-600':'text-gray-400'}`}>
              <span className="text-gray-300 shrink-0 tabular-nums">{l.t}</span>
              <span>{l.msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
