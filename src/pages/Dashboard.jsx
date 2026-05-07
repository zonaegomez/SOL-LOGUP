import { useEffect, useState, useRef } from 'react'
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where, serverTimestamp, writeBatch, addDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useMoneda } from '../context/MonedaContext'
import { Link } from 'react-router-dom'
import * as XLSX from 'xlsx'

const DIAS_SEMANA = ['Vi', 'Sa', 'Do', 'Lu', 'Ma', 'Mi', 'Ju']
const DIAS_LABELS = ['Viernes','Sábado','Domingo','Lunes','Martes','Miércoles','Jueves']

function getInicioSemana(offset = 0) {
  const hoy = new Date()
  const diasDesdeViernes = (hoy.getDay() + 2) % 7
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
  return Math.ceil(((viernes - start) / 86400000 + 1) / 7)
}

function fmt(n) {
  return '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })
}

// ── Componente tabla semanal compartido ───────────────────────────────────────
function TablaSemanal({ rol }) {
  const [semanaOffset, setSemanaOffset] = useState(0)
  const [viajes, setViajes] = useState([])
  const [loading, setLoading] = useState(true)
  const [importando, setImportando] = useState(false)
  const [importMsg, setImportMsg] = useState(null)
  const [meta, setMeta] = useState({ semanal: 190729, diaria: 27247 })
  const [editandoMeta, setEditandoMeta] = useState(false)
  const [metaTemp, setMetaTemp] = useState({ semanal: '', diaria: '' })
  const [guardandoMeta, setGuardandoMeta] = useState(false)
  const { fmt } = useMoneda()
  const [editandoViaje, setEditandoViaje] = useState(null)
  const [viajeEdit, setViajeEdit] = useState({})
  const [guardandoViaje, setGuardandoViaje] = useState(false)
  const fileRef = useRef()
  const hoy = new Date()
  const esAdmin = rol === 'admin'

  const viernes = getInicioSemana(semanaOffset)
  const jueves = new Date(viernes); jueves.setDate(viernes.getDate() + 6)
  const dias = getDiasSemana(viernes)
  const numSemana = getSemanaAnio(viernes)
  const esSemanActual = semanaOffset === 0

  // Cargar meta desde Firestore
  useEffect(() => {
    getDoc(doc(db, 'config', 'metas')).then(snap => {
      if (snap.exists()) setMeta(snap.data())
    }).catch(() => {})
  }, [])

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
    } catch(e) { setViajes([]) }
    finally { setLoading(false) }
  }

  const guardarMeta = async () => {
    setGuardandoMeta(true)
    try {
      const nuevaMeta = {
        semanal: Number(metaTemp.semanal) || meta.semanal,
        diaria: Number(metaTemp.diaria) || meta.diaria,
        actualizadoEn: serverTimestamp(),
      }
      await setDoc(doc(db, 'config', 'metas'), nuevaMeta)
      setMeta(nuevaMeta)
      setEditandoMeta(false)
    } catch(e) { console.error(e) }
    finally { setGuardandoMeta(false) }
  }

  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImportando(true); setImportMsg(null)
    try {
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
      const batch = writeBatch(db)
      let count = 0
      for (const row of rows) {
        const cliente = row['Cliente'] || ''
        const folio = row['Folio / Ref.'] || row['Folio'] || ''
        if (!cliente && !folio) continue
        const ref = doc(collection(db, 'viajesSemana'))
        batch.set(ref, {
          folio, cliente,
          origen: row['Origen'] || '',
          destino: row['Destino'] || '',
          diaSemana: row['Día semana'] || row['Día de salida'] || '',
          fechaSalida: row['Fecha salida'] || '',
          tipoServicio: row['Tipo servicio'] || '',
          tipoUnidad: row['Tipo unidad'] || '',
          ingresoMXN: Number(row['Ingreso MXN']) || 0,
          estatus: row['Estatus'] || 'Programado',
          notas: row['Notas'] || '',
          semanaAnio: Number(row['Sem. año'] || numSemana),
          anio: viernes.getFullYear(),
          importadoEn: serverTimestamp(),
        })
        count++
      }
      await batch.commit()
      setImportMsg({ tipo: 'ok', texto: `✅ ${count} viajes importados` })
      fetchViajes()
    } catch(err) {
      setImportMsg({ tipo: 'error', texto: '❌ Error al importar. Verifica el formato.' })
    } finally {
      setImportando(false)
      if(fileRef.current) fileRef.current.value = ''
    }
  }

  // Calcular métricas
  const ingresosPorDia = DIAS_LABELS.map(dia =>
    viajes.filter(v => v.diaSemana === dia && ['Entregado','En tránsito'].includes(v.estatus))
      .reduce((s, v) => s + (Number(v.ingresoMXN) || 0), 0)
  )
  const viajesPorDia = DIAS_LABELS.map(dia =>
    viajes.filter(v => v.diaSemana === dia && v.estatus !== 'Cancelado').length
  )
  const totalSemana = ingresosPorDia.reduce((a, b) => a + b, 0)
  const totalViajes = viajesPorDia.reduce((a, b) => a + b, 0)
  const diasTranscurridos = esSemanActual ? Math.max(dias.filter(d => d <= hoy).length, 1) : 7
  const proyeccionDiaria = totalSemana / diasTranscurridos
  const proyeccionSemanal = proyeccionDiaria * 7
  const pctMeta = Math.min((totalSemana / meta.semanal) * 100, 100)
  const faltaMeta = Math.max(meta.semanal - totalSemana, 0)
  const diasRestantes = esSemanActual ? 7 - diasTranscurridos : 0

  const guardarViaje = async () => {
    if (!editandoViaje) return
    setGuardandoViaje(true)
    try {
      await updateDoc(doc(db, 'viajesSemana', editandoViaje), {
        ingresoMXN: Number(viajeEdit.ingresoMXN) || 0,
        estatus: viajeEdit.estatus,
        cliente: viajeEdit.cliente,
        tipoServicio: viajeEdit.tipoServicio,
        notas: viajeEdit.notas || '',
      })
      setEditandoViaje(null)
      fetchViajes()
    } catch(e) { console.error(e) }
    finally { setGuardandoViaje(false) }
  }

  const eliminarViaje = async (id) => {
    if (!window.confirm('¿Eliminar este viaje?')) return
    try {
      await deleteDoc(doc(db, 'viajesSemana', id))
      fetchViajes()
    } catch(e) { console.error(e) }
  }

  const COLOR_DIA = (v, esFuturo) => {
    if (esFuturo) return 'bg-gray-50 text-gray-300'
    if (v === 0) return 'bg-gray-50 text-gray-400'
    if (v >= meta.diaria) return 'bg-green-50 text-green-700'
    if (v >= meta.diaria * 0.7) return 'bg-amber-50 text-amber-700'
    return 'bg-red-50 text-red-600'
  }

  return (
    <div className="space-y-4">
      {/* Header tabla */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <p className="text-sm font-semibold text-gray-700">Resumen semanal — Logística</p>
            <p className="text-xs text-gray-400">
              Semana {numSemana} · {viernes.toLocaleDateString('es-MX',{day:'numeric',month:'short'})} al {jueves.toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'})}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Meta editable por admin */}
            {esAdmin && !editandoMeta && (
              <button onClick={() => { setMetaTemp({ semanal: meta.semanal, diaria: meta.diaria }); setEditandoMeta(true) }}
                className="text-xs text-brand hover:underline border border-brand/20 px-2 py-1 rounded-lg">
                Editar meta
              </button>
            )}
            {/* Navegación semanas */}
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
              <button onClick={() => setSemanaOffset(s => s-1)} className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">←</button>
              {semanaOffset !== 0 && <button onClick={() => setSemanaOffset(0)} className="px-2 py-1 text-xs text-brand hover:bg-blue-50 rounded">Hoy</button>}
              <button onClick={() => setSemanaOffset(s => Math.min(s+1, 0))} disabled={semanaOffset===0} className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30">→</button>
            </div>
            {/* Importar Excel */}
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
            <button onClick={() => fileRef.current?.click()} disabled={importando} className="btn-secondary text-xs py-1.5">
              {importando ? 'Cargando...' : 'Importar Excel'}
            </button>
          </div>
        </div>

        {/* Editar meta */}
        {editandoMeta && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex items-center gap-4 flex-wrap">
            <p className="text-xs font-semibold text-brand">Editar metas:</p>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Meta semanal $</label>
              <input type="number" className="input w-32 text-xs py-1" value={metaTemp.semanal} onChange={e => setMetaTemp(m => ({...m, semanal: e.target.value}))} />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Meta diaria $</label>
              <input type="number" className="input w-32 text-xs py-1" value={metaTemp.diaria} onChange={e => setMetaTemp(m => ({...m, diaria: e.target.value}))} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditandoMeta(false)} className="btn-secondary text-xs py-1">Cancelar</button>
              <button onClick={guardarMeta} disabled={guardandoMeta} className="btn-primary text-xs py-1">{guardandoMeta?'Guardando...':'Guardar'}</button>
            </div>
          </div>
        )}

        {importMsg && (
          <div className={`mb-4 rounded-xl px-4 py-2 text-xs font-medium flex justify-between ${importMsg.tipo==='ok'?'bg-green-50 text-green-700':'bg-red-50 text-red-600'}`}>
            {importMsg.texto}
            <button onClick={() => setImportMsg(null)}>×</button>
          </div>
        )}

        {/* Tabla */}
        {loading ? (
          <div className="text-center py-6 text-gray-400 text-sm">Cargando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <td className="text-xs text-gray-400 w-24 pb-2"></td>
                  {dias.map((d, i) => (
                    <td key={i} className={`text-center pb-2 ${d.toDateString()===hoy.toDateString()?'text-brand font-bold':'text-gray-500'}`}>
                      <div className="text-xs font-semibold">{DIAS_SEMANA[i]}</div>
                      <div className="text-[10px] text-gray-400">{d.toLocaleDateString('es-MX',{day:'2-digit',month:'short'})}</div>
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
                          {esFuturo ? '—' : v > 0 ? fmt(v) : viajes.filter(vj=>vj.diaSemana===DIAS_LABELS[i]).length>0?'$0':'—'}
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
                    const prog = viajes.filter(vj=>vj.diaSemana===DIAS_LABELS[i]&&vj.estatus==='Programado').length
                    return (
                      <td key={i} className="text-center py-1 px-0.5">
                        <div className={`rounded-lg py-2 text-xs font-bold ${esFuturo?'bg-gray-50 text-gray-300':v>0?'bg-blue-50 text-brand':prog>0?'bg-blue-50 text-blue-300':'bg-gray-50 text-gray-300'}`}>
                          {esFuturo?'—':v>0?v:prog>0?`(${prog})`:'—'}
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

        {!loading && viajes.length===0 && (
          <p className="text-center text-xs text-gray-400 pt-3">Sin viajes · Importa el Excel semanal</p>
        )}
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:'Proyección diaria', val:fmt(proyeccionDiaria), sub:`Meta: ${fmt(meta.diaria)}` },
          { label:'Proyección semanal', val:fmt(proyeccionSemanal), sub:`Meta: ${fmt(meta.semanal)}` },
          { label:'Avance vs meta', val:`${pctMeta.toFixed(1)}%`, sub: null, pct: pctMeta },
          { label: faltaMeta===0?'Meta lograda':'Falta para meta', val: faltaMeta===0?'Lograda':fmt(faltaMeta), sub:`${totalViajes} viajes efectivos` },
        ].map((s,i) => (
          <div key={i} className="card p-4">
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            <p className={`text-lg font-bold ${i===2?(pctMeta>=100?'text-green-600':pctMeta>=70?'text-amber-500':'text-red-500'):'text-gray-800'}`}>{s.val}</p>
            {s.pct !== undefined && (
              <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1.5">
                <div className={`h-1.5 rounded-full ${s.pct>=100?'bg-green-500':s.pct>=70?'bg-amber-400':'bg-red-400'}`} style={{width:`${s.pct}%`}} />
              </div>
            )}
            {s.sub && <p className="text-[10px] text-gray-400 mt-0.5">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Lista viajes */}
      {viajes.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">Viajes de la semana ({viajes.length})</p>
            <div className="flex gap-2">
              {['Entregado','En tránsito','Programado','Cancelado'].map(e => (
                <span key={e} className={`text-[10px] px-2 py-0.5 rounded-full ${e==='Entregado'?'bg-green-50 text-green-700':e==='En tránsito'?'bg-amber-50 text-amber-700':e==='Programado'?'bg-blue-50 text-brand':'bg-red-50 text-red-600'}`}>
                  {e}: {viajes.filter(v=>v.estatus===e).length}
                </span>
              ))}
            </div>
          </div>
          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
            {viajes.map(v => (
              <div key={v.id}>
                {/* Fila normal */}
                {editandoViaje !== v.id ? (
                  <div className="px-5 py-2.5 flex items-center gap-4 hover:bg-gray-50 group">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${v.estatus==='Entregado'?'bg-green-400':v.estatus==='En tránsito'?'bg-amber-400':v.estatus==='Programado'?'bg-blue-400':'bg-red-300'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{v.cliente}</p>
                      <p className="text-[10px] text-gray-400">{v.origen} → {v.destino} · {v.diaSemana}</p>
                    </div>
                    <span className="text-[10px] bg-blue-50 text-brand px-1.5 py-0.5 rounded shrink-0">{v.tipoServicio}</span>
                    <span className={`text-xs font-bold shrink-0 w-20 text-right ${v.ingresoMXN>0?'text-gray-700':'text-gray-300'}`}>
                      {v.ingresoMXN>0?fmt(v.ingresoMXN):'—'}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${v.estatus==='Entregado'?'bg-green-50 text-green-700':v.estatus==='En tránsito'?'bg-amber-50 text-amber-700':v.estatus==='Programado'?'bg-blue-50 text-brand':'bg-red-50 text-red-500'}`}>
                      {v.estatus}
                    </span>
                    <button
                      onClick={() => { setEditandoViaje(v.id); setViajeEdit({ ingresoMXN: v.ingresoMXN, estatus: v.estatus, cliente: v.cliente, tipoServicio: v.tipoServicio, notas: v.notas||'' }) }}
                      className="opacity-0 group-hover:opacity-100 text-[10px] text-brand hover:underline shrink-0 transition-opacity"
                    >
                      Editar
                    </button>
                  </div>
                ) : (
                  /* Fila en edición */
                  <div className="px-5 py-3 bg-blue-50 border-l-2 border-brand space-y-2">
                    <div className="grid grid-cols-4 gap-2">
                      <div className="col-span-2">
                        <label className="block text-[10px] text-gray-500 mb-0.5">Cliente</label>
                        <input className="input text-xs py-1" value={viajeEdit.cliente} onChange={e=>setViajeEdit(d=>({...d,cliente:e.target.value}))} />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-0.5">Ingreso MXN</label>
                        <input type="number" className="input text-xs py-1" value={viajeEdit.ingresoMXN} onChange={e=>setViajeEdit(d=>({...d,ingresoMXN:e.target.value}))} placeholder="0" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-0.5">Estatus</label>
                        <select className="input text-xs py-1" value={viajeEdit.estatus} onChange={e=>setViajeEdit(d=>({...d,estatus:e.target.value}))}>
                          <option>Programado</option>
                          <option>En tránsito</option>
                          <option>Entregado</option>
                          <option>Cancelado</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={()=>eliminarViaje(v.id)} className="text-[10px] text-red-400 hover:text-red-600 px-2 py-1 rounded">Eliminar</button>
                      <button onClick={()=>setEditandoViaje(null)} className="text-[10px] btn-secondary py-1 px-3">Cancelar</button>
                      <button onClick={guardarViaje} disabled={guardandoViaje} className="text-[10px] btn-primary py-1 px-3">
                        {guardandoViaje?'Guardando...':'Guardar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Dashboards por rol ────────────────────────────────────────────────────────
function DashboardVentas({ perfil }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Buen día, {perfil?.nombre?.split(' ')[0]||'vendedor'} 👋</h1>
          <p className="text-sm text-gray-500">Semana en curso</p>
        </div>
        <Link to="/embarques/nuevo" className="btn-primary">+ Nuevo embarque</Link>
      </div>
      <TablaSemanal rol="ventas" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Acciones rápidas</h2>
          <div className="space-y-2">
            <Link to="/embarques/nuevo" className="btn-primary w-full justify-center">+ Nuevo embarque</Link>
            <Link to="/embarques" className="btn-secondary w-full justify-center">Ver mis embarques</Link>
            <Link to="/pricing" className="btn-secondary w-full justify-center">Ver unidades disponibles</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function DashboardOperaciones({ perfil }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Buen día, {perfil?.nombre?.split(' ')[0]||'usuario'} 👋</h1>
        <p className="text-sm text-gray-500">Resumen operativo</p>
      </div>
      <TablaSemanal rol="operaciones" />
      <div className="card p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Acciones rápidas</h2>
        <div className="space-y-2">
          <Link to="/operaciones" className="btn-primary w-full justify-center">Ver board de operaciones</Link>
          <Link to="/embarques" className="btn-secondary w-full justify-center">Buscar embarque</Link>
        </div>
      </div>
    </div>
  )
}

function DashboardPricing({ perfil }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Buen día, {perfil?.nombre?.split(' ')[0]||'usuario'} 👋</h1>
        <p className="text-sm text-gray-500">Resumen de pricing</p>
      </div>
      <TablaSemanal rol="pricing" />
      <div className="card p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Acciones rápidas</h2>
        <div className="space-y-2">
          <Link to="/pricing" className="btn-primary w-full justify-center">Ver disponibilidad de unidades</Link>
          <Link to="/pricing" className="btn-secondary w-full justify-center">Cotizador interno</Link>
        </div>
      </div>
    </div>
  )
}

function DashboardAdmin({ perfil }) {
  const [stats, setStats] = useState({ total:0, activos:0, criticos:0, porFacturar:0 })
  const [recientes, setRecientes] = useState([])

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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Buen día, {perfil?.nombre?.split(' ')[0]||'Admin'} 👋</h1>
        <p className="text-sm text-gray-500">{new Date().toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'})}</p>
      </div>

      {/* Tabla semanal — admin puede editar meta */}
      <TablaSemanal rol="admin" />

      {/* KPIs operativos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {label:'Total embarques',val:stats.total,color:'text-brand',bg:'bg-blue-50'},
          {label:'Activos',val:stats.activos,color:'text-green-600',bg:'bg-green-50'},
          {label:'Críticos / Urgentes',val:stats.criticos,color:'text-red-500',bg:'bg-red-50'},
          {label:'Por facturar',val:stats.porFacturar,color:'text-amber-500',bg:'bg-amber-50'},
        ].map(s=>(
          <div key={s.label} className="card p-4">
            <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center mb-2`}>
              <span className={`text-lg font-bold ${s.color}`}>{s.val}</span>
            </div>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Acciones rápidas</h2>
          <div className="space-y-2">
            <Link to="/operaciones" className="btn-primary w-full justify-center">Board de operaciones</Link>
            <Link to="/embarques" className="btn-secondary w-full justify-center">Ver todos los embarques</Link>
            <Link to="/admin/usuarios" className="btn-secondary w-full justify-center">Gestionar usuarios</Link>
          </div>
        </div>
        <div className="card p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Embarques recientes</h2>
          {recientes.length===0?<p className="text-sm text-gray-400">Sin embarques aún.</p>:
            <div className="space-y-2">
              {recientes.map(e=>(
                <Link key={e.id} to={`/embarques/${e.id}`} className="flex items-center justify-between py-1.5 border-b border-gray-50 hover:bg-gray-50 px-1 rounded">
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

export default function Dashboard() {
  const { perfil } = useAuth()
  const rol = perfil?.rol || 'ventas'
  if (rol === 'ventas') return <DashboardVentas perfil={perfil} />
  if (rol === 'admin') return <DashboardAdmin perfil={perfil} />
  if (rol === 'operaciones') return <DashboardOperaciones perfil={perfil} />
  if (rol === 'pricing') return <DashboardPricing perfil={perfil} />
  return <DashboardAdmin perfil={perfil} />
}
