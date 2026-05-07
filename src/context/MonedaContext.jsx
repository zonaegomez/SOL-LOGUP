import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const MonedaContext = createContext(null)

const TC_DEFAULT = 17.50
// Serie de BANXICO: SF43718 = Tipo de cambio FIX (pesos por dólar)
const BANXICO_TOKEN = 'ce9a24ac892b3e9f6e4ec8a6bc00e2bc00c1c6b0' 
const BANXICO_SERIE = 'SF43718'

async function fetchTCBanxico() {
  try {
    const hoy = new Date().toISOString().slice(0,10)
    const hace7 = new Date(Date.now() - 7*24*60*60*1000).toISOString().slice(0,10)
    const url = `https://www.banxico.org.mx/SieAPIRest/service/v1/series/${BANXICO_SERIE}/datos/${hace7}/${hoy}?token=${BANXICO_TOKEN}`
    const resp = await fetch(url, { headers: { 'Bmx-Token': BANXICO_TOKEN } })
    const data = await resp.json()
    const datos = data?.bmx?.series?.[0]?.datos
    if (datos?.length) {
      // Tomar el más reciente que no sea N/E
      const valido = [...datos].reverse().find(d => d.dato !== 'N/E')
      if (valido) return parseFloat(valido.dato)
    }
  } catch(e) { console.error('BANXICO error:', e) }
  return null
}

export function MonedaProvider({ children }) {
  const [moneda, setMoneda] = useState('MXN')
  const [tipoCambio, setTipoCambio] = useState(TC_DEFAULT)
  const [tcBanxico, setTcBanxico] = useState(null)
  const [cargandoTC, setCargandoTC] = useState(false)
  const [fechaTC, setFechaTC] = useState(null)

  // Cargar TC de BANXICO al montar
  useEffect(() => {
    const cargar = async () => {
      setCargandoTC(true)
      const tc = await fetchTCBanxico()
      if (tc) {
        setTipoCambio(tc)
        setTcBanxico(tc)
        setFechaTC(new Date().toLocaleDateString('es-MX'))
      }
      setCargandoTC(false)
    }
    cargar()
  }, [])

  // Formatear monto según moneda activa
  const fmt = useCallback((monto, monedaOrigen = 'MXN') => {
    if (!monto && monto !== 0) return '—'
    let valor = Number(monto)

    // Convertir si es necesario
    if (moneda === 'USD' && monedaOrigen === 'MXN') {
      valor = valor / tipoCambio
    } else if (moneda === 'MXN' && monedaOrigen === 'USD') {
      valor = valor * tipoCambio
    }

    const sym = moneda === 'USD' ? 'USD ' : '$'
    return sym + valor.toLocaleString('es-MX', {
      minimumFractionDigits: moneda === 'USD' ? 2 : 0,
      maximumFractionDigits: moneda === 'USD' ? 2 : 0,
    })
  }, [moneda, tipoCambio])

  // Convertir valor a moneda activa
  const convertir = useCallback((monto, monedaOrigen = 'MXN') => {
    if (!monto) return 0
    let valor = Number(monto)
    if (moneda === 'USD' && monedaOrigen === 'MXN') return valor / tipoCambio
    if (moneda === 'MXN' && monedaOrigen === 'USD') return valor * tipoCambio
    return valor
  }, [moneda, tipoCambio])

  const toggleMoneda = () => setMoneda(m => m === 'MXN' ? 'USD' : 'MXN')

  return (
    <MonedaContext.Provider value={{ moneda, setMoneda, tipoCambio, setTipoCambio, tcBanxico, cargandoTC, fechaTC, fmt, convertir, toggleMoneda }}>
      {children}
    </MonedaContext.Provider>
  )
}

export const useMoneda = () => useContext(MonedaContext)
