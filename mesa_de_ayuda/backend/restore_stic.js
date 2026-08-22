const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function run() {
  const asset = await p.asset.create({
    data: {
      hostname: 'stic22191',
      ipAddress: '172.16.22.191',
      osType: 'Windows',
      osVersion: 'Pro 11 x64',
      status: 'ONLINE',
      serialNumber: 'STIC22191-SN',
      brand: 'Dell',
      model: 'OptiPlex 7000',
      deviceType: 'Escritorio',
      assignedUser: 'Funcionario STIC',
      location: 'Palacio Municipal - Piso 2',
      agentVersion: 'MDS Agent 2.5.1',
      lastSeenAt: new Date(),
      motherboard: 'Dell OEM Board',
      cpuModel: 'Intel Core i7-12700',
      ramSummary: '16 GB DDR4',
      storageSummary: 'SSD 512 GB',
      networkSummary: 'Ethernet 1 Gbps / IPv4 172.16.22.191',
      graphicsInfo: 'Intel UHD Graphics',
      notes: 'Dispositivo restaurado a petición del usuario.',
      customerId: 1
    }
  });
  console.log('Restored asset:', asset);
}
run().catch(console.error).finally(() => p.$disconnect());
