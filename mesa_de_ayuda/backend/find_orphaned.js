const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function run() {
  const assets = await p.asset.findMany({ select: { id: true, hostname: true } });
  const assetIds = new Set(assets.map(a => a.id));
  
  const tickets = await p.ticket.findMany({ select: { assetId: true } });
  const maintenances = await p.maintenance.findMany({ select: { assetId: true } });
  
  const orphanedInTickets = tickets.filter(t => t.assetId && !assetIds.has(t.assetId)).map(t => t.assetId);
  const orphanedInMaintenances = maintenances.filter(m => m.assetId && !assetIds.has(m.assetId)).map(m => m.assetId);
  
  console.log('Existing Assets:', assets);
  console.log('Orphaned Asset IDs in Tickets:', [...new Set(orphanedInTickets)]);
  console.log('Orphaned Asset IDs in Maintenances:', [...new Set(orphanedInMaintenances)]);
}
run().catch(console.error).finally(() => p.$disconnect());
