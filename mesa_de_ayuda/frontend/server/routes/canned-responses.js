const express = require('express');
const { requireNonEmptyString, normalizeOptionalString, createHttpError } = require('../lib/utils');
const { requireAuth, requirePermission, requireAnyPermission } = require('../lib/middleware');

function getCannedResponseRoutes(prisma) {
  const router = express.Router();

  router.use(requireAuth(prisma));

  router.get('/', requireAnyPermission('TICKETS_CONFIGURE', 'TICKETS_VIEW'), async (req, res, next) => {
    try {
      const orgFilter = req.auth.organizationId ? { organizationId: req.auth.organizationId } : {};
      const responses = await prisma.cannedResponse.findMany({
        where: orgFilter,
        orderBy: { title: 'asc' },
      });
      res.json(responses);
    } catch (error) {
      next(error);
    }
  });

  router.post('/', requirePermission('TICKETS_CONFIGURE'), async (req, res, next) => {
    try {
      const title = requireNonEmptyString(req.body.title, 'title');
      const content = requireNonEmptyString(req.body.content, 'content');
      const category = normalizeOptionalString(req.body.category) || 'General';
      const ticketType = normalizeOptionalString(req.body.ticketType) || 'Incidencia';
      const shortcut = normalizeOptionalString(req.body.shortcut);

      const response = await prisma.cannedResponse.create({
        data: { 
          title, 
          content, 
          category, 
          ticketType, 
          shortcut,
          organizationId: req.auth.organizationId || null 
        },
      });

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  });

  router.put('/:id', requirePermission('TICKETS_CONFIGURE'), async (req, res, next) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      const target = await prisma.cannedResponse.findUnique({ where: { id } });
      if (!target) throw createHttpError(404, 'Respuesta rápida no encontrada.');
      if (req.auth.organizationId && target.organizationId && target.organizationId !== req.auth.organizationId) {
        throw createHttpError(403, 'No tienes permiso para modificar este recurso.');
      }

      const updateData = {};

      if (req.body.title !== undefined) updateData.title = requireNonEmptyString(req.body.title, 'title');
      if (req.body.content !== undefined) updateData.content = requireNonEmptyString(req.body.content, 'content');
      if (req.body.category !== undefined) updateData.category = normalizeOptionalString(req.body.category);
      if (req.body.ticketType !== undefined) updateData.ticketType = normalizeOptionalString(req.body.ticketType);
      if (req.body.shortcut !== undefined) updateData.shortcut = normalizeOptionalString(req.body.shortcut);

      const response = await prisma.cannedResponse.update({
        where: { id },
        data: updateData,
      });

      res.json(response);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', requirePermission('TICKETS_CONFIGURE'), async (req, res, next) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      const target = await prisma.cannedResponse.findUnique({ where: { id } });
      if (!target) throw createHttpError(404, 'Respuesta rápida no encontrada.');
      if (req.auth.organizationId && target.organizationId && target.organizationId !== req.auth.organizationId) {
        throw createHttpError(403, 'No tienes permiso para eliminar este recurso.');
      }

      await prisma.cannedResponse.delete({ where: { id } });
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = getCannedResponseRoutes;
