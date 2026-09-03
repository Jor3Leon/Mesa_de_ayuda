const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('./auth');

const prisma = new PrismaClient();

const defaultRandomPass = process.env.SEED_DEFAULT_PASSWORD || crypto.randomBytes(16).toString('hex');

const DEFAULT_PASSWORDS = {
  admin: process.env.SEED_ADMIN_PASSWORD || defaultRandomPass,
  level1: process.env.SEED_LEVEL1_PASSWORD || defaultRandomPass,
  level2: process.env.SEED_LEVEL2_PASSWORD || defaultRandomPass,
  level3: process.env.SEED_LEVEL3_PASSWORD || defaultRandomPass,
};

async function main() {
  console.log('🌱 Seeding multi-tenant PostgreSQL database...');

  // 1. Seed Default Organization
  const org = await prisma.organization.upsert({
    where: { slug: 'stic' },
    update: {
      name: 'Alcaldía de Yopal - STIC',
      plan: 'ENTERPRISE',
      isActive: true,
    },
    create: {
      name: 'Alcaldía de Yopal - STIC',
      slug: 'stic',
      plan: 'ENTERPRISE',
      isActive: true,
    },
  });
  console.log(`✅ Organización creada/actualizada: ${org.name} (ID: ${org.id}, Slug: ${org.slug})`);

  // 2. Seed Customer
  let customer = await prisma.customer.findFirst({
    where: { email: 'soporte@yopal.gov.co', organizationId: org.id },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        name: 'Alcaldía de Yopal',
        email: 'soporte@yopal.gov.co',
        organizationId: org.id,
      },
    });
  }

  // 3. Seed Permissions (Global definitions)
  const permissionsData = [
    { code: 'TICKETS_VIEW', name: 'Ver Tickets', description: 'Permite ver la lista de tickets y detalles.' },
    { code: 'TICKETS_CREATE', name: 'Crear Tickets', description: 'Permite crear nuevos tickets.' },
    { code: 'TICKETS_EDIT', name: 'Editar Tickets', description: 'Permite modificar tickets existentes.' },
    { code: 'TICKETS_ASSIGN', name: 'Asignar Tickets', description: 'Permite asignar tickets a técnicos.' },
    { code: 'TICKETS_CONFIGURE', name: 'Configurar Campos Administrativos', description: 'Permite modificar tipo, categoria, ANS, tecnico asignado y seguimiento del ticket.' },
    { code: 'TICKETS_VIEW_STATS', name: 'Ver Estadísticas de Tickets', description: 'Permite ver el tablero de estadísticas en la vista de tickets.' },
    { code: 'ASSETS_VIEW', name: 'Ver Inventario', description: 'Permite ver el inventario de activos.' },
    { code: 'ASSETS_MANAGE', name: 'Gestionar Inventario', description: 'Permite crear, editar y eliminar activos.' },
    { code: 'USERS_MANAGE', name: 'Gestionar Usuarios', description: 'Permite administrar usuarios de la plataforma.' },
    { code: 'ROLES_MANAGE', name: 'Gestionar Roles y Permisos', description: 'Permite administrar roles, niveles de acceso y permisos.' },
    { code: 'ANALYTICS_VIEW', name: 'Ver Estadísticas', description: 'Permite ver tableros de control y reportes.' },
  ];

  const permissions = {};
  for (const p of permissionsData) {
    permissions[p.code] = await prisma.permission.upsert({
      where: { code: p.code },
      update: { name: p.name, description: p.description },
      create: p,
    });
  }

  // 4. Seed Roles (Tenant Scoped)
  const rolesData = [
    {
      name: 'ADMIN',
      description: 'Administrador total del sistema',
      permissionCodes: permissionsData.map(p => p.code),
    },
    {
      name: 'NIVEL 1',
      description: 'Técnico Nivel 1 - Soporte Básico',
      permissionCodes: ['TICKETS_VIEW', 'TICKETS_CREATE', 'TICKETS_EDIT', 'ASSETS_VIEW'],
    },
    {
      name: 'NIVEL 2',
      description: 'Técnico Nivel 2 - Especialista',
      permissionCodes: ['TICKETS_VIEW', 'TICKETS_CREATE', 'TICKETS_EDIT', 'TICKETS_ASSIGN', 'TICKETS_CONFIGURE', 'TICKETS_VIEW_STATS', 'ASSETS_VIEW', 'ASSETS_MANAGE'],
    },
    {
      name: 'NIVEL 3',
      description: 'Técnico Nivel 3 - Coordinador/Infraestructura',
      permissionCodes: ['TICKETS_VIEW', 'TICKETS_CREATE', 'TICKETS_EDIT', 'TICKETS_ASSIGN', 'TICKETS_CONFIGURE', 'TICKETS_VIEW_STATS', 'ASSETS_VIEW', 'ASSETS_MANAGE', 'ANALYTICS_VIEW', 'ROLES_MANAGE'],
    },
    {
      name: 'USUARIO ESTANDAR',
      description: 'Usuario final - Solo creación de tickets',
      permissionCodes: ['TICKETS_VIEW', 'TICKETS_CREATE'],
    },
  ];

  const roles = {};
  for (const r of rolesData) {
    const { permissionCodes, ...roleData } = r;
    let role = await prisma.role.findFirst({
      where: { name: roleData.name, organizationId: org.id },
    });

    if (role) {
      role = await prisma.role.update({
        where: { id: role.id },
        data: { description: roleData.description },
      });
    } else {
      role = await prisma.role.create({
        data: {
          ...roleData,
          organizationId: org.id,
        },
      });
    }

    roles[role.name] = role;

    // Sync Permissions
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissionCodes.map(code => ({
        roleId: role.id,
        permissionId: permissions[code].id,
      })),
    });
  }

  // 5. Seed Locations (Tenant Scoped)
  const locationsData = [
    { name: 'Palacio Municipal - Piso 2', description: 'Area administrativa y mesa de ayuda.' },
    { name: 'Datacenter Principal', description: 'Infraestructura critica y servidores.' },
    { name: 'Punto Vive Digital', description: 'Punto de atencion y soporte tecnologico.' },
  ];

  const locations = {};
  for (const loc of locationsData) {
    let location = await prisma.location.findFirst({
      where: { name: loc.name, organizationId: org.id },
    });

    if (location) {
      location = await prisma.location.update({
        where: { id: location.id },
        data: { description: loc.description, isActive: true },
      });
    } else {
      location = await prisma.location.create({
        data: {
          ...loc,
          organizationId: org.id,
          isActive: true,
        },
      });
    }
    locations[location.name] = location;
  }

  // 5.1 Seed Organization Structure (Sedes, Dependencias, Oficinas)
  const sedesData = [
    { name: 'Palacio Municipal (Sede Central)', code: 'SED-01', address: 'Diagonal 15 No. 13-35', city: 'Yopal', phone: '6351234' },
    { name: 'Datacenter Principal & Redes', code: 'SED-02', address: 'Calle 10 No. 20-40', city: 'Yopal', phone: '6355678' },
    { name: 'Sede Campestre / Obras Públicas', code: 'SED-03', address: 'Vía Morichal Km 2', city: 'Yopal', phone: '6359999' },
  ];

  const seededSedes = {};
  for (const s of sedesData) {
    let sede = await prisma.sede.findFirst({ where: { name: s.name, organizationId: org.id } }).catch(() => null);
    if (!sede) {
      sede = await prisma.sede.create({
        data: { ...s, organizationId: org.id, isActive: true }
      }).catch(() => null);
    }
    if (sede) seededSedes[s.name] = sede;
  }

  const palacioSede = seededSedes['Palacio Municipal (Sede Central)'];
  if (palacioSede) {
    const depsData = [
      { name: 'Dirección de TIC e Innovación', code: 'TIC', managerName: 'Jherson Rivera', email: 'tic@yopal.gov.co' },
      { name: 'Secretaría General', code: 'SGEN', managerName: 'Secretario General', email: 'general@yopal.gov.co' },
      { name: 'Secretaría de Hacienda y Tesorería', code: 'SHAC', managerName: 'Secretario de Hacienda', email: 'hacienda@yopal.gov.co' },
      { name: 'Secretaría de Tránsito y Movilidad', code: 'STRA', managerName: 'Secretario de Tránsito', email: 'transito@yopal.gov.co' },
    ];

    for (const d of depsData) {
      let dep = await prisma.dependencia.findFirst({ where: { name: d.name, organizationId: org.id } }).catch(() => null);
      if (!dep) {
        dep = await prisma.dependencia.create({
          data: { ...d, sedeId: palacioSede.id, organizationId: org.id, isActive: true }
        }).catch(() => null);
      }
      if (dep && d.code === 'TIC') {
        const ofisData = [
          { name: 'Mesa de Ayuda y Soporte TI (Piso 2)', code: 'OF-TIC-01', floor: 'Piso 2', responsibleUser: 'Jherson Rivera' },
          { name: 'Infraestructura, Servidores y Redes (Piso 2)', code: 'OF-TIC-02', floor: 'Piso 2', responsibleUser: 'Jherson Rivera' },
          { name: 'Desarrollo de Software y Gobierno Digital', code: 'OF-TIC-03', floor: 'Piso 2', responsibleUser: 'Ing. Sistemas' },
        ];
        for (const o of ofisData) {
          const ofiExists = await prisma.oficina.findFirst({ where: { name: o.name, organizationId: org.id } }).catch(() => null);
          if (!ofiExists) {
            await prisma.oficina.create({
              data: { ...o, dependenciaId: dep.id, sedeId: palacioSede.id, organizationId: org.id, isActive: true }
            }).catch(() => null);
          }
        }
      }
    }
  }

  // 6. Seed Users (Tenant Scoped)
  const users = [
    {
      name: 'Jherson Rivera',
      username: 'jherson.rivera',
      email: 'jherson.rivera@yopal.gov.co',
      roleName: 'ADMIN',
      locationName: 'Palacio Municipal - Piso 2',
      password: DEFAULT_PASSWORDS.admin,
    },
    {
      name: 'Tecnico Nivel 1',
      username: 'tecnico.n1',
      email: 'nivel1@yopal.gov.co',
      roleName: 'NIVEL 1',
      locationName: 'Palacio Municipal - Piso 2',
      password: DEFAULT_PASSWORDS.level1,
    },
    {
      name: 'Tecnico Nivel 2',
      username: 'tecnico.n2',
      email: 'nivel2@yopal.gov.co',
      roleName: 'NIVEL 2',
      locationName: 'Datacenter Principal',
      password: DEFAULT_PASSWORDS.level2,
    },
    {
      name: 'Tecnico Nivel 3',
      username: 'tecnico.n3',
      email: 'nivel3@yopal.gov.co',
      roleName: 'NIVEL 3',
      locationName: 'Datacenter Principal',
      password: DEFAULT_PASSWORDS.level3,
    },
    {
      name: 'Usuario Estandar',
      username: 'usuario.test',
      email: 'usuario.test@yopal.gov.co',
      roleName: 'USUARIO ESTANDAR',
      locationName: 'Palacio Municipal - Piso 2',
      password: 'User1234!',
    },
  ];

  for (const user of users) {
    const passwordHash = hashPassword(user.password);
    const role = roles[user.roleName];
    const location = locations[user.locationName];

    const existingUser = await prisma.user.findFirst({
      where: {
        organizationId: org.id,
        OR: [{ username: user.username }, { email: user.email }],
      },
    });

    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: user.name,
          roleId: role.id,
          locationId: location ? location.id : null,
          passwordHash,
          isActive: true,
        },
      });
    } else {
      await prisma.user.create({
        data: {
          name: user.name,
          username: user.username,
          email: user.email,
          isActive: true,
          roleId: role.id,
          locationId: location ? location.id : null,
          organizationId: org.id,
          passwordHash,
        },
      });
    }
  }

  // 7. Seed Ticket Categories (Tenant Scoped)
  const categoriesData = [
    { name: 'Hardware', group: 'Soporte Técnico', ticketType: 'Incidencia', sla: '4 horas' },
    { name: 'Software y Ofimática', group: 'Soporte Técnico', ticketType: 'Incidencia', sla: '2 horas' },
    { name: 'Redes y Conectividad', group: 'Infraestructura', ticketType: 'Incidencia', sla: '1 hora' },
    { name: 'Cuentas y Accesos', group: 'Seguridad', ticketType: 'Requerimiento', sla: '8 horas' },
    { name: 'Telefonía IP', group: 'Comunicaciones', ticketType: 'Incidencia', sla: '4 horas' },
  ];

  for (const cat of categoriesData) {
    const existingCat = await prisma.ticketCategory.findFirst({
      where: { name: cat.name, ticketType: cat.ticketType, organizationId: org.id },
    });
    if (!existingCat) {
      await prisma.ticketCategory.create({
        data: {
          ...cat,
          organizationId: org.id,
          isActive: true,
        },
      });
    }
  }

  // 8. Seed Canned Responses (Tenant Scoped)
  const cannedData = [
    { title: 'Saludo y asignación', content: 'Cordial saludo. Su caso ha sido asignado al equipo técnico y nos encontramos gestionando la solución.', shortcut: '/saludo', category: 'General', ticketType: 'Incidencia' },
    { title: 'Solicitud de información', content: 'Para continuar con la atención de su caso, agradecemos nos suministre número de contacto y horario disponible.', shortcut: '/info', category: 'General', ticketType: 'Incidencia' },
    { title: 'Cierre de caso', content: 'Se valida funcionamiento satisfactorio del servicio. Procedemos con el cierre del ticket.', shortcut: '/cierre', category: 'General', ticketType: 'Incidencia' },
  ];

  for (const cr of cannedData) {
    const existingCR = await prisma.cannedResponse.findFirst({
      where: { title: cr.title, organizationId: org.id },
    });
    if (!existingCR) {
      await prisma.cannedResponse.create({
        data: {
          ...cr,
          organizationId: org.id,
        },
      });
    }
  }

  // 9. Seed Sample Assets (Tenant Scoped)
  const existingAssets = await prisma.asset.findMany({
    where: { organizationId: org.id },
    select: { hostname: true },
  });
  const existingHostnames = new Set(existingAssets.map((a) => a.hostname));

  if (!existingHostnames.has('PC-ADMIN-01')) {
    await prisma.asset.create({
      data: {
        hostname: 'PC-ADMIN-01',
        ipAddress: '192.168.1.15',
        osType: 'Windows',
        osVersion: 'Pro 11',
        status: 'ONLINE',
        serialNumber: 'YOP-PC-001',
        brand: 'Dell',
        model: 'OptiPlex 7010',
        deviceType: 'Escritorio',
        assignedUser: 'Jherson Rivera',
        location: 'Palacio Municipal - Piso 2',
        agentVersion: 'MDS Agent 2.4.1',
        lastSeenAt: new Date(),
        motherboard: 'Dell 0WR7PY',
        cpuModel: 'Intel Core i5-3470 @ 3.20GHz',
        ramSummary: '4 GB DDR3',
        storageSummary: 'SSD 447 GB',
        networkSummary: 'Ethernet 1 Gbps / DNS 10.0.1.14',
        graphicsInfo: 'Intel HD Graphics',
        displayInfo: 'Monitor integrado All-in-One',
        notes: 'Equipo principal de administración con acceso a consola y reportes.',
        organizationId: org.id,
        customerId: customer.id,
        metrics: {
          create: {
            cpuUsage: 12.5,
            ramUsage: 45.2,
          },
        },
      },
    });
  }

  if (!existingHostnames.has('SRV-DATA-01')) {
    await prisma.asset.create({
      data: {
        hostname: 'SRV-DATA-01',
        ipAddress: '192.168.1.100',
        osType: 'Linux',
        osVersion: 'Ubuntu 22.04 LTS',
        status: 'WARNING',
        serialNumber: 'YOP-SRV-010',
        brand: 'HP',
        model: 'ProLiant DL380',
        deviceType: 'Servidor',
        assignedUser: 'Infraestructura TIC',
        location: 'Datacenter Principal',
        agentVersion: 'MDS Agent 2.3.9',
        lastSeenAt: new Date(Date.now() - 1000 * 60 * 24),
        motherboard: 'HP ProLiant System Board',
        cpuModel: 'Intel Xeon',
        ramSummary: '32 GB ECC',
        storageSummary: 'RAID 447 GB',
        networkSummary: 'Ethernet 10.0.22.x / DNS corporativo',
        graphicsInfo: 'Video integrado de servidor',
        displayInfo: 'Sin monitor dedicado',
        notes: 'Servidor de datos con advertencia de capacidad de disco.',
        organizationId: org.id,
        customerId: customer.id,
      },
    });
  }

  // 10. Seed Sample Tickets (Tenant Scoped)
  const existingTickets = await prisma.ticket.count({
    where: { organizationId: org.id },
  });

  if (existingTickets === 0) {
    const adminUser = await prisma.user.findFirst({ where: { username: 'jherson.rivera', organizationId: org.id } });
    const techUser = await prisma.user.findFirst({ where: { username: 'tecnico.n1', organizationId: org.id } });

    await prisma.ticket.createMany({
      data: [
        {
          title: 'PROBLEMA CON IMPRESORA DE RED',
          description: 'El usuario reporta que no puede conectar con la impresora HP del segundo piso.',
          priority: 'MEDIA',
          status: 'IN_PROGRESS',
          ticketType: 'Incidencia',
          category: 'Hardware',
          customerId: customer.id,
          organizationId: org.id,
          createdById: adminUser ? adminUser.id : null,
          assignedToId: techUser ? techUser.id : null,
          responsibleUserIds: techUser ? JSON.stringify([techUser.id]) : null,
        },
        {
          title: 'FALLA CRÍTICA DE VPN',
          description: 'Acceso denegado masivo para usuarios remotos en el enlace principal.',
          priority: 'ALTA',
          status: 'NEW',
          ticketType: 'Incidencia',
          category: 'Redes y Conectividad',
          customerId: customer.id,
          organizationId: org.id,
          createdById: adminUser ? adminUser.id : null,
        },
      ],
    });
  }

  console.log('🎉 Multi-tenant database seed completed successfully!');
  console.log(`🔑 Credenciales ADMIN: usuario: jherson.rivera / clave: ${DEFAULT_PASSWORDS.admin}`);
}

main()
  .catch((error) => {
    console.error('❌ Error during seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
