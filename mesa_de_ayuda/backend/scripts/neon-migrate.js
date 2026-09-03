const crypto = require('crypto');

const NEON_HTTP_URL = process.env.NEON_HTTP_URL;
const CONN_STRING = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!CONN_STRING) {
  console.error('❌ Error: Se requiere la variable de entorno DATABASE_URL o DIRECT_URL para ejecutar la migración.');
  process.exit(1);
}

const defaultSeedPass = process.env.SEED_DEFAULT_PASSWORD || 'Admin12345!';

async function sql(query, params = []) {
  if (!NEON_HTTP_URL) {
    throw new Error('NEON_HTTP_URL environment variable is required for HTTPS migration execution.');
  }

  const res = await fetch(NEON_HTTP_URL, {
    method: 'POST',
    headers: {
      'Neon-Connection-String': CONN_STRING,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, params }),
  });

  const data = await res.json();
  if (!res.ok || data.message) {
    throw new Error(data.message || JSON.stringify(data));
  }
  return data;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function migrateAndSeed() {
  console.log('🚀 Executing PostgreSQL Migration & Seeding...');

  // 1. DDL Schema Execution
  console.log('📦 1/4 Creating Tables and Constraints...');
  
  const ddlStatements = [
    `CREATE TABLE IF NOT EXISTS "Organization" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "plan" TEXT NOT NULL DEFAULT 'STARTER',
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Organization_slug_key" ON "Organization"("slug");`,
    `CREATE INDEX IF NOT EXISTS "Organization_slug_idx" ON "Organization"("slug");`,

    `CREATE TABLE IF NOT EXISTS "Customer" (
      "id" SERIAL NOT NULL,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "organizationId" TEXT,
      CONSTRAINT "Customer_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Customer_email_organizationId_key" ON "Customer"("email", "organizationId");`,
    `CREATE INDEX IF NOT EXISTS "Customer_organizationId_idx" ON "Customer"("organizationId");`,

    `CREATE TABLE IF NOT EXISTS "Location" (
      "id" SERIAL NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "organizationId" TEXT,
      CONSTRAINT "Location_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "Location_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Location_name_organizationId_key" ON "Location"("name", "organizationId");`,
    `CREATE INDEX IF NOT EXISTS "Location_organizationId_idx" ON "Location"("organizationId");`,

    `CREATE TABLE IF NOT EXISTS "Sede" (
      "id" SERIAL NOT NULL,
      "name" TEXT NOT NULL,
      "code" TEXT,
      "address" TEXT,
      "city" TEXT DEFAULT 'Yopal',
      "phone" TEXT,
      "managerName" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "organizationId" TEXT,
      CONSTRAINT "Sede_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "Sede_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Sede_name_organizationId_key" ON "Sede"("name", "organizationId");`,
    `CREATE INDEX IF NOT EXISTS "Sede_organizationId_idx" ON "Sede"("organizationId");`,

    `CREATE TABLE IF NOT EXISTS "Dependencia" (
      "id" SERIAL NOT NULL,
      "name" TEXT NOT NULL,
      "code" TEXT,
      "managerName" TEXT,
      "email" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "sedeId" INTEGER,
      "organizationId" TEXT,
      CONSTRAINT "Dependencia_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "Dependencia_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "Dependencia_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Dependencia_name_organizationId_sedeId_key" ON "Dependencia"("name", "organizationId", "sedeId");`,
    `CREATE INDEX IF NOT EXISTS "Dependencia_organizationId_idx" ON "Dependencia"("organizationId");`,
    `CREATE INDEX IF NOT EXISTS "Dependencia_sedeId_idx" ON "Dependencia"("sedeId");`,

    `CREATE TABLE IF NOT EXISTS "Oficina" (
      "id" SERIAL NOT NULL,
      "name" TEXT NOT NULL,
      "code" TEXT,
      "floor" TEXT,
      "responsibleUser" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "dependenciaId" INTEGER,
      "sedeId" INTEGER,
      "organizationId" TEXT,
      CONSTRAINT "Oficina_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "Oficina_dependenciaId_fkey" FOREIGN KEY ("dependenciaId") REFERENCES "Dependencia"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "Oficina_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "Oficina_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Oficina_name_organizationId_dependenciaId_key" ON "Oficina"("name", "organizationId", "dependenciaId");`,
    `CREATE INDEX IF NOT EXISTS "Oficina_organizationId_idx" ON "Oficina"("organizationId");`,
    `CREATE INDEX IF NOT EXISTS "Oficina_dependenciaId_idx" ON "Oficina"("dependenciaId");`,
    `CREATE INDEX IF NOT EXISTS "Oficina_sedeId_idx" ON "Oficina"("sedeId");`,

    `CREATE TABLE IF NOT EXISTS "Role" (
      "id" SERIAL NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "organizationId" TEXT,
      CONSTRAINT "Role_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "Role_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Role_name_organizationId_key" ON "Role"("name", "organizationId");`,
    `CREATE INDEX IF NOT EXISTS "Role_organizationId_idx" ON "Role"("organizationId");`,

    `CREATE TABLE IF NOT EXISTS "Permission" (
      "id" SERIAL NOT NULL,
      "code" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Permission_code_key" ON "Permission"("code");`,

    `CREATE TABLE IF NOT EXISTS "RolePermission" (
      "roleId" INTEGER NOT NULL,
      "permissionId" INTEGER NOT NULL,
      CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId"),
      CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,

    `CREATE TABLE IF NOT EXISTS "User" (
      "id" SERIAL NOT NULL,
      "name" TEXT NOT NULL,
      "username" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "phone" TEXT,
      "locationId" INTEGER,
      "roleId" INTEGER NOT NULL,
      "organizationId" TEXT,
      "passwordHash" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "avatarUrl" TEXT,
      CONSTRAINT "User_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "User_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "User_username_organizationId_key" ON "User"("username", "organizationId");`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_organizationId_key" ON "User"("email", "organizationId");`,
    `CREATE INDEX IF NOT EXISTS "User_organizationId_idx" ON "User"("organizationId");`,
    `CREATE INDEX IF NOT EXISTS "User_roleId_idx" ON "User"("roleId");`,
    `CREATE INDEX IF NOT EXISTS "User_locationId_idx" ON "User"("locationId");`,

    `CREATE TABLE IF NOT EXISTS "Asset" (
      "id" SERIAL NOT NULL,
      "hostname" TEXT NOT NULL,
      "ipAddress" TEXT NOT NULL,
      "osType" TEXT NOT NULL,
      "osVersion" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "serialNumber" TEXT,
      "brand" TEXT,
      "model" TEXT,
      "deviceType" TEXT,
      "assignedUser" TEXT,
      "location" TEXT,
      "agentVersion" TEXT,
      "lastSeenAt" TIMESTAMP(3),
      "motherboard" TEXT,
      "cpuModel" TEXT,
      "ramSummary" TEXT,
      "storageSummary" TEXT,
      "networkSummary" TEXT,
      "graphicsInfo" TEXT,
      "displayInfo" TEXT,
      "notes" TEXT,
      "organizationId" TEXT,
      "customerId" INTEGER NOT NULL,
      CONSTRAINT "Asset_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "Asset_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "Asset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Asset_hostname_organizationId_key" ON "Asset"("hostname", "organizationId");`,
    `CREATE INDEX IF NOT EXISTS "Asset_organizationId_idx" ON "Asset"("organizationId");`,
    `CREATE INDEX IF NOT EXISTS "Asset_customerId_idx" ON "Asset"("customerId");`,

    `CREATE TABLE IF NOT EXISTS "Ticket" (
      "id" SERIAL NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "priority" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "ticketType" TEXT DEFAULT 'Incidencia',
      "category" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "organizationId" TEXT,
      "customerId" INTEGER NOT NULL,
      "assetId" INTEGER,
      "locationId" INTEGER,
      "createdById" INTEGER,
      "assignedToId" INTEGER,
      "secondaryAssignedToId" INTEGER,
      "observerId" INTEGER,
      "assignedAt" TIMESTAMP(3),
      "resolvedAt" TIMESTAMP(3),
      "closedAt" TIMESTAMP(3),
      "sla" TEXT,
      "responsibleUserIds" TEXT,
      CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "Ticket_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "Ticket_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "Ticket_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "Ticket_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "Ticket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "Ticket_secondaryAssignedToId_fkey" FOREIGN KEY ("secondaryAssignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "Ticket_observerId_fkey" FOREIGN KEY ("observerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "Ticket_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE INDEX IF NOT EXISTS "Ticket_organizationId_idx" ON "Ticket"("organizationId");`,
    `CREATE INDEX IF NOT EXISTS "Ticket_status_idx" ON "Ticket"("status");`,
    `CREATE INDEX IF NOT EXISTS "Ticket_customerId_idx" ON "Ticket"("customerId");`,
    `CREATE INDEX IF NOT EXISTS "Ticket_assignedToId_idx" ON "Ticket"("assignedToId");`,
    `CREATE INDEX IF NOT EXISTS "Ticket_createdById_idx" ON "Ticket"("createdById");`,

    `CREATE TABLE IF NOT EXISTS "TicketActivity" (
      "id" SERIAL NOT NULL,
      "ticketId" INTEGER NOT NULL,
      "user" TEXT,
      "action" TEXT NOT NULL,
      "field" TEXT,
      "oldValue" TEXT,
      "newValue" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TicketActivity_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "TicketActivity_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE INDEX IF NOT EXISTS "TicketActivity_ticketId_idx" ON "TicketActivity"("ticketId");`,

    `CREATE TABLE IF NOT EXISTS "Metric" (
      "id" SERIAL NOT NULL,
      "cpuUsage" DOUBLE PRECISION NOT NULL,
      "ramUsage" DOUBLE PRECISION NOT NULL,
      "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "assetId" INTEGER NOT NULL,
      CONSTRAINT "Metric_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "Metric_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE INDEX IF NOT EXISTS "Metric_assetId_idx" ON "Metric"("assetId");`,

    `CREATE TABLE IF NOT EXISTS "Maintenance" (
      "id" SERIAL NOT NULL,
      "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "type" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "technician" TEXT NOT NULL,
      "assetId" INTEGER NOT NULL,
      "ticketId" INTEGER,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Maintenance_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "Maintenance_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "Maintenance_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE
    );`,
    `CREATE INDEX IF NOT EXISTS "Maintenance_assetId_idx" ON "Maintenance"("assetId");`,
    `CREATE INDEX IF NOT EXISTS "Maintenance_ticketId_idx" ON "Maintenance"("ticketId");`,

    `CREATE TABLE IF NOT EXISTS "CannedResponse" (
      "id" SERIAL NOT NULL,
      "title" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "category" TEXT DEFAULT 'General',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "shortcut" TEXT,
      "ticketType" TEXT DEFAULT 'Incidencia',
      "organizationId" TEXT,
      CONSTRAINT "CannedResponse_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "CannedResponse_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE INDEX IF NOT EXISTS "CannedResponse_organizationId_idx" ON "CannedResponse"("organizationId");`,

    `CREATE TABLE IF NOT EXISTS "TicketCategory" (
      "id" SERIAL NOT NULL,
      "group" TEXT NOT NULL DEFAULT 'General',
      "name" TEXT NOT NULL,
      "ticketType" TEXT NOT NULL,
      "sla" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "organizationId" TEXT,
      CONSTRAINT "TicketCategory_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "TicketCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE INDEX IF NOT EXISTS "TicketCategory_organizationId_idx" ON "TicketCategory"("organizationId");`
  ];

  for (const statement of ddlStatements) {
    await sql(statement);
  }
  console.log('✅ All PostgreSQL tables & constraints created successfully.');

  // 2. Seed Default Organization
  console.log('🏢 2/4 Seeding Default Organization...');
  const orgId = 'org-stic-yopal-001';
  await sql(`
    INSERT INTO "Organization" ("id", "name", "slug", "plan", "isActive")
    VALUES ($1, $2, $3, $4, true)
    ON CONFLICT ("slug") DO UPDATE SET "name" = EXCLUDED."name", "plan" = EXCLUDED."plan";
  `, [orgId, 'Alcaldía de Yopal - STIC', 'stic', 'ENTERPRISE']);

  // 3. Seed Permissions
  console.log('🔑 3/4 Seeding Permissions & Roles...');
  const permissionsData = [
    ['TICKETS_VIEW', 'Ver Tickets', 'Permite ver la lista de tickets y detalles.'],
    ['TICKETS_CREATE', 'Crear Tickets', 'Permite crear nuevos tickets.'],
    ['TICKETS_EDIT', 'Editar Tickets', 'Permite modificar tickets existentes.'],
    ['TICKETS_ASSIGN', 'Asignar Tickets', 'Permite asignar tickets a técnicos.'],
    ['TICKETS_CONFIGURE', 'Configurar Campos Administrativos', 'Permite modificar tipo, categoria, ANS, tecnico asignado y seguimiento del ticket.'],
    ['TICKETS_VIEW_STATS', 'Ver Estadísticas de Tickets', 'Permite ver el tablero de estadísticas en la vista de tickets.'],
    ['ASSETS_VIEW', 'Ver Inventario', 'Permite ver el inventario de activos.'],
    ['ASSETS_MANAGE', 'Gestionar Inventario', 'Permite crear, editar y eliminar activos.'],
    ['USERS_MANAGE', 'Gestionar Usuarios', 'Permite administrar usuarios de la plataforma.'],
    ['ROLES_MANAGE', 'Gestionar Roles y Permisos', 'Permite administrar roles, niveles de acceso y permisos.'],
    ['ANALYTICS_VIEW', 'Ver Estadísticas', 'Permite ver tableros de control y reportes.']
  ];

  for (const [code, name, desc] of permissionsData) {
    await sql(`
      INSERT INTO "Permission" ("code", "name", "description")
      VALUES ($1, $2, $3)
      ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description";
    `, [code, name, desc]);
  }

  // Seed Customer
  await sql(`
    INSERT INTO "Customer" ("name", "email", "organizationId")
    VALUES ($1, $2, $3)
    ON CONFLICT ("email", "organizationId") DO NOTHING;
  `, ['Alcaldía de Yopal', 'soporte@yopal.gov.co', orgId]);

  // Seed Roles
  const roles = [
    { name: 'ADMIN', desc: 'Administrador total del sistema', perms: permissionsData.map(p => p[0]) },
    { name: 'NIVEL 1', desc: 'Técnico Nivel 1 - Soporte Básico', perms: ['TICKETS_VIEW', 'TICKETS_CREATE', 'TICKETS_EDIT', 'ASSETS_VIEW'] },
    { name: 'NIVEL 2', desc: 'Técnico Nivel 2 - Especialista', perms: ['TICKETS_VIEW', 'TICKETS_CREATE', 'TICKETS_EDIT', 'TICKETS_ASSIGN', 'TICKETS_CONFIGURE', 'TICKETS_VIEW_STATS', 'ASSETS_VIEW', 'ASSETS_MANAGE'] },
    { name: 'NIVEL 3', desc: 'Técnico Nivel 3 - Coordinador/Infraestructura', perms: ['TICKETS_VIEW', 'TICKETS_CREATE', 'TICKETS_EDIT', 'TICKETS_ASSIGN', 'TICKETS_CONFIGURE', 'TICKETS_VIEW_STATS', 'ASSETS_VIEW', 'ASSETS_MANAGE', 'ANALYTICS_VIEW', 'ROLES_MANAGE'] },
    { name: 'USUARIO ESTANDAR', desc: 'Usuario final - Solo creación de tickets', perms: ['TICKETS_VIEW', 'TICKETS_CREATE'] }
  ];

  const roleMap = {};
  for (const r of roles) {
    let res = await sql(`
      INSERT INTO "Role" ("name", "description", "organizationId", "isActive")
      VALUES ($1, $2, $3, true)
      ON CONFLICT ("name", "organizationId") DO UPDATE SET "description" = EXCLUDED."description"
      RETURNING "id", "name";
    `, [r.name, r.desc, orgId]);

    const roleId = res.rows[0].id;
    roleMap[r.name] = roleId;

    // Link permissions
    await sql(`DELETE FROM "RolePermission" WHERE "roleId" = $1;`, [roleId]);
    for (const code of r.perms) {
      const permRes = await sql(`SELECT "id" FROM "Permission" WHERE "code" = $1;`, [code]);
      if (permRes.rows.length > 0) {
        await sql(`
          INSERT INTO "RolePermission" ("roleId", "permissionId")
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING;
        `, [roleId, permRes.rows[0].id]);
      }
    }
  }

  // Seed Location
  const locRes = await sql(`
    INSERT INTO "Location" ("name", "description", "organizationId", "isActive")
    VALUES ($1, $2, $3, true)
    ON CONFLICT ("name", "organizationId") DO UPDATE SET "description" = EXCLUDED."description"
    RETURNING "id";
  `, ['Palacio Municipal - Piso 2', 'Área administrativa y mesa de ayuda.', orgId]);
  const locationId = locRes.rows[0].id;

  // 4. Seed Users
  console.log('👤 4/4 Seeding Initial Users...');
  const users = [
    { name: 'Jherson Rivera', user: 'jherson.rivera', email: 'jherson.rivera@yopal.gov.co', role: 'ADMIN' },
    { name: 'Técnico Nivel 1', user: 'tecnico.n1', email: 'nivel1@yopal.gov.co', role: 'NIVEL 1' },
    { name: 'Técnico Nivel 2', user: 'tecnico.n2', email: 'nivel2@yopal.gov.co', role: 'NIVEL 2' },
    { name: 'Técnico Nivel 3', user: 'tecnico.n3', email: 'nivel3@yopal.gov.co', role: 'NIVEL 3' },
    { name: 'Usuario Estándar', user: 'usuario.test', email: 'usuario.test@yopal.gov.co', role: 'USUARIO ESTANDAR' }
  ];

  for (const u of users) {
    const pHash = hashPassword(defaultSeedPass);
    await sql(`
      INSERT INTO "User" ("name", "username", "email", "passwordHash", "roleId", "locationId", "organizationId", "isActive")
      VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      ON CONFLICT ("username", "organizationId") DO NOTHING;
    `, [u.name, u.user, u.email, pHash, roleMap[u.role], locationId, orgId]);
  }

  // Seed Categories & Canned
  const categories = [
    ['Hardware', 'Soporte Técnico', 'Incidencia', '4 horas'],
    ['Software y Ofimática', 'Soporte Técnico', 'Incidencia', '2 horas'],
    ['Redes y Conectividad', 'Infraestructura', 'Incidencia', '1 hora'],
    ['Cuentas y Accesos', 'Seguridad', 'Requerimiento', '8 horas']
  ];
  for (const [name, group, type, sla] of categories) {
    await sql(`
      INSERT INTO "TicketCategory" ("name", "group", "ticketType", "sla", "organizationId", "isActive")
      VALUES ($1, $2, $3, $4, $5, true)
      ON CONFLICT DO NOTHING;
    `, [name, group, type, sla, orgId]);
  }

  const canned = [
    ['Saludo y asignación', 'Cordial saludo. Su caso ha sido asignado al equipo técnico y nos encontramos gestionando la solución.', '/saludo', 'General', 'Incidencia'],
    ['Solicitud de información', 'Para continuar con la atención de su caso, agradecemos nos suministre número de contacto y horario disponible.', '/info', 'General', 'Incidencia'],
    ['Cierre de caso', 'Se valida funcionamiento satisfactorio del servicio. Procedemos con el cierre del ticket.', '/cierre', 'General', 'Incidencia']
  ];
  for (const [title, content, shortcut, cat, type] of canned) {
    await sql(`
      INSERT INTO "CannedResponse" ("title", "content", "shortcut", "category", "ticketType", "organizationId")
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT DO NOTHING;
    `, [title, content, shortcut, cat, type, orgId]);
  }

  console.log('\n🎉 Multi-Tenant PostgreSQL initialized successfully from environment variables.');
}

migrateAndSeed().catch(err => {
  console.error('❌ Migration Error:', err);
  process.exit(1);
});
