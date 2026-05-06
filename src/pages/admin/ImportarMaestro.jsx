
import { useState, useRef } from 'react'
import { collection, addDoc, serverTimestamp, writeBatch, doc } from 'firebase/firestore'
import { db } from '../../firebase'
import * as XLSX from 'xlsx'

const TIPO_MAP = { 'CONGE':'ref','REFRI':'ref','SECO':'ftl','FRESCO':'ref','COMBINADO':'ref' }
const ETAPA_MAP = { 'DESCARGADO':'entregado','PROGRAMADO':'creado','EN TRANSITO':'transito','EN TRÁNSITO':'transito' }

function parseTarifa(val) {
  if (!val) return 0
  try { return parseFloat(String(val).replace(/[$,\s]/g,'')) || 0 } catch { return 0 }
}

function fmtFecha(f, h) {
  if (!f) return ''
  try {
    let base = ''
    if (f instanceof Date) base = f.toISOString().slice(0,10)
    else if (typeof f === 'string') base = f.slice(0,10)
    else return ''
    let hora = '08:00'
    if (h) {
      const hs = String(h).trim().slice(0,5)
      if (/\d{1,2}:\d{2}/.test(hs)) hora = hs
    }
    return `${base}T${hora}`
  } catch { return '' }
}

export default function ImportarMaestro() {
  const [preview, setPreview] = useState([])
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [msg, setMsg] = useState(null)
  const fileRef = useRef()

  const procesarExcel = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setMsg(null); setResultado(null)
    try {
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data)
      const ws = wb.Sheets['PROGRAMACION'] || wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      
      // Encontrar la fila de headers (tiene 'VIAJE' en col A)
      let headerIdx = rows.findIndex(r => String(r[0]).trim().toUpperCase() === 'VIAJE')
      if (headerIdx === -1) headerIdx = 1

      const dataRows = rows.slice(headerIdx + 1).filter(r => r[0] && !isNaN(Number(r[0])))
      
      const embarques = dataRows.map(r => {
        const tipoRaw = String(r[3] || 'SECO').trim().toUpperCase()
        let categoria = TIPO_MAP[tipoRaw] || 'ftl'
        const estatusRaw = String(r[17] || 'PROGRAMADO').trim().toUpperCase()
        return {
          folio: `DT-${r[0]}`,
          cp_gm: String(r[1] || ''),
          cliente: String(r[6] || '').trim(),
          proveedor_nombre: String(r[5] || '').trim(),
          categoria,
          cp_temp: String(r[4] || '') !== 'N/A' ? String(r[4] || '') : '',
          origenNombre: String(r[8] || '').trim(),
          destinoNombre: String(r[9] || '').trim(),
          fechaCarga: fmtFecha(r[10], r[12]),
          fechaETA: fmtFecha(r[14], r[15]),
          lugarCarga: String(r[18] || '').trim(),
          lugarDescarga: String(r[20] || '').trim(),
          op_nombre: String(r[21] || '').trim(),
          economicoT: String(r[22] || ''),
          placasTractor: String(r[23] || '').trim(),
          economicoC: String(r[24] || ''),
          op_placas: String(r[25] || '').trim(),
          op_tel: String(r[26] || '').trim(),
          costo_flete: parseTarifa(r[31]),
          costo_proveedor: parseTarifa(r[32]),
          etapa: ETAPA_MAP[estatusRaw] || 'creado',
          prioridad: 'normal',
          _importado: true,
          _demo: false,
        }
      }).filter(e => e.cliente && e.folio !== 'DT-')

      setPreview(embarques.slice(-50)) // últimos 50
    } catch(err) {
      console.error(err)
      setMsg({ tipo:'error', texto:'Error al leer el archivo. Verifica que sea el maestro correcto.' })
    }
    fileRef.current.value = ''
  }

  const importar = async (soloRecientes = true) => {
    const embarques = soloRecientes
      ? preview.filter(e => ['creado','transito'].includes(e.etapa))
      : preview
    
    if (embarques.length === 0) {
      setMsg({ tipo:'error', texto:'No hay embarques para importar con ese filtro.' })
      return
    }

    setImportando(true)
    setMsg(null)
    let ok = 0; let err = 0
    
    try {
      // Importar en batches de 400
      const BATCH_SIZE = 400
      for (let i = 0; i < embarques.length; i += BATCH_SIZE) {
        const chunk = embarques.slice(i, i + BATCH_SIZE)
        const batch = writeBatch(db)
        chunk.forEach(e => {
          const ref = doc(collection(db, 'embarques'))
          batch.set(ref, { ...e, createdAt: serverTimestamp() })
        })
        await batch.commit()
        ok += chunk.length
      }
      setResultado({ ok, err })
      setMsg({ tipo:'ok', texto:`✅ ${ok} embarques importados correctamente al SOL` })
      setPreview([])
    } catch(e) {
      console.error(e)
      setMsg({ tipo:'error', texto:'Error al importar: ' + e.message })
    } finally { setImportando(false) }
  }

  const ETAPA_COLOR = { entregado:'bg-green-50 text-green-700', creado:'bg-blue-50 text-brand', transito:'bg-amber-50 text-amber-700' }

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Importar maestro de operaciones</h1>
        <p className="text-sm text-gray-500">Carga el archivo Excel maestro para importar embarques históricos y activos al SOL</p>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium flex justify-between ${msg.tipo==='ok'?'bg-green-50 text-green-700':'bg-red-50 text-red-600'}`}>
          {msg.texto}<button onClick={()=>setMsg(null)}>×</button>
        </div>
      )}

      {/* Upload */}
      <div className="card p-6 text-center border-2 border-dashed border-gray-200 hover:border-brand transition-colors cursor-pointer" onClick={()=>fileRef.current?.click()}>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={procesarExcel} />
        <p className="text-3xl mb-2">📊</p>
        <p className="text-sm font-medium text-gray-700">Selecciona el archivo maestro de operaciones</p>
        <p className="text-xs text-gray-400 mt-1">Debe tener la hoja "PROGRAMACION" con las columnas del maestro</p>
        <button className="btn-primary mt-4 inline-flex">Seleccionar archivo</button>
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-700">{preview.length} embarques detectados (últimos 50)</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Programados/En tránsito: <strong className="text-brand">{preview.filter(e=>['creado','transito'].includes(e.etapa)).length}</strong> · 
                Entregados: <strong className="text-gray-600">{preview.filter(e=>e.etapa==='entregado').length}</strong>
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>importar(true)} disabled={importando} className="btn-primary text-xs">
                {importando ? '⏳ Importando...' : `📥 Importar solo activos (${preview.filter(e=>['creado','transito'].includes(e.etapa)).length})`}
              </button>
              <button onClick={()=>importar(false)} disabled={importando} className="btn-secondary text-xs">
                Importar todos ({preview.length})
              </button>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase grid grid-cols-7 gap-2">
              <span className="col-span-1">Folio / CP</span>
              <span className="col-span-2">Cliente</span>
              <span className="col-span-1">Ruta</span>
              <span className="col-span-1">Proveedor</span>
              <span className="col-span-1">Tarifa</span>
              <span className="col-span-1">Etapa</span>
            </div>
            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {preview.map((e, i) => (
                <div key={i} className="px-5 py-2 grid grid-cols-7 gap-2 items-center hover:bg-gray-50">
                  <div className="col-span-1">
                    <p className="text-[10px] font-bold text-gray-800">{e.folio}</p>
                    {e.cp_gm && <p className="text-[9px] text-gray-400">CP: {e.cp_gm}</p>}
                  </div>
                  <p className="col-span-2 text-xs font-medium text-gray-700 truncate">{e.cliente}</p>
                  <p className="col-span-1 text-[10px] text-gray-500">{e.origenNombre}→{e.destinoNombre}</p>
                  <p className="col-span-1 text-[10px] text-gray-500 truncate">{e.proveedor_nombre}</p>
                  <p className="col-span-1 text-xs font-medium text-gray-700">${e.costo_flete.toLocaleString('es-MX')}</p>
                  <span className={`col-span-1 text-[10px] px-2 py-0.5 rounded-full font-medium w-fit ${ETAPA_COLOR[e.etapa]||'bg-gray-100 text-gray-600'}`}>
                    {e.etapa}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-brand">
            <p className="font-medium mb-1">💡 Recomendación para la demo</p>
            <p>Importa solo los activos (Programados + En tránsito). Los Descargados son historial — se pueden importar después. Los embarques activos aparecerán de inmediato en el Board de Operaciones.</p>
          </div>
        </div>
      )}
    </div>
  )
}
