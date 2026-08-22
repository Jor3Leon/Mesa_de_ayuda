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
      const token = parseBearerToken(req.headers.authorization);
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
    console.log(`[DEBUG] Checking permissions: ${permissions.join(', ')} for user: ${req.auth.user.name} (${req.auth.user.role})`);
    console.log(`[DEBUG] User permissions: ${JSON.stringify(userPermissions)}`);
    const hasPermission = permissions.every(p => userPermissions.includes(p));

    if (!hasPermission) {
      console.log(`[DEBUG] Permission check FAILED`);
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

module.exports = {
  requireAuth,
  requirePermission,
  requireAnyPermission,
  requireRole,
};
