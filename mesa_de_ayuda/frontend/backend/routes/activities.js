const express = require('express');
const { createHttpError, requireNonEmptyString, sanitizeHtmlServer } = require('../lib/utils');
const { requireAuth } = require('../lib/middleware');

function getActivityRoutes(prisma) {
  const router = express.Router();

  router.use(requireAuth(prisma));

  // PUT /api/activities/:id - Edit a comment
  router.put('/:id', async (req, res, next) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      const activity = await prisma.ticketActivity.findFirst({
        where: {
          id,
          ...(req.auth.organizationId ? { ticket: { organizationId: req.auth.organizationId } } : {})
        },
        include: { ticket: true }
      });

      if (!activity) {
        throw createHttpError(404, 'Actividad no encontrada.');
      }

      // REGLA GENERAL: Mensajes automáticos del sistema no se pueden editar
      // EXCEPCIÓN: Comentarios de solución (RESOLVED) sí se pueden editar
      if (activity.field !== 'Comentario' && activity.action !== 'RESOLVED') {
        throw createHttpError(403, 'Los mensajes automáticos del sistema no se pueden editar.');
      }

      const content = sanitizeHtmlServer(requireNonEmptyString(req.body.content, 'content'));

      const updated = await prisma.ticketActivity.update({
        where: { id },
        data: { newValue: content },
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  // DELETE /api/activities/:id - Delete a comment
  router.delete('/:id', async (req, res, next) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      const activity = await prisma.ticketActivity.findFirst({
        where: {
          id,
          ...(req.auth.organizationId ? { ticket: { organizationId: req.auth.organizationId } } : {})
        },
        include: { ticket: true }
      });

      if (!activity) {
        throw createHttpError(404, 'Actividad no encontrada.');
      }

      // REGLA GENERAL: Mensajes automáticos del sistema no se pueden eliminar
      // EXCEPCIÓN: Comentarios de solución (RESOLVED) sí se pueden eliminar
      if (activity.field !== 'Comentario' && activity.action !== 'RESOLVED') {
        throw createHttpError(403, 'Los mensajes automáticos del sistema no se pueden eliminar.');
      }

      await prisma.ticketActivity.delete({ where: { id } });

      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = getActivityRoutes;
