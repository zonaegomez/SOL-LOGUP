import { useEffect, useState } from 'react'
import { collection, getDocs, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { db, auth } from '../../firebase'

const ROLES = ['admin', 'ventas', 'operaciones', 'pricing', 'proveedor']

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: 'ventas' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchUsuarios() }, [])

  const fetchUsuarios = async () => {
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'usuarios'))
      setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const crearUsuario = async () => {
    if (!form.email || !form.password || !form.nombre) return alert('Completa todos los campos')
    setSaving(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password)
      await addDoc(collection(db, 'usuarios'), {
        uid: cred.user.uid,
        nombre: form.nombre,
        email: form.email,
        rol: form.rol,
        activo: true,
        createdAt: serverTimestamp(),
      })
      setShowForm(false)
      setForm({ nombre: '', email: '', password: '', rol: 'ventas' })
      fetchUsuarios()
    } catch (e) {
      alert('Error: ' + e.message)
    } finally { setSaving(false) }
  }

  const ROL_COLOR = {
    admin: 'bg-red-50 text-red-700',
    ventas: 'bg-blue-50 text-blue-700',
    operaciones: 'bg-amber-50 text-amber-700',
    pricing: 'bg-purple-50 text-purple-700',
    proveedor: 'bg-green-50 text-green-700',
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500">Gestión de accesos al sistema</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">+ Nuevo usuario</button>
      </div>

      {showForm && (
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Crear nuevo usuario</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre completo</label>
              <input className="input" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Correo</label>
              <input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Contraseña temporal</label>
              <input type="password" className="input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Rol</label>
              <select className="input" value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            <button onClick={crearUsuario} disabled={saving} className="btn-primary">
              {saving ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              {['Nombre','Correo','Rol','Estado'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={4} className="text-center py-8 text-gray-400">Cargando...</td></tr>
            ) : usuarios.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-gray-400">Sin usuarios registrados.</td></tr>
            ) : usuarios.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-brand-light text-brand flex items-center justify-center text-xs font-semibold">
                      {u.nombre?.[0]?.toUpperCase() || '?'}
                    </div>
                    {u.nombre}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${ROL_COLOR[u.rol] || 'bg-gray-100 text-gray-600'}`}>
                    {u.rol}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${u.activo ? 'text-green-600' : 'text-gray-400'}`}>
                    {u.activo ? '● Activo' : '○ Inactivo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
