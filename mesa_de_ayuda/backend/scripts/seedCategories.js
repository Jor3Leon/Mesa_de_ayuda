const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { DEFAULT_CATEGORIES } = require('../lib/categories-data');

async function main() {
  console.log('Sincronizando catálogo oficial de categorías...');
  
  // Conectar con retry para Neon Serverless
  let connected = false;
  for (let i = 0; i < 3; i++) {
    try {
      await prisma.$connect();
      connected = true;
      break;
    } catch (err) {
      console.log(`Intento de conexión ${i + 1} fallido, reintentando en 2s...`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Eliminar categorías anteriores
  await prisma.ticketCategory.deleteMany({});

  let count = 0;
  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.ticketCategory.create({
      data: {
        group: cat.group,
        name: cat.name,
        ticketType: cat.ticketType,
        sla: cat.sla || '4 horas',
        isActive: true,
      }
    });
    count++;
  }
  console.log(`¡Sincronización completada con éxito! Se insertaron ${count} categorías oficiales.`);
}

main()
  .catch(e => {
    console.error('Error al ejecutar el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
