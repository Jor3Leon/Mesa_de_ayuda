const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const roles = await prisma.role.findMany();
  console.log('ROLES IN DB:');
  console.log(JSON.stringify(roles, null, 2));

  const users = await prisma.user.findMany({
    include: { role: true }
  });
  console.log('\nUSERS IN DB:');
  console.log(JSON.stringify(users.map(u => ({ id: u.id, name: u.name, role: u.role.name })), null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
