const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function run() {
  const seq = await p.$queryRaw`SELECT * FROM sqlite_sequence WHERE name='Asset'`;
  console.log(seq);
}
run().catch(console.error).finally(() => p.$disconnect());
