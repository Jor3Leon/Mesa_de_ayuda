const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const assets = await prisma.asset.findMany();
  const antivirusVersion = 'Kaspersky Endpoint Security 12.10.0.46';

  console.log(`Actualizando Antivirus para ${assets.length} dispositivos...`);

  for (const asset of assets) {
    await prisma.asset.update({
      where: { id: asset.id },
      data: { agentVersion: antivirusVersion }
    });
    console.log(`Actualizado: ${asset.hostname} -> ${antivirusVersion}`);
  }

  console.log('Proceso de actualización de Antivirus completado.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
