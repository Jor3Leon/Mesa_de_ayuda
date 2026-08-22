const express = require('express');
const { 
  requireNonEmptyString, 
  requirePositiveInt, 
  normalizeOptionalPositiveInt, 
  normalizeOptionalString, 
  normalizeOptionalDate,
  createHttpError,
  createValidationError
} = require('../lib/utils');
const { 
  normalizeResponsibleUserIdsInput, 
  validateResponsibleUsers, 
  attachResponsibleUsers, 
  attachResponsibleUsersToMany,
  parseResponsibleUserIds
} = require('../lib/ticket-service');
const { requireAuth, requirePermission } = require('../lib/middleware');

function getTicketRoutes(prisma) {
  const router = express.Router();

  router.use(requireAuth(prisma));

    router.get('/', requirePermission('TICKETS_VIEW'), async (req, res, next) => {
    try {
      const isStandardUser = req.auth.user.role === 'USUARIO ESTANDAR';
      const orgFilter = req.auth.organizationId ? { organizationId: req.auth.organizationId } : {};
      const where = {
        ...orgFilter,
        ...(isStandardUser ? { createdById: req.auth.user.id } : {}),
      };

      const tickets = await prisma.ticket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          assignedTo: { include: { role: true, location: true } },
          secondaryAssignedTo: { include: { role: true, location: true } },
          createdBy: { include: { role: true, location: true } },
        },
      });

      const processed = await attachResponsibleUsersToMany(prisma, tickets);
      res.json(processed);
    } catch (error) {
      next(error);
    }
  });

  router.post('/', requirePermission('TICKETS_CREATE'), async (req, res, next) => {
    try {
      const subject = req.body.title || req.body.subject;
      if (!subject || typeof subject !== 'string' || subject.trim() === '') {
        throw createValidationError('El título (subject) es requerido.', 'title');
      }
      const description = requireNonEmptyString(req.body.description, 'description');
      const priority = normalizeOptionalString(req.body.priority) || 'BAJA';
      
      // Si no viene customerId, usamos un cliente por defecto o el ID del creador
      const customerId = normalizeOptionalPositiveInt(req.body.customerId) || 1; 
      const category = normalizeOptionalString(req.body.category) || 'General';
      
      const responsibleUserIds = normalizeResponsibleUserIdsInput(req.body);
      await validateResponsibleUsers(prisma, responsibleUserIds);

      // Lógica corregida para asignación primaria y secundaria
      const assignedToId = responsibleUserIds[0] || null;
      const secondaryAssignedToId = responsibleUserIds[1] || null;
      
      const ticketType = normalizeOptionalString(req.body.ticketType) || 'Incidencia';
      const locationId = normalizeOptionalPositiveInt(req.body.locationId);
      const assetId = normalizeOptionalPositiveInt(req.body.assetId);
      const observerId = normalizeOptionalPositiveInt(req.body.observerId);
      const sla = normalizeOptionalString(req.body.sla);

      const ticket = await prisma.ticket.create({
        data: {
          title: subject.toUpperCase(),
          description,
          priority,
          status: responsibleUserIds.length > 0 ? 'IN_PROGRESS' : 'NEW',
          organizationId: req.auth.organizationId || null,
          customerId,
          category,
          ticketType,
          locationId,
          assetId,
          observerId,
          sla,
          assignedToId,
          secondaryAssignedToId,
          responsibleUserIds: JSON.stringify(responsibleUserIds),
          createdById: req.auth.user.id,
        },
        include: {
          customer: true,
          assignedTo: { include: { role: true, location: true } },
          secondaryAssignedTo: { include: { role: true, location: true } },
          createdBy: { include: { role: true, location: true } },
        },
      });

      const initialStatus = responsibleUserIds.length > 0 ? 'IN_PROGRESS' : 'NEW';
      if (initialStatus !== 'NEW') {
        await prisma.ticketActivity.create({
          data: {
            ticketId: ticket.id,
            user: req.auth.user.name,
            action: 'IN_PROGRESS',
            field: 'Estado',
            newValue: 'Cordial saludo, su ticket ha sido asignado',
          },
        });
      }

      res.status(201).json(await attachResponsibleUsers(prisma, ticket));
    } catch (error) {
      next(error);
    }
  });
  
  router.get('/:id', requirePermission('TICKETS_VIEW'), async (req, res, next) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      const ticket = await prisma.ticket.findUnique({
        where: { id },
        include: {
          customer: true,
          assignedTo: { include: { role: true, location: true } },
          secondaryAssignedTo: { include: { role: true, location: true } },
          createdBy: { include: { role: true, location: true } },
          activities: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!ticket) {
        throw createHttpError(404, 'Ticket no encontrado.');
      }

      if (req.auth.organizationId && ticket.organizationId && ticket.organizationId !== req.auth.organizationId) {
        throw createHttpError(403, 'No tienes acceso a este ticket.');
      }

      if (req.auth.user.role === 'USUARIO ESTANDAR' && ticket.createdById !== req.auth.user.id) {
        throw createHttpError(403, 'No tienes permiso para ver este ticket.');
      }

      res.json(await attachResponsibleUsers(prisma, ticket));
    } catch (error) {
      next(error);
    }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      const targetTicket = await prisma.ticket.findUnique({ 
        where: { id },
        include: { assignedTo: true, secondaryAssignedTo: true }
      });
      
      if (!targetTicket) {
        throw createHttpError(404, 'Ticket no encontrado.');
      }

      if (req.auth.organizationId && targetTicket.organizationId && targetTicket.organizationId !== req.auth.organizationId) {
        throw createHttpError(403, 'No tienes permiso para modificar este ticket.');
      }

      const isCreator = targetTicket.createdById === req.auth.user.id;
      const hasEditPermission = req.auth.user.permissions?.includes('TICKETS_EDIT') || false;

      if (!hasEditPermission && !isCreator) {
        throw createHttpError(403, 'No tienes permiso para editar este ticket.');
      }

      const updateData = {};

      // Logic for Standard User (Creator but no general edit permission)
      if (!hasEditPermission && isCreator) {
        if (req.body.status !== undefined) {
          if (targetTicket.status !== 'RESOLVED' && req.body.status === 'CLOSED') {
             // Let them close even if not resolved if they want? 
             // Usually users can close their own tickets.
          } else if (targetTicket.status !== 'RESOLVED') {
             throw createHttpError(400, 'Solo puedes aceptar/rechazar si el ticket está SOLUCIONADO.');
          }
          
          if (!['CLOSED', 'IN_PROGRESS'].includes(req.body.status)) {
            throw createHttpError(400, 'Estado no permitido.');
          }
          updateData.status = req.body.status;
          
          if (req.body.status === 'IN_PROGRESS') {
            updateData.resolvedAt = null;
          }
        } else {
           throw createHttpError(403, 'No tienes permiso para modificar otros campos.');
        }
      } else {
        // Logic for Technician/Admin
        const incomingTitle = req.body.title || req.body.subject;
        if (incomingTitle !== undefined) {
          if (typeof incomingTitle !== 'string' || incomingTitle.trim() === '') {
            throw createValidationError('El título no puede estar vacío.', 'title');
          }
          updateData.title = incomingTitle.toUpperCase();
        }
        if (req.body.description !== undefined) updateData.description = requireNonEmptyString(req.body.description, 'description');
        if (req.body.priority !== undefined) updateData.priority = requireNonEmptyString(req.body.priority, 'priority');
        if (req.body.status !== undefined) updateData.status = requireNonEmptyString(req.body.status, 'status');
        if (req.body.category !== undefined) updateData.category = normalizeOptionalString(req.body.category);
        if (req.body.customerId !== undefined) updateData.customerId = requirePositiveInt(req.body.customerId, 'customerId');
        if (req.body.ticketType !== undefined) updateData.ticketType = normalizeOptionalString(req.body.ticketType);
        if (req.body.locationId !== undefined) updateData.locationId = normalizeOptionalPositiveInt(req.body.locationId);
        if (req.body.assetId !== undefined) updateData.assetId = normalizeOptionalPositiveInt(req.body.assetId);
        if (req.body.observerId !== undefined) updateData.observerId = normalizeOptionalPositiveInt(req.body.observerId);
        if (req.body.sla !== undefined) updateData.sla = normalizeOptionalString(req.body.sla);

        if (req.body.responsibleUserIds !== undefined || req.body.assignedToId !== undefined) {
          const responsibleUserIds = normalizeResponsibleUserIdsInput(req.body);
          await validateResponsibleUsers(prisma, responsibleUserIds);
          
          updateData.responsibleUserIds = JSON.stringify(responsibleUserIds);
          updateData.assignedToId = responsibleUserIds[0] || null;
          updateData.secondaryAssignedToId = responsibleUserIds[1] || null;
          
          if ((targetTicket.status === 'NEW' || targetTicket.status === 'OPEN') && responsibleUserIds.length > 0) {
            updateData.status = 'IN_PROGRESS';
          }
        }
      }

      // SLA Stop Logic: Set resolvedAt/closedAt based on status change
      if (updateData.status === 'RESOLVED' && targetTicket.status !== 'RESOLVED') {
        updateData.resolvedAt = new Date();
      }
      if (updateData.status === 'CLOSED' && targetTicket.status !== 'CLOSED') {
        updateData.closedAt = new Date();
        if (!targetTicket.resolvedAt && !updateData.resolvedAt) {
          updateData.resolvedAt = new Date();
        }
      }
      if (updateData.status === 'IN_PROGRESS' && (targetTicket.status === 'RESOLVED' || targetTicket.status === 'CLOSED')) {
        updateData.resolvedAt = null;
        updateData.closedAt = null;
      }

      const updatedTicket = await prisma.ticket.update({
        where: { id },
        data: updateData,
        include: {
          customer: true,
          assignedTo: { include: { role: true, location: true } },
          secondaryAssignedTo: { include: { role: true, location: true } },
          createdBy: { include: { role: true, location: true } },
        },
      });

      // Activity Recording
      const activitiesToCreate = [];

      if (updateData.status !== undefined && updateData.status !== targetTicket.status) {
        const currentResponsibleIds = parseResponsibleUserIds(updateData.responsibleUserIds || targetTicket.responsibleUserIds);
        
        const hasAssignmentMessage = await prisma.ticketActivity.findFirst({
          where: { 
            ticketId: id, 
            newValue: { in: ['Ticket asignado', 'Cordial saludo, su ticket ha sido asignado'] } 
          }
        });

        const isAssignmentStatus = updateData.status === 'IN_PROGRESS' && 
                                   (targetTicket.status === 'NEW' || targetTicket.status === 'OPEN') &&
                                   currentResponsibleIds.length > 0 &&
                                   !hasAssignmentMessage;
        
        // Priorizar el comentario enviado en el body si existe
        let newValue = req.body.statusComment || updateData.status;

        if (isAssignmentStatus) {
          newValue = 'Cordial saludo, su ticket ha sido asignado';
        } else if (updateData.status === 'CLOSED' && targetTicket.status === 'RESOLVED') {
          newValue = req.body.statusComment || 'Solución aprobada';
        } else if (updateData.status === 'IN_PROGRESS' && targetTicket.status === 'RESOLVED') {
          newValue = req.body.statusComment || 'El usuario ha rechazado la solución. El ticket se ha reabierto.';
        } else if (updateData.status === 'RESOLVED') {
          newValue = req.body.statusComment || 'Ticket solucionado';
        }

        activitiesToCreate.push({
          ticketId: id,
          user: req.auth.user.name,
          action: updateData.status,
          field: 'Estado',
          oldValue: targetTicket.status,
          newValue: newValue,
        });
      }

      // Record other changes if technician
      if (hasEditPermission) {
        const fields = ['title', 'priority', 'category', 'ticketType', 'locationId', 'sla'];
        fields.forEach(f => {
          if (updateData[f] !== undefined && updateData[f] !== targetTicket[f]) {
            activitiesToCreate.push({
              ticketId: id,
              user: req.auth.user.name,
              action: 'UPDATED',
              field: f.charAt(0).toUpperCase() + f.slice(1),
              oldValue: String(targetTicket[f] || 'Ninguno'),
              newValue: String(updateData[f]),
            });
          }
        });
      }

      if (activitiesToCreate.length > 0) {
        await prisma.ticketActivity.createMany({ data: activitiesToCreate });
      }

      res.json(await attachResponsibleUsers(prisma, updatedTicket));
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id/activities', async (req, res, next) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      const activities = await prisma.ticketActivity.findMany({
        where: { ticketId: id },
        orderBy: { createdAt: 'desc' },
      });
      res.json(activities);
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/activities', async (req, res, next) => {
    try {
      const ticketId = Number.parseInt(req.params.id, 10);
      
      // Bloquear comentarios si el ticket está RESUELTO o CERRADO
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { status: true, organizationId: true }
      });

      if (!ticket) {
        throw createHttpError(404, 'Ticket no encontrado.');
      }

      if (req.auth.organizationId && ticket.organizationId && ticket.organizationId !== req.auth.organizationId) {
        throw createHttpError(403, 'No tienes permiso para comentar en este ticket.');
      }

      if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
        throw createHttpError(403, 'No se pueden agregar comentarios a un ticket que ya ha sido solucionado o cerrado. Debe reabrir el caso para comentar.');
      }

      const content = requireNonEmptyString(req.body.content, 'content');
      const type = normalizeOptionalString(req.body.type) || 'COMMENT';

      const activity = await prisma.ticketActivity.create({
        data: {
          ticketId,
          user: req.auth.user.name,
          action: type === 'COMMENT' ? 'COMMENTED' : 'UPDATED',
          field: type === 'COMMENT' ? 'Comentario' : 'Estado',
          newValue: content,
        },
      });

      res.status(201).json(activity);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = getTicketRoutes;
