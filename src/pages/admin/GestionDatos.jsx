import { useState } from 'react'
import { collection, getDocs, doc, deleteDoc, addDoc, serverTimestamp, writeBatch, query, where } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../context/AuthContext'
import { Trash2, Database, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'

const DEMO_DATA = {"clientes": [{"razonSocial": "Alimentos del Norte S.A. de C.V.", "rfc": "ANO980312AB3", "contactoNombre": "Ing. Roberto Garza", "contactoTel": "81-2233-4455", "creditoDias": 30, "activo": true, "rutasPactadas": [{"origen": "MTY", "destino": "CDMX", "tipoServicio": "Refrigerado", "tarifa": 14500}, {"origen": "MTY", "destino": "GDL", "tipoServicio": "Congelado", "tarifa": 9800}], "_demo": true}, {"razonSocial": "Distribuidora Sigma Alimentos", "rfc": "DSA010523CD4", "contactoNombre": "Lic. Patricia Mendoza", "contactoTel": "81-3344-5566", "creditoDias": 45, "activo": true, "rutasPactadas": [{"origen": "MTY", "destino": "CDMX", "tipoServicio": "Congelado", "tarifa": 13200}], "_demo": true}, {"razonSocial": "Oleofinos de México", "rfc": "OME920714EF5", "contactoNombre": "C.P. Andrés Torres", "contactoTel": "55-4455-6677", "creditoDias": 60, "activo": true, "rutasPactadas": [{"origen": "CHINAMECA", "destino": "MTY", "tipoServicio": "Refrigerado", "tarifa": 50880}], "_demo": true}, {"razonSocial": "Industrias Baka S.A.", "rfc": "IBA850901GH6", "contactoNombre": "Ing. Sandra López", "contactoTel": "33-5566-7788", "creditoDias": 30, "activo": true, "rutasPactadas": [{"origen": "GDL", "destino": "MTY", "tipoServicio": "Seco", "tarifa": 8500}], "_demo": true}, {"razonSocial": "Procesadora del Pacífico", "rfc": "PPF031205IJ7", "contactoNombre": "Mtro. Carlos Vega", "contactoTel": "81-6677-8899", "creditoDias": 15, "activo": true, "rutasPactadas": [{"origen": "HMO", "destino": "MTY", "tipoServicio": "Fresco", "tarifa": 28000}], "_demo": true}, {"razonSocial": "Lácteos del Centro", "rfc": "LCE110730KL8", "contactoNombre": "Lic. María Hernández", "contactoTel": "55-7788-9900", "creditoDias": 30, "activo": true, "rutasPactadas": [{"origen": "CDMX", "destino": "MTY", "tipoServicio": "Refrigerado", "tarifa": 16000}], "_demo": true}, {"razonSocial": "Exportadora Fronteriza", "rfc": "EFR000416MN9", "contactoNombre": "Ing. José Ramírez", "contactoTel": "868-1122-3344", "creditoDias": 0, "activo": true, "rutasPactadas": [{"origen": "MTY", "destino": "LAREDO TX", "tipoServicio": "Fronterizo", "tarifa": 22000}], "_demo": true}, {"razonSocial": "Comercializadora Regioalimentos", "rfc": "CRG951201OP0", "contactoNombre": "C.P. Fernanda Cruz", "contactoTel": "81-8899-0011", "creditoDias": 45, "activo": true, "rutasPactadas": [{"origen": "MTY", "destino": "QRO", "tipoServicio": "Seco", "tarifa": 11500}], "_demo": true}], "proveedores": [{"nombre": "Transportes Regio Express", "tel": "81-2233-4455", "email": "ops@regioexpress.com", "calificacion": 4.8, "activo": true, "unidades": ["Reefer 53'", "Caja seca 53'"], "rutas": [{"origen": "MTY", "destino": "CDMX", "tipoUnidad": "Reefer 53'", "tarifa": 14500}, {"origen": "MTY", "destino": "GDL", "tipoUnidad": "Reefer 53'", "tarifa": 9800}], "kpis": {"viajes": 148, "puntualidad": 94, "incidencias": 2, "estadias": 3, "cancelaciones": 0}, "_demo": true}, {"nombre": "Fletes del Norte S.A.", "tel": "81-5566-7788", "email": "contacto@fletesnorte.mx", "calificacion": 4.5, "activo": true, "unidades": ["Caja refrigerada", "Rabón"], "rutas": [{"origen": "MTY", "destino": "CDMX", "tipoUnidad": "Caja refrigerada", "tarifa": 13200}], "kpis": {"viajes": 92, "puntualidad": 88, "incidencias": 5, "estadias": 8, "cancelaciones": 1}, "_demo": true}, {"nombre": "Logística Integral MX", "tel": "81-9900-1122", "email": "ventas@logisticamx.com", "calificacion": 4.2, "activo": true, "unidades": ["Tráiler", "Plataforma", "Tortón"], "rutas": [{"origen": "MTY", "destino": "CDMX", "tipoUnidad": "Tráiler", "tarifa": 12000}], "kpis": {"viajes": 67, "puntualidad": 82, "incidencias": 8, "estadias": 12, "cancelaciones": 2}, "_demo": true}, {"nombre": "Refrigerados del Noreste", "tel": "81-4455-6677", "email": "info@refrinoreste.com", "calificacion": 4.6, "activo": true, "unidades": ["Reefer 53'", "Caja refrigerada"], "rutas": [{"origen": "CDMX", "destino": "MTY", "tipoUnidad": "Reefer 53'", "tarifa": 15000}, {"origen": "MTY", "destino": "HMO", "tipoUnidad": "Reefer 53'", "tarifa": 27000}], "kpis": {"viajes": 115, "puntualidad": 91, "incidencias": 3, "estadias": 5, "cancelaciones": 0}, "_demo": true}], "embarques": [{"folio": "DT-62580", "cliente": "Distribuidora Sigma Alimentos", "origenNombre": "MTY", "destinoNombre": "CDMX", "categoria": "ref", "cp_temp": "-5°F", "etapa": "creado", "vendedor": "Erick Gómez", "proveedor_nombre": "Transportes Regio Express", "costo_flete": 14500, "tarifa_cliente": 18500, "diasCredito": 30, "prioridad": "normal", "_demo": true}, {"folio": "DT-62579", "cliente": "Alimentos del Norte S.A. de C.V.", "origenNombre": "MTY", "destinoNombre": "MTY", "categoria": "ref", "cp_temp": "28°F", "etapa": "posicionamiento", "vendedor": "Erick Gómez", "proveedor_nombre": "Fletes del Norte S.A.", "costo_flete": 9000, "tarifa_cliente": 12000, "diasCredito": 30, "prioridad": "normal", "_demo": true}, {"folio": "DT-62578", "cliente": "Oleofinos de México", "origenNombre": "CHINAMECA", "destinoNombre": "MTY", "categoria": "ref", "cp_temp": "34°F", "etapa": "transito", "vendedor": "Erick Gómez", "proveedor_nombre": "Refrigerados del Noreste", "costo_flete": 50880, "tarifa_cliente": 65000, "diasCredito": 60, "prioridad": "urgente", "_demo": true}, {"folio": "DT-62577", "cliente": "Exportadora Fronteriza", "origenNombre": "MTY", "destinoNombre": "LAREDO TX", "categoria": "ftl", "etapa": "carga", "vendedor": "Erick Gómez", "proveedor_nombre": "Logística Integral MX", "costo_flete": 22000, "tarifa_cliente": 28000, "diasCredito": 0, "prioridad": "normal", "_demo": true}, {"folio": "DT-62576", "cliente": "Lácteos del Centro", "origenNombre": "CDMX", "destinoNombre": "MTY", "categoria": "ref", "cp_temp": "38°F", "etapa": "entregado", "vendedor": "Erick Gómez", "proveedor_nombre": "Fletes del Norte S.A.", "costo_flete": 16000, "tarifa_cliente": 20500, "diasCredito": 30, "prioridad": "normal", "_demo": true}, {"folio": "DT-62575", "cliente": "Industrias Baka S.A.", "origenNombre": "GDL", "destinoNombre": "MTY", "categoria": "ftl", "etapa": "porFacturar", "vendedor": "Erick Gómez", "proveedor_nombre": "Transportes Regio Express", "costo_flete": 8500, "tarifa_cliente": 11000, "diasCredito": 30, "prioridad": "normal", "_demo": true}, {"folio": "DT-62574", "cliente": "Comercializadora Regioalimentos", "origenNombre": "MTY", "destinoNombre": "QRO", "categoria": "ftl", "etapa": "descarga", "vendedor": "Erick Gómez", "proveedor_nombre": "Logística Integral MX", "costo_flete": 11500, "tarifa_cliente": 14800, "diasCredito": 45, "prioridad": "normal", "_demo": true}, {"folio": "DT-62573", "cliente": "Procesadora del Pacífico", "origenNombre": "HMO", "destinoNombre": "MTY", "categoria": "ref", "cp_temp": "32°F", "etapa": "cobrado", "vendedor": "Erick Gómez", "proveedor_nombre": "Refrigerados del Noreste", "costo_flete": 28000, "tarifa_cliente": 36000, "diasCredito": 15, "prioridad": "normal", "_demo": true}], "viajes": [{"folio": "DT-D001", "cliente": "Alimentos del Norte S.A. de C.V.", "origen": "MTY", "destino": "CDMX", "diaSemana": "Viernes", "fechaSalida": "01/05/2026", "tipoServicio": "REF", "ingresoMXN": 18500, "estatus": "Entregado", "semanaAnio": 18, "anio": 2026, "_demo": true}, {"folio": "DT-D002", "cliente": "Distribuidora Sigma Alimentos", "origen": "MTY", "destino": "CDMX", "diaSemana": "Viernes", "fechaSalida": "01/05/2026", "tipoServicio": "REF", "ingresoMXN": 12000, "estatus": "Entregado", "semanaAnio": 18, "anio": 2026, "_demo": true}, {"folio": "DT-D003", "cliente": "Oleofinos de México", "origen": "CHINAMECA", "destino": "MTY", "diaSemana": "Sábado", "fechaSalida": "02/05/2026", "tipoServicio": "REF", "ingresoMXN": 65000, "estatus": "Entregado", "semanaAnio": 18, "anio": 2026, "_demo": true}, {"folio": "DT-D004", "cliente": "Industrias Baka S.A.", "origen": "GDL", "destino": "MTY", "diaSemana": "Lunes", "fechaSalida": "04/05/2026", "tipoServicio": "FTL", "ingresoMXN": 11000, "estatus": "Entregado", "semanaAnio": 18, "anio": 2026, "_demo": true}, {"folio": "DT-D005", "cliente": "Exportadora Fronteriza", "origen": "MTY", "destino": "LAREDO TX", "diaSemana": "Lunes", "fechaSalida": "04/05/2026", "tipoServicio": "INT", "ingresoMXN": 28000, "estatus": "Entregado", "semanaAnio": 18, "anio": 2026, "_demo": true}, {"folio": "DT-D006", "cliente": "Lácteos del Centro", "origen": "CDMX", "destino": "MTY", "diaSemana": "Martes", "fechaSalida": "05/05/2026", "tipoServicio": "REF", "ingresoMXN": 20500, "estatus": "Entregado", "semanaAnio": 18, "anio": 2026, "_demo": true}, {"folio": "DT-D007", "cliente": "Procesadora del Pacífico", "origen": "HMO", "destino": "MTY", "diaSemana": "Martes", "fechaSalida": "05/05/2026", "tipoServicio": "REF", "ingresoMXN": 36000, "estatus": "Entregado", "semanaAnio": 18, "anio": 2026, "_demo": true}, {"folio": "DT-D008", "cliente": "Comercializadora Regioalimentos", "origen": "MTY", "destino": "QRO", "diaSemana": "Miércoles", "fechaSalida": "06/05/2026", "tipoServicio": "FTL", "ingresoMXN": 14800, "estatus": "En tránsito", "semanaAnio": 18, "anio": 2026, "_demo": true}, {"folio": "DT-D009", "cliente": "Alimentos del Norte S.A. de C.V.", "origen": "MTY", "destino": "GDL", "diaSemana": "Miércoles", "fechaSalida": "06/05/2026", "tipoServicio": "REF", "ingresoMXN": 12500, "estatus": "Programado", "semanaAnio": 18, "anio": 2026, "_demo": true}, {"folio": "DT-D010", "cliente": "Distribuidora Sigma Alimentos", "origen": "MTY", "destino": "CDMX", "diaSemana": "Jueves", "fechaSalida": "07/05/2026", "tipoServicio": "REF", "ingresoMXN": 13200, "estatus": "Programado", "semanaAnio": 18, "anio": 2026, "_demo": true}]}

const COLECCIONES = ['embarques', 'clientes', 'proveedores', 'viajesSemana', 'disponibilidad', 'solicitudesUnidad', 'cotizacionesInternas']

export default function GestionDatos() {
  const { esMaestro } = useAuth()
  const [loading, setLoading] = useState(false)
  const [log, setLog] = useState([])
  const [confirm, setConfirm] = useState(null)
  const [texto, setTexto] = useState('')

  const addLog = (msg, tipo = 'info') => setLog(l => [...l, { msg, tipo, t: new Date().toLocaleTimeString() }])

  if (!esMaestro) return (
    <div className="card p-8 text-center text-gray-400">
      <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
      <p>Solo el Maestro puede acceder a esta sección</p>
    </div>
  )

  // Limpiar TODA la info real (solo docs con _demo:false o sin _demo)
  const limpiarDatosReales = async () => {
    if (texto !== 'LIMPIAR TODO') return
    setLoading(true)
    setLog([])
    try {
      for (const col of COLECCIONES) {
        const snap = await getDocs(collection(db, col))
        const batch = writeBatch(db)
        let count = 0
        snap.docs.forEach(d => {
          batch.delete(doc(db, col, d.id))
          count++
        })
        if (count > 0) {
          await batch.commit()
          addLog(`✓ ${col}: ${count} documentos eliminados`, 'ok')
        } else {
          addLog(`${col}: vacío`, 'info')
        }
      }
      addLog('Limpieza completada', 'ok')
    } catch(e) {
      addLog('Error: ' + e.message, 'error')
    }
    setConfirm(null)
    setTexto('')
    setLoading(false)
  }

  // Cargar datos demo ficticios
  const cargarDemo = async () => {
    setLoading(true)
    setLog([])
    try {
      // Clientes
      for (const c of DEMO_DATA.clientes) {
        await addDoc(collection(db, 'clientes'), { ...c, createdAt: serverTimestamp() })
      }
      addLog(`✓ ${DEMO_DATA.clientes.length} clientes demo cargados`, 'ok')

      // Proveedores
      for (const p of DEMO_DATA.proveedores) {
        await addDoc(collection(db, 'proveedores'), { ...p, createdAt: serverTimestamp() })
      }
      addLog(`✓ ${DEMO_DATA.proveedores.length} proveedores demo cargados`, 'ok')

      // Embarques
      for (const e of DEMO_DATA.embarques) {
        await addDoc(collection(db, 'embarques'), { ...e, createdAt: serverTimestamp() })
      }
      addLog(`✓ ${DEMO_DATA.embarques.length} embarques demo cargados`, 'ok')

      // Viajes semana
      for (const v of DEMO_DATA.viajes) {
        await addDoc(collection(db, 'viajesSemana'), { ...v, createdAt: serverTimestamp() })
      }
      addLog(`✓ ${DEMO_DATA.viajes.length} viajes demo cargados`, 'ok')

      addLog('Datos demo listos para presentación', 'ok')
    } catch(e) {
      addLog('Error: ' + e.message, 'error')
    }
    setLoading(false)
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Gestión de datos</h1>
        <p className="text-sm text-gray-500">Solo visible para el Maestro — manejo de datos reales y demo</p>
      </div>

      {/* Aviso */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800">
          <p className="font-semibold mb-1">Zona de administración de datos</p>
          <p>Las acciones aquí son irreversibles. Limpiar borra permanentemente todos los documentos de Firestore. Usa esto solo para cambiar entre datos reales y datos de demo.</p>
        </div>
      </div>

      {/* Acciones */}
      <div className="grid grid-cols-1 gap-4">

        {/* Cargar demo */}
        <div className="card p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Database className="w-4 h-4 text-brand" /> Cargar datos de demostración
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Carga clientes, proveedores, embarques y viajes ficticios para la presentación</p>
            </div>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 mb-3 text-xs text-gray-600 space-y-0.5">
            <p>• 8 clientes ficticios con rutas y tarifas</p>
            <p>• 4 proveedores con KPIs y documentación</p>
            <p>• 8 embarques en distintas etapas del board</p>
            <p>• 10 viajes de la semana 18 para el dashboard</p>
          </div>
          <button onClick={cargarDemo} disabled={loading} className="btn-primary text-xs py-2 w-full justify-center disabled:opacity-50">
            {loading ? <><RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> Cargando...</> : 'Cargar datos demo'}
          </button>
        </div>

        {/* Limpiar todo */}
        <div className="card p-5 border-red-100 border">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-red-600 flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> Limpiar todas las colecciones
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Elimina permanentemente todos los documentos de Firestore</p>
            </div>
          </div>
          <div className="bg-red-50 rounded-xl p-3 mb-3 text-xs text-red-700">
            Esto elimina: embarques, clientes, proveedores, viajes, disponibilidad, solicitudes y cotizaciones internas.
          </div>
          {confirm !== 'limpiar' ? (
            <button onClick={() => setConfirm('limpiar')} className="text-xs bg-red-50 text-red-600 border border-red-200 py-2 px-4 rounded-lg hover:bg-red-100 w-full">
              Limpiar todo
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-red-600 font-medium">Escribe <strong>LIMPIAR TODO</strong> para confirmar:</p>
              <input className="input text-xs" value={texto} onChange={e => setTexto(e.target.value)} placeholder="LIMPIAR TODO" />
              <div className="flex gap-2">
                <button onClick={() => { setConfirm(null); setTexto('') }} className="flex-1 btn-secondary text-xs py-1.5">Cancelar</button>
                <button onClick={limpiarDatosReales} disabled={texto !== 'LIMPIAR TODO' || loading} className="flex-1 text-xs bg-red-500 text-white py-1.5 rounded-lg hover:bg-red-600 disabled:opacity-40 font-medium">
                  {loading ? 'Limpiando...' : 'Confirmar limpieza'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Log de operaciones */}
      {log.length > 0 && (
        <div className="card p-4 space-y-1.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Registro de operaciones</p>
          {log.map((l, i) => (
            <div key={i} className={`flex items-center gap-2 text-xs ${l.tipo === 'ok' ? 'text-green-700' : l.tipo === 'error' ? 'text-red-600' : 'text-gray-500'}`}>
              <span className="text-gray-300 shrink-0">{l.t}</span>
              <span>{l.msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
