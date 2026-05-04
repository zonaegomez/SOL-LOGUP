import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: "AIzaSyDckyTLoQz96hgfS5D8ZWZt1YFfMwRahVk",
  authDomain: "sol-logup.firebaseapp.com",
  projectId: "sol-logup",
  storageBucket: "sol-logup.firebasestorage.app",
  messagingSenderId: "943926902359",
  appId: "1:943926902359:web:12e6e63ac535de16de6d12"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
export const storage = getStorage(app)
export default app
