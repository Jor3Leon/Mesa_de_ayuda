const { verifyToken } = require('../auth');
const { createHttpError } = require('./utils');
const { sanitizeUser } = require('./ticket-service');

function parseBearerToken(headerValue) {
  const value = String(headerValue || '');
  if (!value.startsWith('Bearer ')) {
    return null;
  }
  return value.slice(7).trim();
}

function requireAuth(prisma) {
  return async (req, res, next) => {
    try {
      const token = parseBearerToken(req.headers.authorization) || req.cookies?.token;
      if (!token) {
        throw createHttpError(401, 'Authentication token is required.');
      }

      const payload = verifyToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          organization: true,
          location: true,
          role: {
            include: {
              permissions: {
                include: { permission: true }
              }
            }
          }
        }
      });

      if (!user) {
        throw createHttpError(401, 'Authentication required.');
      }

      if (user.organization && !user.organization.isActive) {
        throw createHttpError(403, 'La organización se encuentra inactiva o suspendida.');
      }

      req.auth = {
        token,
        organizationId: user.organizationId,
        organization: user.organization,
        user: sanitizeUser(user),
      };

      next();
    } catch (error) {
      if (!error.statusCode) {
        error.statusCode = 401;
      }
      next(error);
    }
  };
}

function requirePermission(...permissions) {
  return (req, res, next) => {
    if (!req.auth?.user) {
       return next(createHttpError(401, 'Authentication required.'));
    }
    
    const userPermissions = req.auth.user.permissions || [];
    const hasPermission = permissions.every(p => userPermissions.includes(p));

    if (!hasPermission) {
      return next(createHttpError(403, 'Insufficient permissions. No tiene los permisos necesarios.'));
    }

    next();
  };
}

function requireAnyPermission(...permissions) {
  return (req, res, next) => {
    if (!req.auth?.user) {
      return next(createHttpError(401, 'Authentication required.'));
    }

    const userPermissions = req.auth.user.permissions || [];
    const hasPermission = permissions.some(p => userPermissions.includes(p));

    if (!hasPermission) {
      return next(createHttpError(403, 'Insufficient permissions. No tiene los permisos necesarios.'));
    }

    next();
  };
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth?.user) {
      return next(createHttpError(401, 'Authentication required.'));
    }

    if (!roles.includes(req.auth.user.role)) {
      return next(createHttpError(403, 'Insufficient permissions.'));
    }

    next();
  };
}

/**
 * Resuelve el rol efectivo de forma segura (Sección 4.7 Auditoría).
 * Solo usuarios autorizados (ADMIN, SUPERVISOR o con permiso ROLE_VIEW_AS) pueden simular otro rol.
 */
function getEffectiveRole(req) {
  const user = req.auth?.user;
  if (!user) return '';
  const actualRole = String(user.role || user.role?.name || '').trim().toUpperCase();
  const requestedRole = (req.headers['x-view-as-role'] || req.query.role || req.query.viewAsRole || '').trim().toUpperCase();

  if (!requestedRole || requestedRole === actualRole) {
    return actualRole;
  }

  const canSwitchRole = 
    actualRole.includes('ADMIN') || 
    actualRole.includes('SUPERVISOR') || 
    (Array.isArray(user.permissions) && user.permissions.includes('ROLE_VIEW_AS'));

  if (!canSwitchRole) {
    return actualRole;
  }

  return requestedRole;
}

module.exports = {
  requireAuth,
  requirePermission,
  requireAnyPermission,
  requireRole,
  getEffectiveRole,
};
