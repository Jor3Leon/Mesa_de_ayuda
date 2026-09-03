const DEFAULT_CATEGORIES = [
  // ==========================================
  // 🚨 INCIDENCIAS (12 categorías)
  // ==========================================
  { group: 'Sistemas de la Información', name: 'QfDocument', ticketType: 'Incidencia', sla: '2 horas' },
  { group: 'Sistemas de la Información', name: 'QfCalidad', ticketType: 'Incidencia', sla: '2 horas' },
  { group: 'Sistemas de la Información', name: 'Contractvs', ticketType: 'Incidencia', sla: '2 horas' },
  { group: 'Sistemas de la Información', name: 'Contractvs ERP', ticketType: 'Incidencia', sla: '2 horas' },
  { group: 'Sistemas de la Información', name: 'Universo', ticketType: 'Incidencia', sla: '2 horas' },
  { group: 'Sistemas de la Información', name: 'Mesa de ayuda', ticketType: 'Incidencia', sla: '1 hora' },

  { group: 'Infraestructura - Equipos', name: 'Hardware', ticketType: 'Incidencia', sla: '4 horas' },
  { group: 'Infraestructura - Equipos', name: 'Software', ticketType: 'Incidencia', sla: '2 horas' },

  { group: 'Infraestructura - Red', name: 'Internet', ticketType: 'Incidencia', sla: '1 hora' },
  { group: 'Infraestructura - Red', name: 'WiFi', ticketType: 'Incidencia', sla: '1 hora' },

  { group: 'Infraestructura - Impresoras/Escáneres', name: 'Revisión Impresora', ticketType: 'Incidencia', sla: '3 horas' },
  { group: 'Infraestructura - Impresoras/Escáneres', name: 'Revisión Escáner', ticketType: 'Incidencia', sla: '3 horas' },

  // ==========================================
  // 📋 SOLICITUDES (28 categorías)
  // ==========================================
  // Sistemas de la Información
  { group: 'Sistemas de la Información', name: 'QfDocument', ticketType: 'Solicitud', sla: '4 horas' },
  { group: 'Sistemas de la Información', name: 'QfCalidad', ticketType: 'Solicitud', sla: '4 horas' },
  { group: 'Sistemas de la Información', name: 'Contractvs', ticketType: 'Solicitud', sla: '4 horas' },
  { group: 'Sistemas de la Información', name: 'Contractvs ERP', ticketType: 'Solicitud', sla: '4 horas' },
  { group: 'Sistemas de la Información', name: 'Universo', ticketType: 'Solicitud', sla: '4 horas' },
  { group: 'Sistemas de la Información', name: 'Portal Universo', ticketType: 'Solicitud', sla: '4 horas' },
  { group: 'Sistemas de la Información', name: 'Mesa de Ayuda', ticketType: 'Solicitud', sla: '2 horas' },

  // Credenciales de Acceso
  { group: 'Credenciales de Acceso', name: 'Creación de usuarios', ticketType: 'Solicitud', sla: '2 horas' },
  { group: 'Credenciales de Acceso', name: 'Restablecer Contraseña', ticketType: 'Solicitud', sla: '1 hora' },
  { group: 'Credenciales de Acceso', name: 'Activar/Desactivar usuarios', ticketType: 'Solicitud', sla: '1 hora' },

  // Soporte Universo Online
  { group: 'Soporte Universo Online', name: 'Contador', ticketType: 'Solicitud', sla: '4 horas' },
  { group: 'Soporte Universo Online', name: 'Tesorería', ticketType: 'Solicitud', sla: '4 horas' },
  { group: 'Soporte Universo Online', name: 'Recaudo', ticketType: 'Solicitud', sla: '4 horas' },
  { group: 'Soporte Universo Online', name: 'Contabilidad', ticketType: 'Solicitud', sla: '4 horas' },
  { group: 'Soporte Universo Online', name: 'Talento Humano', ticketType: 'Solicitud', sla: '4 horas' },
  { group: 'Soporte Universo Online', name: 'Cuentas', ticketType: 'Solicitud', sla: '4 horas' },
  { group: 'Soporte Universo Online', name: 'Transito', ticketType: 'Solicitud', sla: '4 horas' },
  { group: 'Soporte Universo Online', name: 'Industria y Comercio', ticketType: 'Solicitud', sla: '4 horas' },
  { group: 'Soporte Universo Online', name: 'Predial', ticketType: 'Solicitud', sla: '4 horas' },

  // Infraestructura - Equipos
  { group: 'Infraestructura - Equipos', name: 'Hardware', ticketType: 'Solicitud', sla: '8 horas' },
  { group: 'Infraestructura - Equipos', name: 'Software', ticketType: 'Solicitud', sla: '4 horas' },

  // Infraestructura - Red
  { group: 'Infraestructura - Red', name: 'Usuario de Red', ticketType: 'Solicitud', sla: '2 horas' },
  { group: 'Infraestructura - Red', name: 'Internet', ticketType: 'Solicitud', sla: '2 horas' },
  { group: 'Infraestructura - Red', name: 'WiFi', ticketType: 'Solicitud', sla: '2 horas' },

  // Infraestructura - Impresoras/Escáneres
  { group: 'Infraestructura - Impresoras/Escáneres', name: 'Instalación Impresora', ticketType: 'Solicitud', sla: '4 horas' },
  { group: 'Infraestructura - Impresoras/Escáneres', name: 'Instalación Escáner', ticketType: 'Solicitud', sla: '4 horas' },
  { group: 'Infraestructura - Impresoras/Escáneres', name: 'Cambio de Tinta/Tóner', ticketType: 'Solicitud', sla: '2 horas' },

  // Plan de Mantenimiento
  { group: 'Plan de Mantenimiento', name: 'Equipo de Computo', ticketType: 'Solicitud', sla: '24 horas' },
  { group: 'Plan de Mantenimiento', name: 'Impresora/Escáner', ticketType: 'Solicitud', sla: '24 horas' },

  // Correo Institucional
  { group: 'Correo Institucional', name: 'Creación', ticketType: 'Solicitud', sla: '2 horas' },
  { group: 'Correo Institucional', name: 'Soporte', ticketType: 'Solicitud', sla: '2 horas' },
  { group: 'Correo Institucional', name: 'Restablecer contraseña', ticketType: 'Solicitud', sla: '1 hora' },
];

async function ensureDefaultCategories(prisma, organizationId = null) {
  try {
    for (const cat of DEFAULT_CATEGORIES) {
      const existing = await prisma.ticketCategory.findFirst({
        where: {
          name: cat.name,
          ticketType: cat.ticketType,
          group: cat.group,
          ...(organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : {})
        }
      });

      if (!existing) {
        await prisma.ticketCategory.create({
          data: {
            group: cat.group,
            name: cat.name,
            ticketType: cat.ticketType,
            sla: cat.sla,
            isActive: true,
            organizationId: organizationId || null
          }
        });
      }
    }
  } catch (err) {
    console.error('Error ensuring default categories:', err.message);
  }
}

module.exports = { DEFAULT_CATEGORIES, ensureDefaultCategories };
