const express = require('express');
const { 
  requireNonEmptyString, 
  normalizeUsername, 
  normalizeAvatarDataUrl,
  createHttpError,
  createValidationError
} = require('../lib/utils');
const { sanitizeUser } = require('../lib/ticket-service');
const { requireAuth, requirePermission, requireAnyPermission } = require('../lib/middleware');
const { hashPassword } = require('../auth');

function getUserRoutes(prisma) {
  const router = express.Router();

  router.use(requireAuth(prisma));

  router.get('/', requireAnyPermission('USERS_MANAGE', 'TICKETS_VIEW'), async (req, res, next) => {
    try {
      const orgFilter = req.auth.organizationId ? { organizationId: req.auth.organizationId } : {};
      const users = await prisma.user.findMany({
        where: orgFilter,
        include: { organization: true, role: true, location: true },
        orderBy: { name: 'asc' },
      });
      res.json(users.map(sanitizeUser));
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', requirePermission('USERS_MANAGE'), async (req, res, next) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      const user = await prisma.user.findUnique({
        where: { id },
        include: { organization: true, role: true, location: true },
      });
      if (!user) throw createHttpError(404, 'Usuario no encontrado.');
      if (req.auth.organizationId && user.organizationId && user.organizationId !== req.auth.organizationId) {
        throw createHttpError(403, 'No tienes acceso a este usuario.');
      }
      res.json(sanitizeUser(user));
    } catch (error) {
      next(error);
    }
  });

  // POST /api/users - Create a new user (Admin only)
  router.post('/', requirePermission('USERS_MANAGE'), async (req, res, next) => {
    try {
      const username = normalizeUsername(requireNonEmptyString(req.body.username, 'username'));
      const email = requireNonEmptyString(req.body.email, 'email').toLowerCase();
      const password = requireNonEmptyString(req.body.password, 'password');

      if (password.length < 6) throw createValidationError('La contraseña debe tener al menos 6 caracteres.');

      const existingUser = await prisma.user.findFirst({
        where: {
          ...(req.auth.organizationId ? { organizationId: req.auth.organizationId } : {}),
          OR: [{ username }, { email }]
        }
      });

      if (existingUser) {
        throw createHttpError(400, 'El usuario o correo electrónico ya están en uso.');
      }

      const role = await prisma.role.findFirst({
        where: {
          name: req.body.role,
          ...(req.auth.organizationId ? { OR: [{ organizationId: req.auth.organizationId }, { organizationId: null }] } : {})
        }
      });
      if (!role) throw createHttpError(400, 'Rol no válido.');

      const user = await prisma.user.create({
        data: {
          username,
          email,
          name: requireNonEmptyString(req.body.name, 'name'),
          phone: req.body.phone || null,
          passwordHash: hashPassword(password),
          roleId: role.id,
          organizationId: req.auth.organizationId || null,
          locationId: req.body.locationId ? Number.parseInt(req.body.locationId, 10) : null,
          isActive: true
        },
        include: { organization: true, role: true, location: true }
      });

      res.status(201).json(sanitizeUser(user));
    } catch (error) {
      next(error);
    }
  });

  // PUT /api/users/:id - Update an existing user (Admin only)
  router.put('/:id', requirePermission('USERS_MANAGE'), async (req, res, next) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      const targetUser = await prisma.user.findUnique({ where: { id } });
      if (!targetUser) throw createHttpError(404, 'Usuario no encontrado.');

      if (req.auth.organizationId && targetUser.organizationId && targetUser.organizationId !== req.auth.organizationId) {
        throw createHttpError(403, 'No tienes permiso para modificar este usuario.');
      }

      const updateData = {};
      if (req.body.name !== undefined) updateData.name = requireNonEmptyString(req.body.name, 'name');
      if (req.body.username !== undefined) updateData.username = normalizeUsername(req.body.username);
      if (req.body.email !== undefined) updateData.email = req.body.email.toLowerCase();
      if (req.body.phone !== undefined) updateData.phone = req.body.phone;
      if (req.body.locationId !== undefined) updateData.locationId = req.body.locationId ? Number.parseInt(req.body.locationId, 10) : null;
      
      if (req.body.role !== undefined) {
        const role = await prisma.role.findFirst({
          where: {
            name: req.body.role,
            ...(req.auth.organizationId ? { OR: [{ organizationId: req.auth.organizationId }, { organizationId: null }] } : {})
          }
        });
        if (!role) throw createHttpError(400, 'Rol no válido.');
        updateData.roleId = role.id;
      }

      if (req.body.password) {
        if (req.body.password.length < 6) throw createValidationError('La contraseña debe tener al menos 6 caracteres.');
        updateData.passwordHash = hashPassword(req.body.password);
      }

      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        include: { organization: true, role: true, location: true }
      });

      res.json(sanitizeUser(user));
    } catch (error) {
      next(error);
    }
  });

  router.patch('/:id/status', requirePermission('USERS_MANAGE'), async (req, res, next) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      const { isActive } = req.body;
      
      if (id === req.auth.user.id) {
        throw createHttpError(400, 'No puedes desactivar tu propio usuario.');
      }

      const targetUser = await prisma.user.findUnique({ where: { id } });
      if (!targetUser) throw createHttpError(404, 'Usuario no encontrado.');

      if (req.auth.organizationId && targetUser.organizationId && targetUser.organizationId !== req.auth.organizationId) {
        throw createHttpError(403, 'No tienes permiso para modificar este usuario.');
      }

      const user = await prisma.user.update({
        where: { id },
        data: { isActive },
        include: { organization: true, role: true, location: true }
      });

      res.json(sanitizeUser(user));
    } catch (error) {
      next(error);
    }
  });

  router.put('/:id/profile', async (req, res, next) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (id !== req.auth.user.id) {
        throw createHttpError(403, 'No puedes editar el perfil de otro usuario.');
      }

      const updateData = {};
      if (req.body.name !== undefined) updateData.name = requireNonEmptyString(req.body.name, 'name');
      if (req.body.avatarUrl !== undefined) updateData.avatarUrl = normalizeAvatarDataUrl(req.body.avatarUrl);
      
      if (req.body.password !== undefined && req.body.password !== '') {
        const password = requireNonEmptyString(req.body.password, 'password');
        if (password.length < 6) throw createValidationError('La contraseña debe tener al menos 6 caracteres.');
        updateData.passwordHash = hashPassword(password);
      }

      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        include: { role: true, location: true },
      });

      res.json(sanitizeUser(user));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = getUserRoutes;
