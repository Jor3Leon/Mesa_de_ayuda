const express = require('express');
const { createToken, verifyPassword } = require('../auth');
const { requireNonEmptyString, createHttpError } = require('../lib/utils');
const { sanitizeUser } = require('../lib/ticket-service');
const { requireAuth } = require('../lib/middleware');

function getAuthRoutes(prisma) {
  const router = express.Router();

  router.post('/login', async (req, res, next) => {
    try {
      const identifier = requireNonEmptyString(req.body.username || req.body.identifier, 'username').toLowerCase();
      const password = requireNonEmptyString(req.body.password, 'password');

      const orgSlug = req.body.organizationSlug || req.body.organization || null;
      let userQuery = {
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
      };

      let user;
      if (orgSlug) {
        const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
        if (!org) {
          throw createHttpError(404, 'Organización no encontrada.');
        }
        user = identifier.includes('@')
          ? await prisma.user.findFirst({
              where: { email: identifier, organizationId: org.id },
              ...userQuery,
            })
          : await prisma.user.findFirst({
              where: { username: identifier, organizationId: org.id },
              ...userQuery,
            });
      } else {
        user = identifier.includes('@')
          ? await prisma.user.findFirst({
              where: { email: identifier },
              ...userQuery,
            })
          : await prisma.user.findFirst({
              where: { username: identifier },
              ...userQuery,
            });
      }

      if (!user || !verifyPassword(password, user.passwordHash)) {
        throw createHttpError(401, 'Usuario o contraseña incorrectos.');
      }

      if (!user.isActive) {
        throw createHttpError(403, 'Este usuario se encuentra inactivo.');
      }

      if (user.organization && !user.organization.isActive) {
        throw createHttpError(403, 'La organización se encuentra inactiva o suspendida.');
      }

      res.json({
        token: createToken(user),
        user: sanitizeUser(user),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/me', requireAuth(prisma), (req, res) => {
    res.json(req.auth.user);
  });

  return router;
}

module.exports = getAuthRoutes;
