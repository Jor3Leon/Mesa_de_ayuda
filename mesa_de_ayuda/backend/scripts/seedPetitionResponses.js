// Seed script: backend/scripts/seedPetitionResponses.js
// This script generates professional canned responses for all "Petición" ticket categories.
// Run with: `node backend/scripts/seedPetitionResponses.js`

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to generate a generic yet formal response based on category name
function generateContent(categoryName) {
  return `Estimado/a solicitante,

En respuesta a su petición referente a *${categoryName}*, le informamos lo siguiente:

1. **Descripción del proceso**: Detallamos los pasos técnicos que se llevarán a cabo para atender su solicitud.
2. **Requisitos**: Lista de información o acceso necesario por parte del solicitante.
3. **Plazo estimado**: Según el SLA configurado para la categoría, el tiempo estimado de resolución es de 48 horas hábiles.
4. **Contacto**: Para cualquier duda adicional, por favor contacte al equipo de soporte técnico.

Quedamos a su disposición para cualquier aclaración.

Saludos cordiales,
Equipo de Soporte Técnico`;
}

async function main() {
  console.log('Obteniendo categorías de tipo Petición...');
  const categories = await prisma.ticketCategory.findMany({
    where: { ticketType: 'Petición' },
    select: { name: true, group: true }
  });

  for (const cat of categories) {
    const title = `Respuesta estándar para ${cat.name}`;
    const content = generateContent(cat.name);
    const shortcut = `/${cat.name.replace(/\s+/g, '').toLowerCase()}`;

    // Upsert to avoid duplicates
    await prisma.cannedResponse.upsert({
      where: { title },
      update: { content, category: cat.name, ticketType: 'Petición', shortcut },
      create: {
        title,
        content,
        category: cat.name,
        ticketType: 'Petición',
        shortcut,
      },
    });
    console.log(`✅ Creada/actualizada respuesta para ${cat.name}`);
  }
}

main()
  .catch(e => {
    console.error('Error al sembrar respuestas de Petición:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
