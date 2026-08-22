const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const roleName = 'USUARIO ESTANDAR';
  const role = await prisma.role.findFirst({
    where: { name: roleName },
    include: {
      permissions: {
        include: {
          permission: true
        }
      }
    }
  });

  if (!role) {
    console.log(`Role ${roleName} not found`);
  } else {
    console.log(`Role found: ${role.name}`);
    console.log('Permissions:');
    role.permissions.forEach(rp => {
      console.log(`- ${rp.permission.code}`);
    });
  }

  const users = await prisma.user.findMany({
    include: {
      role: true
    }
  });
  
  console.log('\nUsers:');
  users.forEach(u => {
    console.log(`- ${u.name} (Email: ${u.email}) Role: ${u.role ? u.role.name : 'NONE'}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
