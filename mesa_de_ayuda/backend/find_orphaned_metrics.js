const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function run() {
  const assets = await p.asset.findMany({ select: { id: true, hostname: true } });
  const assetIds = new Set(assets.map(a => a.id));
  const metrics = await p.metric.findMany({ select: { assetId: true } });
  const orphanedInMetrics = metrics.filter(m => !assetIds.has(m.assetId)).map(m => m.assetId);
  console.log('Orphaned Asset IDs in Metrics:', [...new Set(orphanedInMetrics)]);
}
run().catch(console.error).finally(() => p.$disconnect());
