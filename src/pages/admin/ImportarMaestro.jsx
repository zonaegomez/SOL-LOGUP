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

  const [importandoProv, setImportandoProv] = useState(false)
  const [resultadoProv, setResultadoProv] = useState(null)

  const importarProveedores = async () => {
    setImportandoProv(true)
    setResultadoProv(null)
    try {
      const proveedores = [{"nombre": "ADRIAN GONZALEZ GIL", "contacto": "ARNULFO BECERRA HERNANDEZ", "tel": "5549239362", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["OBREGON - CDMX", "MTY - LEON", "MTY - GDL", "MTY - PUEBLA", "MTY - TORREON", "MTY - CDMX", "ALLENDE - CDMX"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "ADRIANA GIL MENDOZA (HGM)", "contacto": "NICOLAS VALDEZ", "tel": "55 8699 5135", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["GDL - CDMX", "MTY - QUERETARO", "CDMX - MERIDA-CANCUN", "MTY - CDMX", "QRO - CDMX", "CDMX - MERIDA", "CDMX - CDMX", "MTY - MTY", "MTY - CHIHUAHUA", "TOLUCA - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "AGUIRRE ALANIS REFRI", "contacto": "BRYAN VISUET", "tel": "55-8280-5290", "email": "", "unidades": ["Termo conge/Seco"], "rutas": ["MTY - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "ALBERTO CERVANTES GIL (ALEF)", "contacto": "FRANCISCO SANCHEZ", "tel": "222 128 7557", "email": "", "unidades": ["Caja refrigerada", "Caja seca"], "rutas": ["CHINAMECA - MTY", "MTY - CDMX", "PUEBLA - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "ANABELLA GTZ(AGP)", "contacto": "JESUS SALDA A", "tel": "8131350654", "email": "", "unidades": ["Caja seca"], "rutas": ["MTY - LINARES"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "ANGEL RODRIGUEZ HDZ (ALEF)", "contacto": "JUAN CARRETA FIGUEROA", "tel": "937 1089 972", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["CHINAMECA - GDL", "GDL - CDMX", "MTY - CDMX", "TORREON - QRO", "CHINAMECA - TOLUCA", "CDMX - CDMX", "CDMX - TORREON", "MTY - MTY", "TOLUCA - MTY", "MTY - NUEVA ROSITA"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "ANGEL VELAZQUEZ FIGUEROA", "contacto": "VICTOR AGUA SALITRE", "tel": "56 1063 6398", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["GDL - CDMX", "CDMX - LERMA", "MTY - QUERETARO", "MTY - CDMX", "CDMX - TEPEJI", "CDMX - CDMX", "CDMX - IRAPUATO", "SLP - TEPEJI", "MTY - MTY", "TOLUCA - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "ARELY ORTEGA", "contacto": "CAMIONETA 3.5", "tel": "LOG-UP", "email": "", "unidades": [], "rutas": ["MTY - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "ARMANDO SALAS", "contacto": "MARTIN GALVAN MARTINEZ", "tel": "81 1538 7850", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["MTY - TIJUANA", "MTY - OBREGON", "MTY - HERMOSILLO"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "ARNOLDO SALAZAR", "contacto": "EMILIO SARMIENTO", "tel": "232 197 4252", "email": "", "unidades": ["Caja seca"], "rutas": ["CHINAMECA - MTY", "MTY - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "ARTEMIO BUSTAMANTE", "contacto": "SERGIO CONTRERAS", "tel": "PTE", "email": "", "unidades": ["Caja seca"], "rutas": ["ALLENDE - TLAJOMULCO", "MTY - MTY", "MTY - JALISCO", "MTY - IRAPUATO", "MTY - NUEVA ROSITA", "IRAPUATO/QUERETARO - QUERETARO/IRAPUATO", "MTY - SALTILLO", "MTY - GDL", "MTY - QRO", "MTY - LINARES"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "AUTO EXPRESS 3+1", "contacto": "CORNELIO HERNANDEZ", "tel": "296 964 1873", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["CHINAMECA - MTY", "CHINAMECA - GDL", "MCALLEN - MTY", "MTY - MERIDA", "ALTAMIRA - SALTILLO", "MTY - VILLAHERMOSA", "MTY - COATZACOALCOS", "MTY - ALTAMIRA", "MERIDA - MTY", "ALTAMIRA - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "AUTO EXPRESS MONARCA", "contacto": "JORGE PEQUE O", "tel": "PTE", "email": "", "unidades": ["Caja seca", "Termo conge/Seco"], "rutas": ["MTY - MTY", "MTY - JALISCO", "MTY - IRAPUATO", "MTY - CHIHUAHUA", "MTY - RIO BRAVO", "TORREON - VILLAHERMOSA", "MTY - TORREON", "MTY - CDMX", "MTY - DR. GZZ", "CDMX - NUEVO LAREDO"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "AUTO EXXPRES 45", "contacto": "HUMBERTO SOTO  SANCHEZ", "tel": "pte", "email": "", "unidades": ["Caja refrigerada", "Caja seca"], "rutas": ["CHINAMECA - MTY", "MTY - COATZACOALCOS"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "AUTO TRANSPORTES VERGARA", "contacto": "OMAR AVILA HERNANDEZ", "tel": "PTE", "email": "", "unidades": [], "rutas": ["VERACRUZ - QUERETARO"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "AUTOEXPRESS RS", "contacto": "JORGE INES RAGA GOMEZ", "tel": "836 134 5492", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["CHINAMECA - GDL", "MTY - MONCLOVA", "MTY - NAYARIT", "MTY - MAZATLAN", "MTY - MTY", "ALTAMIRA - TULANCINGO", "MTY - CHIHUAHUA", "MTY - VILLAHERMOSA", "MTY - NUEVA ROSITA", "ALTAMIRA - TORREON"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "BENJAMIN FIGUEROA", "contacto": "BENJAMIN FIGUEROA", "tel": "55 4324 5732", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["MTY - MTY", "TOLUCA - CDMX", "CDMX - TEPEJI", "CDMX - MTY", "CDMX - CDMX"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "BERTHA ALICIA AGUILAR (TRC)", "contacto": "ALFONSO TREVI O", "tel": "81 1051 0930", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["MTY - DURANGO", "MTY - TIJUANA", "MTY - OBREGON", "MTY - HERMOSILLO"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "CC TRUKING", "contacto": "JESUS CARRILLO", "tel": "81 2480 6051", "email": "", "unidades": ["Caja refrigerada"], "rutas": ["TORRE N - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "CECILIA HUITZIL MENDOZA", "contacto": "ANTONIO TEPALE MU OZ", "tel": "222 536 1034", "email": "", "unidades": ["Caja seca"], "rutas": ["MTY - PUEBLA"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "CESAR AGUSTO MEDINA", "contacto": "LOMBARDO MEDINA", "tel": "81 8179 0802", "email": "", "unidades": ["Caja seca"], "rutas": ["MTY - MTY", "MTY - DR. GZZ", "MTY - PUEBLA"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "CHANO REFRIGERADOS", "contacto": "CARLOS CORTEZ", "tel": "81 8463 1060", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["MTY - MTY", "SALTILLO - MTY", "MTY - MONTEMORELOS", "MTY - PIEDRAS NEGRAS", "MTY - SALTILLO", "PIEDRAS N - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "CORPORATIVO EXPRESS RIVAS", "contacto": "RICARDO MEDINA", "tel": "", "email": "", "unidades": ["Caja seca", "Termo conge/Seco"], "rutas": ["MTY - CDMX"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "CREEA MEXICO", "contacto": "VICTOR ISRAEL ROMERO ARROYO", "tel": "8671573732", "email": "", "unidades": ["Caja seca"], "rutas": ["PUEBLA - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "DAMARIS ZAMORA (DZ TRUCKING)", "contacto": "JAVIER SAUL ZAMORA", "tel": "56 4986 7939", "email": "", "unidades": ["Caja seca"], "rutas": ["MTY - CDMX"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "DANIEL EMILIANO TORRES CHERETTI", "contacto": "FERNANDO PARRA MARIN", "tel": "962 699 7178", "email": "", "unidades": ["Caja refrigerada", "Caja seca"], "rutas": ["CHINAMECA - MTY", "MTY - MERIDA"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "DIEGO ALEJANDRO AGUIRRE LEAL", "contacto": "ALBERTO DIAZ CADENA", "tel": "8261272869", "email": "", "unidades": ["Caja refrigerada", "Termo conge/Seco"], "rutas": ["CHINAMECA - MTY", "ALTAMIRA - MONCLOVA", "ALTAMIRA - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "DIEGO URIEL GUERRERO (DUGUER)", "contacto": "JUAN MENDEZ MOLINA", "tel": "2321257609", "email": "", "unidades": ["Caja refrigerada", "Termo conge/Seco"], "rutas": ["MCALLEN - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "DLG EXPRESS", "contacto": "ALFONSO HERNANDEZ GARCIA", "tel": "2295258951", "email": "", "unidades": ["Caja seca", "Termo conge/Seco"], "rutas": ["MTY - DURANGO", "ALTAMIRA - DURANGO", "ALTAMIRA - TORREON", "ALTAMIRA - MTY", "MTY - CD VICTORIA", "MTY - LINARES", "MTY - TORREON"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "DUGUER LOGISTIC", "contacto": "JUAN MENDEZ MOLINA", "tel": "2321257609", "email": "", "unidades": ["Termo conge/Seco"], "rutas": ["MCALLEN - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "EDGAR FRANCO", "contacto": "GUADALUPE SANDOVAL", "tel": "9241238893", "email": "", "unidades": ["Caja seca"], "rutas": ["MTY - GDL", "MTY - CDMX", "MTY - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "EDSON QUEZADA(CONEQTA)", "contacto": "AGUSTIN QUEZADA DIMAS", "tel": "55 3925 5702", "email": "", "unidades": ["Caja seca"], "rutas": ["MTY - CDMX"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "ELCOM", "contacto": "GERMAN VARGAS OSORNIO", "tel": "33 1998 6579", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["GDL - GDL", "CDMX - GDL", "CDMX - TORREON", "TORRE N - GDL", "MTY - LEON", "TORRE N - CDMX", "MTY - GDL", "MTY - TORREON", "MTY - CDMX", "CDMX - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "ELENA RDZ", "contacto": "LILIANA OLVERA", "tel": "81 8024 5168", "email": "", "unidades": ["Caja seca"], "rutas": ["MTY - TORREON"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "ELMA DANIELA GUZMAN (A G2)", "contacto": "HELIAM CAVAZOS TREVI O", "tel": "8353210869", "email": "", "unidades": ["Caja refrigerada", "Termo conge/Seco"], "rutas": ["CHINAMECA - MTY", "ALTAMIRA - GDL", "ALTAMIRA - TORREON", "ABASOLO - MTY", "ALTAMIRA - ALLENDE"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "ESPRODEL", "contacto": "MARIO ALBERTO ACEVEDO", "tel": "81 1184 2305", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["CDMX - SALTILLO", "TORREON - MTY", "GDL - CDMX", "TORREON - QUERETARO", "MTY - CDMX", "CHIHUAHUA - CDMX", "MTY - MTY", "ALTAMIRA - SANTIAGO PAPASQUIARO", "MTY - TOLUCA", "MTY - GDL"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "EXPRESS 131", "contacto": "ISAEL ALAMEDA RODILES", "tel": "8261142313", "email": "", "unidades": ["Caja seca"], "rutas": ["CHINAMECA - MTY", "MTY - CD JUAREZ"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "EXPRESS BOLA TRUCKING", "contacto": "JONATHAN SILVESTRE RODRIGUEZ", "tel": "1 81 1915 4177", "email": "", "unidades": [], "rutas": ["MTY - QRO"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "EXPRESS GRS", "contacto": "JUAN CARLOS MENDEZ", "tel": "271 153 2571", "email": "", "unidades": ["Caja seca"], "rutas": ["CHINAMECA - MTY", "MTY - COATZACOALCOS"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "EXPRESS OCA", "contacto": "JESUS ELIZONDO", "tel": "826 116 9921", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["TORRE N - MTY", "TORREON - MTY", "MTY - HERMOSILLO", "TORRE N - GDL", "MTY - ALTAMIRA", "MTY - GDL", "GDL - MONTEMORELOS", "GDL - OBREGON", "MTY - OBREGON", "MTY - MOCHIS"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "FARCO LOGISTICS", "contacto": "CESAR LEOBARDO TELLO CORDERO", "tel": "8119919245", "email": "", "unidades": ["Caja seca"], "rutas": ["MTY - GDL"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "FATIMA DAMARIS", "contacto": "JAIR ALVAREZ", "tel": "81 2770 2390", "email": "", "unidades": ["Caja seca"], "rutas": ["MTY - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "FATIMA VILLAREAL FLORES", "contacto": "JAIR DE JESUS ALVAREZ", "tel": "81 2770 2390", "email": "", "unidades": ["Caja seca"], "rutas": ["MTY - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "FG LOGISTICS", "contacto": "CESAR URIEL LUNA", "tel": "87 1484 0889", "email": "", "unidades": ["Caja seca"], "rutas": ["CDMX - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "FLETES GUADALAJARA", "contacto": "ENRIQUE CHAVEZ V", "tel": "33 3576 8117", "email": "", "unidades": ["Caja seca"], "rutas": ["MTY - GDL", "MTY - AGUASCALIENTES", "ALLENDE - TLAJOMULCO"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "FLETES LICOSA", "contacto": "MARIO LOPEZ", "tel": "81 2876 2053", "email": "", "unidades": ["Caja refrigerada"], "rutas": ["MTY - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "GERARDO SUAREZ (TRN)", "contacto": "FAUSTO CASTILLO HERNANDEZ", "tel": "8182562913", "email": "", "unidades": ["Caja refrigerada", "Termo conge/Seco"], "rutas": ["ALTAMIRA - MTY", "MCALLEN - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "GRACIELA SALINAS (CHERETTI)", "contacto": "FELIPE DE JESUS MARTINEZ", "tel": "232 321 8693", "email": "", "unidades": ["Caja seca"], "rutas": ["MTY - MERIDA", "MTY - COATZACOALCOS", "MTY - GDL", "MTY - PUEBLA", "MTY - CULIACAN"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "GRUPO SYNC", "contacto": "JUAN J ZAVALA AGUIRRE", "tel": "55 8559 9764", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["CHINAMECA - MTY", "TORRE N - MTY", "MTY - HERMOSILLO", "MTY - MTY", "TORRE N - GDL", "MTY - CHIHUAHUA", "TOLUCA - MTY", "TORRE N - CDMX", "MTY - NUEVA ROSITA", "GDL - MONTEMORELOS"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "GRUPO TRANSPO LA FLORIDA", "contacto": "EDUARDO CARLOS ROMERO SALADO", "tel": "N/A", "email": "", "unidades": ["Caja refrigerada"], "rutas": ["GDL - CDMX"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "GUADALUPE TORRES PIZARRO", "contacto": "ENRIQUE TORRES PIZARRO", "tel": "639 1218272", "email": "", "unidades": ["Caja seca"], "rutas": ["MTY - CHIHUAHUA"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "HECTOR CRUZ", "contacto": "BENJAMIN QUIROZ", "tel": "81 1260 5043", "email": "", "unidades": ["Termo conge/Seco"], "rutas": ["MTY - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "IGNACIO TAMEZ", "contacto": "LUIS ALBERTO CERVANTES", "tel": "8261004858", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["MTY - TIJUANA", "MTY - HERMOSILLO", "MTY - CHIHUAHUA", "OBREGON - TIJUANA", "MTY - OBREGON", "MTY - MOCHIS", "MTY - MEXICALI", "MTY - MAZATLAN", "MTY - CULIACAN"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "INTOPSA MEXICO", "contacto": "KEVIN HANS PIZA A", "tel": "5539249517", "email": "", "unidades": ["Caja refrigerada"], "rutas": ["GDL - CDMX"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "ISI CAROLINA CHAPA", "contacto": "NOE VELEZ CEDILLO", "tel": "81 1123 3756", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["MTY - PICSA", "MTY - NUEVA ROSITA", "MTY - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "JESUS EDUARDO PERALES", "contacto": "JULIO CESAR CAMPOS", "tel": "81 4187 4797", "email": "", "unidades": ["Caja seca"], "rutas": ["MTY - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "JESUS MA.TAMEZ", "contacto": "MIGUEL FLORES", "tel": "82 62620 486", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["CHINAMECA - MTY", "CHINAMECA - GDL", "MTY - TIJUANA", "MTY - CD JUAREZ", "MTY - VILLAHERMOSA", "VERACRUZ - SALAMANCA"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "JONATAN ALAN GALVAN", "contacto": "OMAR ISRAEL CARRILLO VAZQUEZ", "tel": "656 657 4401", "email": "", "unidades": ["Caja seca"], "rutas": ["MTY - CDMX"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "JONATHAN ALAN GALVAN", "contacto": "VICTOR ELIU SANCHEZ MARTINEZ", "tel": "2492422013", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["MTY - CDMX", "QRO - CDMX", "CDMX - CDMX", "CDMX - TORREON", "ALTAMIRA - TULANCINGO", "MTY - IRAPUATO", "MTY - GDL", "PENJAMO - CDMX", "ALLENDE - CDMX", "IRAPUATO - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "JORGE GARZA", "contacto": "JUAN SERGIO PEREZ ZU IGA", "tel": "8138482168", "email": "", "unidades": ["Caja refrigerada", "Termo conge/Seco"], "rutas": ["MTY - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "JORGE LUIS GARZA GARZA", "contacto": "PABLO SIMON GARZA MENDOZA", "tel": "8118032973", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["FER - MTY", "MTY - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "JOSE EUTIMIO SERRANO", "contacto": "CRISTIAN HERNANDEZ", "tel": "55 6455 0275", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["CHIHUAHUA - CDMX", "CDMX - TORREON", "MTY - MTY", "TORRE N - GDL", "TORREON - GDL", "CHINAMECA - CDMX", "TORRE N - CDMX", "CDMX - CANC N", "CDMX - MTY", "MTY - GDL"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "JOSE JUAN LOPEZ (4HERMANOS)", "contacto": "JOSE JUAN LOPEZ MENDOZA", "tel": "8261277602", "email": "", "unidades": ["Termo conge/Seco"], "rutas": ["MTY - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "JUAN GUILLERMO CALDERON (ESTGKS)", "contacto": "JORGE GUTIERREZ ALVAREZ", "tel": "449 106 8897", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["CDMX - SALTILLO", "CDMX - GDL", "AGUASCALIENTES - MTY", "CDMX - AGUASCALIENTES", "MTY - LEON", "TORRE N - CDMX", "MTY - GDL", "MTY - CDMX", "GDL - MTY", "MTY - AGUASCALIENTES"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "JUAN MANUEL RAMOS (RAMDA)", "contacto": "CESAR NU EZ", "tel": "629 521 4444", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["TORREON - MTY", "MTY - CD JUAREZ", "MTY - DURANGO", "MTY - CHIHUAHUA", "MTY - LAGUNA", "CHIHUAHUA - MTY", "MTY - TORREON", "MTY - CULIACAN"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "JULIO ORTEGA", "contacto": "JESUS TADEO GARZA", "tel": "81 8658 1356", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["MONTEMORELOS - MTY", "MTY - MTY", "ALLENDE - MTY", "MTY - NUEVA ROSITA", "TOLUCA - CDMX", "CADEREYTA - MTY", "MTY - ALLENDE", "MTY - CDMX", "CDMX - CDMX"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "KARLA ROBLES (TVR)", "contacto": "EDGAR EZEQUIEL LE N GALARZA", "tel": "81 1691 6308", "email": "", "unidades": ["Caja seca"], "rutas": ["MTY - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "LEAL MOLINA JAVIER", "contacto": "ABEL MARTINEZ", "tel": "8138459358", "email": "", "unidades": ["Caja seca"], "rutas": ["MTY - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "LOBOC", "contacto": "JUAN VALADEZ", "tel": "33 3171 4929", "email": "", "unidades": ["Caja seca", "Termo conge/Seco"], "rutas": ["MTY - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "LOGISTICA EF", "contacto": "ENRIQUE BAUTISTA PEREZ", "tel": "81 3141 1318", "email": "", "unidades": ["Caja refrigerada", "Termo conge/Seco"], "rutas": ["MTY - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "LOGISTICS CAMPEL", "contacto": "MARIO ALBERTO LOPEZ CAMPOS", "tel": "8118219156", "email": "", "unidades": ["Caja seca"], "rutas": ["MTY - DURANGO", "MTY - SALTILLO", "MTY - CHIHUAHUA", "MTY - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "LUIS ALBERTO LEAL AGUIRRE", "contacto": "JOSE HERMINIO HUERTA", "tel": "9933882550", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["CHINAMECA - MTY", "MTY - MERIDA", "MTY - CD JUAREZ", "MTY - MTY", "ALTAMIRA - SALTILLO", "ALTAMIRA - NAYARIT", "MTY - NUEVA ROSITA", "MTY - COATZACOALCOS", "MTY - VILLAHERMOSA", "CHINAMECA - CHIHUAHUA"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "LUIS ANGEL MENDEZ", "contacto": "FABIAN ALEJANDRO MONTERO", "tel": "8180860418", "email": "", "unidades": ["Caja seca"], "rutas": ["SALTILLO - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "LUIS ARMANDO CAVAZOS", "contacto": "FRANCISCO BULMARO", "tel": "81 3394 4657", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["CHINAMECA - GDL", "CDMX - SALTILLO", "TORREON - MTY", "GDL - CDMX", "ALTAMIRA - SALTILLO", "MTY - LEON", "ATITALAQUIA - LINARES", "SALTILLO - MTY", "SALTILLO - MONCLOVA", "IRAPUATO - GDL"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "LUIS CARLOS GONZALEZ", "contacto": "ERNESTO RAMIREZ", "tel": "8126584612", "email": "", "unidades": ["Caja seca", "Termo conge/Seco"], "rutas": ["OBREGON - MTY", "MTY - MTY", "ABASOLO - DURANGO", "MTY - DURANGO", "MTY - CHIHUAHUA", "OBREGON - CDMX", "MTY - NUEVA ROSITA", "MTY - OBREGON", "MTY - REYNOSA", "MTY - LINARES"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "MANUEL DE JESUS CVZ (OCA)", "contacto": "FRANCISCO TOBIAS", "tel": "33 3025 1841", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["TORREON - MTY", "MTY - HERMOSILLO", "TORRE N - GDL", "MTY - OBREGON", "MTY - CULIACAN"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "MARIA EVANGELINA RODRIGUEZ", "contacto": "ADOLFO VARGAS CID DEL PRADO", "tel": "826 108 0998", "email": "", "unidades": ["Caja refrigerada", "Termo conge/Seco"], "rutas": ["CHINAMECA - MTY", "OBREGON - CDMX"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "MARISOL ANAYA RANGEL", "contacto": "RAUL HERNANDEZ", "tel": "55 3553 8844", "email": "", "unidades": ["Caja seca"], "rutas": ["MTY - CDMX", "ALLENDE - CDMX"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "MARISOL RUIZ", "contacto": "JOSE RAMON AGUILAR CERINO", "tel": "8120969314", "email": "", "unidades": [], "rutas": ["SALTILLO - MTY", "MTY - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "MARTHA BEATRIZ RODRIGUEZ", "contacto": "AARON EDUARDO LAFUENTE", "tel": "56 5041 6750", "email": "", "unidades": ["Caja seca"], "rutas": ["MTY - CDMX", "CDMX - MTY", "MTY - SLP", "ALLENDE - CDMX"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "MATIAS GUZMAN", "contacto": "LUIS MANZANARES DOMINGUEZ", "tel": "8139707000", "email": "", "unidades": ["Caja seca"], "rutas": ["MTY - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "MIGUEL ANGEL SAMARRON (SAGA)", "contacto": "MARCO ANTONIO SOLIS MONTES", "tel": "8125952795", "email": "", "unidades": ["Caja seca"], "rutas": ["MTY - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "MIRTHA GUADALUPE FLORES", "contacto": "JUNIOR MARTIN GONZALEZ", "tel": "81 3111 2183", "email": "", "unidades": ["Caja seca"], "rutas": ["LINARES - MTY", "MTY - LINARES", "MTY - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "MOCA CARGO", "contacto": "MARTIN BECERRIL", "tel": "55 2972 3150", "email": "", "unidades": ["Caja seca"], "rutas": ["PUEBLA - CDMX"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "NICOLAS ORTIZ(Q&MS)", "contacto": "BERNARDO ESTRADA CORONA", "tel": "", "email": "", "unidades": ["Caja seca"], "rutas": ["MTY - CDMX"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "OM EXPRESS", "contacto": "GIL GARCIA RODRIGUEZ", "tel": "81 1797 0256", "email": "", "unidades": ["Caja seca"], "rutas": ["MTY - TORREON"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "ORLANDO MARTINEZ EXPRESS", "contacto": "OCTAVIO SANCHEZ ORTEGA", "tel": "2221086858", "email": "", "unidades": ["Caja seca"], "rutas": ["MTY - TAMPICO"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "PEDRO RAMIREZ", "contacto": "ELIUD GAONA", "tel": "8186559055", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["MTY - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "POLITRANSPORTES", "contacto": "ABEL SANTIAGO", "tel": "55 3020 4746", "email": "", "unidades": ["Caja seca"], "rutas": ["MTY - MTY", "MTY - GDL", "MTY - CHALCO", "MTY - TORREON", "GDL - MTY", "MTY - CDMX", "CDMX - MTY", "ALLENDE - CDMX"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "PRODUMEX MASTER LOG (PML)", "contacto": "BRANDON ALFREDO BRONDO REYES", "tel": "81 1727 5061", "email": "", "unidades": ["Caja seca", "Termo conge/Seco"], "rutas": ["MCALLEN - MTY", "MTY - MCALLEN"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "RAFAEL GUZMAN CAVAZOS (G2)", "contacto": "ISMAEL FIGEROA GARCIA", "tel": "8115023176", "email": "", "unidades": ["Caja refrigerada"], "rutas": ["CHINAMECA - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "REFRIGERADOS PEREZ", "contacto": "RENE ESPINOZA", "tel": "55 6667 2188", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["CDMX - GDL", "TEPEJI/SLP - SLP/TEPEJI", "GDL - CDMX", "MTY - MTY", "GDL - MONTEMORELOS", "MTY - GDL", "MTY - QUERETARO", "GDL - QUERETARO", "IRAPUATO - CDMX", "QUERETARO - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "REGIOMONTANA DG", "contacto": "FRANCISCO PEREZ BECERRA", "tel": "5545881327", "email": "", "unidades": [], "rutas": ["MANZANILLO - ALLENDE"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "RESIGLEZ", "contacto": "ABRAHAM CASTILLO ORTIZ", "tel": "3311555862", "email": "", "unidades": ["Caja seca"], "rutas": ["MTY - GDL", "MTY - CDMX"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "RICARDO MARCELO M", "contacto": "SAMUEL ALEXIS BASACA RUELAS", "tel": "6624736994", "email": "", "unidades": ["Caja seca", "Termo conge/Seco"], "rutas": ["MTY - TIJUANA", "MTY - CD JUAREZ"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "RODRIGO BALDERAS (RBM)", "contacto": "LUIS CASTELLANO REYES", "tel": "8120114235", "email": "", "unidades": ["Termo conge/Seco"], "rutas": ["MTY - SALTILLO", "ALLENDE - SALTILLO", "ALTAMIRA - MTY", "ALLENDE - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "RODRIGO GPE BALDERAS (RBM)", "contacto": "ARTURO TIMOTEO GONZ LEZ Z  IGA", "tel": "8261236103", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["MCALLEN - MTY", "MTY - CD JUAREZ", "MTY - MTY", "COLOMBIA - TORREON", "MTY - COATZACOALCOS", "ALTAMIRA - TORREON", "ALTAMIRA - MTY", "MTY - CD VICTORIA", "MTY - TORREON"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "SALAZAR EXPRESS", "contacto": "JOSE CARLOS CARMONA", "tel": "826 127 0418", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["CHINAMECA - GDL", "VILLAHERMOSA - MTY", "ALLENDE - IRAPUATO", "MTY - NAYARIT", "CDMX - MERIDA-CANCUN", "MTY - CDMX", "CDMX - MERIDA", "MTY - MAZATLAN", "CHINAMECA - CELAYA", "IRAPUATO - VILLAHERMOSA"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "SERVICIOS TERRESTRES(STELEVA)", "contacto": "DANIEL HERNANDEZ ZU IGA", "tel": "8119828597", "email": "", "unidades": ["Termo conge/Seco"], "rutas": ["ALTAMIRA - SALTILLO", "MTY - VILLAHERMOSA", "MERIDA - CD VICTORIA", "ALTAMIRA - MTY", "ALTAMIRA - ALLENDE"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "SIT REFRIGERADO", "contacto": "MARCO MAGA A LAGUNAS", "tel": "55 3813 8572", "email": "", "unidades": ["Caja refrigerada"], "rutas": ["GDL - CDMX"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "SOLUCIONES EN TRANSPORTE LIAN", "contacto": "DANIEL CRUZ", "tel": "722 643 7664", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["CDMX - LINARES", "MTY - LERMA", "MTY - QUERETARO", "MTY - TOLUCA", "MTY - GDL", "MTY - CDMX", "MTY - ATITALAQUIA", "CDMX - MTY", "ALLENDE - CDMX"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "T. DENISSE", "contacto": "JOSE ALBERTO CRISANTO PEREZ", "tel": "5549169645", "email": "", "unidades": ["Caja seca"], "rutas": ["ATITALAQUIA - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "T. HR REFRIGERADOS", "contacto": "ARMANDO SAENZ", "tel": "81 2438 9684", "email": "", "unidades": ["Caja refrigerada"], "rutas": ["MTY - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "THG TRANSPORTES", "contacto": "JUAN ANTONIO SANCHEZ", "tel": "662 374 6774", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["GDL - OBREGON", "MTY - CDMX", "MTY - HERMOSILLO", "MTY - CHIHUAHUA", "MTY - IRAPUATO", "OBREGON - CDMX", "MTY - TOLUCA", "SALTILLO - CHIHUAHUA", "HERMOSILLO - CDMX", "MTY - AGUASCALIENTES"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "TJ EXPRESS", "contacto": "GERARDO LOPEZ", "tel": "238 110 6153", "email": "", "unidades": ["Caja refrigerada"], "rutas": ["MTY - CULIACAN"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "TMS MONROY SCHIAVON", "contacto": "TRINIDAD TORRES ZAVALA", "tel": "5566311280", "email": "", "unidades": ["Caja seca"], "rutas": ["MTY - GDL", "MTY - CDMX", "SALTILLO - CDMX"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "TRANSFRIO BARRON", "contacto": "IGNACIO ALBERTO COLIN", "tel": "33 2616 3969", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["MTY - MTY", "MTY - QUERETARO", "MTY - GDL", "MTY - CDMX", "CDMX - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "TRANSPO TRUCKS MEXICO", "contacto": "VICTOR HUGO ANDRADE", "tel": "55-4357 4136", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["MTY - TIJUANA", "GDL - CDMX", "VERACRUZ - CDMX", "GDL - OBREGON", "MTY - CDMX", "CDMX - CDMX", "CHINAMECA - CELAYA", "CHIHUAHUA - CDMX", "CDMX - TORREON", "MTY - VILLAHERMOSA"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "TRANSPORTES 3+1", "contacto": "ALEXANDER VASCONZELOS", "tel": "993 584 9801", "email": "", "unidades": ["Caja refrigerada", "Tráiler", "Caja seca", "Termo conge/Seco"], "rutas": ["CHINAMECA - GDL", "MCALLEN - MTY", "VILLAHERMOSA - QUERETARO", "VILLAHERMOSA - MTY", "MTY - CD VICTORIA", "MTY - MAZATLAN", "CHINAMECA - CELAYA", "MTY - MTY", "ALTAMIRA - DURANGO", "VERACRUZ - LINARES"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "TRANSPORTES CRUZ RDZ (TCR)", "contacto": "AZIEL ARMENDARIS", "tel": "998 188 6052", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["CHINAMECA - MTY", "MTY - TIJUANA", "MTY - CHIHUAHUA", "OBREGON - CDMX", "TIJUANA - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "TRANSPORTES GARZA", "contacto": "MIGUEL ANGEL DEGOLLADO", "tel": "81 1633 1991", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["MTY - NUEVA ROSITA", "MTY - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "TRANSPORTES HERLOP", "contacto": "EDGAR HERNANDEZ", "tel": "55 7682 6934", "email": "", "unidades": ["Termo conge/Seco"], "rutas": ["CDMX - VILLAHERMOSA", "CDMX - CANC N"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "TRANSPORTES MGGC", "contacto": "RAMON LOPEZ ALVARADO", "tel": "81 2629 3874", "email": "", "unidades": ["Caja seca", "Termo conge/Seco"], "rutas": ["MTY - VILLAHERMOSA", "MTY - COATZACOALCOS"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "TRANSPORTES RUIZ", "contacto": "JAIME TORRES", "tel": "4462589678", "email": "", "unidades": ["Caja refrigerada"], "rutas": ["MTY - CDMX"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "TRANSPORTES SALAZAR", "contacto": "JUAN CARLOS ZU IGA LUNA", "tel": "826 126 9133", "email": "", "unidades": ["Caja refrigerada"], "rutas": ["MTY - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "TRANSPORTES TCR", "contacto": "ARON DE LA CRUZ", "tel": "81 2466 1585", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["CHINAMECA - GDL", "MTY - TIJUANA", "MTY - CDMX", "MTY - MAZATLAN", "IRAPUATO - TIJUANA", "CHIHUAHUA - CDMX", "CABORCA - CDMX", "MTY - MTY", "OBREGON - MTY", "MTY - CHIHUAHUA"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "TRANSPORTES VALDEZ", "contacto": "JUAN PABLO CASTILLO", "tel": "81 2898 6395", "email": "", "unidades": ["Caja refrigerada", "Caja seca"], "rutas": ["CHINAMECA - MTY", "MTY - COATZACOALCOS"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "TRANSPORTES VAREVA", "contacto": "JOCSAN MORENO ARIAS", "tel": "33 1109 0938", "email": "", "unidades": [], "rutas": ["MANZANILLO - ALLENDE"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "TRANSPORTES ZARAGOZA", "contacto": "ANTONIO ALFONSO VERGARA", "tel": "229 365 2469", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["MTY - TORREON", "MTY - CHIHUAHUA", "TORREON - VILLAHERMOSA"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "TRANSUTO", "contacto": "EDMAN JESUS URBINA SANTOS", "tel": "8993184516", "email": "", "unidades": ["Termo conge/Seco"], "rutas": ["MCALLEN - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "TREA DEL ALAMO", "contacto": "ABDUL GONZALEZ", "tel": "766 103 5106", "email": "", "unidades": ["Caja seca"], "rutas": ["CHINAMECA - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "WENDY DAMARIS ZAMORA", "contacto": "MARTIN GARC A", "tel": "55 7784 6585", "email": "", "unidades": ["Caja seca"], "rutas": ["MTY - LERMA", "MTY - QUERETARO", "MTY - CDMX", "ATITALAQUIA - CHIHUAHUA"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "WENDY MARISOL ESCAMILLA (CAVARI)", "contacto": "ANGEL MONTES DE OCA REYES", "tel": "797 109 1248", "email": "", "unidades": ["Caja seca"], "rutas": ["MTY - PUEBLA"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "XCG CARGO (LUIS CAVAZOS)", "contacto": "JORGE GONZALEZ", "tel": "656 590 2020", "email": "", "unidades": ["Caja refrigerada", "Caja seca", "Termo conge/Seco"], "rutas": ["MTY - GDL", "MTY - QRO", "GDL - MTY", "MTY - CDMX", "CDMX - MTY", "ALLENDE - CDMX", "MTY - MORELIA"], "calificacion": 4.0, "activo": true, "_importado": true}, {"nombre": "YURIRIA MARCELA CUELLAR(THERMON)", "contacto": "MARCO DE LEON RIOS", "tel": "5520899088", "email": "", "unidades": ["Caja seca"], "rutas": ["MTY - MTY"], "calificacion": 4.0, "activo": true, "_importado": true}]
      const { writeBatch, doc, collection, serverTimestamp } = await import('firebase/firestore')
      const { db } = await import('../../firebase')
      let ok = 0
      const CHUNK = 400
      for (let i = 0; i < proveedores.length; i += CHUNK) {
        const batch = writeBatch(db)
        proveedores.slice(i, i + CHUNK).forEach(p => {
          const ref = doc(collection(db, 'proveedores'))
          batch.set(ref, { ...p, createdAt: serverTimestamp() })
        })
        await batch.commit()
        ok += Math.min(CHUNK, proveedores.length - i)
      }
      setResultadoProv({ ok })
    } catch(e) {
      console.error(e)
      setResultadoProv({ error: e.message })
    } finally { setImportandoProv(false) }
  }

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
      {/* Importar proveedores reales */}
      <div className="card p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Importar catálogo de proveedores</h2>
            <p className="text-xs text-gray-500 mt-0.5">Carga los 125 proveedores reales extraídos del maestro al catálogo de Pricing</p>
          </div>
          <span className="text-xs bg-blue-50 text-brand px-2 py-1 rounded-lg font-medium">125 proveedores</span>
        </div>
        {resultadoProv && (
          <div className={`rounded-xl px-4 py-3 text-sm font-medium ${resultadoProv.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {resultadoProv.ok ? `✓ ${resultadoProv.ok} proveedores importados correctamente` : `Error: ${resultadoProv.error}`}
          </div>
        )}
        <button onClick={importarProveedores} disabled={importandoProv} className="btn-primary text-xs py-2 disabled:opacity-50">
          {importandoProv ? 'Importando proveedores...' : 'Importar 125 proveedores al catálogo'}
        </button>
      </div>
    </div>
  )
}
