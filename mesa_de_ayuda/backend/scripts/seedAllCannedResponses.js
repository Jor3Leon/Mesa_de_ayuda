// Seed script: backend/scripts/seedAllCannedResponses.js
// This script generates professional canned responses for ALL ticket categories.
// Run with: `node backend/scripts/seedAllCannedResponses.js`

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function generateIncidenciaContent(categoryName) {
  return `Estimado/a usuario/a,

Le informamos que la incidencia reportada bajo la categoría *${categoryName}* ha sido resuelta satisfactoriamente por nuestro equipo técnico.

**Acciones Realizadas:**
- Diagnóstico integral de la falla reportada.
- Aplicación de protocolos técnicos correctivos.
- Pruebas de validación y aseguramiento del servicio.

**Recomendaciones:**
- Verifique la operatividad en su terminal.
- Si detecta alguna anomalía residual, por favor repórtela de inmediato.

Agradecemos su paciencia durante este proceso.

Atentamente,
Departamento de Tecnología e Innovación`;
}

function generatePeticionContent(categoryName) {
  return `Estimado/a usuario/a,

Nos complace informarle que su solicitud referente a *${categoryName}* ha sido gestionada y completada exitosamente.

**Resumen de Ejecución:**
- Procesamiento de la solicitud según los estándares institucionales.
- Configuración y habilitación de los recursos solicitados.
- Verificación final de funcionamiento.

**Instrucciones Adicionales:**
- Los cambios o recursos ya se encuentran disponibles para su uso.
- Por favor, valide que todo se encuentre conforme a su requerimiento.

Quedamos a su entera disposición para futuros requerimientos.

Cordialmente,
Centro de Gestión de Servicios TI`;
}

async function main() {
  console.log('Iniciando alimentación de Base de Conocimientos...');

  // 1. Obtener todas las categorías
  const categories = await prisma.ticketCategory.findMany({
    where: { isActive: true }
  });

  console.log(`Se encontraron ${categories.length} categorías activas.`);

  // 2. Limpiar respuestas automáticas previas para evitar duplicados y desorden
  // Solo eliminamos las que tienen el prefijo "Solución:" o "Gestión:" para no borrar manuales si las hay
  // Pero el usuario pidió alimentar TODO, así que vamos a ser quirúrgicos.
  
  let createdCount = 0;

  for (const cat of categories) {
    const isIncidencia = cat.ticketType === 'Incidencia';
    const prefix = isIncidencia ? 'Solución:' : 'Gestión:';
    const title = `${prefix} ${cat.name} (${cat.ticketType})`;
    const content = isIncidencia ? generateIncidenciaContent(cat.name) : generatePeticionContent(cat.name);
    const shortcut = `/${cat.name.replace(/\s+/g, '').toLowerCase()}`;

    // Buscar si ya existe por título para no duplicar
    const existing = await prisma.cannedResponse.findFirst({
      where: { title }
    });

    if (existing) {
      await prisma.cannedResponse.update({
        where: { id: existing.id },
        data: {
          content,
          category: cat.name,
          ticketType: cat.ticketType,
          shortcut
        }
      });
    } else {
      await prisma.cannedResponse.create({
        data: {
          title,
          content,
          category: cat.name,
          ticketType: cat.ticketType,
          shortcut
        }
      });
    }
    createdCount++;
  }

  console.log(`✅ ¡Proceso completado! Se sincronizaron ${createdCount} respuestas predeterminadas.`);
}

main()
  .catch(e => {
    console.error('Error al sembrar respuestas:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
