const express = require('express');
const { 
  requireNonEmptyString, 
  requirePositiveInt, 
  normalizeOptionalPositiveInt, 
  normalizeOptionalString, 
  normalizeOptionalDate,
  createHttpError,
  createValidationError,
  sanitizeHtmlServer
} = require('../lib/utils');
const { 
  normalizeResponsibleUserIdsInput, 
  validateResponsibleUsers, 
  attachResponsibleUsers, 
  attachResponsibleUsersToMany,
  parseResponsibleUserIds
} = require('../lib/ticket-service');
const { requireAuth, requirePermission } = require('../lib/middleware');
const { autoCloseResolvedTickets } = require('../lib/business-hours');
const { resolvePolicy } = require('../lib/ans-engine');

async function findEntityFirst(model, where) {
  if (!model) return null;
  if (typeof model.findFirst === 'function') {
    return model.findFirst({ where });
  }
  if (typeof model.findMany === 'function') {
    const items = await model.findMany({ where });
    return items ? items[0] : null;
  }
  if (typeof model.findUnique === 'function' && where.id !== undefined) {
    const item = await model.findUnique({ where: { id: where.id } });
    if (item && (!where.organizationId || item.organizationId === where.organizationId)) {
      return item;
    }
    return null;
  }
  return null;
}

function getTicketRoutes(prisma) {
  const router = express.Router();

  router.use(requireAuth(prisma));

  router.get('/', requirePermission('TICKETS_VIEW'), async (req, res, next) => {
    try {
      // Auto-close tickets that have been in RESOLVED for >= 8 business hours
      await autoCloseResolvedTickets(prisma).catch(console.error);

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
          asset: true,
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
      const description = sanitizeHtmlServer(requireNonEmptyString(req.body.description, 'description'));
      const rawPriority = (normalizeOptionalString(req.body.priority) || 'MEDIO').toUpperCase();
      let priority = 'MEDIO';
      if (['ALTO', 'HIGH', 'ALTA', 'CRITICAL', 'CRITICA', 'EMERGENCY', 'URGENTE'].includes(rawPriority)) {
        priority = 'ALTO';
      } else if (['BAJO', 'LOW', 'BAJA'].includes(rawPriority)) {
        priority = 'BAJO';
      } else {
        priority = 'MEDIO';
      }

      
      // Validación multi-tenant estricta de relaciones
      if (req.auth.organizationId) {
        if (req.body.customerId) {
          const cust = await findEntityFirst(prisma.customer, { id: normalizeOptionalPositiveInt(req.body.customerId), organizationId: req.auth.organizationId });
          if (!cust) throw createValidationError('El solicitante no pertenece a su organización.', 'customerId');
        }
        if (req.body.assetId) {
          const asset = await findEntityFirst(prisma.asset, { id: normalizeOptionalPositiveInt(req.body.assetId), organizationId: req.auth.organizationId });
          if (!asset) throw createValidationError('El activo no pertenece a su organización.', 'assetId');
        }
        if (req.body.locationId) {
          const loc = await findEntityFirst(prisma.location, { id: normalizeOptionalPositiveInt(req.body.locationId), organizationId: req.auth.organizationId });
          if (!loc) throw createValidationError('La ubicación no pertenece a su organización.', 'locationId');
        }
        if (req.body.observerId) {
          const obs = await findEntityFirst(prisma.user, { id: normalizeOptionalPositiveInt(req.body.observerId), organizationId: req.auth.organizationId });
          if (!obs) throw createValidationError('El observador no pertenece a su organización.', 'observerId');
        }
      }

      // Si no viene customerId, usamos un cliente por defecto o el ID del creador
      const customerId = normalizeOptionalPositiveInt(req.body.customerId) || 1; 
      const category = normalizeOptionalString(req.body.category) || 'General';
      
      const responsibleUserIds = normalizeResponsibleUserIdsInput(req.body);
      await validateResponsibleUsers(prisma, responsibleUserIds);

      // Lógica corregida para asignación primaria y secundaria
      const assignedToId = responsibleUserIds[0] || null;
      const secondaryAssignedToId = responsibleUserIds[1] || null;
      const assignedAt = assignedToId ? new Date() : null;
      
      const ticketType = normalizeOptionalString(req.body.ticketType) || 'Incidencia';
      const locationId = normalizeOptionalPositiveInt(req.body.locationId);
      const assetId = normalizeOptionalPositiveInt(req.body.assetId);
      const observerId = normalizeOptionalPositiveInt(req.body.observerId);
      const sla = normalizeOptionalString(req.body.sla);

      // Snapshot ANS oficial
      const ansPolicy = await resolvePolicy(prisma, priority, req.auth.organizationId);

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
          responseAnsMinutes: ansPolicy.responseMinutes,
          resolutionAnsMinutes: ansPolicy.resolutionMinutes,
          assignedToId,
          secondaryAssignedToId,
          assignedAt,
          responsibleUserIds: JSON.stringify(responsibleUserIds),
          createdById: req.auth.user.id,
        },
        include: {
          customer: true,
          asset: true,
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
      await autoCloseResolvedTickets(prisma).catch(console.error);
      const id = Number.parseInt(req.params.id, 10);
      const ticket = await prisma.ticket.findFirst({
        where: {
          id,
          ...(req.auth.organizationId ? { organizationId: req.auth.organizationId } : {}),
        },
        include: {
          customer: true,
          asset: true,
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

      if (req.auth.organizationId && ticket.organizationId !== req.auth.organizationId) {
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
      const targetTicket = await prisma.ticket.findFirst({ 
        where: {
          id,
          ...(req.auth.organizationId ? { organizationId: req.auth.organizationId } : {}),
        },
        include: { 
          asset: true,
          customer: true,
          assignedTo: true, 
          secondaryAssignedTo: true 
        }
      });
      
      if (!targetTicket) {
        throw createHttpError(404, 'Ticket no encontrado.');
      }

      if (req.auth.organizationId && targetTicket.organizationId !== req.auth.organizationId) {
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
             // Let them close even if not resolved if they want
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
        if (req.body.description !== undefined) updateData.description = sanitizeHtmlServer(requireNonEmptyString(req.body.description, 'description'));
        if (req.body.priority !== undefined) {
          const rawPrio = requireNonEmptyString(req.body.priority, 'priority').toUpperCase();
          let newPrio = 'MEDIO';
          if (['ALTO', 'HIGH', 'ALTA', 'CRITICAL', 'CRITICA', 'EMERGENCY', 'URGENTE'].includes(rawPrio)) {
            newPrio = 'ALTO';
          } else if (['BAJO', 'LOW', 'BAJA'].includes(rawPrio)) {
            newPrio = 'BAJO';
          }
          updateData.priority = newPrio;
          if (newPrio !== targetTicket.priority) {
            const p = await resolvePolicy(prisma, newPrio, req.auth.organizationId);
            updateData.responseAnsMinutes = p.responseMinutes;
            updateData.resolutionAnsMinutes = p.resolutionMinutes;
          }
        }
        if (req.body.status !== undefined) updateData.status = requireNonEmptyString(req.body.status, 'status');
        if (req.body.category !== undefined) updateData.category = normalizeOptionalString(req.body.category);
        if (req.body.customerId !== undefined) {
          const cid = requirePositiveInt(req.body.customerId, 'customerId');
          if (req.auth.organizationId) {
            const cust = await findEntityFirst(prisma.customer, { id: cid, organizationId: req.auth.organizationId });
            if (!cust) throw createValidationError('El solicitante no pertenece a su organización.', 'customerId');
          }
          updateData.customerId = cid;
        }
        if (req.body.ticketType !== undefined) updateData.ticketType = normalizeOptionalString(req.body.ticketType);
        if (req.body.locationId !== undefined) {
          const lid = normalizeOptionalPositiveInt(req.body.locationId);
          if (lid && req.auth.organizationId) {
            const loc = await findEntityFirst(prisma.location, { id: lid, organizationId: req.auth.organizationId });
            if (!loc) throw createValidationError('La ubicación no pertenece a su organización.', 'locationId');
          }
          updateData.locationId = lid;
        }
        if (req.body.assetId !== undefined) {
          const aid = normalizeOptionalPositiveInt(req.body.assetId);
          if (aid && req.auth.organizationId) {
            const asset = await findEntityFirst(prisma.asset, { id: aid, organizationId: req.auth.organizationId });
            if (!asset) throw createValidationError('El activo no pertenece a su organización.', 'assetId');
          }
          updateData.assetId = aid;
        }
        if (req.body.observerId !== undefined) {
          const oid = normalizeOptionalPositiveInt(req.body.observerId);
          if (oid && req.auth.organizationId) {
            const obs = await findEntityFirst(prisma.user, { id: oid, organizationId: req.auth.organizationId });
            if (!obs) throw createValidationError('El observador no pertenece a su organización.', 'observerId');
          }
          updateData.observerId = oid;
        }
        if (req.body.sla !== undefined) updateData.sla = normalizeOptionalString(req.body.sla);

        if (req.body.responsibleUserIds !== undefined || req.body.assignedToId !== undefined) {
          const responsibleUserIds = normalizeResponsibleUserIdsInput(req.body);
          await validateResponsibleUsers(prisma, responsibleUserIds);
          
          updateData.responsibleUserIds = JSON.stringify(responsibleUserIds);
          updateData.assignedToId = responsibleUserIds[0] || null;
          updateData.secondaryAssignedToId = responsibleUserIds[1] || null;
          if (responsibleUserIds.length > 0 && !targetTicket.assignedAt) {
            updateData.assignedAt = new Date();
          }
          
          if ((targetTicket.status === 'NEW' || targetTicket.status === 'OPEN') && responsibleUserIds.length > 0) {
            updateData.status = 'IN_PROGRESS';
          }
        }
      }

      // Registrar primera respuesta si un técnico/agente atiende el caso
      const userRole = String(req.auth.user.role || '').toUpperCase();
      const isTechOrAdmin = !userRole.includes('ESTANDAR') && !userRole.includes('STANDARD');
      if (isTechOrAdmin && !targetTicket.firstResponseAt) {
        updateData.firstResponseAt = new Date();
        updateData.firstResponseById = req.auth.user.id;
      }

      // ANS Stop Logic: Set resolvedAt/closedAt/resolvedById and reopenCount
      if (updateData.status === 'RESOLVED' && targetTicket.status !== 'RESOLVED') {
        updateData.resolvedAt = new Date();
        updateData.resolvedById = req.auth.user.id;
      }
      if (updateData.status === 'CLOSED' && targetTicket.status !== 'CLOSED') {
        updateData.closedAt = new Date();
        if (!targetTicket.resolvedAt && !updateData.resolvedAt) {
          updateData.resolvedAt = new Date();
          updateData.resolvedById = req.auth.user.id;
        }
      }
      if (updateData.status === 'IN_PROGRESS' && (targetTicket.status === 'RESOLVED' || targetTicket.status === 'CLOSED')) {
        updateData.resolvedAt = null;
        updateData.resolvedById = null;
        updateData.closedAt = null;
        updateData.reopenCount = (targetTicket.reopenCount || 0) + 1;
      }

      const updatedTicket = await prisma.ticket.update({
        where: { id },
        data: updateData,
        include: {
          customer: true,
          asset: true,
          assignedTo: { include: { role: true, location: true } },
          secondaryAssignedTo: { include: { role: true, location: true } },
          createdBy: { include: { role: true, location: true } },
        },
      });

      // Activity Recording - Auditoría exhaustiva de todos los cambios
      const activitiesToCreate = [];

      // 1. Estado
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

      // 2. Elemento Asociado / Dispositivo / Activo (assetId)
      if (updateData.assetId !== undefined && updateData.assetId !== targetTicket.assetId) {
        const assetIds = [targetTicket.assetId, updateData.assetId].filter((aid) => Number.isInteger(aid) && aid > 0);
        const foundAssets = assetIds.length > 0 ? await prisma.asset.findMany({ where: { id: { in: assetIds } } }) : [];

        const getAssetDisplay = (aid) => {
          if (!aid) return 'Sin elemento asociado';
          const match = foundAssets.find(a => a.id === aid);
          if (!match) return `Activo #${aid}`;
          const brandModel = [match.brand, match.model].filter(Boolean).join(' ');
          return match.hostname + (brandModel ? ` (${brandModel})` : '');
        };

        activitiesToCreate.push({
          ticketId: id,
          user: req.auth.user.name,
          action: 'UPDATED',
          field: 'Elemento Asociado',
          oldValue: getAssetDisplay(targetTicket.assetId),
          newValue: getAssetDisplay(updateData.assetId),
        });
      }

      // 3. Tipo (ticketType)
      if (updateData.ticketType !== undefined && updateData.ticketType !== targetTicket.ticketType) {
        activitiesToCreate.push({
          ticketId: id,
          user: req.auth.user.name,
          action: 'UPDATED',
          field: 'Tipo',
          oldValue: String(targetTicket.ticketType || 'Sin Tipo'),
          newValue: String(updateData.ticketType || 'Sin Tipo'),
        });
      }

      // 4. Categoría (category)
      if (updateData.category !== undefined && updateData.category !== targetTicket.category) {
        activitiesToCreate.push({
          ticketId: id,
          user: req.auth.user.name,
          action: 'UPDATED',
          field: 'Categoría',
          oldValue: String(targetTicket.category || 'Sin Categoría'),
          newValue: String(updateData.category || 'Sin Categoría'),
        });
      }

      // 5. Prioridad (priority)
      if (updateData.priority !== undefined && updateData.priority !== targetTicket.priority) {
        activitiesToCreate.push({
          ticketId: id,
          user: req.auth.user.name,
          action: 'UPDATED',
          field: 'Prioridad',
          oldValue: String(targetTicket.priority || 'Sin Prioridad'),
          newValue: String(updateData.priority || 'Sin Prioridad'),
        });
      }

      // 6. ANS / SLA (sla)
      if (updateData.sla !== undefined && updateData.sla !== targetTicket.sla) {
        activitiesToCreate.push({
          ticketId: id,
          user: req.auth.user.name,
          action: 'UPDATED',
          field: 'ANS',
          oldValue: String(targetTicket.sla || 'Sin ANS'),
          newValue: String(updateData.sla || 'Sin ANS'),
        });
      }

      // 7. Ubicación (locationId)
      if (updateData.locationId !== undefined && updateData.locationId !== targetTicket.locationId) {
        const locationIds = [targetTicket.locationId, updateData.locationId].filter((lid) => Number.isInteger(lid) && lid > 0);
        const locs = locationIds.length > 0 ? await prisma.location.findMany({ where: { id: { in: locationIds } } }) : [];
        const oldLoc = locs.find(l => l.id === targetTicket.locationId)?.name || 'Sin Ubicación';
        const newLoc = locs.find(l => l.id === updateData.locationId)?.name || 'Sin Ubicación';

        activitiesToCreate.push({
          ticketId: id,
          user: req.auth.user.name,
          action: 'UPDATED',
          field: 'Ubicación',
          oldValue: oldLoc,
          newValue: newLoc,
        });
      }

      // 8. Seguimiento / Observador (observerId)
      if (updateData.observerId !== undefined && updateData.observerId !== targetTicket.observerId) {
        const observerIds = [targetTicket.observerId, updateData.observerId].filter((uid) => Number.isInteger(uid) && uid > 0);
        const obsUsers = observerIds.length > 0 ? await prisma.user.findMany({ where: { id: { in: observerIds } } }) : [];
        const oldObs = obsUsers.find(u => u.id === targetTicket.observerId)?.name || 'Sin Asignar';
        const newObs = obsUsers.find(u => u.id === updateData.observerId)?.name || 'Sin Asignar';

        activitiesToCreate.push({
          ticketId: id,
          user: req.auth.user.name,
          action: 'UPDATED',
          field: 'Seguimiento',
          oldValue: oldObs,
          newValue: newObs,
        });
      }

      // 9. Técnicos Asignados / Participantes (responsibleUserIds)
      if (updateData.responsibleUserIds !== undefined) {
        const oldRespIds = parseResponsibleUserIds(targetTicket.responsibleUserIds);
        const newRespIds = parseResponsibleUserIds(updateData.responsibleUserIds);

        const oldSorted = [...oldRespIds].sort().join(',');
        const newSorted = [...newRespIds].sort().join(',');

        if (oldSorted !== newSorted) {
          const allUserIds = [...new Set([...oldRespIds, ...newRespIds])];
          const techUsers = allUserIds.length > 0 ? await prisma.user.findMany({ where: { id: { in: allUserIds } } }) : [];
          
          const oldTechNames = oldRespIds.map(uid => techUsers.find(u => u.id === uid)?.name || `ID ${uid}`).join(', ') || 'Sin Asignar';
          const newTechNames = newRespIds.map(uid => techUsers.find(u => u.id === uid)?.name || `ID ${uid}`).join(', ') || 'Sin Asignar';

          activitiesToCreate.push({
            ticketId: id,
            user: req.auth.user.name,
            action: 'UPDATED',
            field: 'Técnico Asignado',
            oldValue: oldTechNames,
            newValue: newTechNames,
          });
        }
      }

      // 10. Título (title)
      if (updateData.title !== undefined && updateData.title !== targetTicket.title) {
        activitiesToCreate.push({
          ticketId: id,
          user: req.auth.user.name,
          action: 'UPDATED',
          field: 'Título',
          oldValue: targetTicket.title,
          newValue: updateData.title,
        });
      }

      // 11. Descripción (description)
      if (updateData.description !== undefined && updateData.description !== targetTicket.description) {
        activitiesToCreate.push({
          ticketId: id,
          user: req.auth.user.name,
          action: 'UPDATED',
          field: 'Descripción',
          oldValue: 'Contenido modificado',
          newValue: 'Descripción actualizada',
        });
      }

      // 12. Solicitante / Cliente (customerId)
      if (updateData.customerId !== undefined && updateData.customerId !== targetTicket.customerId) {
        const custIds = [targetTicket.customerId, updateData.customerId].filter((cid) => Number.isInteger(cid) && cid > 0);
        const custs = custIds.length > 0 ? await prisma.customer.findMany({ where: { id: { in: custIds } } }) : [];
        const oldCust = custs.find(c => c.id === targetTicket.customerId)?.name || 'Sin Solicitante';
        const newCust = custs.find(c => c.id === updateData.customerId)?.name || 'Sin Solicitante';

        activitiesToCreate.push({
          ticketId: id,
          user: req.auth.user.name,
          action: 'UPDATED',
          field: 'Solicitante',
          oldValue: oldCust,
          newValue: newCust,
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
      const ticket = await prisma.ticket.findFirst({
        where: {
          id,
          ...(req.auth.organizationId ? { organizationId: req.auth.organizationId } : {}),
        },
        include: { 
          asset: true, 
          createdBy: true 
        }
      });

      if (!ticket) {
        throw createHttpError(404, 'Ticket no encontrado.');
      }

      let activities = await prisma.ticketActivity.findMany({
        where: { ticketId: id },
        orderBy: { createdAt: 'desc' },
      });

      // 🔄 Auto-reconciliación: Si el ticket tiene un asset pero no tiene actividad registrada
      if (ticket.assetId && !activities.some(a => a.field === 'Elemento Asociado')) {
        const brandModel = ticket.asset ? [ticket.asset.brand, ticket.asset.model].filter(Boolean).join(' ') : '';
        const assetDisplay = ticket.asset ? (ticket.asset.hostname + (brandModel ? ` (${brandModel})` : '')) : `Activo #${ticket.assetId}`;

        const createdAssetAct = await prisma.ticketActivity.create({
          data: {
            ticketId: id,
            user: ticket.createdBy?.name || req.auth.user?.name || 'Administrador',
            action: 'UPDATED',
            field: 'Elemento Asociado',
            oldValue: 'Sin elemento asociado',
            newValue: assetDisplay,
            createdAt: ticket.updatedAt || ticket.createdAt || new Date(),
          }
        }).catch(() => null);

        if (createdAssetAct) {
          activities.unshift(createdAssetAct);
        }
      }

      res.json(activities);
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/activities', async (req, res, next) => {
    try {
      const ticketId = Number.parseInt(req.params.id, 10);
      
      // Bloquear comentarios si el ticket está RESUELTO o CERRADO
      const ticket = await prisma.ticket.findFirst({
        where: {
          id: ticketId,
          ...(req.auth.organizationId ? { organizationId: req.auth.organizationId } : {}),
        },
        select: { status: true, organizationId: true }
      });

      if (!ticket) {
        throw createHttpError(404, 'Ticket no encontrado.');
      }

      if (req.auth.organizationId && ticket.organizationId !== req.auth.organizationId) {
        throw createHttpError(403, 'No tienes permiso para comentar en este ticket.');
      }

      if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
        throw createHttpError(403, 'No se pueden agregar comentarios a un ticket que ya ha sido solucionado o cerrado. Debe reabrir el caso para comentar.');
      }

      const content = sanitizeHtmlServer(requireNonEmptyString(req.body.content, 'content'));
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

      // Si el autor es técnico/admin y el ticket aún no tiene primera respuesta registrada, registrarla
      const userRole = String(req.auth.user.role || '').toUpperCase();
      const isTechOrAdmin = !userRole.includes('ESTANDAR') && !userRole.includes('STANDARD');
      if (isTechOrAdmin) {
        await prisma.ticket.updateMany({
          where: { id: ticketId, firstResponseAt: null },
          data: {
            firstResponseAt: new Date(),
            firstResponseById: req.auth.user.id
          }
        }).catch(() => null);
      }

      res.status(201).json(activity);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = getTicketRoutes;
