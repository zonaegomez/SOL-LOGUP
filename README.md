# SOL — Sistema Operativo Logístico
### Log Up · v1.0.0

Sistema de gestión de embarques construido con React + Firebase + Vercel.

---

## Stack
- **Frontend**: React 18 + Vite
- **Estilos**: Tailwind CSS
- **Base de datos**: Firebase Firestore
- **Auth**: Firebase Authentication
- **Storage**: Firebase Storage
- **Hosting**: Vercel

---

## Setup local

```bash
# 1. Instalar dependencias
npm install

# 2. Correr en desarrollo
npm run dev
```

---

## Deploy en Vercel

1. Sube este proyecto a GitHub
2. Entra a vercel.com → New Project → importa el repo
3. Vercel detecta Vite automáticamente
4. Deploy → obtienes tu URL pública

---

## Firebase — configuración inicial

### Authentication
1. Firebase Console → Authentication → Sign-in method
2. Habilitar: **Email/Password**

### Firestore
1. Firebase Console → Firestore Database → Create database
2. Modo: **Production** (puedes empezar en test mode para desarrollo)
3. Pegar las siguientes reglas en la pestaña Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Crear primer usuario admin
1. Firebase Console → Authentication → Add user
2. Email: admin@logup.mx / contraseña que elijas
3. Anotar el UID del usuario creado
4. Firestore → colección `usuarios` → Add document con ID = UID del usuario
5. Campos:
   - uid: (el UID)
   - nombre: "Administrador"
   - email: "admin@logup.mx"
   - rol: "admin"
   - activo: true

---

## Colecciones Firestore

| Colección | Descripción |
|-----------|-------------|
| `usuarios` | Usuarios del sistema con roles |
| `clientes` | Clientes con RFC y datos de contacto |
| `ubicaciones` | Puntos de carga/descarga con CP (para Carta Porte) |
| `embarques` | Embarques con todos los datos + subcolección `historico` |

---

## Módulos actuales

- ✅ **Dashboard** — métricas y accesos rápidos
- ✅ **Ventas / Embarques** — lista, búsqueda, nuevo embarque (4 pasos con Carta Porte 3.1)
- ✅ **Detalle embarque** — tabs Información / Contratos / Histórico + timeline de etapas
- ✅ **Operaciones** — board Kanban con avance de etapas
- ✅ **Admin / Usuarios** — gestión de accesos y roles
- ✅ **Admin / Catálogos** — puntos de carga/descarga con CP para Carta Porte
- 🔄 **Pricing** — en desarrollo (tarifas, proveedores, disponibilidad)
- 🔄 **Documentos** — en desarrollo (portal de proveedores)
