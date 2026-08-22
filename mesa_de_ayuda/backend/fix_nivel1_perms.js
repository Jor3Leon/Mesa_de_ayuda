const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- FIXING NIVEL 1 PERMISSIONS ---');
  
  // Find NIVEL 1 role
  const role = await prisma.role.findUnique({
    where: { name: 'NIVEL 1' },
    include: { permissions: { include: { permission: true } } }
  });

  if (!role) {
    console.error('Role NIVEL 1 not found');
    return;
  }

  const permissionsToRemove = ['ANALYTICS_VIEW', 'TICKETS_VIEW_STATS', 'ASSETS_VIEW'];
  
  console.log(`Current permissions for NIVEL 1: ${role.permissions.map(p => p.permission.code).join(', ')}`);

  for (const code of permissionsToRemove) {
    const perm = await prisma.permission.findUnique({ where: { code } });
    if (perm) {
      await prisma.rolePermission.deleteMany({
        where: {
          roleId: role.id,
          permissionId: perm.id
        }
      });
      console.log(`Removed ${code} from NIVEL 1`);
    }
  }

  const updatedRole = await prisma.role.findUnique({
    where: { name: 'NIVEL 1' },
    include: { permissions: { include: { permission: true } } }
  });
  console.log(`Updated permissions for NIVEL 1: ${updatedRole.permissions.map(p => p.permission.code).join(', ')}`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
