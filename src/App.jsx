import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Embarques from './pages/ventas/Embarques'
import NuevoEmbarque from './pages/ventas/NuevoEmbarque'
import DetalleEmbarque from './pages/ventas/DetalleEmbarque'
import Usuarios from './pages/admin/Usuarios'
import Catalogos from './pages/admin/Catalogos'
import Board from './pages/operaciones/Board'
import Pricing from './pages/pricing/Pricing'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/embarques" element={<Embarques />} />
              <Route path="/embarques/nuevo" element={<NuevoEmbarque />} />
              <Route path="/embarques/:id" element={<DetalleEmbarque />} />
              <Route path="/operaciones" element={<Board />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/admin/usuarios" element={<Usuarios />} />
              <Route path="/admin/catalogos" element={<Catalogos />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
