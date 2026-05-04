export default function Pricing() {
  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Pricing</h1>
        <p className="text-sm text-gray-500">Gestión de tarifas, proveedores y disponibilidad de unidades</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: '🏢', title: 'Proveedores', desc: 'Catálogo de transportistas con tarifas por ruta', status: 'Próximamente' },
          { icon: '🗺️', title: 'Tarifas por ruta', desc: 'Matriz origen-destino con precios FTL/LTL/REF', status: 'Próximamente' },
          { icon: '📅', title: 'Disponibilidad', desc: 'Tabla de unidades disponibles por día', status: 'Próximamente' },
        ].map(m => (
          <div key={m.title} className="card p-5">
            <div className="text-2xl mb-3">{m.icon}</div>
            <h2 className="text-sm font-semibold text-gray-800 mb-1">{m.title}</h2>
            <p className="text-xs text-gray-500 mb-3">{m.desc}</p>
            <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium">{m.status}</span>
          </div>
        ))}
      </div>
      <div className="card p-5 border-brand border-2">
        <p className="text-sm font-medium text-brand mb-1">¿Qué incluirá este módulo?</p>
        <ul className="text-xs text-gray-600 space-y-1.5 list-disc list-inside">
          <li>Alta de proveedores con tarifas diferenciadas por tipo de servicio</li>
          <li>Generador de demanda: cotización interna para comparar opciones</li>
          <li>Tabla de unidades disponibles por fecha (para planear capacidad)</li>
          <li>Integración con el cotizador para calcular margen automáticamente</li>
        </ul>
      </div>
    </div>
  )
}
