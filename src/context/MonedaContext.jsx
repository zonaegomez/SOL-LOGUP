import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const MonedaContext = createContext(null)

const TC_DEFAULT = 17.50

async function fetchTCBanxico() {
  try {
    // Opción 1: exchangerate-api (sin CORS, gratuita)
    const resp = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
    const data = await resp.json()
    if (data?.rates?.MXN) return parseFloat(data.rates.MXN.toFixed(4))
  } catch(e) {}
  try {
    // Opción 2: fixer.io alternativo sin key
    const resp = await fetch('https://open.er-api.com/v6/latest/USD')
    const data = await resp.json()
    if (data?.rates?.MXN) return parseFloat(data.rates.MXN.toFixed(4))
  } catch(e) { console.error('TC fetch error:', e) }
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
