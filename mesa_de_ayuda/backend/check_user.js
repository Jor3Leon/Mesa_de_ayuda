const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findFirst({
    where: { email: { contains: 'ingred.quevedo' } },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true }
          }
        }
      }
    }
  });
  console.log(JSON.stringify(user, null, 2));
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
