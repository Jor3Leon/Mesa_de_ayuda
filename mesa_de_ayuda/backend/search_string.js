const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function run() {
  const tables = await p.$queryRaw`SELECT name FROM sqlite_master WHERE type='table'`;
  console.log('Tables:', tables);
  for (const table of tables) {
    if (table.name.startsWith('_')) continue;
    const count = await p.$queryRawUnsafe(`SELECT COUNT(*) as count FROM ${table.name}`);
    console.log(`Table ${table.name} count:`, count);
    if (count[0].count > 0) {
      const data = await p.$queryRawUnsafe(`SELECT * FROM ${table.name}`);
      const found = JSON.stringify(data).includes('stic22191');
      if (found) {
        console.log(`FOUND stic22191 IN TABLE ${table.name}`);
      }
    }
  }
}
run().catch(console.error).finally(() => p.$disconnect());
