const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function list() {
  const assets = await prisma.asset.findMany();
  console.log('--- ASSETS ---');
  assets.forEach(a => console.log(`- ${a.hostname} (Model: ${a.model}, Location: ${a.locationId})`));
  await prisma.$disconnect();
}
list();
