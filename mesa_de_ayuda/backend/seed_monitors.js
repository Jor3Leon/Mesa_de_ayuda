const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const screens = [
    { hostname: 'SHAC9351', model: 'HP LV1911', brand: 'HP', deviceType: 'Monitor', serialNumber: 'SN-MNT-9351', status: 'ONLINE', osType: 'Non-OS', osVersion: 'v1.0', lastSeenAt: new Date(), ipAddress: '0.0.0.0', customerId: 1 },
    { hostname: 'SHAC2745', model: 'HP LV2011', brand: 'HP', deviceType: 'Monitor', serialNumber: 'SN-MNT-2745', status: 'ONLINE', osType: 'Non-OS', osVersion: 'v1.0', lastSeenAt: new Date(), ipAddress: '0.0.0.0', customerId: 1 }
  ];

  console.log(`Registrando ${screens.length} monitores como activos independientes...`);

  for (const screen of screens) {
    await prisma.asset.upsert({
      where: { hostname: screen.hostname },
      update: screen,
      create: screen
    });
    console.log(`Registrado: ${screen.hostname}`);
  }

  console.log('Monitores registrados correctamente.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
