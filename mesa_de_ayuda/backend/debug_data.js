const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const activities = await prisma.ticketActivity.findMany({ take: 5 });
    console.log('TicketActivities:', JSON.stringify(activities, null, 2));
    
    const assets = await prisma.asset.findMany({ take: 5 });
    console.log('Assets:', JSON.stringify(assets, null, 2));
    
    const dashboardData = await prisma.ticket.groupBy({
      by: ['priority'],
      _count: { _all: true },
      where: { status: { not: 'CLOSED' } }
    });
    console.log('Dashboard Priority GroupBy:', JSON.stringify(dashboardData, null, 2));

  } catch (error) {
    console.error('Error querying data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
