const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const role = await prisma.role.findFirst({
    where: { name: 'USUARIO ESTANDAR' },
    include: {
      permissions: {
        include: { permission: true }
      }
    }
  });
  console.log(JSON.stringify(role, null, 2));
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
