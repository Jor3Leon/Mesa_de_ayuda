const express = require('express');
const { requireAuth, requirePermission } = require('../lib/middleware');
const { createHttpError } = require('../lib/utils');

module.exports = function getCategoryRoutes(prisma) {
  const router = express.Router();

  // Middleware para todas las rutas de categorias (solo admins pueden modificar)
  router.use(requireAuth(prisma));

  // GET /api/categories - Obtener categorías
  router.get('/', async (req, res, next) => {
    try {
      const { ticketType, isActive } = req.query;
      const orgFilter = req.auth.organizationId ? { organizationId: req.auth.organizationId } : {};
      const where = { ...orgFilter };

      if (ticketType) {
        where.ticketType = ticketType;
      }
      
      if (isActive !== undefined) {
        where.isActive = isActive === 'true';
      }

      const categories = await prisma.ticketCategory.findMany({
        where,
        orderBy: [
          { ticketType: 'asc' },
          { group: 'asc' },
          { name: 'asc' }
        ]
      });

      res.json(categories);
    } catch (error) {
      next(error);
    }
  });

  // POST /api/categories - Crear nueva categoría
  router.post('/', requirePermission('TICKETS_CONFIGURE'), async (req, res, next) => {
    try {
      const { name, ticketType, sla, isActive, group } = req.body;

      if (!name || !ticketType) {
        throw createHttpError(400, 'El nombre y el tipo de ticket son obligatorios.');
      }

      const category = await prisma.ticketCategory.create({
        data: {
          group: group || 'General',
          name,
          ticketType,
          sla: sla || null,
          isActive: isActive !== undefined ? isActive : true,
          organizationId: req.auth.organizationId || null,
        }
      });

      res.status(201).json(category);
    } catch (error) {
      next(error);
    }
  });

  // PUT /api/categories/:id - Editar categoría
  router.put('/:id', requirePermission('TICKETS_CONFIGURE'), async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const target = await prisma.ticketCategory.findUnique({ where: { id } });
      if (!target) throw createHttpError(404, 'Categoría no encontrada.');
      if (req.auth.organizationId && target.organizationId && target.organizationId !== req.auth.organizationId) {
        throw createHttpError(403, 'No tienes permiso para modificar este recurso.');
      }

      const { name, ticketType, sla, isActive, group } = req.body;

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (ticketType !== undefined) updateData.ticketType = ticketType;
      if (sla !== undefined) updateData.sla = sla;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (group !== undefined) updateData.group = group;

      const category = await prisma.ticketCategory.update({
        where: { id },
        data: updateData
      });

      res.json(category);
    } catch (error) {
      next(error);
    }
  });

  // DELETE /api/categories/:id - Eliminar categoría
  router.delete('/:id', requirePermission('TICKETS_CONFIGURE'), async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const target = await prisma.ticketCategory.findUnique({ where: { id } });
      if (!target) throw createHttpError(404, 'Categoría no encontrada.');
      if (req.auth.organizationId && target.organizationId && target.organizationId !== req.auth.organizationId) {
        throw createHttpError(403, 'No tienes permiso para eliminar este recurso.');
      }

      const category = await prisma.ticketCategory.delete({
        where: { id }
      });

      res.json({ message: 'Categoría eliminada correctamente', category });
    } catch (error) {
      next(error);
    }
  });

  return router;
};
