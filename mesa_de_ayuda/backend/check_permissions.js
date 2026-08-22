const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const roles = await prisma.role.findMany({
    include: {
      permissions: {
        include: {
          permission: true
        }
      }
    }
  });

  console.log('--- ROLES ---');
  roles.forEach(role => {
    console.log(`Role: ${role.name} (${role.id})`);
    console.log(`Permissions: ${role.permissions.map(p => p.permission.code).join(', ')}`);
    console.log('----------------');
  });

  const users = await prisma.user.findMany({
    include: {
      role: true
    }
  });

  console.log('\n--- USERS ---');
  users.forEach(user => {
    console.log(`User: ${user.name} (${user.username}) - Role: ${user.role?.name || 'NONE'}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
