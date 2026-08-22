const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function run() {
  const data = {
    customers: await p.customer.findMany(),
    users: await p.user.findMany(),
    locations: await p.location.findMany(),
    tickets: await p.ticket.findMany(),
    assets: await p.asset.findMany(),
    metrics: await p.metric.findMany(),
    maintenances: await p.maintenance.findMany(),
  };
  console.log(JSON.stringify(data, null, 2));
}
run().catch(console.error).finally(() => p.$disconnect());
