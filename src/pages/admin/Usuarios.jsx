import { useEffect, useState } from 'react'
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, query, where } from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { db, auth } from '../../firebase'
import { useAuth } from '../../context/AuthContext'

const ROLES = ['admin', 'ventas', 'operaciones', 'pricing', 'proveedor']

const ROL_COLOR = {
  admin: 'bg-red-50 text-red-700',
  ventas: 'bg-blue-50 text-blue-700',
  operaciones: 'bg-amber-50 text-amber-700',
  pricing: 'bg-purple-50 text-purple-700',
  proveedor: 'bg-green-50 text-green-700',
}

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState(null) // usuario que se está editando
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: 'ventas' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [confirmEliminar, setConfirmEliminar] = useState(null)
  const [textoConfirm, setTextoConfirm] = useState('')
  const { esMaestro, esGerente, esAdmin, perfil } = useAuth()

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
    if (!form.email || !form.password || !form.nombre) return setMsg({ tipo: 'error', texto: 'Completa todos los campos' })
    setSaving(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password)
      // Guardar con el UID como ID del documento
      await addDoc(collection(db, 'usuarios'), {
        uid: cred.user.uid,
        nombre: form.nombre.trim(),
        email: form.email.trim(),
        rol: form.rol,
        activo: true,
        createdAt: serverTimestamp(),
      })
      setMsg({ tipo: 'ok', texto: `✅ Usuario ${form.nombre} creado correctamente` })
      setShowForm(false)
      setForm({ nombre: '', email: '', password: '', rol: 'ventas' })
      fetchUsuarios()
    } catch (e) {
      setMsg({ tipo: 'error', texto: e.code === 'auth/email-already-in-use' ? 'Ese correo ya está registrado' : 'Error: ' + e.message })
    } finally { setSaving(false) }
  }

  const guardarEdicion = async () => {
    if (!editando) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'usuarios', editando.id), {
        nombre: editando.nombre.trim(),
        rol: editando.rol,
        activo: editando.activo,
      })
      setMsg({ tipo: 'ok', texto: `✅ Usuario actualizado correctamente` })
      setEditando(null)
      fetchUsuarios()
    } catch (e) {
      setMsg({ tipo: 'error', texto: 'Error al guardar: ' + e.message })
    } finally { setSaving(false) }
  }

  const toggleActivo = async (usuario) => {
    try {
      await updateDoc(doc(db, 'usuarios', usuario.id), { activo: !usuario.activo })
      fetchUsuarios()
    } catch(e) { console.error(e) }
  }

  const eliminarUsuario = async () => {
    if (textoConfirm !== 'ELIMINAR') return
    try {
      await deleteDoc(doc(db, 'usuarios', confirmEliminar.id))
      setMsg({ tipo: 'ok', texto: `✅ Usuario eliminado` })
      setConfirmEliminar(null)
      setTextoConfirm('')
      fetchUsuarios()
    } catch(e) { setMsg({ tipo: 'error', texto: 'Error al eliminar' }) }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500">Gestión de accesos al sistema</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setMsg(null) }} className="btn-primary">
          + Nuevo usuario
        </button>
      </div>

      {/* Mensaje */}
      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center justify-between ${msg.tipo === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
          {msg.texto}
          <button onClick={() => setMsg(null)} className="text-xs opacity-60 hover:opacity-100 ml-3">×</button>
        </div>
      )}

      {/* Formulario nuevo usuario */}
      {showForm && (
        <div className="card p-5 space-y-4 border-brand border">
          <h2 className="text-sm font-semibold text-gray-700">Crear nuevo usuario</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre completo *</label>
              <input className="input" placeholder="Ej. Erick Gómez" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Correo *</label>
              <input type="email" className="input" placeholder="usuario@logup.mx" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Contraseña temporal *</label>
              <input type="password" className="input" placeholder="Mínimo 6 caracteres" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Rol *</label>
              <select className="input" value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-700">
            ⚠️ El usuario deberá cambiar su contraseña al primer inicio de sesión.
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); setMsg(null) }} className="btn-secondary">Cancelar</button>
            <button onClick={crearUsuario} disabled={saving} className="btn-primary">
              {saving ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>
        </div>
      )}

      {/* Modal edición */}
      {editando && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Editar usuario</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nombre</label>
                <input className="input" value={editando.nombre} onChange={e => setEditando(u => ({ ...u, nombre: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Correo</label>
                <input className="input bg-gray-50" value={editando.email} disabled />
                <p className="text-[10px] text-gray-400 mt-0.5">El correo no se puede cambiar desde aquí</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Rol</label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map(r => (
                    <button
                      key={r}
                      onClick={() => setEditando(u => ({ ...u, rol: r }))}
                      className={`py-2 px-3 rounded-lg text-xs font-medium border-2 transition-all capitalize ${
                        editando.rol === r ? 'border-brand bg-blue-50 text-brand' : 'border-gray-100 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-gray-600">Estado del usuario</span>
                <button
                  onClick={() => setEditando(u => ({ ...u, activo: !u.activo }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${editando.activo ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}
                >
                  {editando.activo ? '● Activo' : '○ Inactivo'}
                </button>
              </div>
              {esGerente && !esMaestro && !esAdmin ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                  ⚠️ Como Gerente, cambiar el rol requiere autorización del Maestro. Se enviará una solicitud.
                </div>
              ) : (
                <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-brand">
                  💡 El rol se aplica inmediatamente al próximo inicio de sesión del usuario.
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditando(null)} className="flex-1 btn-secondary">Cancelar</button>
              <button onClick={guardarEdicion} disabled={saving} className="flex-1 btn-primary justify-center">
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de usuarios */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              {['Nombre', 'Correo', 'Rol', 'Estado', 'Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">Cargando...</td></tr>
            ) : usuarios.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">Sin usuarios registrados.</td></tr>
            ) : usuarios.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xs font-semibold shrink-0">
                      {u.nombre ? u.nombre[0].toUpperCase() : '?'}
                    </div>
                    {u.nombre || <span className="text-gray-400 italic text-xs">Sin nombre</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${ROL_COLOR[u.rol] || 'bg-gray-100 text-gray-600'}`}>
                    {u.rol}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActivo(u)} className={`text-xs font-medium transition-colors ${u.activo ? 'text-green-600 hover:text-green-700' : 'text-gray-400 hover:text-gray-600'}`}>
                    {u.activo ? '● Activo' : '○ Inactivo'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <button onClick={() => { setEditando({ ...u }); setMsg(null) }} className="text-xs text-brand hover:underline font-medium">✏️ Editar</button>
                    {(esMaestro || esGerente) && <button onClick={() => { setConfirmEliminar(u); setTextoConfirm('') }} className="text-xs text-red-400 hover:text-red-600 hover:underline font-medium">🗑️ Eliminar</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal eliminar — solo Maestro */}
      {confirmEliminar && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-base font-semibold text-red-600 mb-1">⚠️ Eliminar usuario</h2>
            <p className="text-xs text-gray-500 mb-4">Esto eliminará permanentemente a <strong>{confirmEliminar.nombre || confirmEliminar.email}</strong>. Esta acción no se puede deshacer.</p>
            <p className="text-xs text-gray-600 mb-2">Escribe <strong>ELIMINAR</strong> para confirmar:</p>
            <input className="input mb-4" value={textoConfirm} onChange={e=>setTextoConfirm(e.target.value)} placeholder="ELIMINAR" />
            <div className="flex gap-2">
              <button onClick={()=>{setConfirmEliminar(null);setTextoConfirm('')}} className="flex-1 btn-secondary text-xs">Cancelar</button>
              <button onClick={eliminarUsuario} disabled={textoConfirm !== 'ELIMINAR'} className="flex-1 text-xs bg-red-500 text-white py-2.5 rounded-lg hover:bg-red-600 disabled:opacity-40 font-medium">
                Eliminar definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-xs font-medium text-brand mb-1">💡 Roles del sistema</p>
        <div className="grid grid-cols-2 gap-1 text-[11px] text-blue-700 mt-2">
          <span><strong>Admin</strong> — acceso total</span>
          <span><strong>Ventas</strong> — dashboard semanal + embarques</span>
          <span><strong>Operaciones</strong> — board + seguimiento</span>
          <span><strong>Pricing</strong> — tarifas + disponibilidad</span>
          <span><strong>Proveedor</strong> — portal de documentos</span>
        </div>
      </div>
    </div>
  )
}
