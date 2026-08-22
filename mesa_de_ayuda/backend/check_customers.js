const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function run() {
  const c = await p.customer.findMany();
  console.log(JSON.stringify(c, null, 2));
}
run().catch(console.error).finally(() => p.$disconnect());
