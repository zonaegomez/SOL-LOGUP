import { useEffect, useState } from 'react'
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'

const TIPOS = ['Bodega', 'Parque industrial', 'Puerto', 'Aduana', 'CEDIS', 'Planta', 'Otro']
const ESTADOS_MX = [
  'Aguascalientes','Baja California','Baja California Sur','Campeche','Chiapas','Chihuahua',
  'Ciudad de México','Coahuila','Colima','Durango','Estado de México','Guanajuato','Guerrero',
  'Hidalgo','Jalisco','Michoacán','Morelos','Nayarit','Nuevo León','Oaxaca','Puebla','Querétaro',
  'Quintana Roo','San Luis Potosí','Sinaloa','Sonora','Tabasco','Tamaulipas','Tlaxcala',
  'Veracruz','Yucatán','Zacatecas',
]

export default function Catalogos() {
  const [ubicaciones, setUbicaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nombre: '', tipo: 'Bodega', direccion: '', colonia: '',
    municipio: '', estado: 'Nuevo León', cp: '', pais: 'México',
    contacto: '', telefono: '', notas: ''
  })

  useEffect(() => { fetchUbicaciones() }, [])

  const fetchUbicaciones = async () => {
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'ubicaciones'))
      setUbicaciones(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const guardar = async () => {
    if (!form.nombre || !form.cp || !form.municipio) return alert('Nombre, CP y municipio son obligatorios')
    setSaving(true)
    try {
      await addDoc(collection(db, 'ubicaciones'), { ...form, createdAt: serverTimestamp() })
      setShowForm(false)
      setForm({ nombre: '', tipo: 'Bodega', direccion: '', colonia: '', municipio: '', estado: 'Nuevo León', cp: '', pais: 'México', contacto: '', telefono: '', notas: '' })
      fetchUbicaciones()
    } catch (e) { alert('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  const filtradas = ubicaciones.filter(u =>
    !busqueda || u.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.municipio?.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.cp?.includes(busqueda)
  )

  const TIPO_COLOR = {
    'Bodega': 'bg-blue-50 text-blue-700',
    'Parque industrial': 'bg-purple-50 text-purple-700',
    'Puerto': 'bg-teal-50 text-teal-700',
    'Aduana': 'bg-red-50 text-red-700',
    'CEDIS': 'bg-amber-50 text-amber-700',
    'Planta': 'bg-green-50 text-green-700',
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Catálogos</h1>
          <p className="text-sm text-gray-500">Puntos de carga y descarga — base para Carta Porte</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">+ Nueva ubicación</button>
      </div>

      {showForm && (
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Registrar punto de carga / descarga</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Nombre del lugar *</label>
              <input className="input" placeholder="Ej. Parque Industrial Apodaca - Bodega 12" value={form.nombre} onChange={e => set('nombre', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tipo</label>
              <select className="input" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                {TIPOS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Código Postal * (SAT)</label>
              <input className="input font-mono" placeholder="64000" maxLength={5} value={form.cp} onChange={e => set('cp', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Dirección</label>
              <input className="input" placeholder="Calle, número exterior e interior" value={form.direccion} onChange={e => set('direccion', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Colonia</label>
              <input className="input" value={form.colonia} onChange={e => set('colonia', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Municipio *</label>
              <input className="input" value={form.municipio} onChange={e => set('municipio', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Estado</label>
              <select className="input" value={form.estado} onChange={e => set('estado', e.target.value)}>
                {ESTADOS_MX.map(e => <option key={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">País</label>
              <input className="input" value={form.pais} onChange={e => set('pais', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Contacto en el lugar</label>
              <input className="input" placeholder="Nombre del responsable" value={form.contacto} onChange={e => set('contacto', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Teléfono</label>
              <input className="input" placeholder="81 xxxx xxxx" value={form.telefono} onChange={e => set('telefono', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Notas / Instrucciones de acceso</label>
              <textarea className="input resize-none" rows={2} placeholder="Ej. Acceso por puerta 3, horario 8am-6pm, preguntar por almacén" value={form.notas} onChange={e => set('notas', e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            <button onClick={guardar} disabled={saving} className="btn-primary">
              {saving ? 'Guardando...' : 'Guardar ubicación'}
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <input
            className="input"
            placeholder="Buscar por nombre, municipio o CP..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando catálogo...</div>
        ) : filtradas.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <p className="text-3xl mb-2">📂</p>
            <p className="font-medium">Sin ubicaciones registradas</p>
            <p className="text-sm mt-1">Agrega los puntos de carga y descarga para usarlos en los embarques y Carta Porte.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                {['Nombre','Tipo','Dirección','CP','Municipio / Estado','Contacto'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtradas.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800 max-w-48 truncate">{u.nombre}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${TIPO_COLOR[u.tipo] || 'bg-gray-100 text-gray-600'}`}>
                      {u.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-40 truncate">{u.direccion || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-brand font-medium">{u.cp}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{u.municipio}, {u.estado}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{u.contacto || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
