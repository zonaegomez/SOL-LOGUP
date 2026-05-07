import { useState, useEffect, useRef } from 'react'
import { collection, getDocs, addDoc, doc, getDoc, setDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../context/AuthContext'
import { Link } from 'react-router-dom'

const TIPOS_UNIDAD = ['Caja seca 53 pies', 'Caja refrigerada 53 pies', 'Tráiler', 'Rabón', 'Tortón', 'Plataforma', 'Full']

const NOTAS_DEFAULT = [
  'Cuenta con 6 horas libres de carga y 6 horas libres de descarga.',
  'ESTADIA 12 hrs O FRACCION.',
  'Los precios no incluyen IVA.',
  'El precio de los servicios es en Pesos mexicanos.',
  'Libre de maniobras, sujeto a disponibilidad.',
  'El servicio está programado para realizarse de manera continua, esto quiere decir que, si la unidad requiere esperar para cargar, descargar o alguna otra situación la cual sea atribuida al cliente se cobrará las estadías mencionadas. En caso de no tener ningún retraso solo se cobrará el servicio.',
  'El servicio incluye el uso de casetas.',
]

const INFO_EMPRESA = {
  direccion: 'ARCO VÍAL LAREDO - SALTILLO KM 37.9 LAMAR 3 L6, APODACA, NUEVO LEÓN.',
  rfc: 'LLS1407175E6',
  tel: '(81) 1941-7135',
  clave: '09FRQQ1855',
  revision: '1',
  fechaRevision: '01-Feb-2019',
  emision: '03-Jul-2017',
}

// Generar PDF con el formato exacto de Log Up
function generarCotizacionPDF(cotizacion, vendedor) {
  const fecha = new Date(cotizacion.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const filasTabla = cotizacion.rutas.map(r => `
    <tr>
      <td style="border:1px solid #000;padding:6px 10px;font-size:11px;">${r.descripcion}</td>
      <td style="border:1px solid #000;padding:6px 10px;font-size:11px;text-align:right;">${r.precio ? '$' + Number(r.precio).toLocaleString('es-MX', {minimumFractionDigits:2}) : ''}</td>
    </tr>`).join('')

  const filasServicios = cotizacion.servicios.filter(s => s.descripcion && s.precio).map(s => `
    <tr>
      <td style="border:1px solid #000;padding:6px 10px;font-size:11px;">${s.descripcion}</td>
      <td style="border:1px solid #000;padding:6px 10px;font-size:11px;text-align:right;">$${Number(s.precio).toLocaleString('es-MX', {minimumFractionDigits:2})}</td>
    </tr>`).join('')

  const notas = (cotizacion.notas || NOTAS_DEFAULT).map((n, i) => `
    <li style="margin-bottom:4px;">${n}</li>`).join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Cotización ${cotizacion.numero}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #000; padding: 32px; max-width: 800px; margin: 0 auto; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>

<!-- Header superior: dirección y datos empresa -->
<div style="text-align:center;font-size:9px;color:#333;margin-bottom:8px;">
  ${INFO_EMPRESA.direccion}<br>
  RFC: ${INFO_EMPRESA.rfc} &nbsp;|&nbsp; TEL: ${INFO_EMPRESA.tel}
</div>

<!-- Tabla principal de cabecera -->
<table style="width:100%;border-collapse:collapse;margin-bottom:0;">
  <tr>
    <!-- Logo -->
    <td style="width:25%;border:1px solid #000;padding:8px;vertical-align:middle;text-align:center;" rowspan="2">
      <img src="${window.location.origin}/logupcompleto.png" style="height:55px;object-fit:contain;" onerror="this.style.display='none';this.nextSibling.style.display='block'"/>
      <div style="display:none;font-size:18px;font-weight:900;color:#1a3672;">LOG<span style="color:#333">UP</span><br><span style="font-size:8px;letter-spacing:1px;font-weight:400;">LOGÍSTICA Y SERVICIOS</span></div>
    </td>
    <!-- Título COTIZACIÓN -->
    <td style="width:40%;border:1px solid #000;padding:12px;text-align:center;vertical-align:middle;font-size:16px;font-weight:bold;letter-spacing:2px;" rowspan="2">
      COTIZACIÓN
    </td>
    <!-- Datos clave -->
    <td style="width:35%;border:1px solid #000;padding:4px 8px;font-size:9px;vertical-align:top;">
      <table style="width:100%;">
        <tr><td style="color:#666;">Clave:</td><td style="text-align:right;">${INFO_EMPRESA.clave}</td></tr>
        <tr><td style="color:#666;">Revisión:</td><td style="text-align:right;">${INFO_EMPRESA.revision}</td></tr>
        <tr><td style="color:#666;">Fecha de revisión:</td><td style="text-align:right;">${INFO_EMPRESA.fechaRevision}</td></tr>
        <tr><td style="color:#666;">Emisión:</td><td style="text-align:right;">${INFO_EMPRESA.emision}</td></tr>
      </table>
    </td>
  </tr>
</table>

<!-- Número de cotización y fecha -->
<table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
  <tr>
    <td style="width:65%;border:1px solid #000;border-top:none;padding:0;"></td>
    <td style="width:35%;border:1px solid #000;border-top:none;padding:0;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="border:1px solid #000;padding:5px 8px;font-size:10px;font-weight:bold;background:#f5f5f5;">COTIZACIÓN</td>
          <td style="border:1px solid #000;padding:5px 8px;font-size:11px;font-weight:bold;color:#cc0000;text-align:center;">${cotizacion.numero}</td>
        </tr>
        <tr>
          <td style="border:1px solid #000;padding:5px 8px;font-size:10px;font-weight:bold;background:#f5f5f5;">FECHA</td>
          <td style="border:1px solid #000;padding:5px 8px;font-size:10px;text-align:center;">${fecha}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- Datos del cliente -->
<table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
  <tr>
    <td style="width:50%;padding:3px 0;font-size:11px;"><strong>Empresa:</strong> ${cotizacion.empresa}</td>
    <td style="width:50%;padding:3px 0;font-size:11px;"><strong>Oficina:</strong> ${cotizacion.oficina || ''}</td>
  </tr>
  <tr>
    <td style="padding:3px 0;font-size:11px;"><strong>Cliente:</strong> ${cotizacion.contacto}</td>
    <td style="padding:3px 0;font-size:11px;"><strong>Celular:</strong> ${cotizacion.celular || ''}</td>
  </tr>
  <tr>
    <td style="padding:3px 0;font-size:11px;"><strong>Puesto:</strong> ${cotizacion.puesto || ''}</td>
    <td style="padding:3px 0;font-size:11px;"><strong>E-MAIL:</strong> ${cotizacion.email || ''}</td>
  </tr>
</table>

<p style="font-size:11px;margin-bottom:16px;">Estimado (a):</p>
<p style="font-size:11px;margin-bottom:20px;">En atención a su solicitud, nos permitimos enviarle la cotización correspondiente al servicio de transporte de carga en unidad ${cotizacion.tipoUnidad}.</p>

<!-- Tabla de precios -->
<table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
  <thead>
    <tr>
      <th style="border:1px solid #000;padding:8px 10px;background:#000;color:#fff;font-size:11px;text-align:left;width:65%;">ORIGEN-DESTINO</th>
      <th style="border:1px solid #000;padding:8px 10px;background:#000;color:#fff;font-size:11px;text-align:center;width:35%;">${cotizacion.tipoUnidad.toUpperCase()}</th>
    </tr>
  </thead>
  <tbody>
    ${filasTabla}
    ${filasServicios ? `<tr><td colspan="2" style="border:1px solid #000;padding:4px 10px;background:#f5f5f5;font-size:10px;font-weight:bold;color:#333;">SERVICIOS ADICIONALES</td></tr>${filasServicios}` : ''}
  </tbody>
</table>

<!-- Notas -->
<div style="margin-bottom:24px;">
  <p style="font-size:11px;font-weight:bold;margin-bottom:8px;">NOTA:</p>
  <ul style="padding-left:20px;font-size:11px;line-height:1.6;">
    ${notas}
  </ul>
</div>

<!-- Firma -->
<div style="margin-top:48px;text-align:center;">
  <div style="border-top:1px solid #000;width:220px;margin:0 auto;padding-top:6px;">
    <p style="font-size:11px;font-weight:bold;">${vendedor?.nombre || 'Ing. Erick Gómez'}</p>
    <p style="font-size:10px;">${vendedor?.email || 'Ventas1@logup.mx'}</p>
  </div>
</div>

<!-- Footer empresa -->
<div style="margin-top:32px;border-top:3px solid #1a3672;padding-top:8px;text-align:center;font-size:9px;color:#333;">
  ${INFO_EMPRESA.direccion}<br>
  RFC: ${INFO_EMPRESA.rfc} &nbsp;|&nbsp; TEL: ${INFO_EMPRESA.tel}
</div>

<script>window.onload=()=>window.print()</script>
</body></html>`

  const ventana = window.open('', '_blank', 'width=900,height=700')
  ventana.document.write(html)
  ventana.document.close()
}

// ── Formulario nueva cotización ───────────────────────────────────────────────
function NuevaCotizacion({ onGuardado, onCancelar, vendedor }) {
  const [form, setForm] = useState({
    empresa: '', contacto: '', puesto: '', oficina: '', celular: '', email: '',
    tipoUnidad: 'Caja seca 53 pies',
    rutas: [
      { descripcion: '', precio: '' },
      { descripcion: '', precio: '' },
      { descripcion: '', precio: '' },
    ],
    servicios: [
      { descripcion: 'MOVIMIENTO EN FALSO', precio: '' },
      { descripcion: 'ESTADÍA LOCAL', precio: '' },
      { descripcion: '', precio: '' },
    ],
    notas: [...NOTAS_DEFAULT],
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({...f, [k]: v}))

  const setRuta = (i, k, v) => setForm(f => {
    const rutas = [...f.rutas]
    rutas[i] = {...rutas[i], [k]: v}
    return {...f, rutas}
  })

  const setServicio = (i, k, v) => setForm(f => {
    const servicios = [...f.servicios]
    servicios[i] = {...servicios[i], [k]: v}
    return {...f, servicios}
  })

  const setNota = (i, v) => setForm(f => {
    const notas = [...f.notas]
    notas[i] = v
    return {...f, notas}
  })

  const guardar = async () => {
    if (!form.empresa) return alert('La empresa es obligatoria')
    setSaving(true)
    try {
      // Obtener siguiente número
      const configSnap = await getDoc(doc(db, 'config', 'cotizaciones'))
      const ultimo = configSnap.exists() ? configSnap.data().ultimoNumero || 96 : 96
      const nuevo = ultimo + 1
      const numero = `LOG-${String(nuevo).padStart(5, '0')}`

      await addDoc(collection(db, 'cotizaciones'), {
        ...form,
        numero,
        fecha: new Date().toISOString(),
        vendedorNombre: vendedor?.nombre || '',
        vendedorEmail: vendedor?.email || '',
        estado: 'vigente',
        createdAt: serverTimestamp(),
      })

      await setDoc(doc(db, 'config', 'cotizaciones'), { ultimoNumero: nuevo }, { merge: true })
      onGuardado()
    } catch(e) {
      console.error(e)
      alert('Error al guardar')
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={onCancelar} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Nueva cotización</h2>
          <p className="text-xs text-gray-500">Se generará el número automáticamente</p>
        </div>
      </div>

      {/* Datos del cliente */}
      <div className="card p-5 space-y-4">
        <p className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Datos del cliente</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">Empresa *</label><input className="input" value={form.empresa} onChange={e=>set('empresa',e.target.value)} placeholder="Razón social" /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Contacto</label><input className="input" value={form.contacto} onChange={e=>set('contacto',e.target.value)} placeholder="Nombre completo" /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Puesto</label><input className="input" value={form.puesto} onChange={e=>set('puesto',e.target.value)} placeholder="Jefe de Logística" /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Oficina</label><input className="input" value={form.oficina} onChange={e=>set('oficina',e.target.value)} placeholder="MTY, CDMX..." /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Celular</label><input className="input" value={form.celular} onChange={e=>set('celular',e.target.value)} /></div>
          <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">Email</label><input className="input" value={form.email} onChange={e=>set('email',e.target.value)} /></div>
        </div>
      </div>

      {/* Tipo de unidad */}
      <div className="card p-5">
        <p className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-3">Tipo de unidad</p>
        <div className="flex flex-wrap gap-2">
          {TIPOS_UNIDAD.map(t => (
            <button key={t} onClick={() => set('tipoUnidad', t)}
              className={`px-3 py-1.5 rounded-lg text-xs border-2 transition-all ${form.tipoUnidad===t?'border-brand bg-blue-50 text-brand font-medium':'border-gray-100 text-gray-600 hover:border-gray-300'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de precios - Rutas */}
      <div className="card p-5">
        <p className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-3">Rutas y precios</p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">ORIGEN - DESTINO</p>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">PRECIO MXN</p>
        </div>
        {form.rutas.map((r, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 mb-2">
            <input className="input text-xs" placeholder="Ej. LOCAL EN MONTERREY (32 KM A LA REDONDA)" value={r.descripcion} onChange={e=>setRuta(i,'descripcion',e.target.value)} />
            <input className="input text-xs" placeholder="7500" type="number" value={r.precio} onChange={e=>setRuta(i,'precio',e.target.value)} />
          </div>
        ))}
        <button onClick={() => setForm(f=>({...f, rutas:[...f.rutas,{descripcion:'',precio:''}]}))} className="text-xs text-brand hover:underline mt-1">+ Agregar ruta</button>
      </div>

      {/* Servicios adicionales */}
      <div className="card p-5">
        <p className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-3">Servicios adicionales</p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">SERVICIO</p>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">PRECIO MXN</p>
        </div>
        {form.servicios.map((s, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 mb-2">
            <input className="input text-xs" placeholder="Ej. MOVIMIENTO EN FALSO" value={s.descripcion} onChange={e=>setServicio(i,'descripcion',e.target.value)} />
            <input className="input text-xs" placeholder="5000" type="number" value={s.precio} onChange={e=>setServicio(i,'precio',e.target.value)} />
          </div>
        ))}
        <button onClick={() => setForm(f=>({...f, servicios:[...f.servicios,{descripcion:'',precio:''}]}))} className="text-xs text-brand hover:underline mt-1">+ Agregar servicio</button>
      </div>

      {/* Notas */}
      <div className="card p-5">
        <p className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-3">Notas y condiciones</p>
        <p className="text-xs text-gray-400 mb-3">Edita las notas si es necesario para esta cotización</p>
        {form.notas.map((n, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <span className="text-gray-400 text-xs mt-2 shrink-0">•</span>
            <textarea className="input text-xs resize-none flex-1" rows={2} value={n} onChange={e=>setNota(i,e.target.value)} />
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={onCancelar} className="btn-secondary flex-1 justify-center">Cancelar</button>
        <button onClick={guardar} disabled={saving} className="btn-primary flex-1 justify-center">
          {saving ? 'Guardando...' : 'Guardar cotización'}
        </button>
      </div>
    </div>
  )
}

export default function Cotizaciones() {
  const { perfil, esMaestro, esGerente } = useAuth()
  const [cotizaciones, setCotizaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState('lista')
  const [busqueda, setBusqueda] = useState('')
  const [vistaPrevia, setVistaPrevia] = useState(null)
  const [confirmEliminar, setConfirmEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => { fetchCotizaciones() }, [])

  const eliminarCotizacion = async () => {
    if (!confirmEliminar) return
    setEliminando(true)
    try {
      await deleteDoc(doc(db, 'cotizaciones', confirmEliminar.id))
      setConfirmEliminar(null)
      fetchCotizaciones()
    } catch(e) { console.error(e) }
    finally { setEliminando(false) }
  }

  const fetchCotizaciones = async () => {
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'cotizaciones'))
      const data = snap.docs.map(d => ({id: d.id, ...d.data()}))
        .sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0))
      setCotizaciones(data)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const filtradas = busqueda
    ? cotizaciones.filter(c => c.empresa?.toLowerCase().includes(busqueda.toLowerCase()) || c.numero?.includes(busqueda))
    : cotizaciones

  if (vista === 'nueva') {
    return (
      <div className="p-1">
        <NuevaCotizacion
          vendedor={perfil}
          onGuardado={() => { fetchCotizaciones(); setVista('lista') }}
          onCancelar={() => setVista('lista')}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Cotizaciones</h1>
          <p className="text-sm text-gray-500">Genera y gestiona cotizaciones para clientes</p>
        </div>
        <button onClick={() => setVista('nueva')} className="btn-primary">+ Nueva cotización</button>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <input className="input" placeholder="Buscar por empresa o número de cotización..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} />
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando cotizaciones...</div>
        ) : filtradas.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-3xl mb-3">📄</p>
            <p className="font-medium">Sin cotizaciones</p>
            <p className="text-sm mt-1">Crea la primera cotización para un cliente.</p>
            <button onClick={() => setVista('nueva')} className="btn-primary mt-4 inline-flex">+ Nueva cotización</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                {['Número','Empresa','Contacto','Unidad','Fecha','Estado',''].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtradas.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-red-600">{c.numero}</td>
                  <td className="px-4 py-3 font-medium text-gray-800 max-w-40 truncate">{c.empresa}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{c.contacto || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{c.tipoUnidad}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {c.fecha ? new Date(c.fecha).toLocaleDateString('es-MX') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.estado==='vigente'?'bg-green-50 text-green-700':'bg-gray-100 text-gray-500'}`}>
                      {c.estado || 'vigente'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setVistaPrevia(c)} className="text-xs text-brand hover:underline font-medium">Ver</button>
                      <button onClick={() => generarCotizacionPDF(c, { nombre: c.vendedorNombre, email: c.vendedorEmail })} className="text-xs text-gray-500 hover:underline">Imprimir</button>
                      {(esMaestro || esGerente) && <button onClick={() => setConfirmEliminar(c)} className="text-xs text-red-400 hover:text-red-600">Eliminar</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Vista Previa */}
      {vistaPrevia && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <p className="text-sm font-semibold text-gray-900">{vistaPrevia.numero}</p>
                <p className="text-xs text-gray-400">{vistaPrevia.empresa}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => generarCotizacionPDF(vistaPrevia, { nombre: vistaPrevia.vendedorNombre, email: vistaPrevia.vendedorEmail })} className="btn-primary text-xs py-1.5">Imprimir / PDF</button>
                <button onClick={() => setVistaPrevia(null)} className="btn-secondary text-xs py-1.5">Cerrar</button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-6 text-xs space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-gray-400">Empresa: </span><strong>{vistaPrevia.empresa}</strong></div>
                <div><span className="text-gray-400">Contacto: </span><strong>{vistaPrevia.contacto}</strong></div>
                <div><span className="text-gray-400">Unidad: </span><strong>{vistaPrevia.tipoUnidad}</strong></div>
                <div><span className="text-gray-400">Fecha: </span><strong>{vistaPrevia.fecha ? new Date(vistaPrevia.fecha).toLocaleDateString('es-MX') : '—'}</strong></div>
              </div>
              <table className="w-full border-collapse">
                <thead><tr className="bg-gray-900 text-white"><th className="text-left px-3 py-2">Ruta / Descripción</th><th className="text-right px-3 py-2">Precio</th></tr></thead>
                <tbody>
                  {(vistaPrevia.rutas||[]).filter(r=>r.descripcion).map((r,i)=>(
                    <tr key={i} className="border-b border-gray-100">
                      <td className="px-3 py-2">{r.descripcion}</td>
                      <td className="px-3 py-2 text-right font-bold text-brand">{r.precio?'$'+Number(r.precio).toLocaleString('es-MX'):''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(vistaPrevia.notas||[]).length > 0 && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="font-semibold mb-1">Notas:</p>
                  {vistaPrevia.notas.map((n,i) => <p key={i} className="text-gray-600">• {n}</p>)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Eliminar */}
      {confirmEliminar && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-base font-semibold text-red-600 mb-2">Eliminar cotización</h2>
            <p className="text-xs text-gray-500 mb-1">Número: <strong>{confirmEliminar.numero}</strong></p>
            <p className="text-xs text-gray-500 mb-4">Empresa: <strong>{confirmEliminar.empresa}</strong></p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmEliminar(null)} className="flex-1 btn-secondary text-xs">Cancelar</button>
              <button onClick={eliminarCotizacion} disabled={eliminando} className="flex-1 text-xs bg-red-500 text-white py-2.5 rounded-lg hover:bg-red-600 disabled:opacity-50 font-medium">
                {eliminando ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
