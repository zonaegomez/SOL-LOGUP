import { useEffect, useState, useRef } from 'react'
import { collection, getDocs, addDoc, query, where, orderBy, serverTimestamp, writeBatch, doc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import * as XLSX from 'xlsx'

const DIAS_SEMANA = ['Vi', 'Sa', 'Do', 'Lu', 'Ma', 'Mi', 'Ju']
const DIAS_LABELS = ['Viernes','Sábado','Domingo','Lunes','Martes','Miércoles','Jueves']

const META_SEMANAL = 190729
const META_DIARIA = 27247

function getInicioSemana(offset = 0) {
  const hoy = new Date()
  const dia = hoy.getDay()
  const diasDesdeViernes = (dia + 2) % 7
  const viernes = new Date(hoy)
  viernes.setDate(hoy.getDate() - diasDesdeViernes + offset * 7)
  viernes.setHours(0, 0, 0, 0)
  return viernes
}

function getDiasSemana(viernes) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(viernes)
    d.setDate(viernes.getDate() + i)
    return d
  })
}

function getSemanaAnio(viernes) {
  const start = new Date(viernes.getFullYear(), 0, 1)
  const diff = viernes - start
  const oneWeek = 7 * 24 * 60 * 60 * 1000
  return Math.ceil((diff / oneWeek) + 1)
}

function fmt(n) {
  return '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })
}

// ── Dashboard VENTAS ──────────────────────────────────────────────────────────
function DashboardVentas({ perfil }) {
  const [semanaOffset, setSemanaOffset] = useState(0)
  const [viajes, setViajes] = useState([])
  const [loading, setLoading] = useState(true)
  const [importando, setImportando] = useState(false)
  const [importMsg, setImportMsg] = useState(null)
  const fileRef = useRef()

  const viernes = getInicioSemana(semanaOffset)
  const jueves = new Date(viernes); jueves.setDate(viernes.getDate() + 6)
  const dias = getDiasSemana(viernes)
  const numSemana = getSemanaAnio(viernes)
  const hoy = new Date()
  const esSemanActual = semanaOffset === 0

  useEffect(() => { fetchViajes() }, [semanaOffset])

  const fetchViajes = async () => {
    setLoading(true)
    try {
      const snap = await getDocs(query(
        collection(db, 'viajesSemana'),
        where('semanaAnio', '==', numSemana),
        where('anio', '==', viernes.getFullYear())
      ))
      setViajes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch(e) {
      console.error(e)
      setViajes([])
    } finally { setLoading(false) }
  }

  // Calcular ingresos y viajes por día
  const ingresosPorDia = DIAS_LABELS.map(dia => {
    return viajes
      .filter(v => v.diaSemana === dia && ['Entregado','En tránsito'].includes(v.estatus))
      .reduce((sum, v) => sum + (Number(v.ingresoMXN) || 0), 0)
  })

  const viajesPorDia = DIAS_LABELS.map(dia => {
    return viajes.filter(v => v.diaSemana === dia && v.estatus !== 'Cancelado').length
  })

  const totalSemana = ingresosPorDia.reduce((a, b) => a + b, 0)
  const totalViajes = viajesPorDia.reduce((a, b) => a + b, 0)
  const diasTranscurridos = esSemanActual ? dias.filter(d => d <= hoy).length : 7
  const proyeccionDiaria = diasTranscurridos > 0 ? totalSemana / diasTranscurridos : 0
  const proyeccionSemanal = proyeccionDiaria * 7
  const pctMeta = Math.min((totalSemana / META_SEMANAL) * 100, 100)
  const faltaMeta = Math.max(META_SEMANAL - totalSemana, 0)
  const diasRestantes = esSemanActual ? 7 - diasTranscurridos : 0
  const mejorDia = DIAS_LABELS[ingresosPorDia.indexOf(Math.max(...ingresosPorDia))]
  const mejorIngreso = Math.max(...ingresosPorDia)

  // Importar Excel
  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImportando(true)
    setImportMsg(null)
    try {
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })

      const batch = writeBatch(db)
      let count = 0

      for (const row of rows) {
        const folio = row['Folio / Ref.'] || row['Folio'] || ''
        const cliente = row['Cliente'] || ''
        const origen = row['Origen'] || ''
        const destino = row['Destino'] || ''
        const diaSemana = row['Día semana'] || row['Día de salida'] || ''
        const fechaSalida = row['Fecha salida'] || ''
        const tipoServicio = row['Tipo servicio'] || ''
        const tipoUnidad = row['Tipo unidad'] || ''
        const ingresoMXN = Number(row['Ingreso MXN']) || 0
        const estatus = row['Estatus'] || 'Programado'
        const semAnio = Number(row['Sem. año'] || row['Semana año'] || numSemana)
        const notas = row['Notas'] || ''

        if (!cliente && !folio) continue

        const ref = doc(collection(db, 'viajesSemana'))
        batch.set(ref, {
          folio, cliente, origen, destino, diaSemana,
          fechaSalida, tipoServicio, tipoUnidad, ingresoMXN,
          estatus, notas,
          semanaAnio: semAnio,
          anio: viernes.getFullYear(),
          importadoEn: serverTimestamp(),
        })
        count++
      }

      await batch.commit()
      setImportMsg({ tipo: 'ok', texto: `✅ ${count} viajes importados correctamente` })
      fetchViajes()
    } catch(err) {
      console.error(err)
      setImportMsg({ tipo: 'error', texto: '❌ Error al importar. Verifica el formato del archivo.' })
    } finally {
      setImportando(false)
      fileRef.current.value = ''
    }
  }

  const COLOR_DIA = (ingreso, esFuturo) => {
    if (esFuturo) return 'bg-gray-50 text-gray-300'
    if (ingreso === 0) return 'bg-gray-50 text-gray-400'
    if (ingreso >= META_DIARIA) return 'bg-green-50 text-green-700'
    if (ingreso >= META_DIARIA * 0.7) return 'bg-amber-50 text-amber-700'
    return 'bg-red-50 text-red-600'
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {esSemanActual ? `Buen día, ${perfil?.nombre?.split(' ')[0] || 'vendedor'} 👋` : `Semana ${numSemana} · ${viernes.getFullYear()}`}
          </h1>
          <p className="text-sm text-gray-500">
            Semana {numSemana} · {viernes.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} al {jueves.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Navegación de semanas */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
            <button onClick={() => setSemanaOffset(s => s - 1)} className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">← Anterior</button>
            {semanaOffset !== 0 && <button onClick={() => setSemanaOffset(0)} className="px-2 py-1 text-xs text-brand hover:bg-blue-50 rounded">Hoy</button>}
            <button onClick={() => setSemanaOffset(s => Math.min(s + 1, 0))} disabled={semanaOffset === 0} className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30">Siguiente →</button>
          </div>
          {/* Importar Excel */}
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
          <button onClick={() => fileRef.current.click()} disabled={importando} className="btn-secondary text-xs py-1.5">
            {importando ? '⏳ Importando...' : '📥 Importar Excel'}
          </button>
          {esSemanActual && <Link to="/embarques/nuevo" className="btn-primary text-xs py-1.5">+ Nuevo embarque</Link>}
        </div>
      </div>

      {/* Mensaje de importación */}
      {importMsg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${importMsg.tipo === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
          {importMsg.texto}
          <button onClick={() => setImportMsg(null)} className="ml-3 text-xs opacity-60 hover:opacity-100">×</button>
        </div>
      )}

      {/* Tabla semanal */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-gray-700">Resumen semanal — Logística</p>
          <span className="text-xs text-gray-400">Vi → Ju · Semana {numSemana}</span>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400 text-sm">Cargando datos de la semana...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <td className="text-xs text-gray-400 w-24 pb-2"></td>
                  {dias.map((d, i) => (
                    <td key={i} className={`text-center pb-2 ${d.toDateString() === hoy.toDateString() ? 'text-brand font-bold' : 'text-gray-500'}`}>
                      <div className="text-xs font-semibold">{DIAS_SEMANA[i]}</div>
                      <div className="text-[10px] text-gray-400">{d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</div>
                    </td>
                  ))}
                  <td className="text-center pb-2 text-xs font-bold text-gray-700">Total</td>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="text-xs text-gray-500 py-2 font-medium">Ingresos</td>
                  {ingresosPorDia.map((v, i) => {
                    const esFuturo = esSemanActual && dias[i] > hoy
                    return (
                      <td key={i} className="text-center py-1 px-0.5">
                        <div className={`rounded-lg py-2 text-xs font-bold ${COLOR_DIA(v, esFuturo)}`}>
                          {esFuturo ? '—' : v > 0 ? fmt(v) : viajes.filter(vj => vj.diaSemana === DIAS_LABELS[i]).length > 0 ? '$0' : '—'}
                        </div>
                      </td>
                    )
                  })}
                  <td className="text-center">
                    <div className="bg-brand text-white rounded-lg py-2 text-xs font-bold">{fmt(totalSemana)}</div>
                  </td>
                </tr>
                <tr>
                  <td className="text-xs text-gray-500 py-2 font-medium">Viajes</td>
                  {viajesPorDia.map((v, i) => {
                    const esFuturo = esSemanActual && dias[i] > hoy
                    const programados = viajes.filter(vj => vj.diaSemana === DIAS_LABELS[i] && vj.estatus === 'Programado').length
                    return (
                      <td key={i} className="text-center py-1 px-0.5">
                        <div className={`rounded-lg py-2 text-xs font-bold relative ${esFuturo ? 'bg-gray-50 text-gray-300' : v > 0 ? 'bg-blue-50 text-brand' : programados > 0 ? 'bg-blue-50 text-blue-300' : 'bg-gray-50 text-gray-300'}`}>
                          {esFuturo ? '—' : v > 0 ? v : programados > 0 ? `(${programados})` : '—'}
                        </div>
                      </td>
                    )
                  })}
                  <td className="text-center">
                    <div className="bg-blue-100 text-brand rounded-lg py-2 text-xs font-bold">{totalViajes}</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Sin datos */}
        {!loading && viajes.length === 0 && (
          <div className="text-center pt-4 pb-2">
            <p className="text-xs text-gray-400">Sin viajes registrados para esta semana.</p>
            <p className="text-xs text-gray-400 mt-1">
              Importa el Excel semanal o <Link to="/embarques/nuevo" className="text-brand hover:underline">crea un embarque</Link>.
            </p>
          </div>
        )}
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-400 mb-1">Proyección diaria</p>
          <p className="text-lg font-bold text-gray-800">{fmt(proyeccionDiaria)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Meta: {fmt(META_DIARIA)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-400 mb-1">Proyección semanal</p>
          <p className="text-lg font-bold text-gray-800">{fmt(proyeccionSemanal)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Meta: {fmt(META_SEMANAL)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-400 mb-1">Avance vs meta</p>
          <p className={`text-lg font-bold ${pctMeta >= 100 ? 'text-green-600' : pctMeta >= 70 ? 'text-amber-500' : 'text-red-500'}`}>
            {pctMeta.toFixed(1)}%
          </p>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1.5">
            <div className={`h-1.5 rounded-full transition-all ${pctMeta >= 100 ? 'bg-green-500' : pctMeta >= 70 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${pctMeta}%` }} />
          </div>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-400 mb-1">{esSemanActual ? 'Falta para meta' : 'vs Meta semanal'}</p>
          <p className={`text-lg font-bold ${faltaMeta === 0 ? 'text-green-600' : 'text-red-500'}`}>
            {faltaMeta === 0 ? '✅ Lograda' : fmt(faltaMeta)}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">{totalViajes} viajes efectivos</p>
        </div>
      </div>

      {/* Esta semana + acciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Indicadores</h2>
          <div className="space-y-2">
            {[
              { label: 'Mejor día', val: mejorIngreso > 0 ? `${mejorDia} ${fmt(mejorIngreso)}` : '—' },
              { label: 'Promedio por viaje', val: totalViajes > 0 ? fmt(totalSemana / totalViajes) : '—' },
              { label: esSemanActual ? 'Días restantes' : 'Semana', val: esSemanActual ? `${diasRestantes} días` : `Semana ${numSemana}` },
              { label: esSemanActual && diasRestantes > 0 ? 'Necesitas por día' : 'Total semana', val: esSemanActual && diasRestantes > 0 ? fmt(faltaMeta / diasRestantes) : fmt(totalSemana) },
              { label: 'Viajes programados', val: viajes.filter(v => v.estatus === 'Programado').length },
              { label: 'Cancelados', val: viajes.filter(v => v.estatus === 'Cancelado').length },
            ].map(s => (
              <div key={s.label} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                <span className="text-gray-500">{s.label}</span>
                <span className="font-medium text-gray-800">{s.val}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Acciones rápidas</h2>
          <div className="space-y-2">
            <button onClick={() => fileRef.current.click()} className="btn-primary w-full justify-center text-sm">
              📥 Importar Excel semanal
            </button>
            <Link to="/embarques/nuevo" className="btn-secondary w-full justify-center text-sm">+ Nuevo embarque</Link>
            <Link to="/pricing" className="btn-secondary w-full justify-center text-sm">Ver unidades disponibles</Link>
          </div>
          <div className="mt-4 bg-blue-50 rounded-xl p-3">
            <p className="text-xs font-medium text-brand mb-1">💡 Cómo cargar historial</p>
            <p className="text-[11px] text-blue-600">Descarga el Excel, llena los viajes de cualquier semana pasada y usa "Importar Excel". El historial queda guardado y puedes navegar entre semanas con las flechas ← →</p>
          </div>
        </div>
      </div>

      {/* Lista de viajes de la semana */}
      {viajes.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">Viajes de la semana ({viajes.length})</p>
            <div className="flex gap-2 text-[10px]">
              {['Entregado','En tránsito','Programado','Cancelado'].map(e => (
                <span key={e} className={`px-2 py-0.5 rounded-full ${
                  e==='Entregado'?'bg-green-50 text-green-700':e==='En tránsito'?'bg-amber-50 text-amber-700':e==='Programado'?'bg-blue-50 text-brand':'bg-red-50 text-red-600'
                }`}>{e}: {viajes.filter(v=>v.estatus===e).length}</span>
              ))}
            </div>
          </div>
          <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
            {viajes.map(v => (
              <div key={v.id} className="px-5 py-2.5 flex items-center gap-4 hover:bg-gray-50">
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  v.estatus==='Entregado'?'bg-green-400':v.estatus==='En tránsito'?'bg-amber-400':v.estatus==='Programado'?'bg-blue-400':'bg-red-300'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{v.cliente}</p>
                  <p className="text-[10px] text-gray-400">{v.origen} → {v.destino} · {v.diaSemana}</p>
                </div>
                <span className="text-[10px] bg-blue-50 text-brand px-1.5 py-0.5 rounded shrink-0">{v.tipoServicio}</span>
                <span className="text-xs font-bold text-gray-700 shrink-0 w-20 text-right">
                  {v.ingresoMXN > 0 ? fmt(v.ingresoMXN) : '—'}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                  v.estatus==='Entregado'?'bg-green-50 text-green-700':v.estatus==='En tránsito'?'bg-amber-50 text-amber-700':v.estatus==='Programado'?'bg-blue-50 text-brand':'bg-red-50 text-red-500'
                }`}>{v.estatus}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Dashboard ADMIN ────────────────────────────────────────────────────────────
function DashboardAdmin({ perfil }) {
  const [stats, setStats] = useState({ total:0, activos:0, criticos:0, porFacturar:0 })
  const [recientes, setRecientes] = useState([])
  const [semanaOffset, setSemanaOffset] = useState(0)
  const [viajes, setViajes] = useState([])
  const hoy = new Date()
  const viernes = getInicioSemana(semanaOffset)
  const jueves = new Date(viernes); jueves.setDate(viernes.getDate()+6)
  const numSemana = getSemanaAnio(viernes)

  useEffect(() => {
    getDocs(collection(db,'embarques')).then(snap=>{
      const todos = snap.docs.map(d=>({id:d.id,...d.data()}))
      setStats({
        total:todos.length,
        activos:todos.filter(e=>!['cobrado','cancelado'].includes(e.etapa)).length,
        criticos:todos.filter(e=>e.prioridad==='urgente').length,
        porFacturar:todos.filter(e=>e.etapa==='porFacturar').length,
      })
      setRecientes(todos.slice(0,5))
    }).catch(console.error)
  },[])

  useEffect(()=>{
    getDocs(query(collection(db,'viajesSemana'),
      where('semanaAnio','==',numSemana),
      where('anio','==',viernes.getFullYear())
    )).then(snap=>setViajes(snap.docs.map(d=>({id:d.id,...d.data()})))).catch(()=>setViajes([]))
  },[semanaOffset])

  const ingresosPorDia = ['Viernes','Sábado','Domingo','Lunes','Martes','Miércoles','Jueves'].map(dia=>
    viajes.filter(v=>v.diaSemana===dia&&['Entregado','En tránsito'].includes(v.estatus)).reduce((s,v)=>s+(Number(v.ingresoMXN)||0),0)
  )
  const totalSemana = ingresosPorDia.reduce((a,b)=>a+b,0)
  const totalViajes = viajes.filter(v=>v.estatus!=='Cancelado').length
  const pctMeta = Math.min((totalSemana/META_SEMANAL)*100,100)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Buen día, {perfil?.nombre?.split(' ')[0]||'Admin'} 👋</h1>
          <p className="text-sm text-gray-500">{hoy.toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'})}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {label:'Ingresos semana',val:fmt(totalSemana),sub:`Meta: ${fmt(META_SEMANAL)}`,color:'text-brand',bg:'bg-blue-50'},
          {label:'Viajes semana',val:totalViajes,sub:'Logística tercerizada',color:'text-green-600',bg:'bg-green-50'},
          {label:'Avance meta',val:`${pctMeta.toFixed(1)}%`,sub:`Faltan ${fmt(Math.max(META_SEMANAL-totalSemana,0))}`,color:pctMeta>=70?'text-amber-500':'text-red-500',bg:'bg-amber-50'},
          {label:'Por facturar',val:stats.porFacturar,sub:'embarques pendientes',color:'text-amber-500',bg:'bg-amber-50'},
        ].map(s=>(
          <div key={s.label} className="card p-4">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
              <span className={`text-base font-bold ${s.color}`}>{s.val}</span>
            </div>
            <p className="text-xs font-medium text-gray-700">{s.label}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabla semanal admin */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700">Semana {numSemana} — Logística</p>
          <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-1">
            <button onClick={()=>setSemanaOffset(s=>s-1)} className="px-2 py-0.5 text-xs text-gray-600 hover:bg-white rounded">←</button>
            {semanaOffset!==0&&<button onClick={()=>setSemanaOffset(0)} className="px-2 py-0.5 text-xs text-brand hover:bg-white rounded">Hoy</button>}
            <button onClick={()=>setSemanaOffset(s=>Math.min(s+1,0))} disabled={semanaOffset===0} className="px-2 py-0.5 text-xs text-gray-600 hover:bg-white rounded disabled:opacity-30">→</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <td className="text-xs text-gray-400 w-20 pb-2"></td>
                {DIAS_SEMANA.map((d,i)=>{
                  const fecha = new Date(viernes); fecha.setDate(viernes.getDate()+i)
                  return <td key={i} className={`text-center pb-2 text-xs ${fecha.toDateString()===hoy.toDateString()?'text-brand font-bold':'text-gray-500'}`}>
                    <div className="font-semibold">{d}</div>
                    <div className="text-[10px] text-gray-400">{fecha.getDate()}</div>
                  </td>
                })}
                <td className="text-center pb-2 text-xs font-bold text-gray-700">Total</td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-xs text-gray-500 py-1.5">Ingresos</td>
                {ingresosPorDia.map((v,i)=>(
                  <td key={i} className="text-center py-1 px-0.5">
                    <div className={`rounded py-1.5 text-[10px] font-bold ${v>0?'bg-blue-50 text-brand':'bg-gray-50 text-gray-300'}`}>
                      {v>0?fmt(v):'—'}
                    </div>
                  </td>
                ))}
                <td className="text-center"><div className="bg-brand text-white rounded py-1.5 text-[10px] font-bold">{fmt(totalSemana)}</div></td>
              </tr>
              <tr>
                <td className="text-xs text-gray-500 py-1.5">Viajes</td>
                {['Viernes','Sábado','Domingo','Lunes','Martes','Miércoles','Jueves'].map((dia,i)=>{
                  const v=viajes.filter(vj=>vj.diaSemana===dia&&vj.estatus!=='Cancelado').length
                  return <td key={i} className="text-center py-1 px-0.5">
                    <div className={`rounded py-1.5 text-xs font-bold ${v>0?'bg-green-50 text-green-700':'bg-gray-50 text-gray-300'}`}>{v>0?v:'—'}</div>
                  </td>
                })}
                <td className="text-center"><div className="bg-green-100 text-green-700 rounded py-1.5 text-xs font-bold">{totalViajes}</div></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Estado de operaciones</h2>
          {[{label:'Total embarques',val:stats.total,color:'text-brand'},{label:'Activos',val:stats.activos,color:'text-green-600'},{label:'Críticos / Urgentes',val:stats.criticos,color:'text-red-500'},{label:'Por facturar',val:stats.porFacturar,color:'text-amber-500'}].map(s=>(
            <div key={s.label} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
              <span className="text-xs text-gray-500">{s.label}</span>
              <span className={`text-sm font-bold ${s.color}`}>{s.val}</span>
            </div>
          ))}
          <div className="mt-3 space-y-2">
            <Link to="/operaciones" className="btn-secondary w-full justify-center text-xs">Ver board de operaciones</Link>
          </div>
        </div>
        <div className="card p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Embarques recientes</h2>
          {recientes.length===0?<p className="text-sm text-gray-400">Sin embarques registrados.</p>:
            <div className="space-y-2">
              {recientes.map(e=>(
                <Link key={e.id} to={`/embarques/${e.id}`} className="flex items-center justify-between py-1.5 border-b border-gray-50 hover:bg-gray-50 px-1 rounded transition-colors">
                  <div><p className="text-xs font-medium text-gray-800">{e.folio||e.id.slice(0,10)}</p><p className="text-[10px] text-gray-400">{e.cliente}</p></div>
                  <span className="text-[10px] bg-blue-50 text-brand px-2 py-0.5 rounded-full capitalize">{e.etapa}</span>
                </Link>
              ))}
            </div>
          }
        </div>
      </div>
    </div>
  )
}

function DashboardOperaciones({ perfil }) {
  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-semibold text-gray-900">Buen día, {perfil?.nombre?.split(' ')[0]||'usuario'} 👋</h1><p className="text-sm text-gray-500">Resumen operativo</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Acciones rápidas</h2>
          <div className="space-y-2">
            <Link to="/operaciones" className="btn-primary w-full justify-center">Ver board de operaciones</Link>
            <Link to="/embarques" className="btn-secondary w-full justify-center">Buscar embarque</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function DashboardPricing({ perfil }) {
  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-semibold text-gray-900">Buen día, {perfil?.nombre?.split(' ')[0]||'usuario'} 👋</h1><p className="text-sm text-gray-500">Resumen de pricing</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Acciones rápidas</h2>
          <div className="space-y-2">
            <Link to="/pricing" className="btn-primary w-full justify-center">Ver disponibilidad de unidades</Link>
            <Link to="/pricing" className="btn-secondary w-full justify-center">Cotizador interno</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { perfil } = useAuth()
  const rol = perfil?.rol || 'ventas'
  if (rol === 'ventas') return <DashboardVentas perfil={perfil} />
  if (rol === 'admin') return <DashboardAdmin perfil={perfil} />
  if (rol === 'operaciones') return <DashboardOperaciones perfil={perfil} />
  if (rol === 'pricing') return <DashboardPricing perfil={perfil} />
  return <DashboardAdmin perfil={perfil} />
}
