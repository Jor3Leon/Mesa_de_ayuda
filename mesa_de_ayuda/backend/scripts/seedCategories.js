const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const categories = [
  // INCIDENCIAS
  { group: 'Sistemas de la Información', name: 'QfDocument', ticketType: 'Incidencia' },
  { group: 'Sistemas de la Información', name: 'QfCalidad', ticketType: 'Incidencia' },
  { group: 'Sistemas de la Información', name: 'Contractvs', ticketType: 'Incidencia' },
  { group: 'Sistemas de la Información', name: 'Contractvs ERP', ticketType: 'Incidencia' },
  { group: 'Sistemas de la Información', name: 'Universo', ticketType: 'Incidencia' },
  { group: 'Sistemas de la Información', name: 'Mesa de ayuda', ticketType: 'Incidencia' },

  { group: 'Infraestructura - Equipos', name: 'Hardware', ticketType: 'Incidencia' },
  { group: 'Infraestructura - Equipos', name: 'Software', ticketType: 'Incidencia' },

  { group: 'Infraestructura - Red', name: 'Internet', ticketType: 'Incidencia' },
  { group: 'Infraestructura - Red', name: 'WiFi', ticketType: 'Incidencia' },

  { group: 'Infraestructura - Impresoras/Escáneres', name: 'Revisión Impresora', ticketType: 'Incidencia' },
  { group: 'Infraestructura - Impresoras/Escáneres', name: 'Revisión Escáner', ticketType: 'Incidencia' },

  // PETICIONES (SOLICITUD)
  { group: 'Sistemas de la Información', name: 'QfDocument', ticketType: 'Petición' },
  { group: 'Sistemas de la Información', name: 'QfCalidad', ticketType: 'Petición' },
  { group: 'Sistemas de la Información', name: 'Contractvs', ticketType: 'Petición' },
  { group: 'Sistemas de la Información', name: 'Contractvs ERP', ticketType: 'Petición' },
  { group: 'Sistemas de la Información', name: 'Universo', ticketType: 'Petición' },
  { group: 'Sistemas de la Información', name: 'Portal Universo', ticketType: 'Petición' },
  { group: 'Sistemas de la Información', name: 'Mesa de Ayuda', ticketType: 'Petición' },

  { group: 'Credenciales de Acceso', name: 'Creación de usuarios', ticketType: 'Petición' },
  { group: 'Credenciales de Acceso', name: 'Restablecer Contraseña', ticketType: 'Petición' },
  { group: 'Credenciales de Acceso', name: 'Activar/Desactivar usuarios', ticketType: 'Petición' },

  { group: 'Soporte Universo Online', name: 'Contador', ticketType: 'Petición' },
  { group: 'Soporte Universo Online', name: 'Tesorería', ticketType: 'Petición' },
  { group: 'Soporte Universo Online', name: 'Recaudo', ticketType: 'Petición' },
  { group: 'Soporte Universo Online', name: 'Contabilidad', ticketType: 'Petición' },
  { group: 'Soporte Universo Online', name: 'Talento Humano', ticketType: 'Petición' },
  { group: 'Soporte Universo Online', name: 'Cuentas', ticketType: 'Petición' },
  { group: 'Soporte Universo Online', name: 'Transito', ticketType: 'Petición' },
  { group: 'Soporte Universo Online', name: 'Industria y Comercio', ticketType: 'Petición' },
  { group: 'Soporte Universo Online', name: 'Predial', ticketType: 'Petición' },

  { group: 'Infraestructura - Equipos', name: 'Hardware', ticketType: 'Petición' },
  { group: 'Infraestructura - Equipos', name: 'Software', ticketType: 'Petición' },

  { group: 'Infraestructura - Red', name: 'Usuario de Red', ticketType: 'Petición' },
  { group: 'Infraestructura - Red', name: 'Internet', ticketType: 'Petición' },
  { group: 'Infraestructura - Red', name: 'WiFi', ticketType: 'Petición' },

  { group: 'Infraestructura - Impresoras/Escáneres', name: 'Instalación Impresora', ticketType: 'Petición' },
  { group: 'Infraestructura - Impresoras/Escáneres', name: 'Instalación Escáner', ticketType: 'Petición' },
  { group: 'Infraestructura - Impresoras/Escáneres', name: 'Cambio de Tinta/Tóner', ticketType: 'Petición' },

  { group: 'Plan de Mantenimiento', name: 'Equipo de Computo', ticketType: 'Petición' },
  { group: 'Plan de Mantenimiento', name: 'Impresora/Escáner', ticketType: 'Petición' },

  { group: 'Correo Institucional', name: 'Creación', ticketType: 'Petición' },
  { group: 'Correo Institucional', name: 'Soporte', ticketType: 'Petición' },
  { group: 'Correo Institucional', name: 'Restablecer contraseña', ticketType: 'Petición' },
];

async function main() {
  console.log('Limpiando categorías existentes...');
  await prisma.ticketCategory.deleteMany({});

  console.log('Insertando nuevas categorías estructuradas...');
  let count = 0;
  for (const cat of categories) {
    // Por el momento no asignamos un SLA por defecto. Si se desea, se puede cambiar a sla: "4h"
    await prisma.ticketCategory.create({
      data: {
        ...cat,
        sla: null,
        isActive: true,
      }
    });
    count++;
  }
  console.log(`¡Sembrado completado! Se insertaron ${count} categorías.`);
}

main()
  .catch(e => {
    console.error('Error al ejecutar el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
