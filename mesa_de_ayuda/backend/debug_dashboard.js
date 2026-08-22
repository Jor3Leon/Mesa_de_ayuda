const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const activities = await prisma.ticketActivity.findMany({
      take: 5,
      include: { ticket: true }
    });
    console.log('Recent Activities:', JSON.stringify(activities, null, 2));

    const counts = await prisma.ticket.groupBy({
      by: ['priority'],
      _count: { _all: true }
    });
    console.log('Tickets by Priority:', JSON.stringify(counts, null, 2));
  } catch (error) {
    console.error('Error debugging data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
