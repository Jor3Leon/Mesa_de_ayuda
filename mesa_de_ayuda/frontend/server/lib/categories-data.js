const DEFAULT_CATEGORIES = [
  // INCIDENCIAS (12 categorías)
  { group: 'Sistemas de la Información', name: 'QfDocument', ticketType: 'Incidencia', sla: '2 horas' },
  { group: 'Sistemas de la Información', name: 'QfCalidad', ticketType: 'Incidencia', sla: '2 horas' },
  { group: 'Sistemas de la Información', name: 'Contractvs', ticketType: 'Incidencia', sla: '2 horas' },
  { group: 'Sistemas de la Información', name: 'Contractvs ERP', ticketType: 'Incidencia', sla: '2 horas' },
  { group: 'Sistemas de la Información', name: 'Universo', ticketType: 'Incidencia', sla: '2 horas' },
  { group: 'Sistemas de la Información', name: 'Mesa de ayuda', ticketType: 'Incidencia', sla: '1 hora' },

  { group: 'Infraestructura - Equipos', name: 'Hardware', ticketType: 'Incidencia', sla: '4 horas' },
  { group: 'Infraestructura - Equipos', name: 'Software y Ofimática', ticketType: 'Incidencia', sla: '2 horas' },

  { group: 'Infraestructura - Red', name: 'Internet', ticketType: 'Incidencia', sla: '1 hora' },
  { group: 'Infraestructura - Red', name: 'WiFi', ticketType: 'Incidencia', sla: '1 hora' },

  { group: 'Infraestructura - Impresoras/Escáneres', name: 'Revisión Impresora', ticketType: 'Incidencia', sla: '3 horas' },
  { group: 'Infraestructura - Impresoras/Escáneres', name: 'Revisión Escáner', ticketType: 'Incidencia', sla: '3 horas' },

  // PETICIONES / SOLICITUDES (23 categorías)
  { group: 'Sistemas de la Información', name: 'QfDocument', ticketType: 'Petición', sla: '4 horas' },
  { group: 'Sistemas de la Información', name: 'QfCalidad', ticketType: 'Petición', sla: '4 horas' },
  { group: 'Sistemas de la Información', name: 'Contractvs', ticketType: 'Petición', sla: '4 horas' },
  { group: 'Sistemas de la Información', name: 'Contractvs ERP', ticketType: 'Petición', sla: '4 horas' },
  { group: 'Sistemas de la Información', name: 'Universo', ticketType: 'Petición', sla: '4 horas' },
  { group: 'Sistemas de la Información', name: 'Portal Universo', ticketType: 'Petición', sla: '4 horas' },
  { group: 'Sistemas de la Información', name: 'Mesa de Ayuda', ticketType: 'Petición', sla: '2 horas' },

  { group: 'Credenciales de Acceso', name: 'Creación de usuarios', ticketType: 'Petición', sla: '2 horas' },
  { group: 'Credenciales de Acceso', name: 'Restablecer Contraseña', ticketType: 'Petición', sla: '1 hora' },
  { group: 'Credenciales de Acceso', name: 'Activar/Desactivar usuarios', ticketType: 'Petición', sla: '1 hora' },

  { group: 'Soporte Universo Online', name: 'Contador', ticketType: 'Petición', sla: '4 horas' },
  { group: 'Soporte Universo Online', name: 'Tesorería', ticketType: 'Petición', sla: '4 horas' },
  { group: 'Soporte Universo Online', name: 'Recaudo', ticketType: 'Petición', sla: '4 horas' },
  { group: 'Soporte Universo Online', name: 'Contabilidad', ticketType: 'Petición', sla: '4 horas' },
  { group: 'Soporte Universo Online', name: 'Talento Humano', ticketType: 'Petición', sla: '4 horas' },
  { group: 'Soporte Universo Online', name: 'Cuentas', ticketType: 'Petición', sla: '4 horas' },
  { group: 'Soporte Universo Online', name: 'Transito', ticketType: 'Petición', sla: '4 horas' },
  { group: 'Soporte Universo Online', name: 'Industria y Comercio', ticketType: 'Petición', sla: '4 horas' },
  { group: 'Soporte Universo Online', name: 'Predial', ticketType: 'Petición', sla: '4 horas' },

  { group: 'Infraestructura - Equipos', name: 'Hardware', ticketType: 'Petición', sla: '8 horas' },
  { group: 'Infraestructura - Equipos', name: 'Software', ticketType: 'Petición', sla: '4 horas' },

  { group: 'Infraestructura - Red', name: 'Usuario de Red', ticketType: 'Petición', sla: '2 horas' },
  { group: 'Infraestructura - Red', name: 'Internet', ticketType: 'Petición', sla: '2 horas' },
  { group: 'Infraestructura - Red', name: 'WiFi', ticketType: 'Petición', sla: '2 horas' },

  { group: 'Infraestructura - Impresoras/Escáneres', name: 'Instalación Impresora', ticketType: 'Petición', sla: '4 horas' },
  { group: 'Infraestructura - Impresoras/Escáneres', name: 'Instalación Escáner', ticketType: 'Petición', sla: '4 horas' },
  { group: 'Infraestructura - Impresoras/Escáneres', name: 'Cambio de Tinta/Tóner', ticketType: 'Petición', sla: '2 horas' },

  { group: 'Plan de Mantenimiento', name: 'Equipo de Computo', ticketType: 'Petición', sla: '24 horas' },
  { group: 'Plan de Mantenimiento', name: 'Impresora/Escáner', ticketType: 'Petición', sla: '24 horas' },

  { group: 'Correo Institucional', name: 'Creación', ticketType: 'Petición', sla: '2 horas' },
  { group: 'Correo Institucional', name: 'Soporte', ticketType: 'Petición', sla: '2 horas' },
  { group: 'Correo Institucional', name: 'Restablecer contraseña', ticketType: 'Petición', sla: '1 hora' },
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
