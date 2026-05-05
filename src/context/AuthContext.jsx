import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, getDocs, collection, query, where } from 'firebase/firestore'
import { auth, db } from '../firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        try {
          // Primero busca por ID del documento = UID (usuarios nuevos)
          const snap = await getDoc(doc(db, 'usuarios', u.uid))
          if (snap.exists()) {
            setPerfil(snap.data())
          } else {
            // Si no encuentra, busca por campo uid (usuarios creados antes)
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

  return (
    <AuthContext.Provider value={{ user, perfil, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
