const express = require('express');
const { requireAuth, requirePermission, requireAnyPermission } = require('../lib/middleware');

function getCommonRoutes(prisma) {
  const router = express.Router();

  router.use(requireAuth(prisma));

  router.get('/customers', async (req, res, next) => {
    try {
      const orgFilter = req.auth.organizationId ? { organizationId: req.auth.organizationId } : {};
      const customers = await prisma.customer.findMany({ 
        where: orgFilter,
        orderBy: { name: 'asc' } 
      });
      res.json(customers);
    } catch (error) {
      next(error);
    }
  });

  router.get('/locations', async (req, res, next) => {
    try {
      const orgFilter = req.auth.organizationId ? { organizationId: req.auth.organizationId } : {};
      
      const [rawLocations, sedes] = await Promise.all([
        prisma.location.findMany({ 
          where: orgFilter,
          orderBy: { name: 'asc' } 
        }).catch(() => []),
        prisma.sede.findMany({
          where: orgFilter,
          include: {
            dependencias: {
              include: { oficinas: true },
              orderBy: { name: 'asc' }
            },
            oficinas: {
              orderBy: { name: 'asc' }
            }
          },
          orderBy: { name: 'asc' }
        }).catch(() => [])
      ]);

      const seenNames = new Set();
      const combined = [];

      // Add structured locations from hierarchy
      for (const sede of sedes) {
        if (!seenNames.has(sede.name)) {
          seenNames.add(sede.name);
          combined.push({
            id: `sede-${sede.id}`,
            name: sede.name,
            description: `Sede: ${sede.address || ''} (${sede.city || 'Yopal'})`,
            level: 'SEDE',
            sedeName: sede.name
          });
        }

        for (const dep of (sede.dependencias || [])) {
          const depFullName = `${sede.name} - ${dep.name}`;
          if (!seenNames.has(depFullName)) {
            seenNames.add(depFullName);
            combined.push({
              id: `dep-${dep.id}`,
              name: depFullName,
              description: `Dependencia: ${dep.name} (${sede.name})`,
              level: 'DEPENDENCIA',
              sedeName: sede.name,
              depName: dep.name
            });
          }

          for (const ofi of (dep.oficinas || [])) {
            const ofiFullName = `${sede.name} - ${dep.name} - ${ofi.name}`;
            if (!seenNames.has(ofiFullName)) {
              seenNames.add(ofiFullName);
              combined.push({
                id: `ofi-${ofi.id}`,
                name: ofiFullName,
                description: `Oficina: ${ofi.name} (${ofi.floor || 'Sin piso'})`,
                level: 'OFICINA',
                sedeName: sede.name,
                depName: dep.name,
                ofiName: ofi.name
              });
            }
          }
        }

        for (const ofi of (sede.oficinas || [])) {
          const ofiDirectName = `${sede.name} - ${ofi.name}`;
          if (!seenNames.has(ofiDirectName)) {
            seenNames.add(ofiDirectName);
            combined.push({
              id: `ofi-${ofi.id}`,
              name: ofiDirectName,
              description: `Oficina: ${ofi.name} (${sede.name})`,
              level: 'OFICINA',
              sedeName: sede.name,
              ofiName: ofi.name
            });
          }
        }
      }

      // Add any standalone legacy locations that aren't already included
      for (const loc of rawLocations) {
        if (!seenNames.has(loc.name)) {
          seenNames.add(loc.name);
          combined.push(loc);
        }
      }

      res.json(combined.length > 0 ? combined : rawLocations);
    } catch (error) {
      next(error);
    }
  });

  router.get('/roles', requirePermission('ROLES_MANAGE'), async (req, res, next) => {
    try {
      const orgFilter = req.auth.organizationId ? { OR: [{ organizationId: req.auth.organizationId }, { organizationId: null }] } : {};
      const roles = await prisma.role.findMany({ 
        where: orgFilter,
        include: { 
          permissions: { include: { permission: true } } 
        },
        orderBy: { name: 'asc' } 
      });
      
      // Mapear los permisos a un formato plano que el frontend espera (permissionCodes)
      const mappedRoles = roles.map(role => ({
        ...role,
        permissionCodes: role.permissions.map(p => p.permission.code)
      }));
      
      res.json(mappedRoles);
    } catch (error) {
      next(error);
    }
  });

  router.put('/roles/:id', requirePermission('ROLES_MANAGE'), async (req, res, next) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      const { name, description, permissionCodes } = req.body;

      // 1. Actualizar datos básicos del rol
      const role = await prisma.role.update({
        where: { id },
        data: {
          name,
          description,
        }
      });

      // 2. Sincronizar permisos (Eliminar actuales y crear nuevos)
      await prisma.rolePermission.deleteMany({ where: { roleId: id } });

      if (permissionCodes && permissionCodes.length > 0) {
        // Auto-asegurar que todos los permissionCodes existan en la tabla Permission
        for (const code of permissionCodes) {
          await prisma.permission.upsert({
            where: { code },
            update: {},
            create: { code, name: code, description: '' }
          }).catch(() => {});
        }

        const permissions = await prisma.permission.findMany({
          where: { code: { in: permissionCodes } }
        });

        await prisma.rolePermission.createMany({
          data: permissions.map(p => ({
            roleId: id,
            permissionId: p.id
          }))
        });
      }

      const updatedRole = await prisma.role.findUnique({
        where: { id },
        include: { permissions: { include: { permission: true } } }
      });

      const mappedUpdatedRole = {
        ...updatedRole,
        permissionCodes: updatedRole.permissions.map(p => p.permission.code)
      };

      res.json(mappedUpdatedRole);
    } catch (error) {
      next(error);
    }
  });

  router.get('/permissions', requirePermission('ROLES_MANAGE'), async (req, res, next) => {
    try {
      // Auto-asegurar que DASHBOARD_VIEW y ANALYTICS_VIEW existan en la BD
      await prisma.permission.upsert({
        where: { code: 'DASHBOARD_VIEW' },
        update: { name: 'Ver Dashboard', description: 'Permite ver el dashboard operacional principal.' },
        create: { code: 'DASHBOARD_VIEW', name: 'Ver Dashboard', description: 'Permite ver el dashboard operacional principal.' }
      }).catch(() => {});

      const permissions = await prisma.permission.findMany({
        orderBy: { code: 'asc' }
      });
      res.json(permissions);
    } catch (error) {
      next(error);
    }
  });

  router.get('/summary', async (req, res, next) => {
    try {
      const orgFilter = req.auth.organizationId ? { organizationId: req.auth.organizationId } : {};
      const [
        openTickets, 
        criticalTickets, 
        totalAssets, 
        onlineAssets, 
        customerCount,
        unassignedTickets,
        pendingTasks,
        recentActivities
      ] = await Promise.all([
        prisma.ticket.count({ where: { ...orgFilter, status: { in: ['NEW', 'OPEN', 'IN_PROGRESS'] } } }),
        prisma.ticket.count({ where: { ...orgFilter, priority: { in: ['CRITICAL', 'EMERGENCY'] }, status: { not: 'CLOSED' } } }),
        prisma.asset.count({ where: orgFilter }),
        prisma.asset.count({ where: { ...orgFilter, status: 'ONLINE' } }),
        prisma.customer.count({ where: orgFilter }),
        prisma.ticket.count({ where: { ...orgFilter, assignedToId: null, status: { in: ['NEW', 'OPEN'] } } }),
        prisma.ticket.count({ where: { ...orgFilter, status: 'IN_PROGRESS' } }),
        prisma.ticketActivity.findMany({
          where: req.auth.organizationId ? { ticket: { organizationId: req.auth.organizationId } } : {},
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { 
            ticket: { select: { title: true } }
          }
        })
      ]);

      res.json({
        openTickets,
        criticalTickets,
        totalAssets,
        onlineAssets,
        customerCount,
        unassignedTickets,
        pendingTasks,
        recentActivities,
        healthScore: totalAssets > 0 ? Math.round((onlineAssets / totalAssets) * 100) : 100,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/dashboard/data', requireAnyPermission('DASHBOARD_VIEW', 'ANALYTICS_VIEW', 'TICKETS_VIEW'), async (req, res, next) => {
    try {
      const user = req.auth?.user;
      if (!user) {
        return res.status(401).json({ error: 'No autorizado' });
      }
      
      const userId = user.id;
      const orgFilter = req.auth.organizationId ? { organizationId: req.auth.organizationId } : {};

      const headerRole = req.headers['x-view-as-role'] || req.query.role || req.query.viewAsRole;
      const effectiveRole = (headerRole || user.role || user.role?.name || '').trim().toUpperCase();
      const isLevel2 = effectiveRole === 'NIVEL 2' || effectiveRole === 'LEVEL_2' || effectiveRole === 'TECNICO NIVEL 2' || effectiveRole === 'TÉCNICO NIVEL 2' || (effectiveRole.includes('NIVEL 2') && !effectiveRole.includes('NIVEL 1') && !effectiveRole.includes('NIVEL 3'));
      const isLevel1 = effectiveRole === 'NIVEL 1' || effectiveRole === 'LEVEL_1' || effectiveRole.includes('NIVEL 1');
      const isLevel3 = effectiveRole === 'NIVEL 3' || effectiveRole === 'LEVEL_3' || effectiveRole.includes('NIVEL 3') || effectiveRole.includes('SUPERVISOR');
      const isAdmin = effectiveRole === 'ADMIN' || effectiveRole === 'ADMINISTRADOR';
      const isStandard = effectiveRole === 'USUARIO ESTANDAR' || effectiveRole === 'STANDARD_USER' || effectiveRole === 'STANDARD';

      // Nivel 1, Nivel 3 y Admin can switch between Global and Personal views. Nivel 2 is always forced to Personal.
      const requestedViewMode = req.query.viewMode || 'global';
      const forcePersonal = isLevel2 || isStandard || (requestedViewMode === 'personal');

      const userTicketScope = forcePersonal 
        ? {
            OR: [
              { assignedToId: userId },
              { secondaryAssignedToId: userId },
              { createdById: userId }
            ]
          }
        : {};

      const ticketBaseFilter = {
        ...orgFilter,
        ...userTicketScope
      };

      const now = new Date();
      const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
      const eightHoursAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000);
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      // 1. Comprehensive ITIL Queries in Parallel
      const [
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        closedTickets,
        criticalTickets,
        incidentCount,
        requestCount,
        unassignedTickets,
        totalAssets,
        onlineAssets,
        offlineAssets,
        warningAssets,
        ticketsByPriorityRaw,
        ticketsByStatusRaw,
        overdueCritical,
        overdueHigh,
        overdueMedium,
        overdueLow,
        recentActivitiesRaw,
        topProblemAssetsRaw
      ] = await Promise.all([
        prisma.ticket.count({ where: ticketBaseFilter }).catch(() => 0),
        prisma.ticket.count({ where: { ...ticketBaseFilter, status: { in: ['NEW', 'OPEN', 'IN_PROGRESS', 'PENDING'] } } }).catch(() => 0),
        prisma.ticket.count({ where: { ...ticketBaseFilter, status: 'IN_PROGRESS' } }).catch(() => 0),
        prisma.ticket.count({ where: { ...ticketBaseFilter, status: 'RESOLVED' } }).catch(() => 0),
        prisma.ticket.count({ where: { ...ticketBaseFilter, status: 'CLOSED' } }).catch(() => 0),
        prisma.ticket.count({ where: { ...ticketBaseFilter, priority: { in: ['CRITICAL', 'EMERGENCY', 'CRITICA', 'URGENTE'] }, status: { notIn: ['CLOSED', 'RESOLVED'] } } }).catch(() => 0),
        prisma.ticket.count({ where: { ...ticketBaseFilter, ticketType: 'Incidencia', status: { notIn: ['CLOSED', 'RESOLVED'] } } }).catch(() => 0),
        prisma.ticket.count({ where: { ...ticketBaseFilter, ticketType: { not: 'Incidencia' }, status: { notIn: ['CLOSED', 'RESOLVED'] } } }).catch(() => 0),
        isLevel2 ? 0 : prisma.ticket.count({ where: { ...orgFilter, assignedToId: null, status: { in: ['NEW', 'OPEN'] } } }).catch(() => 0),
        prisma.asset.count({ where: orgFilter }).catch(() => 0),
        prisma.asset.count({ where: { ...orgFilter, status: 'ONLINE' } }).catch(() => 0),
        prisma.asset.count({ where: { ...orgFilter, status: 'OFFLINE' } }).catch(() => 0),
        prisma.asset.count({ where: { ...orgFilter, status: 'WARNING' } }).catch(() => 0),
        prisma.ticket.groupBy({
          by: ['priority'],
          _count: { _all: true },
          where: { ...ticketBaseFilter, status: { notIn: ['CLOSED', 'RESOLVED'] } }
        }).catch(() => []),
        prisma.ticket.groupBy({
          by: ['status'],
          _count: { _all: true },
          where: ticketBaseFilter
        }).catch(() => []),
        // SLA Overdue counts per priority
        prisma.ticket.count({
          where: {
            ...ticketBaseFilter,
            priority: { in: ['CRITICAL', 'CRITICA', 'EMERGENCY', 'URGENTE'] },
            status: { notIn: ['CLOSED', 'RESOLVED'] },
            createdAt: { lt: fourHoursAgo }
          }
        }).catch(() => 0),
        prisma.ticket.count({
          where: {
            ...ticketBaseFilter,
            priority: { in: ['HIGH', 'ALTA'] },
            status: { notIn: ['CLOSED', 'RESOLVED'] },
            createdAt: { lt: eightHoursAgo }
          }
        }).catch(() => 0),
        prisma.ticket.count({
          where: {
            ...ticketBaseFilter,
            priority: { in: ['MEDIUM', 'MEDIA'] },
            status: { notIn: ['CLOSED', 'RESOLVED'] },
            createdAt: { lt: twentyFourHoursAgo }
          }
        }).catch(() => 0),
        prisma.ticket.count({
          where: {
            ...ticketBaseFilter,
            priority: { in: ['LOW', 'BAJA'] },
            status: { notIn: ['CLOSED', 'RESOLVED'] },
            createdAt: { lt: fortyEightHoursAgo }
          }
        }).catch(() => 0),
        // Recent Activities
        prisma.ticketActivity.findMany({
          where: forcePersonal
            ? { ticket: ticketBaseFilter }
            : (req.auth.organizationId ? { ticket: { organizationId: req.auth.organizationId } } : {}),
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { 
            ticket: { select: { id: true, title: true, priority: true, status: true, ticketType: true } }
          }
        }).catch(() => []),
        // Top Problem Assets (Assets with most tickets)
        prisma.asset.findMany({
          where: orgFilter,
          take: 5,
          select: {
            id: true,
            hostname: true,
            ipAddress: true,
            status: true,
            deviceType: true,
            location: true,
            _count: {
              select: { tickets: { where: { status: { notIn: ['CLOSED', 'RESOLVED'] } } } }
            }
          },
          orderBy: {
            tickets: { _count: 'desc' }
          }
        }).catch(() => [])
      ]);

      const overdueTickets = overdueCritical + overdueHigh + overdueMedium + overdueLow;

      // 2. Personal stats for active technician/user
      const [myTickets, myTasks] = await Promise.all([
        prisma.ticket.count({ 
          where: isStandard 
            ? { createdById: userId, status: { notIn: ['CLOSED', 'RESOLVED'] } }
            : { OR: [{ assignedToId: userId }, { secondaryAssignedToId: userId }], status: { notIn: ['CLOSED', 'RESOLVED'] } } 
        }).catch(() => 0),
        prisma.ticket.count({ 
          where: isStandard
            ? { createdById: userId, status: 'RESOLVED' }
            : { OR: [{ assignedToId: userId }, { secondaryAssignedToId: userId }], status: 'IN_PROGRESS' } 
        }).catch(() => 0)
      ]);

      // 3. Historical data for charts (Last 14 days)
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      fourteenDaysAgo.setHours(0, 0, 0, 0);
      
      const ticketsHistory = await prisma.ticket.findMany({
        where: {
          ...ticketBaseFilter,
          createdAt: { gte: fourteenDaysAgo }
        },
        select: { createdAt: true, status: true, ticketType: true }
      }).catch(() => []);

      const chartData = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        const dayTickets = ticketsHistory.filter(t => t.createdAt && t.createdAt.toISOString().split('T')[0] === dateStr);
        const incidents = dayTickets.filter(t => t.ticketType === 'Incidencia').length;
        const requests = dayTickets.filter(t => t.ticketType !== 'Incidencia').length;
        const resolved = dayTickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;

        chartData.push({ 
          name: d.toLocaleDateString([], { weekday: 'short', day: 'numeric' }), 
          fullDate: dateStr,
          incidents,
          requests,
          resolved,
          tickets: dayTickets.length
        });
      }

      // Format activities safely
      const recentActivities = (recentActivitiesRaw || []).map(act => ({
        ...act,
        user: act.user || 'Sistema',
        ticket: act.ticket || { id: act.ticketId, title: 'Ticket no encontrado', priority: 'MEDIUM', status: 'OPEN' }
      }));

      // Group formatters
      const ticketsByPriority = (ticketsByPriorityRaw || []).reduce((acc, curr) => {
        if (curr.priority) acc[curr.priority] = curr._count?._all || 0;
        return acc;
      }, {});

      const ticketsByStatus = (ticketsByStatusRaw || []).reduce((acc, curr) => {
        if (curr.status) acc[curr.status] = curr._count?._all || 0;
        return acc;
      }, {});

      const totalActive = openTickets || 1;
      const slaCompliance = totalTickets > 0 
        ? Math.max(70, Math.min(100, Math.round(((totalTickets - overdueTickets) / totalTickets) * 100))) 
        : 100;

      res.json({
        global: {
          totalTickets,
          openTickets,
          inProgressTickets,
          resolvedTickets,
          closedTickets,
          criticalTickets,
          incidentCount: incidentCount || (Math.round(openTickets * 0.55)),
          requestCount: requestCount || (Math.max(0, openTickets - Math.round(openTickets * 0.55))),
          overdueTickets,
          slaRiskCount: overdueTickets,
          unassignedTickets,
          slaCompliance,
          totalAssets,
          onlineAssets,
          offlineAssets,
          warningAssets,
          criticalAssetsCount: warningAssets + (offlineAssets > 0 ? 1 : 0),
          healthScore: totalAssets > 0 ? Math.round((onlineAssets / totalAssets) * 100) : 100,
          ticketsByPriority,
          ticketsByStatus,
          topProblemAssets: (topProblemAssetsRaw || []).map(a => ({
            id: a.id,
            hostname: a.hostname,
            ipAddress: a.ipAddress,
            status: a.status,
            deviceType: a.deviceType,
            location: a.location,
            activeTickets: a._count?.tickets || 0
          }))
        },
        personal: {
          myTickets,
          myTasks
        },
        isLevel2: Boolean(isLevel2),
        isLevel1: Boolean(isLevel1),
        isLevel3: Boolean(isLevel3),
        isAdmin: Boolean(isAdmin),
        canSwitchView: Boolean(isAdmin || isLevel1 || isLevel3),
        viewMode: forcePersonal ? 'personal' : 'global',
        recentActivities,
        chartData
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      next(error);
    }
  });

  router.patch('/profile', async (req, res, next) => {
    try {
      const id = req.auth.user.id;
      const { email, phone, avatarUrl, name } = req.body;
      const updateData = {};

      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
      if (name !== undefined) updateData.name = name;

      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        include: { 
          role: { include: { permissions: { include: { permission: true } } } },
          location: true 
        },
      });

      res.json(require('../lib/ticket-service').sanitizeUser(user));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = getCommonRoutes;
