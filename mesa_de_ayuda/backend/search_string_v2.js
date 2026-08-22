const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function run() {
  const replacer = (key, value) => typeof value === 'bigint' ? value.toString() : value;
  const tables = await p.$queryRaw`SELECT name FROM sqlite_master WHERE type='table'`;
  for (const table of tables) {
    if (table.name.startsWith('_') || table.name.startsWith('sqlite_')) continue;
    const data = await p.$queryRawUnsafe(`SELECT * FROM ${table.name}`);
    const str = JSON.stringify(data, replacer);
    if (str.includes('stic22191')) {
      console.log(`FOUND stic22191 IN TABLE ${table.name}`);
      console.log(data);
    }
  }
}
run().catch(console.error).finally(() => p.$disconnect());
