const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const role = await prisma.role.findFirst({
    where: { name: { in: ['USUARIO ESTANDAR', 'Usuario Estandar'] } },
    include: {
      permissions: {
        include: { permission: true }
      }
    }
  });
  console.log('ROLE:', JSON.stringify(role, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
