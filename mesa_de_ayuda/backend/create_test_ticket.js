
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { username: 'usuario.test' }
  });

  if (!user) {
    console.log('User usuario.test not found');
    return;
  }

  // Create a ticket for this user
  const ticket = await prisma.ticket.create({
    data: {
      title: 'TICKET DE PRUEBA MANUAL',
      description: 'Prueba de visibilidad',
      priority: 'BAJA',
      status: 'NEW',
      customerId: 1,
      createdById: user.id
    }
  });

  console.log('Ticket created for usuario.test (ID:', user.id, ') -> Ticket ID:', ticket.id);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
