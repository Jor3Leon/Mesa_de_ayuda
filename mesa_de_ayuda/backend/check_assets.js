const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function run() {
  const assets = await p.asset.findMany();
  console.log(JSON.stringify(assets, null, 2));
}
run().catch(console.error).finally(() => p.$disconnect());
