const { createValidationError } = require('./utils');

const ASSIGNABLE_ROLES = new Set(['ADMIN', 'LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'NIVEL 1', 'NIVEL 2', 'NIVEL 3']);

function parseResponsibleUserIds(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed
      .map((id) => Number.parseInt(id, 10))
      .filter((id) => Number.isInteger(id) && id > 0))]
      .slice(0, 5);
  } catch {
    return [];
  }
}

function getLegacyResponsibleUserIds(ticket) {
  return [...new Set([ticket?.assignedToId, ticket?.secondaryAssignedToId].filter((id) => Number.isInteger(id) && id > 0))];
}

function normalizeResponsibleUserIdsInput(payload) {
  const rawIds = Array.isArray(payload?.responsibleUserIds)
    ? payload.responsibleUserIds
    : [payload?.assignedToId, payload?.secondaryAssignedToId].filter((value) => value !== undefined);

  return [...new Set(rawIds
    .map((id) => Number.parseInt(id, 10))
    .filter((id) => Number.isInteger(id) && id > 0))]
    .slice(0, 5);
}

async function validateResponsibleUsers(prisma, responsibleUserIds) {
  if (responsibleUserIds.length > 5) {
    throw createValidationError('Solo puedes asignar hasta 5 responsables por ticket.');
  }
  if (responsibleUserIds.length === 0) {
    return [];
  }
  const users = await prisma.user.findMany({
    where: { id: { in: responsibleUserIds } },
    include: { role: true },
  });
  if (users.length !== responsibleUserIds.length) {
    throw createValidationError('Uno o varios responsables no existen.');
  }
  
  const invalidUser = users.find((user) => {
    const roleName = (user.role?.name || '').trim().toUpperCase();
    return !user.isActive || !ASSIGNABLE_ROLES.has(roleName);
  });

  if (invalidUser) {
    const roleName = invalidUser.role?.name || 'SIN ROL';
    throw createValidationError(`El usuario ${invalidUser.name} no puede ser asignado. Su rol (${roleName}) no tiene permisos técnicos o el usuario está inactivo.`);
  }
  return users;
}

function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, role, ...safeUser } = user;
  if (role) {
    if (typeof role === 'string') {
      safeUser.role = role;
      safeUser.permissions = [];
    } else {
      safeUser.role = role.name;
      safeUser.permissions = Array.isArray(role.permissions)
        ? role.permissions.map((p) => p.permission.code)
        : [];
    }
  }
  if (safeUser.location) {
    safeUser.dependencia = safeUser.location.name;
  }
  if (user.organization) {
    safeUser.organization = {
      id: user.organization.id,
      name: user.organization.name,
      slug: user.organization.slug,
      plan: user.organization.plan,
    };
  }
  return safeUser;
}

async function attachResponsibleUsers(prisma, ticket) {
  const responsibleUserIds = parseResponsibleUserIds(ticket.responsibleUserIds);
  const mergedIds = responsibleUserIds.length > 0 ? responsibleUserIds : getLegacyResponsibleUserIds(ticket);
  if (mergedIds.length === 0) {
    return { ...ticket, responsibleUserIds: [], responsibleUsers: [] };
  }
  const users = await prisma.user.findMany({
    where: { id: { in: mergedIds } },
    include: { role: true, location: true },
  });
  const userMap = new Map(users.map((user) => [user.id, sanitizeUser(user)]));
  return {
    ...ticket,
    responsibleUserIds: mergedIds,
    responsibleUsers: mergedIds.map((id) => userMap.get(id)).filter(Boolean),
  };
}

async function attachResponsibleUsersToMany(prisma, tickets) {
  return Promise.all(tickets.map((ticket) => attachResponsibleUsers(prisma, ticket)));
}

module.exports = {
  parseResponsibleUserIds,
  getLegacyResponsibleUserIds,
  normalizeResponsibleUserIdsInput,
  validateResponsibleUsers,
  attachResponsibleUsers,
  attachResponsibleUsersToMany,
  sanitizeUser,
};
