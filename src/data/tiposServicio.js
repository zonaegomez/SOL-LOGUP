export const TIPOS_SERVICIO = {
  CONGE: {
    label: 'Congelado', descripcion: 'Temperatura de congelación',
    tempRequerida: true, rangTemp: { min: -20, max: 0, unidad: '°F' },
    equipamiento: {
      unidad: ['Reefer 53 pies operativa','Termógrafo calibrado y activo','Pre-enfriado mínimo 2 horas antes de carga','Verificación de temperatura antes de cargar','Combustible suficiente + 20% extra'],
      operador: ['Licencia federal vigente','Conocimiento de carga refrigerada','Contacto de emergencia del cliente guardado'],
      documentos: ['Carta Porte 3.1 con temperatura especificada','Bitácora de temperatura','Factura o remisión del cliente'],
      cliente: ['Confirmar temperatura de recepción requerida','Confirmar si requiere termógrafo descargable','Confirmar ventana de carga/descarga'],
    },
  },
  REFRI: {
    label: 'Refrigerado', descripcion: 'Temperatura entre 0°F y 40°F',
    tempRequerida: true, rangTemp: { min: 0, max: 40, unidad: '°F' },
    equipamiento: {
      unidad: ['Reefer 53 pies operativa','Termógrafo calibrado','Pre-enfriado mínimo 1 hora','Verificación de temperatura'],
      operador: ['Licencia federal vigente','Conocimiento de carga refrigerada'],
      documentos: ['Carta Porte 3.1 con temperatura','Registro de temperatura','Factura o remisión'],
      cliente: ['Confirmar temperatura de recepción','Confirmar ventana de carga/descarga'],
    },
  },
  FRESCO: {
    label: 'Fresco', descripcion: 'Frutas, verduras, lácteos. Temperatura controlada',
    tempRequerida: true, rangTemp: { min: 35, max: 55, unidad: '°F' },
    equipamiento: {
      unidad: ['Reefer o caja ventilada','Termógrafo activo','Verificación de temperatura'],
      operador: ['Licencia federal vigente'],
      documentos: ['Carta Porte 3.1','Registro de temperatura','Factura o remisión'],
      cliente: ['Confirmar temperatura requerida'],
    },
  },
  SECO: {
    label: 'Seco / Carga general', descripcion: 'Carga seca sin temperatura',
    tempRequerida: false,
    equipamiento: {
      unidad: ['Caja seca 53 pies en buen estado','Piso sin daños ni humedad','Puertas y sellos en buen estado','Caja limpia y libre de olores'],
      operador: ['Licencia federal vigente','Chaleco y botas de seguridad'],
      documentos: ['Carta Porte 3.1','Factura o remisión del cliente'],
      cliente: ['Confirmar si requiere stretch film o tarimas'],
    },
  },
  COMBINADO: {
    label: 'Combinado / FCL', descripcion: 'Seco + refrigerado en una unidad',
    tempRequerida: true,
    equipamiento: {
      unidad: ['Reefer con divisor de temperatura (combo)','Verificación de ambas zonas','Termógrafo en zona refrigerada'],
      operador: ['Licencia federal vigente','Experiencia en unidades combo'],
      documentos: ['Carta Porte 3.1 especificando ambas cargas','Registro de temperatura zona fría'],
      cliente: ['Confirmar temperaturas de cada zona','Confirmar distribución de carga'],
    },
  },
  PLANA: {
    label: 'Plataforma', descripcion: 'Maquinaria, estructuras, carga oversized',
    tempRequerida: false, requierePermisos: true,
    equipamiento: {
      unidad: ['Plataforma o lowboy según dimensiones','Cintas de sujeción certificadas (mínimo 4)','Cadenas de seguridad si aplica','Lonas de protección','Gatas logísticas','Esquineros y separadores','Luces de advertencia si hay vuelo'],
      operador: ['Licencia federal tipo E si aplica','Experiencia en carga especializada','Casco, chaleco, guantes, botas de seguridad','Conocimiento de técnicas de sujeción'],
      documentos: ['Carta Porte 3.1','Permiso SCT para sobredimensionada si aplica','Memoria fotográfica de sujeción','Hoja de dimensiones y peso'],
      cliente: ['Confirmar dimensiones y peso exacto','Confirmar si requiere escolta','Confirmar rutas permitidas','Confirmar restricciones horarias'],
    },
  },
  PORTACONTENEDOR: {
    label: 'Portacontenedor', descripcion: "Contenedores marítimos 20' o 40'",
    tempRequerida: false,
    equipamiento: {
      unidad: ['Chasis portacontenedor en buen estado','Twistlocks operativos','Compatibilidad con tamaño del contenedor','Luces traseras funcionando'],
      operador: ['Licencia federal vigente','Conocimiento de patios portuarios','Documentación para acceso a puerto'],
      documentos: ['Carta Porte 3.1','Booking o release del contenedor','Número de contenedor y sello','BL o guía de transporte'],
      cliente: ['Confirmar número de contenedor','Confirmar patio de entrega/recepción','Confirmar si es cargado o vacío'],
    },
  },
  FRONTERIZO: {
    label: 'Cruce fronterizo', descripcion: 'Exportación/Importación México-EE.UU.',
    tempRequerida: false, requierePermisos: true, tasa0: true,
    equipamiento: {
      unidad: ['C-TPAT o FAST Lane si aplica','Estado mecánico óptimo','Sin modificaciones no declaradas','Sello de seguridad en buen estado'],
      operador: ['Visa láser o FAST Card','Licencia federal vigente','Conocimiento de procedimientos aduanales','Sin antecedentes penales'],
      documentos: ['Pedimento de exportación/importación','Carta Porte 3.1 (lado México)','Bill of Lading (lado USA)','Factura comercial bilingüe','Packing list','Certificado de origen T-MEC si aplica','Permisos SAGARPA si es alimento','Número de cruce / crossing appointment'],
      cliente: ['Confirmar broker aduanal ambos lados','Confirmar si es tasa 0% IVA','Confirmar si es transbordo o cruce directo','Confirmar si requiere fumigación'],
    },
  },
  HANDCARRY: {
    label: 'Hand Carry / Urgente', descripcion: 'Envío urgente en vehículo ligero',
    tempRequerida: false,
    equipamiento: {
      unidad: ['Vehículo ligero o Van según peso','GPS activo','Seguro de mercancía'],
      operador: ['Licencia vigente','Teléfono con ubicación compartida','Disponibilidad inmediata'],
      documentos: ['Remisión o factura','Comprobante de entrega firmado'],
      cliente: ['Confirmar dirección exacta','Confirmar contacto receptor con teléfono','Confirmar si requiere firma de recibido'],
    },
  },
  AEREO: {
    label: 'Aéreo', descripcion: 'Carga aérea nacional o internacional',
    tempRequerida: false,
    equipamiento: {
      unidad: ['Vehículo para recolección/entrega en aeropuerto'],
      operador: ['Acceso a zona de carga aeroportuaria','Conocimiento de regulaciones IATA'],
      documentos: ['Air Waybill (AWB)','Factura comercial','Packing list','Permisos especiales si aplica','Declaración DGR si es carga peligrosa'],
      cliente: ['Confirmar aeropuerto origen/destino','Confirmar si es carga peligrosa','Confirmar dimensiones y peso','Confirmar aerolínea si tiene preferencia'],
    },
  },
  MARITIMO: {
    label: 'Marítimo', descripcion: 'Carga marítima LCL o FCL',
    tempRequerida: false,
    equipamiento: {
      unidad: ['Transporte para recolección/entrega en puerto'],
      operador: ['Acceso a terminal portuaria si aplica'],
      documentos: ['Bill of Lading (BL)','Booking confirmation','Factura comercial','Packing list','Certificado de origen si aplica','VGM (Verified Gross Mass) si es FCL'],
      cliente: ['Confirmar puerto origen/destino','Confirmar LCL o FCL','Confirmar naviera si tiene preferencia','Confirmar INCOTERM','Confirmar si requiere seguro de carga'],
    },
  },
}

export const TIPOS_LISTA = Object.entries(TIPOS_SERVICIO).map(([key, val]) => ({
  key, label: val.label, descripcion: val.descripcion,
}))
