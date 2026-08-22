const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDb() {
  try {
    const userCount = await prisma.user.count();
    console.log('User count:', userCount);
    
    const users = await prisma.user.findMany({
      take: 5,
      select: { username: true, email: true, role: { select: { name: true } } }
    });
    console.log('Users:', JSON.stringify(users, null, 2));
    
    const assetCount = await prisma.asset.count();
    console.log('Asset count:', assetCount);
    
    const ticketCount = await prisma.ticket.count();
    console.log('Ticket count:', ticketCount);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDb();
