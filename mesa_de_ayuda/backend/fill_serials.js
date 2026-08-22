const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const assets = await prisma.asset.findMany();
  console.log(`Regenerando seriales para ${assets.length} dispositivos...`);

  for (const asset of assets) {
    const randomHex = Math.random().toString(16).substring(2, 10).toUpperCase();
    const prefix = asset.deviceType === 'Escritorio' ? 'PC' : (asset.deviceType === 'Servidor' ? 'SRV' : 'NET');
    const newSerial = `${prefix}-${randomHex}-${asset.id.toString().padStart(3, '0')}`;
    
    await prisma.asset.update({
      where: { id: asset.id },
      data: { serialNumber: newSerial }
    });
    
    console.log(`${asset.hostname} -> ${newSerial}`);
  }

  console.log('Proceso completado.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
