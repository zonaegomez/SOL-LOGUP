import html2canvas from 'html2canvas'
import { useEffect, useState } from 'react'
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../context/AuthContext'

const COLS = [
  { key: 'embarcadoCreado', label: 'Creado', icon: '📋' },
  { key: 'posicionamiento', label: 'Posicionamiento', icon: '📍' },
  { key: 'carga', label: 'Carga', icon: '📦' },
  { key: 'transito', label: 'Tránsito', icon: '🚛' },
  { key: 'descarga', label: 'Descarga', icon: '🏭' },
  { key: 'entregado', label: 'Entregado', icon: '✅' },
  { key: 'provisiones', label: 'Provisiones', icon: '💰' },
  { key: 'porFacturar', label: 'Por facturar', icon: '🧾' },
  { key: 'cobrado', label: 'Cobrado', icon: '💳' },
]

const LIMITES_ETAPA = {
  embarcadoCreado: null, posicionamiento: 4, carga: 6,
  transito: null, descarga: 6, entregado: null,
  provisiones: null, porFacturar: 48, cobrado: null,
}

const DEMO_EMBARQUES = [
  { id:'demo-001', folio:'DT-2605-44821', cliente:'SIGMA ALIMENTOS COMERCIAL', clienteRFC:'SAC850101SA1', origenNombre:'Monterrey, NL', destinoNombre:'CDMX', categoria:'ref', etapa:'transito', prioridad:'urgente', fechaCarga: new Date(Date.now()-6*3600000).toISOString(), fechaETA: new Date(Date.now()+8*3600000).toISOString(), etapaEntradaAt: new Date(Date.now()-6*3600000).toISOString(), horasLibresCarga:6, horasLibresDescarga:6, distanciaKm:910, op_nombre:'MARTIN SANCHEZ', op_placas:'NLE-4821-B', op_tipoUnidad:'caja_ref', cp_descripcion:'Productos cárnicos refrigerados', cp_peso:'18000', cp_unidadPeso:'KGM', cp_pallets:'33', cp_valorMercancia:'850000', cp_moneda:'MXN', vendedor:'E. Gomez', referencia:'SIG-2605-001', observaciones:'Temperatura requerida: -4°C. Verificar cadena de frío en descarga. Entregar en CD Vallejo, recepción 3.', origenCP:'64000', destinoCP:'07870', _demo:true },
  { id:'demo-002', folio:'DT-2605-33190', cliente:'PILGRIMS PRIDE', clienteRFC:'PPR920301PP2', origenNombre:'Saltillo, COAH', destinoNombre:'Querétaro, QRO', categoria:'ref', etapa:'carga', prioridad:'normal', fechaCarga: new Date(Date.now()-7*3600000).toISOString(), fechaETA: new Date(Date.now()+2*3600000).toISOString(), etapaEntradaAt: new Date(Date.now()-7*3600000).toISOString(), horasLibresCarga:6, horasLibresDescarga:6, distanciaKm:800, op_nombre:'LUIS RAMIREZ', op_placas:'COAH-9032-C', op_tipoUnidad:'caja_ref', cp_descripcion:'Pollo procesado congelado', cp_peso:'14000', cp_unidadPeso:'KGM', cp_pallets:'22', cp_valorMercancia:'480000', cp_moneda:'MXN', vendedor:'E. Gomez', referencia:'PP-0503-QRO', observaciones:'', origenCP:'25000', destinoCP:'76000', _demo:true },
  { id:'demo-003', folio:'DT-2605-71045', cliente:'SUPERMERCADOS INTERNACIONALES H-E-B', clienteRFC:'SIH010101HB3', origenNombre:'Monterrey, NL', destinoNombre:'Laredo, TX', categoria:'int', etapa:'posicionamiento', prioridad:'normal', fechaCarga: new Date(Date.now()+2*3600000).toISOString(), fechaETA: new Date(Date.now()+18*3600000).toISOString(), etapaEntradaAt: new Date(Date.now()-1*3600000).toISOString(), horasLibresCarga:6, horasLibresDescarga:6, distanciaKm:240, op_nombre:'', op_placas:'', op_tipoUnidad:'trailer', cp_descripcion:'Productos alimenticios varios', cp_peso:'20000', cp_unidadPeso:'KGM', cp_pallets:'38', cp_valorMercancia:'1100000', cp_moneda:'MXN', vendedor:'E. Gomez', referencia:'HEB-MAY-045', observaciones:'Unidad pendiente de asignación. Despacho aduanal confirmado.', origenCP:'64000', destinoCP:'78040', _demo:true },
  { id:'demo-004', folio:'DT-2605-58302', cliente:'FRIJALSA FRIGORIFICOS', clienteRFC:'FFR150601FF4', origenNombre:'CDMX', destinoNombre:'Monterrey, NL', categoria:'ref', etapa:'transito', prioridad:'normal', fechaCarga: new Date(Date.now()-14*3600000).toISOString(), fechaETA: new Date(Date.now()+1*3600000).toISOString(), etapaEntradaAt: new Date(Date.now()-14*3600000).toISOString(), horasLibresCarga:6, horasLibresDescarga:8, distanciaKm:910, op_nombre:'JOSE TORRES', op_placas:'CDMX-5821-A', op_tipoUnidad:'caja_ref', cp_descripcion:'Productos lácteos refrigerados', cp_peso:'9500', cp_unidadPeso:'KGM', cp_pallets:'18', cp_valorMercancia:'390000', cp_moneda:'MXN', vendedor:'E. Gomez', referencia:'FRJ-REF-302', observaciones:'Temperatura requerida: 2°C a 6°C. Verificar termógrafo al arribo.', origenCP:'07870', destinoCP:'64000', _demo:true },
  { id:'demo-005', folio:'DT-2605-92011', cliente:'BACHOCO COMERCIAL', clienteRFC:'BCO880901BC5', origenNombre:'Guadalajara, JAL', destinoNombre:'Monterrey, NL', categoria:'ftl', etapa:'descarga', prioridad:'normal', fechaCarga: new Date(Date.now()-22*3600000).toISOString(), fechaETA: new Date(Date.now()-1*3600000).toISOString(), etapaEntradaAt: new Date(Date.now()-3*3600000).toISOString(), horasLibresCarga:6, horasLibresDescarga:6, distanciaKm:690, op_nombre:'CARLOS VEGA', op_placas:'JAL-7734-D', op_tipoUnidad:'trailer', cp_descripcion:'Alimento balanceado para aves', cp_peso:'24000', cp_unidadPeso:'KGM', cp_pallets:'40', cp_valorMercancia:'520000', cp_moneda:'MXN', vendedor:'E. Gomez', referencia:'BAC-GDL-2605', observaciones:'', origenCP:'44100', destinoCP:'64000', _demo:true },
  { id:'demo-006', folio:'DT-2605-10472', cliente:'FERRERO DE MEXICO', clienteRFC:'FMX030201FM6', origenNombre:'Monterrey, NL', destinoNombre:'CDMX', categoria:'ltl', etapa:'embarcadoCreado', prioridad:'normal', fechaCarga: new Date(Date.now()+6*3600000).toISOString(), fechaETA: new Date(Date.now()+24*3600000).toISOString(), etapaEntradaAt: new Date(Date.now()-0.5*3600000).toISOString(), horasLibresCarga:6, horasLibresDescarga:6, distanciaKm:910, op_nombre:'', op_placas:'', op_tipoUnidad:'rabon', cp_descripcion:'Chocolates y confitería', cp_peso:'3200', cp_unidadPeso:'KGM', cp_pallets:'6', cp_valorMercancia:'210000', cp_moneda:'MXN', vendedor:'E. Gomez', referencia:'FER-CDG-472', observaciones:'Mercancía sensible al calor. No exponer a temperaturas mayores a 22°C.', origenCP:'64000', destinoCP:'06600', _demo:true },
  { id:'demo-007', folio:'DT-2605-37841', cliente:'JUGOS DEL VALLE', clienteRFC:'JDV010101JV7', origenNombre:'Monterrey, NL', destinoNombre:'Guadalajara, JAL', categoria:'ftl', etapa:'porFacturar', prioridad:'normal', fechaCarga: new Date(Date.now()-30*3600000).toISOString(), fechaETA: new Date(Date.now()-10*3600000).toISOString(), etapaEntradaAt: new Date(Date.now()-10*3600000).toISOString(), horasLibresCarga:6, horasLibresDescarga:6, distanciaKm:690, op_nombre:'PEDRO ALVARADO', op_placas:'NLE-2241-F', op_tipoUnidad:'trailer', cp_descripcion:'Jugos y bebidas naturales', cp_peso:'21000', cp_unidadPeso:'KGM', cp_pallets:'36', cp_valorMercancia:'380000', cp_moneda:'MXN', vendedor:'E. Gomez', referencia:'JDV-GDL-841', observaciones:'', origenCP:'64000', destinoCP:'44100', _demo:true },
]

const TIPO_COLOR = { ftl:'bg-blue-50 text-blue-700', ltl:'bg-amber-50 text-amber-700', int:'bg-purple-50 text-purple-700', imp:'bg-purple-50 text-purple-700', ref:'bg-green-50 text-green-700', exp:'bg-pink-50 text-pink-700' }
const TIPO_TAG = { ftl:'FTL', ltl:'LTL', int:'INT', imp:'IMP', ref:'REF', exp:'EXP' }
const TIPO_LABEL = { ftl:'Flete Terrestre Completo', ltl:'Carga Parcial', int:'Exportación Terrestre', imp:'Importación Terrestre', ref:'Refrigerado', exp:'Exportación' }
const UNIDAD_LABEL = { trailer:'Tráiler', caja_seca:'Caja seca', caja_ref:'Caja refrigerada', rabon:'Rabón', torton:'Tortón', plataforma:'Plataforma', pipa:'Pipa' }

const SEM = { red:{dot:'bg-red-500',text:'text-red-600',border:'border-l-red-400'}, yellow:{dot:'bg-amber-400',text:'text-amber-600',border:'border-l-amber-400'}, green:{dot:'bg-green-400',text:'text-green-600',border:'border-l-green-300'} }

function calcETA(km) { return Math.ceil(km/65)+(km>500?2:1) }

function semETA(fechaETA) {
  if(!fechaETA) return null
  const mins=(new Date(fechaETA).getTime()-Date.now())/60000
  if(mins<0) return {color:'red',texto:`${Math.abs(Math.round(mins/60))}h vencido`}
  if(mins<60) return {color:'red',texto:`${Math.round(mins)}min`}
  if(mins<180) return {color:'yellow',texto:`${Math.round(mins/60)}h restantes`}
  return {color:'green',texto:`${Math.round(mins/60)}h restantes`}
}

function semEtapa(etapa,entrada,hCarga,hDesc,km) {
  if(!entrada) return null
  let lim=LIMITES_ETAPA[etapa]
  if(etapa==='carga') lim=hCarga||6
  if(etapa==='descarga') lim=hDesc||6
  if(etapa==='transito'&&km) lim=calcETA(km)
  if(!lim) return null
  const hrs=(Date.now()-new Date(entrada).getTime())/3600000
  const pct=(hrs/lim)*100
  const rest=lim-hrs
  if(pct>=100) return {color:'red',texto:`+${Math.round(hrs-lim)}h estadía ⚠️`,estadia:true}
  if(pct>=75) return {color:'yellow',texto:`${Math.round(rest*60)}min libres`}
  return {color:'green',texto:`${Math.round(rest)}h libres`}
}

function fmt(n,cur='MXN') {
  return '$'+Number(n||0).toLocaleString('es-MX',{minimumFractionDigits:2})+' '+cur
}

// Genera la Carta de Instrucciones como ventana de impresión
function generarCartaPDF(em) {
  const eta = em.distanciaKm ? calcETA(em.distanciaKm) : '—'
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Carta de Instrucciones ${em.folio}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a1a; padding: 32px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #1a56db; padding-bottom:16px; margin-bottom:20px; }
  .logo { font-size:22px; font-weight:900; color:#1a56db; letter-spacing:-1px; }
  .logo span { color:#1a1a1a; }
  .folio { text-align:right; }
  .folio h2 { font-size:16px; font-weight:700; color:#1a1a1a; }
  .folio p { font-size:10px; color:#666; margin-top:2px; }
  .badge { display:inline-block; background:#1a56db; color:white; padding:2px 8px; border-radius:4px; font-size:10px; font-weight:600; margin-top:4px; }
  .section { margin-bottom:16px; }
  .section-title { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#1a56db; border-bottom:1px solid #e5e7eb; padding-bottom:4px; margin-bottom:8px; }
  .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .grid3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; }
  .field { margin-bottom:4px; }
  .label { font-size:9px; color:#888; text-transform:uppercase; letter-spacing:0.5px; }
  .value { font-size:11px; font-weight:600; color:#1a1a1a; margin-top:1px; }
  .route-box { background:#f0f7ff; border:1px solid #bfdbfe; border-radius:8px; padding:12px; margin-bottom:16px; }
  .route-inner { display:flex; align-items:center; gap:12px; }
  .route-point { flex:1; }
  .route-point .label { font-size:9px; color:#1a56db; }
  .route-point .city { font-size:13px; font-weight:700; }
  .route-point .cp { font-size:10px; color:#555; }
  .arrow { font-size:20px; color:#1a56db; }
  .eta-box { text-align:center; background:#eff6ff; border-radius:6px; padding:8px 16px; }
  .eta-box .num { font-size:18px; font-weight:900; color:#1a56db; }
  .eta-box .sub { font-size:9px; color:#555; }
  table { width:100%; border-collapse:collapse; }
  th { background:#f8fafc; font-size:9px; text-transform:uppercase; letter-spacing:0.5px; color:#666; padding:6px 8px; text-align:left; border:1px solid #e5e7eb; }
  td { padding:6px 8px; border:1px solid #e5e7eb; font-size:10px; }
  .total-row td { background:#f0f7ff; font-weight:700; color:#1a56db; }
  .alert-box { background:#fff7ed; border:1px solid #fed7aa; border-radius:6px; padding:10px 12px; }
  .alert-box p { font-size:10px; color:#92400e; }
  .footer { margin-top:24px; border-top:1px solid #e5e7eb; padding-top:12px; display:flex; justify-content:space-between; }
  .sign-box { border-top:1px solid #1a1a1a; width:180px; text-align:center; padding-top:4px; font-size:9px; color:#888; margin-top:40px; }
  .chip { display:inline-block; padding:2px 6px; border-radius:4px; font-size:9px; font-weight:600; background:#eff6ff; color:#1a56db; }
  @media print { body { padding:16px; } button { display:none; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">LOG<span>UP</span></div>
    <div style="font-size:10px;color:#666;margin-top:2px;">Sistema Operativo Logístico · Log Up</div>
    <div style="font-size:9px;color:#aaa;margin-top:1px;">Generado: ${new Date().toLocaleString('es-MX')}</div>
  </div>
  <div class="folio">
    <div style="font-size:10px;color:#666;">CARTA DE INSTRUCCIONES DE EMBARQUE</div>
    <h2>${em.folio}</h2>
    <div class="badge">${TIPO_LABEL[em.categoria]||em.categoria}</div>
    ${em.prioridad==='urgente'?'<div style="display:inline-block;background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;margin-left:4px;">🔴 URGENTE</div>':''}
  </div>
</div>

<div class="route-box">
  <div class="route-inner">
    <div class="route-point">
      <div class="label">Origen</div>
      <div class="city">${em.origenNombre}</div>
      <div class="cp">CP: ${em.origenCP||'—'}</div>
    </div>
    <div class="arrow">→</div>
    <div class="route-point">
      <div class="label">Destino</div>
      <div class="city">${em.destinoNombre}</div>
      <div class="cp">CP: ${em.destinoCP||'—'}</div>
    </div>
    ${em.distanciaKm?`<div class="eta-box"><div class="num">~${eta}h</div><div class="sub">${em.distanciaKm} km · factor trailer</div></div>`:''}
  </div>
</div>

<div class="grid2">
<div>
<div class="section">
  <div class="section-title">Datos del cliente</div>
  <div class="field"><div class="label">Razón social</div><div class="value">${em.cliente||'—'}</div></div>
  <div class="field"><div class="label">RFC</div><div class="value">${em.clienteRFC||'—'}</div></div>
  <div class="field"><div class="label">Referencia del cliente</div><div class="value">${em.referencia||'—'}</div></div>
</div>
<div class="section">
  <div class="section-title">Fechas</div>
  <div class="field"><div class="label">Fecha y hora de carga</div><div class="value">${em.fechaCarga?new Date(em.fechaCarga).toLocaleString('es-MX'):'—'}</div></div>
  <div class="field"><div class="label">ETA estimada</div><div class="value">${em.fechaETA?new Date(em.fechaETA).toLocaleString('es-MX'):'—'}</div></div>
  <div class="field"><div class="label">Horas libres de carga</div><div class="value">${em.horasLibresCarga||6} hrs</div></div>
  <div class="field"><div class="label">Horas libres de descarga</div><div class="value">${em.horasLibresDescarga||6} hrs</div></div>
  <div class="field"><div class="label">Estadías (en exceso)</div><div class="value">Bloques de 12 hrs o fracción</div></div>
</div>
</div>
<div>
<div class="section">
  <div class="section-title">Operador y unidad</div>
  <div class="field"><div class="label">Operador</div><div class="value">${em.op_nombre||'Por asignar'}</div></div>
  <div class="field"><div class="label">Licencia</div><div class="value">${em.op_licencia||'—'}</div></div>
  <div class="field"><div class="label">Placas</div><div class="value">${em.op_placas||'—'}</div></div>
  <div class="field"><div class="label">Tipo de unidad</div><div class="value">${UNIDAD_LABEL[em.op_tipoUnidad]||em.op_tipoUnidad||'—'}</div></div>
</div>
<div class="section">
  <div class="section-title">Responsables</div>
  <div class="field"><div class="label">Vendedor</div><div class="value">${em.vendedor||'—'}</div></div>
  <div class="field"><div class="label">Seguimiento</div><div class="value">${em.seguimiento||'—'}</div></div>
  <div class="field"><div class="label">Etapa actual</div><div class="value chip">${COLS.find(c=>c.key===em.etapa)?.label||em.etapa}</div></div>
</div>
</div>
</div>

<div class="section">
  <div class="section-title">Complemento Carta Porte 3.1 — Mercancía</div>
  <table>
    <tr>
      <th>Descripción</th><th>Clave SAT</th><th>Peso bruto</th><th>Unidad</th><th>Pallets</th><th>Valor mercancía</th><th>Seguro</th>
    </tr>
    <tr>
      <td>${em.cp_descripcion||'—'}</td>
      <td style="font-family:monospace">${em.cp_claveSAT||'—'}</td>
      <td>${em.cp_peso?Number(em.cp_peso).toLocaleString('es-MX')+' kg':'—'}</td>
      <td>${em.cp_unidadPeso||'KGM'}</td>
      <td>${em.cp_pallets||'—'}</td>
      <td>${em.cp_valorMercancia?fmt(em.cp_valorMercancia,em.cp_moneda):'—'}</td>
      <td>${em.cp_seguro?fmt(em.cp_seguro):'—'}</td>
    </tr>
  </table>
</div>

<div class="section">
  <div class="section-title">Detalle de costos y tarifas</div>
  <table>
    <tr><th>Concepto</th><th>Detalle</th><th>Monto</th></tr>
    <tr><td>Flete base</td><td>${em.origenNombre} → ${em.destinoNombre} · ${TIPO_LABEL[em.categoria]||''}</td><td>${fmt(em.costo_flete||0)}</td></tr>
    <tr><td>Combustible (surcharge)</td><td>18% sobre flete base</td><td>${fmt((em.costo_flete||0)*0.18)}</td></tr>
    ${em.costo_seguro?`<tr><td>Seguro de carga</td><td>Prima</td><td>${fmt(em.costo_seguro)}</td></tr>`:''}
    ${em.costo_aduanal?`<tr><td>Honorarios agente aduanal</td><td></td><td>${fmt(em.costo_aduanal)}</td></tr>`:''}
    ${em.costo_extra?`<tr><td>Cargos adicionales</td><td>${em.costo_extra_desc||''}</td><td>${fmt(em.costo_extra)}</td></tr>`:''}
    <tr class="total-row"><td colspan="2"><strong>TOTAL ESTIMADO</strong></td><td><strong>${fmt((em.costo_flete||0)*1.18+(em.costo_seguro||0)+(em.costo_aduanal||0)+(em.costo_extra||0))}</strong></td></tr>
  </table>
</div>

${em.observaciones?`<div class="alert-box" style="margin-bottom:16px;"><div style="font-size:9px;font-weight:700;color:#92400e;margin-bottom:4px;">⚠️ INSTRUCCIONES ESPECIALES</div><p>${em.observaciones}</p></div>`:''}

<div class="footer">
  <div>
    <div class="sign-box">Recibido por (cliente)</div>
  </div>
  <div>
    <div class="sign-box">Operador / Transportista</div>
  </div>
  <div>
    <div class="sign-box">Autorizado Log Up</div>
  </div>
</div>

<div style="margin-top:16px;text-align:center;font-size:8px;color:#aaa;">
  Este documento es informativo. Los tiempos de estadía generan cargos adicionales conforme a las condiciones pactadas con el cliente.<br>
  Log Up · Sistema Operativo Logístico · ${new Date().toLocaleDateString('es-MX')}
</div>

<script>window.onload=()=>window.print()</script>
</body></html>`

  const ventana = window.open('','_blank','width=900,height=700')
  ventana.document.write(html)
  ventana.document.close()
}


// Genera la Hoja de Viaje como PNG descargable
async function generarHojaViajePNG(em, extras = {}, setGenerando) {
  const {
    economicoC = em.economicoC || '',
    placasCaja = em.op_placas || '',
    economicoT = em.economicoT || '',
    placasTractor = em.placasTractor || '',
    operador = em.op_nombre || '',
    telOperador = em.op_tel || '',
    fechaCarga = em.fechaCarga ? new Date(em.fechaCarga).toLocaleDateString('es-MX') : '',
    horaCarga = em.fechaCarga ? new Date(em.fechaCarga).toLocaleTimeString('es-MX', {hour:'2-digit',minute:'2-digit'}) : '',
    fechaDescarga = em.fechaETA ? new Date(em.fechaETA).toLocaleDateString('es-MX') : '',
    horaDescarga = em.fechaETA ? new Date(em.fechaETA).toLocaleTimeString('es-MX', {hour:'2-digit',minute:'2-digit'}) : '',
    origen = em.origenNombre || '',
    destino = em.destinoNombre || '',
    lugarCarga = em.lugarCarga || '',
    escala = em.escala || '0',
    lugarDescarga = em.lugarDescarga || '',
    cliente = em.cliente || '',
    tipo = UNIDAD_LABEL[em.op_tipoUnidad] || em.op_tipoUnidad || '',
    temperatura = em.cp_temp || '',
    tarifa = em.costo_flete ? '$' + Number(em.costo_flete).toLocaleString('es-MX') + '.00' : '',
    maniobras = em.maniobras || '$0.00',
    referencia = em.referencia || '',
    proveedor = em.proveedor_nombre || '',
    comentarios = em.observaciones || '',
    numViaje = em.folio || '',
  } = extras

  const logoBase64 = typeof LOGO_COMPLETO !== 'undefined' ? LOGO_COMPLETO : ''

  const row = (label, value, bold = false) => `
    <tr>
      <td style="background:#f0f4ff;font-weight:600;color:#1a3672;border:1px solid #b0bec5;padding:5px 8px;font-size:10px;width:45%">${label}</td>
      <td style="border:1px solid #b0bec5;padding:5px 8px;font-size:10px;${bold?'font-weight:700;font-size:12px;':''}width:55%">${value || ''}</td>
    </tr>`

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Hoja de Viaje ${numViaje}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 10px; color: #1a1a1a; padding: 24px; max-width: 700px; margin: 0 auto; }
  table { width:100%; border-collapse:collapse; }
  .header-table td { padding: 8px; vertical-align: middle; }
  @media print { body { padding: 12px; } }
</style>
</head>
<body>

<!-- Header igual al formato Log Up -->
<table class="header-table" style="border:2px solid #1a3672;margin-bottom:0;">
  <tr>
    <td style="width:40%;border-right:2px solid #1a3672;text-align:center;padding:12px;">
      ${logoBase64
        ? `<img src="${logoBase64}" style="height:50px;object-fit:contain;" />`
        : `<div style="font-size:20px;font-weight:900;color:#1a3672;">LOG<span style="color:#333">UP</span></div><div style="font-size:8px;color:#666;letter-spacing:1px;">LOGÍSTICA Y SERVICIOS</div>`
      }
    </td>
    <td style="text-align:center;padding:12px;">
      <div style="font-size:13px;font-weight:700;color:#333;">${proveedor || 'PROVEEDOR'}</div>
    </td>
  </tr>
</table>

<!-- Número de viaje -->
<table style="border:2px solid #1a3672;border-top:none;margin-bottom:0;">
  <tr>
    <td style="width:40%;border-right:2px solid #1a3672;background:#f0f4ff;font-weight:700;color:#1a3672;padding:8px;font-size:11px;text-align:center;">VIAJE:</td>
    <td style="padding:8px;text-align:center;font-weight:900;font-size:22px;color:#1a1a1a;">${numViaje}</td>
  </tr>
</table>

<!-- Datos del viaje -->
<table style="border:2px solid #1a3672;border-top:none;">
  ${row('ECONOMICO CAJA', economicoC)}
  ${row('PLACAS CAJA', placasCaja)}
  ${row('ECONOMICO TRACTO', economicoT)}
  ${row('PLACAS TRACTO', placasTractor)}
  ${row('NOMBRE OPERADOR', operador)}
  ${row('TELEFONO OPERADOR', telOperador)}
  ${row('FECHA DE CARGA', fechaCarga)}
  ${row('HORA DE CARGA', horaCarga)}
  ${row('FECHA DE DESCARGA', fechaDescarga)}
  ${row('HORA DE DESCARGA', horaDescarga)}
  ${row('ORIGEN', origen)}
  ${row('DESTINO', destino)}
  ${row('LUGAR DE CARGA', lugarCarga)}
  ${row('ESCALA', escala)}
  ${row('LUGAR DE DESCARGA', lugarDescarga)}
  ${row('CLIENTE', cliente)}
  ${row('TIPO', tipo)}
  ${row('TEMPERATURA GRADOS FARENH', temperatura)}
  ${row('TARIFA', tarifa)}
  ${row('MANIOBRAS', maniobras)}
  ${row('REFERENCIA', referencia)}
  ${row('PROVEEDOR', proveedor)}
  ${row('COMENTARIOS', comentarios)}
</table>

<script>window.onload=()=>window.print()</script>
</body></html>`

  // Crear div oculto para renderizar
  if (setGenerando) setGenerando(true)
  
  const div = document.createElement('div')
  div.style.cssText = 'position:fixed;left:-9999px;top:0;width:700px;background:white;'
  div.innerHTML = html.replace('<script>window.onload=()=>window.print()</script>', '')
  document.body.appendChild(div)

  // Esperar a que cargue el logo
  await new Promise(r => setTimeout(r, 500))

  try {
    const canvas = await html2canvas(div, { 
      scale: 2, 
      useCORS: true,
      backgroundColor: '#ffffff',
      width: 700,
    })
    const link = document.createElement('a')
    link.download = `HojaViaje_${extras.numViaje || em.folio || 'viaje'}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  } catch(e) {
    console.error('html2canvas error:', e)
    // Fallback: abrir ventana de impresión
    const ventana = window.open('', '_blank', 'width=800,height=700')
    ventana.document.write(html)
    ventana.document.close()
  } finally {
    document.body.removeChild(div)
    if (setGenerando) setGenerando(false)
  }
}

// Panel lateral de detalle
function PanelDetalle({ em, onClose, onAvanzar, onCambiarEtapa }) {
  const [tabActivo, setTabActivo] = useState('info')
  const [showCambioEtapa, setShowCambioEtapa] = useState(false)
  const [showHojaViaje, setShowHojaViaje] = useState(false)
  const [etapaSeleccionada, setEtapaSeleccionada] = useState(em.etapa)
  const [motivoCambio, setMotivoCambio] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [hojaData, setHojaData] = useState({
    economicoC: em.economicoC||'',
    placasCaja: em.op_placas||'',
    economicoT: em.economicoT||'',
    placasTractor: em.placasTractor||em.op_placas||'',
    operador: em.op_nombre||'',
    telOperador: em.op_tel||'',
    fechaCarga: em.fechaCarga ? new Date(em.fechaCarga).toLocaleDateString('es-MX') : '',
    horaCarga: em.fechaCarga ? new Date(em.fechaCarga).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'}) : '',
    fechaDescarga: em.fechaETA ? new Date(em.fechaETA).toLocaleDateString('es-MX') : '',
    horaDescarga: em.fechaETA ? new Date(em.fechaETA).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'}) : '',
    origen: em.origenNombre||'',
    destino: em.destinoNombre||'',
    lugarCarga: em.lugarCarga||'',
    escala: em.escala||'0',
    lugarDescarga: em.lugarDescarga||'',
    cliente: em.cliente||'',
    tipo: em.op_tipoUnidad||'',
    temperatura: em.cp_temp||'',
    tarifa: em.costo_flete ? '$'+Number(em.costo_flete).toLocaleString('es-MX')+'.00' : '',
    maniobras: em.maniobras||'$0.00',
    referencia: em.referencia||'',
    proveedor: em.proveedor_nombre||'',
    comentarios: em.observaciones||'PRESENTARSE A CARGA A NOMBRE DE LOG-UP',
    numViaje: em.folio||'',
  })
  const setH = (k,v) => setHojaData(d=>({...d,[k]:v}))
  const [generandoPNG, setGenerandoPNG] = useState(false)
  const [editandoFechas, setEditandoFechas] = useState(false)
  const [fechasEdit, setFechasEdit] = useState({
    fechaCarga: em.fechaCarga ? new Date(em.fechaCarga).toISOString().slice(0,16) : '',
    fechaETA: em.fechaETA ? new Date(em.fechaETA).toISOString().slice(0,16) : '',
    horasLibresCarga: em.horasLibresCarga || 6,
    horasLibresDescarga: em.horasLibresDescarga || 6,
    observaciones: em.observaciones || '',
  })
  const [guardandoFechas, setGuardandoFechas] = useState(false)
  const { perfil } = useAuth()

  const guardarFechas = async () => {
    setGuardandoFechas(true)
    try {
      const { updateDoc, doc: fsDoc, addDoc, collection: fsCol, serverTimestamp: sTs } = await import('firebase/firestore')
      await updateDoc(fsDoc(db, 'embarques', em.id), {
        fechaCarga: fechasEdit.fechaCarga,
        fechaETA: fechasEdit.fechaETA,
        horasLibresCarga: Number(fechasEdit.horasLibresCarga),
        horasLibresDescarga: Number(fechasEdit.horasLibresDescarga),
        observaciones: fechasEdit.observaciones,
        updatedAt: sTs(),
      })
      await addDoc(fsCol(db, 'embarques', em.id, 'historico'), {
        tipo: 'edicion',
        descripcion: `Fechas y datos actualizados`,
        usuario: perfil?.nombre || perfil?.email || 'usuario',
        fecha: sTs(),
      })
      setEditandoFechas(false)
      onClose()
    } catch(e) { console.error(e) }
    finally { setGuardandoFechas(false) }
  }

  const setF = (k,v) => setFechasEdit(d=>({...d,[k]:v}))

  const s_eta = semETA(em.fechaETA)
  const s_etapa = semEtapa(em.etapa, em.etapaEntradaAt, em.horasLibresCarga, em.horasLibresDescarga, em.distanciaKm)
  const etaTransito = em.etapa==='transito'&&em.distanciaKm ? calcETA(em.distanciaKm) : null
  const colIdx = COLS.findIndex(c=>c.key===em.etapa)

  const handleCambioEtapa = async () => {
    if(etapaSeleccionada === em.etapa) { setShowCambioEtapa(false); return }
    setGuardando(true)
    await onCambiarEtapa(em, etapaSeleccionada, motivoCambio)
    setGuardando(false)
    setShowCambioEtapa(false)
    setMotivoCambio('')
    onClose()
  }

  const InfoRow = ({label,value}) => (
    <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 shrink-0 w-36">{label}</span>
      <span className="text-xs text-gray-800 font-medium text-right">{value||'—'}</span>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden animate-slide-in">
        {/* Header panel */}
        <div className="px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm font-bold text-gray-900">{em.folio}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${TIPO_COLOR[em.categoria]||'bg-gray-100 text-gray-600'}`}>{TIPO_TAG[em.categoria]}</span>
                {em.prioridad==='urgente'&&<span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded font-medium">🔴 URG</span>}
                {em._demo&&<span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100">DEMO</span>}
              </div>
              <p className="text-sm font-semibold text-gray-800">{em.cliente}</p>
              <p className="text-xs text-gray-400">{em.origenNombre} → {em.destinoNombre}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1">×</button>
          </div>

          {/* Semáforos */}
          <div className="flex gap-3 mb-3">
            {s_eta&&<div className={`flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-1.5`}>
              <div className={`w-2.5 h-2.5 rounded-full ${SEM[s_eta.color].dot}`}/>
              <span className={`text-xs font-medium ${SEM[s_eta.color].text}`}>ETA: {s_eta.texto}</span>
            </div>}
            {s_etapa&&<div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${SEM[s_etapa.color].dot}`}/>
              <span className={`text-xs font-medium ${SEM[s_etapa.color].text}`}>{s_etapa.texto}</span>
            </div>}
            {etaTransito&&<div className="flex items-center gap-1 bg-blue-50 rounded-lg px-3 py-1.5">
              <span className="text-xs text-brand">🚛 ~{etaTransito}h · {em.distanciaKm}km</span>
            </div>}
          </div>

          {/* Timeline mini */}
          <div className="flex items-center gap-0.5 overflow-x-auto">
            {COLS.map((c,i)=>(
              <div key={c.key} className="flex items-center">
                <div className={`text-[8px] px-1.5 py-0.5 rounded whitespace-nowrap font-medium ${
                  i<colIdx?'bg-green-100 text-green-700':i===colIdx?'bg-brand text-white':'bg-gray-100 text-gray-400'
                }`}>{c.label}</div>
                {i<COLS.length-1&&<div className={`w-2 h-px ${i<colIdx?'bg-green-300':'bg-gray-200'}`}/>}
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 shrink-0">
          {[{k:'info',l:'Información'},{k:'cartaporte',l:'Carta Porte'},{k:'docs',l:'Factura & POD'}].map(t=>(
            <button key={t.k} onClick={()=>setTabActivo(t.k)}
              className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors ${tabActivo===t.k?'border-brand text-brand':'border-transparent text-gray-500 hover:text-gray-700'}`}
            >{t.l}</button>
          ))}
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-5">

          {tabActivo==='info'&&(
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Cliente</p>
                <InfoRow label="Razón social" value={em.cliente}/>
                <InfoRow label="RFC" value={em.clienteRFC}/>
                <InfoRow label="Referencia" value={em.referencia}/>
                <InfoRow label="Vendedor" value={em.vendedor}/>
                <InfoRow label="Seguimiento" value={em.seguimiento}/>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Ruta y fechas</p>
                  <button onClick={()=>setEditandoFechas(!editandoFechas)} className="text-[10px] text-brand hover:underline">
                    {editandoFechas ? '× Cancelar' : '✏️ Editar'}
                  </button>
                </div>

                {editandoFechas ? (
                  <div className="space-y-3 bg-blue-50 rounded-xl p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">Fecha y hora de carga</label>
                        <input type="datetime-local" className="input text-xs py-1.5" value={fechasEdit.fechaCarga} onChange={e=>setF('fechaCarga',e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">Fecha y hora de descarga (ETA)</label>
                        <input type="datetime-local" className="input text-xs py-1.5" value={fechasEdit.fechaETA} onChange={e=>setF('fechaETA',e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">Horas libres carga</label>
                        <input type="number" className="input text-xs py-1.5" value={fechasEdit.horasLibresCarga} onChange={e=>setF('horasLibresCarga',e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-1">Horas libres descarga</label>
                        <input type="number" className="input text-xs py-1.5" value={fechasEdit.horasLibresDescarga} onChange={e=>setF('horasLibresDescarga',e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">Observaciones / Instrucciones especiales</label>
                      <textarea className="input text-xs resize-none" rows={2} value={fechasEdit.observaciones} onChange={e=>setF('observaciones',e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>setEditandoFechas(false)} className="flex-1 text-xs bg-white border border-gray-200 text-gray-600 py-2 rounded-lg hover:bg-gray-50">Cancelar</button>
                      <button onClick={guardarFechas} disabled={guardandoFechas} className="flex-1 text-xs bg-brand text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60">
                        {guardandoFechas ? 'Guardando...' : '✓ Guardar cambios'}
                      </button>
                    </div>
                    <p className="text-[10px] text-blue-500 text-center">El cambio quedará registrado en el historial del embarque</p>
                  </div>
                ) : (
                  <>
                    <InfoRow label="Origen" value={`${em.origenNombre} (CP ${em.origenCP||'—'})`}/>
                    <InfoRow label="Destino" value={`${em.destinoNombre} (CP ${em.destinoCP||'—'})`}/>
                    <InfoRow label="Fecha carga" value={em.fechaCarga?new Date(em.fechaCarga).toLocaleString('es-MX'):'—'}/>
                    <InfoRow label="ETA" value={em.fechaETA?new Date(em.fechaETA).toLocaleString('es-MX'):'—'}/>
                    <InfoRow label="Horas libres carga" value={`${em.horasLibresCarga||6} hrs`}/>
                    <InfoRow label="Horas libres descarga" value={`${em.horasLibresDescarga||6} hrs`}/>
                    <InfoRow label="Estadías" value="Bloques de 12 hrs o fracción"/>
                  </>
                )}
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Operador y unidad</p>
                <InfoRow label="Operador" value={em.op_nombre||'Por asignar'}/>
                <InfoRow label="Licencia" value={em.op_licencia}/>
                <InfoRow label="Placas" value={em.op_placas}/>
                <InfoRow label="Tipo de unidad" value={UNIDAD_LABEL[em.op_tipoUnidad]||em.op_tipoUnidad}/>
              </div>
              {em.observaciones&&(
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-amber-700 mb-1">⚠️ Instrucciones especiales</p>
                  <p className="text-xs text-amber-800">{em.observaciones}</p>
                </div>
              )}
            </div>
          )}

          {tabActivo==='cartaporte'&&(
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Mercancía · Carta Porte 3.1</p>
                <InfoRow label="Descripción" value={em.cp_descripcion}/>
                <InfoRow label="Clave SAT" value={em.cp_claveSAT}/>
                <InfoRow label="Peso bruto" value={em.cp_peso?`${Number(em.cp_peso).toLocaleString('es-MX')} ${em.cp_unidadPeso}`:'—'}/>
                <InfoRow label="Pallets" value={em.cp_pallets}/>
                <InfoRow label="Valor mercancía" value={em.cp_valorMercancia?fmt(em.cp_valorMercancia,em.cp_moneda):'—'}/>
                <InfoRow label="Seguro" value={em.cp_seguro?fmt(em.cp_seguro):'—'}/>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Costos y tarifas</p>
                <InfoRow label="Flete base" value={fmt(em.costo_flete||0)}/>
                <InfoRow label="Combustible (18%)" value={fmt((em.costo_flete||0)*0.18)}/>
                {em.costo_seguro&&<InfoRow label="Seguro de carga" value={fmt(em.costo_seguro)}/>}
                {em.costo_aduanal&&<InfoRow label="Agente aduanal" value={fmt(em.costo_aduanal)}/>}
                <div className="flex justify-between py-2 border-t border-gray-200 mt-1">
                  <span className="text-xs font-bold text-brand">TOTAL ESTIMADO</span>
                  <span className="text-sm font-bold text-brand">{fmt((em.costo_flete||0)*1.18+(em.costo_seguro||0)+(em.costo_aduanal||0))}</span>
                </div>
              </div>
            </div>
          )}

          {tabActivo==='docs'&&(
            <div className="space-y-4">
              {/* Factura */}
              <div className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🧾</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Factura del proveedor</p>
                      <p className="text-xs text-gray-400">Documento fiscal del transportista</p>
                    </div>
                  </div>
                  {em._demo
                    ? <span className="text-[10px] bg-green-50 text-green-600 px-2 py-1 rounded-lg border border-green-100 font-medium">✓ Recibida (demo)</span>
                    : <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-1 rounded-lg border border-amber-100">Pendiente</span>
                  }
                </div>
                {em._demo?(
                  <div className="bg-green-50 rounded-lg p-3 text-xs text-green-700">
                    <p className="font-medium mb-1">Factura recibida · LOG UP</p>
                    <p className="text-[10px] text-green-600">Ver factura · Eliminar</p>
                  </div>
                ):(
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-400 mb-2">El proveedor subirá la factura desde su portal</p>
                    <p className="text-[10px] text-gray-300">Módulo de proveedores · Próximamente</p>
                  </div>
                )}
              </div>

              {/* POD */}
              <div className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📄</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">POD — Prueba de entrega</p>
                      <p className="text-xs text-gray-400">Evidencia fotográfica y firma del receptor</p>
                    </div>
                  </div>
                  {em._demo&&em.etapa==='porFacturar'
                    ? <span className="text-[10px] bg-green-50 text-green-600 px-2 py-1 rounded-lg border border-green-100 font-medium">✓ Recibido (demo)</span>
                    : <span className="text-[10px] bg-gray-50 text-gray-400 px-2 py-1 rounded-lg border border-gray-100">Pendiente</span>
                  }
                </div>
                {em._demo&&em.etapa==='porFacturar'?(
                  <div className="bg-green-50 rounded-lg p-3 text-xs text-green-700">
                    <p className="font-medium mb-1">POD recibido · Firma conforme</p>
                    <p className="text-[10px] text-green-600">Ver evidencia · Ver firma</p>
                  </div>
                ):(
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-400 mb-1">Disponible cuando el embarque sea entregado</p>
                    <p className="text-[10px] text-gray-300">El operador sube evidencia desde su portal</p>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <p className="text-xs font-medium text-brand mb-1">📱 Portal de proveedores</p>
                <p className="text-[11px] text-blue-600">Los transportistas y operadores tendrán acceso a un portal donde suben facturas, evidencias fotográficas y POD directamente vinculados al folio del embarque.</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Hoja de Viaje editable */}
        {showHojaViaje && (
          <div className="absolute inset-0 bg-white z-10 flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div>
                <p className="text-sm font-semibold text-gray-900">Hoja de Viaje</p>
                <p className="text-xs text-gray-400">{em.folio} · Edita antes de imprimir</p>
              </div>
              <button onClick={()=>setShowHojaViaje(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {[
                ['Número de viaje','numViaje'],
                ['Proveedor (transportista)','proveedor'],
                ['Económico caja','economicoC'],
                ['Placas caja','placasCaja'],
                ['Económico tracto','economicoT'],
                ['Placas tracto','placasTractor'],
                ['Nombre operador','operador'],
                ['Teléfono operador','telOperador'],
                ['Fecha de carga','fechaCarga'],
                ['Hora de carga','horaCarga'],
                ['Fecha de descarga','fechaDescarga'],
                ['Hora de descarga','horaDescarga'],
                ['Origen','origen'],
                ['Destino','destino'],
                ['Lugar de carga','lugarCarga'],
                ['Escala','escala'],
                ['Lugar de descarga','lugarDescarga'],
                ['Cliente','cliente'],
                ['Tipo de unidad','tipo'],
                ['Temperatura (°F)','temperatura'],
                ['Tarifa','tarifa'],
                ['Maniobras','maniobras'],
                ['Referencia','referencia'],
                ['Comentarios','comentarios'],
              ].map(([label, key]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-36 shrink-0">{label}</span>
                  <input
                    className="input flex-1 text-xs py-1.5"
                    value={hojaData[key]}
                    onChange={e=>setH(key, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex gap-2 shrink-0">
              <button onClick={()=>setShowHojaViaje(false)} className="flex-1 bg-gray-100 text-gray-700 text-xs font-medium py-2.5 rounded-lg hover:bg-gray-200">
                Cancelar
              </button>
              <button
                onClick={()=>{ generarHojaViajePNG(em, hojaData, setGenerandoPNG); }}
                disabled={generandoPNG}
                className="flex-1 bg-[#1a3672] text-white text-xs font-medium py-2.5 rounded-lg hover:bg-blue-900 transition-colors disabled:opacity-60"
              >
                {generandoPNG ? '⏳ Generando...' : '📥 Descargar PNG'}
              </button>
            </div>
          </div>
        )}

        {/* Modal cambio manual de etapa */}
        {showCambioEtapa && (
          <div className="absolute inset-0 bg-white z-10 flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Cambiar etapa manualmente</p>
                <p className="text-xs text-gray-400">{em.folio} · Etapa actual: <strong>{COLS.find(c=>c.key===em.etapa)?.label}</strong></p>
              </div>
              <button onClick={()=>setShowCambioEtapa(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <p className="text-xs text-gray-500 mb-2">Selecciona la etapa destino:</p>
              <div className="space-y-2">
                {COLS.map((c, i) => {
                  const esActual = c.key === em.etapa
                  const esSeleccionada = c.key === etapaSeleccionada
                  const esAnterior = i < colIdx
                  return (
                    <button
                      key={c.key}
                      onClick={() => setEtapaSeleccionada(c.key)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                        esSeleccionada && !esActual ? 'border-brand bg-blue-50' :
                        esActual ? 'border-gray-200 bg-gray-50 cursor-default' :
                        'border-gray-100 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-base">{c.icon}</span>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${esActual?'text-gray-400':esSeleccionada?'text-brand':'text-gray-700'}`}>
                          {c.label}
                          {esActual && <span className="ml-2 text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">Actual</span>}
                        </p>
                        {esAnterior && !esActual && <p className="text-[10px] text-amber-600">↩ Regresar a esta etapa</p>}
                        {i > colIdx && !esActual && <p className="text-[10px] text-brand">↗ Saltar a esta etapa</p>}
                      </div>
                      {esSeleccionada && !esActual && <span className="text-brand text-lg">✓</span>}
                    </button>
                  )
                })}
              </div>

              {etapaSeleccionada !== em.etapa && (
                <div className="mt-4">
                  <label className="block text-xs text-gray-500 mb-1">Motivo del cambio <span className="text-gray-400">(opcional)</span></label>
                  <textarea
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
                    rows={3}
                    placeholder="Ej. Cliente confirmó descarga anticipada, ajuste por retraso en aduana..."
                    value={motivoCambio}
                    onChange={e => setMotivoCambio(e.target.value)}
                  />
                  <div className="mt-1 text-[10px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                    ⚠️ El cambio quedará registrado en el histórico con tu nombre, la etapa anterior y el motivo.
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
              <button onClick={() => setShowCambioEtapa(false)} className="flex-1 bg-gray-100 text-gray-700 text-xs font-medium py-2.5 rounded-lg hover:bg-gray-200">
                Cancelar
              </button>
              <button
                onClick={handleCambioEtapa}
                disabled={etapaSeleccionada === em.etapa || guardando}
                className="flex-1 bg-brand text-white text-xs font-medium py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {guardando ? 'Guardando...' : `Mover a "${COLS.find(c=>c.key===etapaSeleccionada)?.label}"`}
              </button>
            </div>
          </div>
        )}

        {/* Footer acciones */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 shrink-0 flex-wrap">
          <button
            onClick={()=>generarCartaPDF(em)}
            className="flex-1 bg-brand text-white text-xs font-medium py-2.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
          >
            📄 CARTA
          </button>
          <button
            onClick={()=>setShowHojaViaje(true)}
            className="flex-1 bg-[#1a3672] text-white text-xs font-medium py-2.5 rounded-lg hover:bg-blue-900 transition-colors flex items-center justify-center gap-1"
          >
            🚛 HOJA DE VIAJE
          </button>
          <button
              onClick={() => setShowCambioEtapa(true)}
              className="flex-1 bg-gray-100 text-gray-700 text-xs font-medium py-2.5 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
            >
              ⇄ Cambiar etapa
            </button>
          {colIdx<COLS.length-1&&(
            <button
              onClick={()=>{onAvanzar(em);onClose()}}
              className="px-3 bg-green-50 text-green-700 text-xs font-medium py-2.5 rounded-lg hover:bg-green-100 transition-colors border border-green-200"
            >
              → {COLS[colIdx+1]?.label}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function TarjetaEmbarque({ em, onClick }) {
  const s_eta = semETA(em.fechaETA)
  const s_etapa = semEtapa(em.etapa, em.etapaEntradaAt, em.horasLibresCarga, em.horasLibresDescarga, em.distanciaKm)
  const colorDom = s_eta?.color==='red'||s_etapa?.color==='red'?'red':s_eta?.color==='yellow'||s_etapa?.color==='yellow'?'yellow':'green'
  const styles = SEM[colorDom]
  const etaT = em.etapa==='transito'&&em.distanciaKm?calcETA(em.distanciaKm):null

  return (
    <div onClick={()=>onClick(em)}
      className={`bg-white rounded-xl border border-gray-100 border-l-4 ${styles.border} p-3 hover:shadow-md cursor-pointer transition-all`}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-mono text-gray-400">{em.folio}</p>
        <div className="flex gap-1">
          {em._demo&&<span className="text-[8px] bg-amber-50 text-amber-500 px-1 rounded border border-amber-100">DEMO</span>}
          {em.prioridad==='urgente'&&<span className="text-[8px] bg-red-50 text-red-500 px-1 rounded border border-red-100">URG</span>}
        </div>
      </div>
      <p className="text-xs font-semibold text-gray-800 leading-tight mb-1 truncate">{em.cliente}</p>
      <p className="text-[10px] text-gray-400 mb-2 truncate">{em.origenNombre} → {em.destinoNombre}</p>
      {s_eta&&<div className="flex items-center gap-1 mb-1"><div className={`w-2 h-2 rounded-full shrink-0 ${SEM[s_eta.color].dot}`}/><span className={`text-[9px] font-medium ${SEM[s_eta.color].text}`}>ETA: {s_eta.texto}</span></div>}
      {s_etapa&&<div className="flex items-center gap-1 mb-2"><div className={`w-2 h-2 rounded-full shrink-0 ${SEM[s_etapa.color].dot}`}/><span className={`text-[9px] font-medium ${SEM[s_etapa.color].text}`}>{s_etapa.texto}</span></div>}
      {etaT&&<p className="text-[9px] text-gray-400 mb-2">🚛 ~{etaT}h · {em.distanciaKm}km</p>}
      <div className="flex items-center justify-between">
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${TIPO_COLOR[em.categoria]||'bg-gray-100 text-gray-500'}`}>{TIPO_TAG[em.categoria]||'—'}</span>
        <span className="text-[9px] text-gray-300">Ver detalle →</span>
      </div>
    </div>
  )
}

export default function Board() {
  const [embarques, setEmbarques] = useState([])
  const [loading, setLoading] = useState(true)
  const [showDemo, setShowDemo] = useState(true)
  const [filtro, setFiltro] = useState('todos')
  const [panelEm, setPanelEm] = useState(null)
  const { perfil, user } = useAuth()

  useEffect(()=>{fetchEmbarques()},[])
  useEffect(()=>{const t=setInterval(()=>setEmbarques(p=>[...p]),60000);return()=>clearInterval(t)},[])

  const fetchEmbarques = async()=>{
    setLoading(true)
    try{const snap=await getDocs(collection(db,'embarques'));setEmbarques(snap.docs.map(d=>({id:d.id,...d.data()})))}
    catch(e){console.error(e)}finally{setLoading(false)}
  }

  const avanzarEtapa = async(embarque)=>{
    const idx=COLS.findIndex(c=>c.key===embarque.etapa)
    if(idx>=COLS.length-1) return
    const nueva=COLS[idx+1]
    await updateDoc(doc(db,'embarques',embarque.id),{etapa:nueva.key,etapaEntradaAt:new Date().toISOString(),updatedAt:serverTimestamp()})
    await addDoc(collection(db,'embarques',embarque.id,'historico'),{etapa:nueva.label,usuario:perfil?.nombre||user?.email,timestamp:serverTimestamp(),tipo:'etapa'})
    setEmbarques(prev=>prev.map(em=>em.id===embarque.id?{...em,etapa:nueva.key,etapaEntradaAt:new Date().toISOString()}:em))
  }

  const cambiarEtapa = async(embarque, nuevaEtapaKey, motivo) => {
    if(!embarque.id || embarque._demo) return
    const etapaAnterior = COLS.find(c=>c.key===embarque.etapa)?.label || embarque.etapa
    const etapaNueva = COLS.find(c=>c.key===nuevaEtapaKey)?.label || nuevaEtapaKey
    await updateDoc(doc(db,'embarques',embarque.id),{
      etapa: nuevaEtapaKey, etapaEntradaAt: new Date().toISOString(), updatedAt: serverTimestamp()
    })
    await addDoc(collection(db,'embarques',embarque.id,'historico'),{
      etapa: `Cambio manual: ${etapaAnterior} → ${etapaNueva}`,
      detalle: motivo || 'Sin motivo especificado',
      usuario: perfil?.nombre || user?.email,
      timestamp: serverTimestamp(), tipo: 'cambio_manual',
    })
    setEmbarques(prev=>prev.map(em=>
      em.id===embarque.id ? {...em, etapa:nuevaEtapaKey, etapaEntradaAt:new Date().toISOString()} : em
    ))
  }

  const todos=[...embarques,...(showDemo?DEMO_EMBARQUES:[])].filter(e=>{
    if(filtro==='urgentes') return e.prioridad==='urgente'
    if(filtro==='criticos') return semETA(e.fechaETA)?.color==='red'
    return true
  })

  const nC=todos.filter(e=>semETA(e.fechaETA)?.color==='red').length
  const nA=todos.filter(e=>semETA(e.fechaETA)?.color==='yellow').length

  return (
    <div className="space-y-4">
      <style>{`.animate-slide-in{animation:slideIn .25s ease-out}@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Operaciones</h1>
          <p className="text-sm text-gray-500">Board de seguimiento · clic en tarjeta para ver detalle</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-lg px-3 py-1.5 text-xs">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block"/>OK</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/>Alerta</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"/>Crítico</span>
          </div>
          {nC>0&&<span className="bg-red-50 text-red-600 text-xs font-medium px-2 py-1 rounded-lg">🔴 {nC} crítico{nC>1?'s':''}</span>}
          {nA>0&&<span className="bg-amber-50 text-amber-600 text-xs font-medium px-2 py-1 rounded-lg">🟡 {nA} alerta{nA>1?'s':''}</span>}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {[{key:'todos',label:'Todos'},{key:'urgentes',label:'🔴 Urgentes'},{key:'criticos',label:'⚠️ Críticos'}].map(f=>(
          <button key={f.key} onClick={()=>setFiltro(f.key)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filtro===f.key?'bg-brand text-white':'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >{f.label}</button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={()=>setShowDemo(!showDemo)}
            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${showDemo?'bg-amber-50 border-amber-200 text-amber-700':'bg-white border-gray-200 text-gray-500'}`}
          >{showDemo?'👁 Ocultar demo':'👁 Ver demo'}</button>
          <button onClick={fetchEmbarques} className="btn-secondary text-xs py-1">↻ Actualizar</button>
        </div>
      </div>

      {loading?(
        <div className="text-center py-12 text-gray-400">Cargando embarques...</div>
      ):(
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max">
            {COLS.map(col=>{
              const cards=todos.filter(e=>e.etapa===col.key)
              const criticos=cards.filter(e=>semETA(e.fechaETA)?.color==='red').length
              return(
                <div key={col.key} className="w-52 shrink-0">
                  <div className={`flex items-center justify-between mb-2 px-2 py-1.5 rounded-lg ${criticos>0?'bg-red-50':'bg-gray-50'}`}>
                    <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">{col.icon} {col.label}</span>
                    <div className="flex items-center gap-1">
                      {criticos>0&&<span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/>}
                      <span className="text-[10px] bg-white text-gray-500 rounded-full px-1.5 border border-gray-200">{cards.length}</span>
                    </div>
                  </div>
                  <div className="space-y-2 min-h-24">
                    {cards.map(em=><TarjetaEmbarque key={em.id} em={em} onClick={setPanelEm}/>)}
                    {cards.length===0&&<div className="border-2 border-dashed border-gray-100 rounded-xl h-16 flex items-center justify-center"><span className="text-[10px] text-gray-300">vacío</span></div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showDemo&&<p className="text-[11px] text-gray-400 text-center">Embarques DEMO para ilustrar el sistema.</p>}

      {panelEm&&<PanelDetalle em={panelEm} onClose={()=>setPanelEm(null)} onAvanzar={avanzarEtapa} onCambiarEtapa={cambiarEtapa}/>}
    </div>
  )
}
