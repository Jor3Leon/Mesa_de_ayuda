
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { username: 'usuario.test' },
    include: { role: { include: { permissions: { include: { permission: true } } } } }
  });

  if (!user) {
    console.log('User usuario.test not found');
    return;
  }

  console.log('User Info:');
  console.log('ID:', user.id);
  console.log('Username:', user.username);
  console.log('Role:', user.role.name);
  console.log('Permissions:', user.role.permissions.map(p => p.permission.code));

  const ticketCount = await prisma.ticket.count({
    where: { createdById: user.id }
  });
  console.log('Ticket count for this user (createdById):', ticketCount);

  const allTicketsForUser = await prisma.ticket.findMany({
    where: { createdById: user.id }
  });
  console.log('Tickets:', JSON.stringify(allTicketsForUser, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
