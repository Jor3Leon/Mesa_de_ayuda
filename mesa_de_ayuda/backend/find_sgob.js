const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function find() {
  const assets = await prisma.asset.findMany();
  console.log(`TOTAL ASSETS: ${assets.length}`);
  const filtered = assets.filter(a => a.hostname.includes('sgob') || (a.model && a.model.includes('sgob')));
  console.log(`FOUND SGOB ASSETS: ${filtered.length}`);
  filtered.forEach(a => console.log(JSON.stringify(a)));
  await prisma.$disconnect();
}
find();
