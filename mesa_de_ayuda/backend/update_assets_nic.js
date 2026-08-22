const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const assets = await prisma.asset.findMany();
  console.log(`Actualizando Hardware de Red (NIC) para ${assets.length} dispositivos...`);

  const nicModels = [
    'Intel Ethernet Connection I219-V (Integrated)',
    'Realtek PCIe GbE Family Controller',
    'Broadcom NetXtreme Gigabit Ethernet',
    'Intel Wi-Fi 6 AX201 (Gig+)',
    'Killer E2600 Gigabit Ethernet Controller',
    'Marvell AQC113 10GbE Network Adapter'
  ];

  for (const asset of assets) {
    // Escolher um modelo aleatório ou baseado no tipo
    let nic = '';
    if (asset.deviceType === 'Servidor') {
      nic = 'Dual Intel I350 Gigabit Network Connection (LOM)';
    } else if (asset.hostname.includes('NET')) {
      nic = 'Integrated OEM Network Bridge Controller';
    } else {
      nic = nicModels[Math.floor(Math.random() * nicModels.length)];
    }

    await prisma.asset.update({
      where: { id: asset.id },
      data: { 
        networkSummary: nic,
        // Limpiar cualquier otra cosa si es necesario
      }
    });
    
    console.log(`Actualizado: ${asset.hostname} -> ${nic}`);
  }

  console.log('Inventario actualizado con hardware de red (NIC).');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
