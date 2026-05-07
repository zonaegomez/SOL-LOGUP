import { useEffect, useState } from 'react'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '../../firebase'
import { TrendingUp, TrendingDown, Truck, DollarSign, Users, Star, AlertTriangle, CheckCircle, Clock, BarChart2, Package, Target, Download, FileText, Table } from 'lucide-react'
import * as XLSX from 'xlsx'

const fmt = (n) => '$' + Number(n||0).toLocaleString('es-MX', {minimumFractionDigits:0})
const pct = (a, b) => b ? ((a/b)*100).toFixed(1) + '%' : '0%'

// Exportar a Excel
function exportarExcel(datos, nombre) {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(datos)
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte')
  XLSX.writeFile(wb, `${nombre}_${new Date().toLocaleDateString('es-MX').replace(/\//g,'-')}.xlsx`)
}

// Exportar a CSV
function exportarCSV(datos, nombre) {
  const headers = Object.keys(datos[0] || {}).join(',')
  const rows = datos.map(d => Object.values(d).map(v => `"${v}"`).join(',')).join('\n')
  const csv = `${headers}\n${rows}`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${nombre}_${new Date().toLocaleDateString('es-MX').replace(/\//g,'-')}.csv`
  link.click()
}

// Imprimir reporte
function imprimirReporte() {
  window.print()
}

const SEMANAS = ['Sem 13','Sem 14','Sem 15','Sem 16','Sem 17','Sem 18']
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

// Mini gráfico de barras SVG
function BarChart({ data, height = 60, color = '#1A56DB' }) {
  if (!data?.length) return null
  const max = Math.max(...data.map(d => d.value), 1)
  const w = 100 / data.length
  return (
    <svg viewBox={`0 0 100 ${height}`} className="w-full" preserveAspectRatio="none">
      {data.map((d, i) => {
        const h = (d.value / max) * (height - 8)
        const x = i * w + w * 0.1
        const barW = w * 0.8
        return (
          <g key={i}>
            <rect x={x} y={height - h - 4} width={barW} height={h} fill={color} rx="2" opacity="0.85" />
            <text x={x + barW/2} y={height} textAnchor="middle" fontSize="5" fill="#9CA3AF">{d.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

// Mini línea SVG
function LineChart({ data, height = 60, color = '#1A56DB' }) {
  if (!data?.length || data.length < 2) return null
  const max = Math.max(...data.map(d => d.value), 1)
  const min = Math.min(...data.map(d => d.value), 0)
  const range = max - min || 1
  const w = 100 / (data.length - 1)
  const points = data.map((d, i) => {
    const x = i * w
    const y = height - 8 - ((d.value - min) / range) * (height - 16)
    return `${x},${y}`
  }).join(' ')
  return (
    <svg viewBox={`0 0 100 ${height}`} className="w-full" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => {
        const x = i * w
        const y = height - 8 - ((d.value - min) / range) * (height - 16)
        return <circle key={i} cx={x} cy={y} r="2" fill={color} />
      })}
      {data.map((d, i) => {
        const x = i * w
        return <text key={i} x={x} y={height} textAnchor="middle" fontSize="5" fill="#9CA3AF">{d.label}</text>
      })}
    </svg>
  )
}

// Gauge circular SVG
function Gauge({ value, max = 100, color = '#1A56DB', label }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const dashArr = (value / max) * circ
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 72 72" className="w-20 h-20">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#F3F4F6" strokeWidth="8" />
        <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dashArr} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 36 36)" />
        <text x="36" y="40" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#1F2937">
          {value}%
        </text>
      </svg>
      {label && <p className="text-[10px] text-gray-400 mt-1 text-center">{label}</p>}
    </div>
  )
}

// KPI Card
function KPICard({ titulo, valor, subtitulo, icono: Icono, color, trend, chart, chartType = 'bar' }) {
  const isPositive = trend >= 0
  return (
    <div className="card p-5 space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 font-medium">{titulo}</p>
          <p className={`text-2xl font-bold mt-1 ${color || 'text-gray-900'}`}>{valor}</p>
          {subtitulo && <p className="text-[10px] text-gray-400 mt-0.5">{subtitulo}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color?.includes('green')?'bg-green-50':color?.includes('amber')?'bg-amber-50':color?.includes('red')?'bg-red-50':'bg-blue-50'}`}>
          {Icono && <Icono className={`w-5 h-5 ${color||'text-brand'}`} />}
        </div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-[10px] font-medium ${isPositive?'text-green-600':'text-red-500'}`}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(trend)}% vs semana anterior
        </div>
      )}
      {chart && chart.length > 0 && (
        <div className="pt-2">
          {chartType === 'line'
            ? <LineChart data={chart} height={40} color={color?.includes('green')?'#16a34a':color?.includes('amber')?'#d97706':color?.includes('red')?'#dc2626':'#1A56DB'} />
            : <BarChart data={chart} height={40} color={color?.includes('green')?'#16a34a':color?.includes('amber')?'#d97706':color?.includes('red')?'#dc2626':'#1A56DB'} />
          }
        </div>
      )}
    </div>
  )
}

export default function Reportes() {
  const [periodo, setPeriodo] = useState('semana') // semana | mes | año
  const [loading, setLoading] = useState(true)
  const [viajes, setViajes] = useState([])
  const [embarques, setEmbarques] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [clientes, setClientes] = useState([])
  const [tab, setTab] = useState('general') // general | ventas | operaciones | proveedores

  useEffect(() => { fetchTodo() }, [])

  const fetchTodo = async () => {
    setLoading(true)
    try {
      const [viajesSnap, embSnap, provSnap, cliSnap] = await Promise.all([
        getDocs(collection(db, 'viajesSemana')),
        getDocs(collection(db, 'embarques')),
        getDocs(collection(db, 'proveedores')),
        getDocs(collection(db, 'clientes')),
      ])
      setViajes(viajesSnap.docs.map(d => ({id:d.id,...d.data()})))
      setEmbarques(embSnap.docs.map(d => ({id:d.id,...d.data()})))
      setProveedores(provSnap.docs.map(d => ({id:d.id,...d.data()})).filter(p=>!p._demo))
      setClientes(cliSnap.docs.map(d => ({id:d.id,...d.data()})))
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  // ── Calcular métricas ────────────────────────────────────────────────────────
  const semanaActual = 18 // Semana actual
  const viajesSemActual = viajes.filter(v => v.semanaAnio === semanaActual)
  const viajesSemAnterior = viajes.filter(v => v.semanaAnio === semanaActual - 1)

  const ingresosSemActual = viajesSemActual.filter(v=>['Entregado','En tránsito'].includes(v.estatus)).reduce((s,v)=>s+(Number(v.ingresoMXN)||0),0)
  const ingresosSemAnterior = viajesSemAnterior.filter(v=>['Entregado','En tránsito'].includes(v.estatus)).reduce((s,v)=>s+(Number(v.ingresoMXN)||0),0)
  const trendIngresos = ingresosSemAnterior ? Math.round(((ingresosSemActual - ingresosSemAnterior) / ingresosSemAnterior) * 100) : 0

  const viajesEfectivos = viajesSemActual.filter(v=>v.estatus!=='Cancelado').length
  const viajesCancelados = viajesSemActual.filter(v=>v.estatus==='Cancelado').length
  const tasaCancelacion = viajesSemActual.length ? Math.round((viajesCancelados/viajesSemActual.length)*100) : 0

  // Ingresos por semana para la gráfica (últimas 6 semanas)
  const ingresosPorSemana = [13,14,15,16,17,18].map(sem => ({
    label: `S${sem}`,
    value: viajes.filter(v=>v.semanaAnio===sem&&['Entregado','En tránsito'].includes(v.estatus)).reduce((s,v)=>s+(Number(v.ingresoMXN)||0),0)
  }))

  const viajePorSemana = [13,14,15,16,17,18].map(sem => ({
    label: `S${sem}`,
    value: viajes.filter(v=>v.semanaAnio===sem&&v.estatus!=='Cancelado').length
  }))

  // Promedio por viaje
  const promedioViaje = viajesEfectivos > 0 ? Math.round(ingresosSemActual / viajesEfectivos) : 0

  // Meta
  const META_SEMANAL = 190729
  const avanceMeta = Math.min(Math.round((ingresosSemActual/META_SEMANAL)*100), 100)

  // Embarques por etapa
  const etapas = ['creado','posicionamiento','carga','transito','descarga','entregado','porFacturar','cobrado']
  const embPorEtapa = etapas.map(e => ({
    label: e, value: embarques.filter(em=>em.etapa===e).length
  }))

  // Top clientes por ingresos
  const ingxCliente = {}
  viajes.forEach(v => {
    if (!v.cliente || !['Entregado','En tránsito'].includes(v.estatus)) return
    ingxCliente[v.cliente] = (ingxCliente[v.cliente]||0) + (Number(v.ingresoMXN)||0)
  })
  const topClientes = Object.entries(ingxCliente).sort((a,b)=>b[1]-a[1]).slice(0,5)

  // Top proveedores por viajes
  const viajesxProv = {}
  viajes.forEach(v => {
    if (!v.proveedor) return
    viajesxProv[v.proveedor] = (viajesxProv[v.proveedor]||0) + 1
  })
  const topProveedores = Object.entries(viajesxProv).sort((a,b)=>b[1]-a[1]).slice(0,5)

  // Tipos de servicio
  const tiposServicio = {}
  viajes.forEach(v => {
    const t = v.tipoServicio || 'FTL'
    tiposServicio[t] = (tiposServicio[t]||0) + 1
  })
  const tiposData = Object.entries(tiposServicio).sort((a,b)=>b[1]-a[1])

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <BarChart2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-400">Cargando reportes...</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Reportes y KPIs</h1>
          <p className="text-sm text-gray-400">Panel ejecutivo · Logística Log Up</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {['semana','mes','año'].map(p => (
              <button key={p} onClick={()=>setPeriodo(p)}
                className={`px-3 py-1.5 rounded text-xs font-medium capitalize ${periodo===p?'bg-white shadow-sm text-gray-900':'text-gray-500'}`}>
                {p === 'semana' ? 'Esta semana' : p === 'mes' ? 'Este mes' : 'Este año'}
              </button>
            ))}
          </div>
          {/* Botones de exportación */}
          <div className="flex gap-2">
            <button onClick={() => exportarExcel([
              ...viajesSemActual.map(v=>({
                Folio: v.folio||'', Cliente: v.cliente||'', Origen: v.origen||'', Destino: v.destino||'',
                Dia: v.diaSemana||'', Servicio: v.tipoServicio||'', Ingreso: v.ingresoMXN||0, Estatus: v.estatus||''
              }))
            ], `Viajes_Semana${semanaActual}`)}
              className="btn-secondary text-xs py-1.5 flex items-center gap-1.5">
              <Table className="w-3.5 h-3.5" /> Excel
            </button>
            <button onClick={() => exportarCSV([
              ...viajesSemActual.map(v=>({
                Folio: v.folio||'', Cliente: v.cliente||'', Origen: v.origen||'',
                Destino: v.destino||'', Dia: v.diaSemana||'', Ingreso: v.ingresoMXN||0, Estatus: v.estatus||''
              }))
            ], `Viajes_Semana${semanaActual}`)}
              className="btn-secondary text-xs py-1.5 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button onClick={imprimirReporte}
              className="btn-secondary text-xs py-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Imprimir
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key:'general', label:'General' },
          { key:'ventas', label:'Ventas' },
          { key:'operaciones', label:'Operaciones' },
          { key:'proveedores', label:'Proveedores' },
        ].map(t => (
          <button key={t.key} onClick={()=>setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${tab===t.key?'bg-white text-gray-900 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── GENERAL ─────────────────────────────────────────────────────────── */}
      {tab === 'general' && (
        <div className="space-y-5">
          {/* KPIs principales */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard titulo="Ingresos semana" valor={fmt(ingresosSemActual)} subtitulo={`Meta: ${fmt(META_SEMANAL)}`} icono={DollarSign} color="text-brand" trend={trendIngresos} chart={ingresosPorSemana} chartType="line" />
            <KPICard titulo="Viajes efectivos" valor={viajesEfectivos} subtitulo={`${viajesCancelados} cancelados`} icono={Truck} color="text-green-600" trend={5} chart={viajePorSemana} chartType="bar" />
            <KPICard titulo="Promedio por viaje" valor={fmt(promedioViaje)} subtitulo="Esta semana" icono={TrendingUp} color="text-amber-600" />
            <KPICard titulo="Tasa cancelación" valor={`${tasaCancelacion}%`} subtitulo={`${viajesCancelados} de ${viajesSemActual.length} viajes`} icono={AlertTriangle} color={tasaCancelacion>20?'text-red-500':'text-green-600'} />
          </div>

          {/* Avance de meta + Embarques activos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Gauge de meta */}
            <div className="card p-5 flex flex-col items-center justify-center">
              <p className="text-xs font-medium text-gray-500 mb-3">Avance vs meta semanal</p>
              <Gauge value={avanceMeta} color={avanceMeta>=100?'#16a34a':avanceMeta>=70?'#d97706':'#dc2626'} />
              <div className="mt-3 text-center">
                <p className="text-sm font-bold text-gray-800">{fmt(ingresosSemActual)}</p>
                <p className="text-[10px] text-gray-400">de {fmt(META_SEMANAL)} meta</p>
                {avanceMeta < 100 && <p className="text-[10px] text-red-500 mt-1">Faltan {fmt(META_SEMANAL-ingresosSemActual)}</p>}
              </div>
            </div>

            {/* Embarques por etapa */}
            <div className="card p-5 col-span-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Pipeline de embarques</p>
              <div className="space-y-2">
                {embPorEtapa.filter(e=>e.value>0).map(e => {
                  const maxVal = Math.max(...embPorEtapa.map(x=>x.value), 1)
                  const pct = (e.value/maxVal)*100
                  const colors = { creado:'bg-gray-300', posicionamiento:'bg-blue-300', carga:'bg-amber-400', transito:'bg-blue-500', descarga:'bg-orange-400', entregado:'bg-green-500', porFacturar:'bg-purple-400', cobrado:'bg-green-700' }
                  const labels = { creado:'Creado', posicionamiento:'Posicionamiento', carga:'Carga', transito:'Tránsito', descarga:'Descarga', entregado:'Entregado', porFacturar:'Por facturar', cobrado:'Cobrado' }
                  return (
                    <div key={e.label} className="flex items-center gap-3">
                      <span className="text-[10px] text-gray-500 w-24 shrink-0">{labels[e.label]}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                        <div className={`h-4 rounded-full ${colors[e.label]||'bg-gray-400'} transition-all`} style={{width:`${pct}%`}} />
                      </div>
                      <span className="text-xs font-bold text-gray-700 w-6 text-right">{e.value}</span>
                    </div>
                  )
                })}
                {embPorEtapa.every(e=>e.value===0) && <p className="text-xs text-gray-400 text-center py-4">Sin embarques registrados</p>}
              </div>
            </div>
          </div>

          {/* Ingresos por semana — gráfica grande */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-700">Ingresos por semana (últimas 6)</p>
              <p className="text-xs text-gray-400">Vi → Ju</p>
            </div>
            <div className="h-32">
              <LineChart data={ingresosPorSemana} height={100} color="#1A56DB" />
            </div>
            <div className="flex justify-between mt-2">
              {ingresosPorSemana.map((s,i) => (
                <div key={i} className="text-center">
                  <p className="text-[10px] font-bold text-gray-700">{s.value>0?fmt(s.value):'—'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── VENTAS ──────────────────────────────────────────────────────────── */}
      {tab === 'ventas' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard titulo="Viajes esta semana" valor={viajesEfectivos} icono={Package} color="text-brand" />
            <KPICard titulo="Ticket promedio" valor={fmt(promedioViaje)} icono={DollarSign} color="text-green-600" />
            <KPICard titulo="Clientes activos" valor={clientes.filter(c=>c.activo!==false).length} icono={Users} color="text-amber-600" />
            <KPICard titulo="Cancelaciones" valor={`${tasaCancelacion}%`} icono={AlertTriangle} color={tasaCancelacion>20?'text-red-500':'text-green-600'} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top clientes */}
            <div className="card p-5">
              <p className="text-sm font-semibold text-gray-700 mb-4">Top clientes por ingresos</p>
              {topClientes.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">Sin datos disponibles</p>
              ) : (
                <div className="space-y-3">
                  {topClientes.map(([nombre, ingreso], i) => {
                    const maxIng = topClientes[0][1]
                    return (
                      <div key={nombre}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-medium text-gray-700 truncate max-w-48">{i+1}. {nombre}</span>
                          <span className="text-xs font-bold text-brand shrink-0">{fmt(ingreso)}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="bg-brand h-1.5 rounded-full" style={{width:`${(ingreso/maxIng)*100}%`}} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Tipos de servicio */}
            <div className="card p-5">
              <p className="text-sm font-semibold text-gray-700 mb-4">Mix de servicios</p>
              {tiposData.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">Sin datos</p>
              ) : (
                <div className="space-y-3">
                  {tiposData.map(([tipo, count]) => {
                    const total = Object.values(tiposServicio).reduce((a,b)=>a+b,0)
                    const p = Math.round((count/total)*100)
                    const colors = { REF:'bg-blue-500', FTL:'bg-green-500', LTL:'bg-amber-400', INT:'bg-purple-500', EXP:'bg-red-400' }
                    return (
                      <div key={tipo}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-medium text-gray-700">{tipo}</span>
                          <span className="text-xs text-gray-400">{count} viajes · {p}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className={`${colors[tipo]||'bg-gray-400'} h-2 rounded-full`} style={{width:`${p}%`}} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Tabla de viajes por día */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">Detalle por día — Semana {semanaActual}</p>
              <button onClick={() => exportarExcel(
                ['Viernes','Sábado','Domingo','Lunes','Martes','Miércoles','Jueves'].map(dia => {
                  const dViajes = viajesSemActual.filter(v=>v.diaSemana===dia)
                  const dEfect = dViajes.filter(v=>['Entregado','En tránsito'].includes(v.estatus))
                  return {
                    Dia: dia,
                    Viajes: dEfect.length,
                    Ingresos: dEfect.reduce((s,v)=>s+(Number(v.ingresoMXN)||0),0),
                    Cancelados: dViajes.filter(v=>v.estatus==='Cancelado').length,
                    Promedio: dEfect.length ? Math.round(dEfect.reduce((s,v)=>s+(Number(v.ingresoMXN)||0),0)/dEfect.length) : 0
                  }
                }), `Detalle_Semana${semanaActual}`
              )} className="btn-secondary text-xs py-1 flex items-center gap-1">
                <Download className="w-3 h-3" /> Exportar
              </button>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-[10px] text-gray-500 uppercase">
                <tr>
                  {['Día','Viajes','Ingresos','Cancelados','Promedio'].map(h=>(
                    <th key={h} className="text-left px-4 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {['Viernes','Sábado','Domingo','Lunes','Martes','Miércoles','Jueves'].map(dia => {
                  const dViajes = viajesSemActual.filter(v=>v.diaSemana===dia)
                  const dEfect = dViajes.filter(v=>['Entregado','En tránsito'].includes(v.estatus))
                  const dCancel = dViajes.filter(v=>v.estatus==='Cancelado').length
                  const dIng = dEfect.reduce((s,v)=>s+(Number(v.ingresoMXN)||0),0)
                  const dProm = dEfect.length ? Math.round(dIng/dEfect.length) : 0
                  return (
                    <tr key={dia} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-800">{dia}</td>
                      <td className="px-4 py-2.5">{dEfect.length > 0 ? <span className="bg-blue-50 text-brand px-2 py-0.5 rounded-full font-bold">{dEfect.length}</span> : <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-2.5 font-bold text-gray-800">{dIng > 0 ? fmt(dIng) : '—'}</td>
                      <td className="px-4 py-2.5">{dCancel > 0 ? <span className="text-red-500 font-medium">{dCancel}</span> : <span className="text-gray-300">0</span>}</td>
                      <td className="px-4 py-2.5 text-gray-500">{dProm > 0 ? fmt(dProm) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-gray-50 font-bold text-xs">
                <tr>
                  <td className="px-4 py-2.5 text-gray-700">TOTAL</td>
                  <td className="px-4 py-2.5 text-brand">{viajesEfectivos}</td>
                  <td className="px-4 py-2.5 text-brand">{fmt(ingresosSemActual)}</td>
                  <td className="px-4 py-2.5 text-red-500">{viajesCancelados}</td>
                  <td className="px-4 py-2.5 text-gray-700">{fmt(promedioViaje)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── OPERACIONES ─────────────────────────────────────────────────────── */}
      {tab === 'operaciones' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard titulo="Embarques activos" valor={embarques.filter(e=>!['cobrado','cancelado'].includes(e.etapa)).length} icono={Truck} color="text-brand" />
            <KPICard titulo="En tránsito" valor={embarques.filter(e=>e.etapa==='transito').length} icono={Clock} color="text-amber-600" />
            <KPICard titulo="Por facturar" valor={embarques.filter(e=>e.etapa==='porFacturar').length} icono={DollarSign} color="text-purple-600" />
            <KPICard titulo="Entregados hoy" valor={embarques.filter(e=>e.etapa==='entregado').length} icono={CheckCircle} color="text-green-600" />
          </div>

          {/* Embarques críticos */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">Estado del pipeline</p>
              <span className="text-xs text-gray-400">{embarques.length} embarques totales</span>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { etapa:'creado', label:'Creados', color:'bg-gray-200' },
                  { etapa:'posicionamiento', label:'Posicionamiento', color:'bg-blue-300' },
                  { etapa:'carga', label:'En carga', color:'bg-amber-400' },
                  { etapa:'transito', label:'En tránsito', color:'bg-blue-500' },
                  { etapa:'descarga', label:'En descarga', color:'bg-orange-400' },
                  { etapa:'entregado', label:'Entregados', color:'bg-green-500' },
                  { etapa:'provisiones', label:'Provisiones', color:'bg-purple-300' },
                  { etapa:'porFacturar', label:'Por facturar', color:'bg-purple-500' },
                ].map(({ etapa, label, color }) => {
                  const count = embarques.filter(e=>e.etapa===etapa).length
                  return (
                    <div key={etapa} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${color} shrink-0`} />
                      <span className="text-xs text-gray-600 flex-1">{label}</span>
                      <span className="text-sm font-bold text-gray-800">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PROVEEDORES ─────────────────────────────────────────────────────── */}
      {tab === 'proveedores' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard titulo="Proveedores activos" valor={proveedores.filter(p=>p.activo!==false).length} icono={Truck} color="text-brand" />
            <KPICard titulo="Calificación promedio" valor={proveedores.length ? (proveedores.reduce((s,p)=>s+(p.calificacion||0),0)/proveedores.length).toFixed(1) : '—'} icono={Star} color="text-amber-500" />
            <KPICard titulo="Docs completos" valor={proveedores.filter(p=>p.documentos&&Object.values(p.documentos).filter(Boolean).length>=6).length} icono={CheckCircle} color="text-green-600" />
            <KPICard titulo="Docs incompletos" valor={proveedores.filter(p=>!p.documentos||Object.values(p.documentos||{}).filter(Boolean).length<6).length} icono={AlertTriangle} color="text-red-500" />
          </div>

          {/* Top proveedores */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card p-5">
              <p className="text-sm font-semibold text-gray-700 mb-4">Proveedores más usados</p>
              {topProveedores.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">Sin datos</p>
              ) : (
                <div className="space-y-3">
                  {topProveedores.map(([nombre, count], i) => {
                    const max = topProveedores[0][1]
                    return (
                      <div key={nombre}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-medium text-gray-700 truncate max-w-44">{i+1}. {nombre}</span>
                          <span className="text-xs font-bold text-gray-600 shrink-0">{count} viajes</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="bg-amber-400 h-1.5 rounded-full" style={{width:`${(count/max)*100}%`}} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Gauges de calificación */}
            <div className="card p-5">
              <p className="text-sm font-semibold text-gray-700 mb-4">Evaluación del servicio</p>
              <div className="grid grid-cols-3 gap-3">
                <Gauge value={proveedores.length ? Math.round(proveedores.reduce((s,p)=>s+(p.kpis?.puntualidad||0),0)/proveedores.length) : 0} color="#16a34a" label="Puntualidad" />
                <Gauge value={proveedores.filter(p=>p.documentos&&Object.values(p.documentos||{}).filter(Boolean).length>=6).length && proveedores.length ? Math.round((proveedores.filter(p=>p.documentos&&Object.values(p.documentos||{}).filter(Boolean).length>=6).length/proveedores.length)*100) : 0} color="#1A56DB" label="Docs completos" />
                <Gauge value={proveedores.filter(p=>p.activo!==false).length && proveedores.length ? Math.round((proveedores.filter(p=>p.activo!==false).length/proveedores.length)*100) : 0} color="#d97706" label="Activos" />
              </div>
            </div>
          </div>

          {/* Tabla de proveedores con KPIs */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">Detalle por proveedor</p>
              <button onClick={() => exportarExcel(
                proveedores.map(p => ({
                  Proveedor: p.nombre||'',
                  Calificacion: p.calificacion||0,
                  Viajes: p.kpis?.viajes||0,
                  Puntualidad: `${p.kpis?.puntualidad||0}%`,
                  Documentos: Object.values(p.documentos||{}).filter(Boolean).length,
                  Estado: p.activo!==false?'Activo':'Inactivo'
                })), 'Proveedores_KPIs'
              )} className="btn-secondary text-xs py-1 flex items-center gap-1">
                <Download className="w-3 h-3" /> Exportar
              </button>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-[10px] text-gray-500 uppercase">
                <tr>
                  {['Proveedor','Calificación','Viajes','Puntualidad','Docs','Estado'].map(h=>(
                    <th key={h} className="text-left px-4 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {proveedores.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">Sin proveedores registrados</td></tr>
                ) : proveedores.slice(0,10).map(p => {
                  const docsCount = Object.values(p.documentos||{}).filter(Boolean).length
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-800 max-w-36 truncate">{p.nombre}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span className="font-medium">{p.calificacion?.toFixed(1)||'—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-brand font-bold">{p.kpis?.viajes||0}</td>
                      <td className="px-4 py-2.5">
                        <span className={`font-medium ${(p.kpis?.puntualidad||0)>=90?'text-green-600':(p.kpis?.puntualidad||0)>=70?'text-amber-500':'text-red-500'}`}>
                          {p.kpis?.puntualidad||0}%
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${docsCount>=6?'bg-green-50 text-green-700':'bg-red-50 text-red-600'}`}>
                          {docsCount}/{Object.keys(p.documentos||{}).length||0}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.activo!==false?'bg-green-50 text-green-700':'bg-gray-100 text-gray-500'}`}>
                          {p.activo!==false?'Activo':'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
