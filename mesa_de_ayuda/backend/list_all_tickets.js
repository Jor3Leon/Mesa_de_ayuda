
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tickets = await prisma.ticket.findMany({
    include: {
      createdBy: true
    }
  });

  console.log('Total tickets:', tickets.length);
  tickets.forEach(t => {
    console.log(`Ticket ID: ${t.id}, Title: ${t.title}, CreatedBy: ${t.createdBy ? t.createdBy.username : 'NULL'} (ID: ${t.createdById})`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
