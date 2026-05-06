import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, getDocs, collection, query, where } from 'firebase/firestore'
import { auth, db } from '../firebase'

const AuthContext = createContext(null)

// UIDs del usuario maestro — oculto del sistema
const MAESTRO_UIDS = ['c0moo99rvCCkl77ejJxz']

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        try {
          // Verificar si es usuario maestro
          if (MAESTRO_UIDS.includes(u.uid)) {
            setPerfil({
              uid: u.uid,
              nombre: 'Maestro',
              email: u.email,
              rol: 'maestro',
              activo: true,
              _oculto: true,
            })
            setLoading(false)
            return
          }

          const snap = await getDoc(doc(db, 'usuarios', u.uid))
          if (snap.exists()) {
            setPerfil(snap.data())
          } else {
            const q = query(collection(db, 'usuarios'), where('uid', '==', u.uid))
            const qsnap = await getDocs(q)
            if (!qsnap.empty) {
              setPerfil(qsnap.docs[0].data())
            } else {
              setPerfil(null)
            }
          }
        } catch(e) {
          console.error(e)
          setPerfil(null)
        }
      } else {
        setPerfil(null)
      }
      setLoading(false)
    })
  }, [])

  const esMaestro = perfil?.rol === 'maestro'
  const esGerente = perfil?.rol === 'gerente' || esMaestro
  const esAdmin = perfil?.rol === 'admin' || esMaestro
  const puedeAutorizar = esGerente

  return (
    <AuthContext.Provider value={{ user, perfil, loading, esMaestro, esGerente, esAdmin, puedeAutorizar }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
