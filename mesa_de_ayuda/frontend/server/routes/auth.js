const express = require('express');
const { createToken, verifyPassword, hashPassword, createPasswordResetToken, verifyPasswordResetToken } = require('../auth');
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

  router.post('/forgot-password', async (req, res, next) => {
    try {
      const email = requireNonEmptyString(req.body.email, 'email').toLowerCase();
      const orgSlug = req.body.organizationSlug || null;

      let org = null;
      if (orgSlug) {
        org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
      }

      const user = await prisma.user.findFirst({
        where: {
          email,
          ...(org ? { organizationId: org.id } : {})
        }
      });

      // Retorno genérico para prevenir enumeración de usuarios
      if (!user || !user.isActive) {
        return res.json({
          message: 'Si el correo ingresado se encuentra registrado y activo, se generará el enlace de restablecimiento.'
        });
      }

      const resetToken = createPasswordResetToken(user);
      const isDevOrTest = process.env.NODE_ENV !== 'production' || process.env.ENABLE_RESET_DEBUG === 'true';

      res.json({
        message: 'Si el correo ingresado se encuentra registrado y activo, se generará el enlace de restablecimiento.',
        ...(isDevOrTest ? { resetToken } : {})
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/reset-password', async (req, res, next) => {
    try {
      const token = requireNonEmptyString(req.body.token, 'token');
      const newPassword = requireNonEmptyString(req.body.newPassword, 'newPassword');

      if (newPassword.length < 6) {
        throw createHttpError(400, 'La nueva contraseña debe tener al menos 6 caracteres.');
      }

      const [encoded] = token.split('.');
      if (!encoded) throw createHttpError(400, 'Token inválido.');
      let payload;
      try {
        payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
      } catch {
        throw createHttpError(400, 'Token inválido.');
      }

      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) {
        throw createHttpError(404, 'Usuario no encontrado.');
      }

      verifyPasswordResetToken(token, user);

      const newHash = hashPassword(newPassword);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash }
      });

      res.json({ success: true, message: 'Contraseña actualizada correctamente.' });
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
