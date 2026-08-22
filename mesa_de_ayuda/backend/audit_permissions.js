const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true
            }
          }
        }
      }
    }
  });

  console.log('--- USER PERMISSIONS AUDIT ---');
  for (const user of users) {
    console.log(`User: ${user.username} (${user.name})`);
    console.log(`Role: ${user.role?.name || 'N/A'}`);
    const perms = user.role?.permissions.map(p => p.permission.code) || [];
    console.log(`Permissions: ${perms.join(', ')}`);
    console.log('----------------------------');
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
