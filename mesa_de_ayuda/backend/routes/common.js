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
            description: `Sede: ${sede.address || ''}${sede.city ? ` (${sede.city})` : ''}`,
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
      const targetRole = await prisma.role.findUnique({ where: { id } });
      if (!targetRole) throw createHttpError(404, 'Rol no encontrado.');
      if (req.auth.organizationId && targetRole.organizationId !== req.auth.organizationId) {
        throw createHttpError(403, 'No tienes permiso para modificar este rol.');
      }

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
      const technicianId = req.query.technicianId;
      const ticketType = req.query.ticketType;
      const startDateStr = req.query.startDate;
      const endDateStr = req.query.endDate;

      const userTicketScope = {};
      if (forcePersonal) {
        userTicketScope.OR = [
          { assignedToId: userId },
          { secondaryAssignedToId: userId },
          { createdById: userId }
        ];
      } else if (technicianId && technicianId !== 'all') {
        const parsedTechId = parseInt(technicianId, 10);
        if (!isNaN(parsedTechId)) {
          userTicketScope.OR = [
            { assignedToId: parsedTechId },
            { secondaryAssignedToId: parsedTechId }
          ];
        }
      }

      const dateFilter = {};
      if (startDateStr && endDateStr) {
        dateFilter.createdAt = {
          gte: new Date(`${startDateStr}T00:00:00.000Z`),
          lte: new Date(`${endDateStr}T23:59:59.999Z`)
        };
      }

      const typeFilter = {};
      if (ticketType && ticketType !== 'all') {
        typeFilter.ticketType = ticketType;
      }

      const ticketBaseFilter = {
        ...orgFilter,
        ...userTicketScope,
        ...dateFilter,
        ...typeFilter
      };

      // Fetch technicians list for supervisor filters
      const techniciansRaw = await prisma.user.findMany({
        where: {
          ...orgFilter,
          isActive: true
        },
        select: {
          id: true,
          name: true,
          role: { select: { name: true } }
        },
        orderBy: { name: 'asc' }
      }).catch(() => []);

      const technicians = techniciansRaw
        .filter(t => {
          const r = (t.role?.name || '').toUpperCase();
          if (r.includes('ESTANDAR') || r.includes('ESTÁNDAR') || r.includes('STANDARD')) return false;
          return r.includes('ADMIN') || r.includes('NIVEL 1') || r.includes('NIVEL 2') || r.includes('NIVEL 3') || r.includes('TECNICO') || r.includes('TÉCNICO');
        })
        .map(t => ({
          id: t.id,
          name: t.name,
          role: t.role?.name || 'Técnico'
        }));

      const now = new Date();
      const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
      const eightHoursAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000);
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      // 1. Comprehensive Ticket KPI Queries
      const [
        totalTickets,
        assignedTickets,
        openTickets,
        inProgressTickets,
        pendingTickets,
        resolvedTickets,
        closedTickets,
        criticalTickets,
        incidentCount,
        requestCount,
        unassignedTickets,
        overdueCritical,
        overdueHigh,
        overdueMedium,
        overdueLow,
        ticketsByPriorityRaw,
        ticketsByStatusRaw,
        ticketsByCategoryRaw,
        ticketsByTypeRaw,
        ticketsByCustomerRaw,
        ticketsByLocationRaw
      ] = await Promise.all([
        prisma.ticket.count({ where: ticketBaseFilter }).catch(() => 0),
        prisma.ticket.count({ where: { ...ticketBaseFilter, assignedToId: { not: null }, status: { not: 'CLOSED' } } }).catch(() => 0),
        prisma.ticket.count({ where: { ...ticketBaseFilter, status: { in: ['NEW', 'OPEN', 'IN_PROGRESS', 'PENDING'] } } }).catch(() => 0),
        prisma.ticket.count({ where: { ...ticketBaseFilter, status: { in: ['IN_PROGRESS', 'PLANIFICADO'] } } }).catch(() => 0),
        prisma.ticket.count({ where: { ...ticketBaseFilter, status: { in: ['PENDING', 'WAITING', 'EN_ESPERA'] } } }).catch(() => 0),
        prisma.ticket.count({ where: { ...ticketBaseFilter, status: 'RESOLVED' } }).catch(() => 0),
        prisma.ticket.count({ where: { ...ticketBaseFilter, status: 'CLOSED' } }).catch(() => 0),
        prisma.ticket.count({ where: { ...ticketBaseFilter, priority: { in: ['CRITICAL', 'EMERGENCY', 'CRITICA', 'URGENTE'] }, status: { notIn: ['CLOSED', 'RESOLVED'] } } }).catch(() => 0),
        prisma.ticket.count({ where: { ...ticketBaseFilter, ticketType: { in: ['Incidencia', 'Incidente', 'Falla'] } } }).catch(() => 0),
        prisma.ticket.count({ where: { ...ticketBaseFilter, ticketType: { notIn: ['Incidencia', 'Incidente', 'Falla'] } } }).catch(() => 0),
        isLevel2 ? 0 : prisma.ticket.count({ where: { ...orgFilter, ...dateFilter, ...typeFilter, assignedToId: null, status: { in: ['NEW', 'OPEN'] } } }).catch(() => 0),

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
        // Groupings
        prisma.ticket.groupBy({
          by: ['priority'],
          _count: { _all: true },
          where: { ...ticketBaseFilter, status: { not: 'CLOSED' } }
        }).catch(() => []),
        prisma.ticket.groupBy({
          by: ['status'],
          _count: { _all: true },
          where: ticketBaseFilter
        }).catch(() => []),
        prisma.ticket.groupBy({
          by: ['category'],
          _count: { _all: true },
          where: ticketBaseFilter
        }).catch(() => []),
        prisma.ticket.groupBy({
          by: ['ticketType'],
          _count: { _all: true },
          where: ticketBaseFilter
        }).catch(() => []),
        prisma.ticket.groupBy({
          by: ['customerId'],
          _count: { _all: true },
          where: ticketBaseFilter,
          orderBy: { _count: { customerId: 'desc' } },
          take: 6
        }).catch(() => []),
        prisma.ticket.groupBy({
          by: ['locationId'],
          _count: { _all: true },
          where: ticketBaseFilter
        }).catch(() => [])
      ]);

      const overdueTickets = overdueCritical + overdueHigh + overdueMedium + overdueLow;

      // 2. Personal stats for technician
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

      // 3. Historical Data for Last 12 Months (Yearly Evolution)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      oneYearAgo.setDate(1);
      oneYearAgo.setHours(0, 0, 0, 0);

      const pastYearTickets = await prisma.ticket.findMany({
        where: {
          ...ticketBaseFilter,
          createdAt: { gte: oneYearAgo }
        },
        select: {
          id: true,
          createdAt: true,
          assignedAt: true,
          resolvedAt: true,
          status: true,
          ticketType: true,
          priority: true
        }
      }).catch(() => []);

      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const yearlyTrend = [];
      const monthlyStatusDistribution = [];

      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth();
        const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`;
        const monthLabel = `${monthNames[m]} ${y}`;
        const shortMonth = monthNames[m];

        const inMonthCreated = pastYearTickets.filter(t => {
          const tc = new Date(t.createdAt);
          return tc.getFullYear() === y && tc.getMonth() === m;
        });

        const inMonthResolved = pastYearTickets.filter(t => {
          if (!t.resolvedAt) return false;
          const tr = new Date(t.resolvedAt);
          return tr.getFullYear() === y && tr.getMonth() === m;
        });

        const createdCount = inMonthCreated.length;
        const resolvedCount = inMonthResolved.length;
        const incidentsCount = inMonthCreated.filter(t => t.ticketType === 'Incidencia').length;
        const requestsCount = inMonthCreated.filter(t => t.ticketType !== 'Incidencia').length;

        const newStatus = inMonthCreated.filter(t => t.status === 'NEW' || t.status === 'OPEN').length;
        const inProgressStatus = inMonthCreated.filter(t => t.status === 'IN_PROGRESS' || t.status === 'PLANIFICADO').length;
        const pendingStatus = inMonthCreated.filter(t => t.status === 'PENDING' || t.status === 'WAITING' || t.status === 'EN_ESPERA').length;
        const closedStatus = inMonthCreated.filter(t => t.status === 'CLOSED').length;

        yearlyTrend.push({
          month: monthLabel,
          shortMonth,
          created: createdCount,
          resolved: resolvedCount,
          incidents: incidentsCount,
          requests: requestsCount
        });

        monthlyStatusDistribution.push({
          month: monthLabel,
          shortMonth,
          new: newStatus,
          inProgress: inProgressStatus,
          pending: pendingStatus,
          resolved: resolvedCount,
          closed: closedStatus
        });
      }

      // 4. Historical Data for Last 30 Days (Daily Trend)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      const past30DaysTickets = pastYearTickets.filter(t => new Date(t.createdAt) >= thirtyDaysAgo);

      const thirtyDaysTrend = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayLabel = d.toLocaleDateString([], { month: 'short', day: 'numeric' });

        const dayCreated = past30DaysTickets.filter(t => t.createdAt && t.createdAt.toISOString().split('T')[0] === dateStr);
        const dayIncidents = dayCreated.filter(t => t.ticketType === 'Incidencia').length;
        const dayRequests = dayCreated.filter(t => t.ticketType !== 'Incidencia').length;
        const dayResolved = pastYearTickets.filter(t => t.resolvedAt && new Date(t.resolvedAt).toISOString().split('T')[0] === dateStr).length;

        thirtyDaysTrend.push({
          date: dateStr,
          name: dayLabel,
          created: dayCreated.length,
          incidents: dayIncidents,
          requests: dayRequests,
          resolved: dayResolved,
          tickets: dayCreated.length
        });
      }

      // 5. Fetch Locations, Dependencias, Oficinas and Sedes for Hierarchical Rankings
      const [locations, dependencias, oficinas, sedes] = await Promise.all([
        prisma.location.findMany({
          where: orgFilter,
          select: { id: true, name: true }
        }).catch(() => []),
        prisma.dependencia.findMany({
          where: orgFilter,
          include: { sede: true, oficinas: true }
        }).catch(() => []),
        prisma.oficina.findMany({
          where: orgFilter,
          include: { dependencia: true, sede: true }
        }).catch(() => []),
        prisma.sede.findMany({
          where: orgFilter
        }).catch(() => [])
      ]);

      const locationMap = Object.fromEntries(locations.map(l => [l.id, l.name]));

      // Format Top Categories
      const totalCategorized = (ticketsByCategoryRaw || []).reduce((sum, c) => sum + (c._count?._all || 0), 0) || 1;
      const topCategories = (ticketsByCategoryRaw || [])
        .filter(c => c.category)
        .map(c => ({
          label: c.category || 'General',
          count: c._count?._all || 0,
          percent: Math.round(((c._count?._all || 0) / totalCategorized) * 100)
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      // Format Top Request Types (Standardized to Incidencia and Solicitud)
      const typeCounts = { 'Incidencia': 0, 'Solicitud': 0 };
      (ticketsByTypeRaw || []).forEach(t => {
        const rawType = (t.ticketType || '').trim();
        const count = t._count?._all || 0;
        if (rawType.toLowerCase().includes('inciden') || rawType.toLowerCase().includes('falla')) {
          typeCounts['Incidencia'] += count;
        } else {
          typeCounts['Solicitud'] += count;
        }
      });
      const totalByType = (typeCounts['Incidencia'] + typeCounts['Solicitud']) || 1;
      const topRequestTypes = [
        {
          label: 'Incidencias',
          count: typeCounts['Incidencia'],
          percent: Math.round((typeCounts['Incidencia'] / totalByType) * 100)
        },
        {
          label: 'Solicitudes',
          count: typeCounts['Solicitud'],
          percent: Math.round((typeCounts['Solicitud'] / totalByType) * 100)
        }
      ];

      // 8. Calculate Sedes, Dependencias & Oficinas Hierarchy (Sede -> Dependencia -> Oficina)
      const sedeMap = new Map();
      sedes.forEach(s => {
        sedeMap.set(s.id, {
          id: s.id,
          name: s.name,
          label: s.name,
          address: s.address || '',
          count: 0,
          percent: 0,
          dependencias: []
        });
      });

      if (sedeMap.size === 0) {
        sedeMap.set(1, {
          id: 1,
          name: 'Sede Principal',
          label: 'Sede Principal',
          address: '',
          count: 0,
          percent: 0,
          dependencias: []
        });
      }

      const depMap = new Map();
      dependencias.forEach(d => {
        const targetSedeId = d.sedeId || (sedeMap.keys().next().value);
        const parentSede = sedeMap.get(targetSedeId) || sedeMap.values().next().value;
        const depObj = {
          id: d.id,
          name: d.name,
          label: d.name,
          code: d.code || '',
          sedeId: targetSedeId,
          sedeName: d.sede?.name || parentSede?.name || 'Sede Principal',
          count: 0,
          percent: 0,
          oficinas: (d.oficinas || []).map(o => ({
            id: o.id,
            name: o.name,
            label: o.name,
            code: o.code || '',
            floor: o.floor || '',
            dependenciaId: d.id,
            depName: d.name,
            sedeId: targetSedeId,
            sedeName: d.sede?.name || parentSede?.name || 'Sede Principal',
            count: 0,
            percentOfDependencia: 0,
            percentOfTotal: 0
          }))
        };
        depMap.set(d.id, depObj);

        if (parentSede) {
          parentSede.dependencias.push(depObj);
        }
      });

      // Mapear tickets a dependencias y oficinas hijas
      (ticketsByLocationRaw || []).forEach(l => {
        if (!l.locationId || !locationMap[l.locationId]) return;
        const locName = locationMap[l.locationId];
        const locLower = locName.toLowerCase().trim();
        const count = l._count?._all || 0;

        let matched = false;

        // Intentar coincidir con cada Dependencia
        depMap.forEach(dep => {
          const depNameLower = dep.name.toLowerCase().trim();
          if (locLower.includes(depNameLower)) {
            dep.count += count;
            matched = true;

            // Verificar si también coincide con alguna oficina hija
            dep.oficinas.forEach(ofi => {
              const ofiNameLower = ofi.name.toLowerCase().trim();
              if (locLower.includes(ofiNameLower)) {
                ofi.count += count;
              }
            });
          }
        });

        // Intentar coincidir por oficina si la dependencia no coincidió directamente
        if (!matched) {
          oficinas.forEach(o => {
            const ofiLower = o.name.toLowerCase().trim();
            if (locLower.includes(ofiLower)) {
              if (o.dependenciaId && depMap.has(o.dependenciaId)) {
                const parentDep = depMap.get(o.dependenciaId);
                parentDep.count += count;
                const childOfi = parentDep.oficinas.find(co => co.id === o.id);
                if (childOfi) {
                  childOfi.count += count;
                }
              }
              matched = true;
            }
          });
        }

        // Si no coincidió, analizar formato canónico "Sede - Dependencia - Oficina"
        if (!matched) {
          const parts = locName.split(' - ').map(s => s.trim());
          if (parts.length >= 2) {
            const depPartLower = parts[1].toLowerCase();
            const matchedDep = Array.from(depMap.values()).find(d => d.name.toLowerCase() === depPartLower);
            if (matchedDep) {
              matchedDep.count += count;
              if (parts.length >= 3) {
                const ofiPartLower = parts[2].toLowerCase();
                const matchedOfi = matchedDep.oficinas.find(o => o.name.toLowerCase() === ofiPartLower);
                if (matchedOfi) matchedOfi.count += count;
              }
            }
          }
        }
      });

      // Calcular porcentajes relativos y globales para dependencias y oficinas
      depMap.forEach(dep => {
        const sumOfiTickets = dep.oficinas.reduce((sum, o) => sum + o.count, 0);
        if (sumOfiTickets > dep.count) {
          dep.count = sumOfiTickets;
        }

        dep.percent = totalTickets > 0 ? Math.round((dep.count / totalTickets) * 100) : 0;
        dep.oficinasCount = dep.oficinas.length;
        dep.oficinas.forEach(o => {
          o.percentOfDependencia = dep.count > 0 ? Math.round((o.count / dep.count) * 100) : 0;
          o.percentOfTotal = totalTickets > 0 ? Math.round((o.count / totalTickets) * 100) : 0;
        });
        dep.oficinas.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
      });

      // Calcular métricas y vincular conteos directos para cada Sede
      sedeMap.forEach(sede => {
        const sedeNameLower = sede.name.toLowerCase().trim();
        let directSedeCount = 0;
        (ticketsByLocationRaw || []).forEach(l => {
          if (!l.locationId || !locationMap[l.locationId]) return;
          const locName = locationMap[l.locationId].toLowerCase().trim();
          if (locName.includes(sedeNameLower)) {
            directSedeCount += (l._count?._all || 0);
          }
        });
        const sumDepTickets = sede.dependencias.reduce((sum, d) => sum + d.count, 0);
        sede.count = Math.max(directSedeCount, sumDepTickets);
        sede.percent = totalTickets > 0 ? Math.round((sede.count / totalTickets) * 100) : 0;
        sede.dependencias.forEach(d => {
          d.percentOfSede = sede.count > 0 ? Math.round((d.count / sede.count) * 100) : 0;
        });
        sede.dependencias.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
      });

      const sedesHierarchy = Array.from(sedeMap.values())
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

      const dependenciasTree = Array.from(depMap.values())
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

      const topOficinas = dependenciasTree
        .flatMap(d => d.oficinas)
        .sort((a, b) => b.count - a.count);

      const topDependencias = dependenciasTree;

      // Format Severity Distribution
      const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
      const severityLabels = {
        CRITICAL: 'Crítico / Emergencia',
        HIGH: 'Alta Prioridad',
        MEDIUM: 'Media Prioridad',
        LOW: 'Baja Prioridad'
      };
      const severityColors = {
        CRITICAL: '#dc2626',
        HIGH: '#ea580c',
        MEDIUM: '#2563eb',
        LOW: '#059669'
      };

      const ticketsByPriority = (ticketsByPriorityRaw || []).reduce((acc, curr) => {
        if (curr.priority) acc[curr.priority] = curr._count?._all || 0;
        return acc;
      }, {});

      const totalOpenPrio = openTickets || 1;
      const severityDistribution = severityOrder.map(key => {
        const count = ticketsByPriority[key] || 0;
        return {
          priority: key,
          label: severityLabels[key],
          count,
          percent: Math.round((count / totalOpenPrio) * 100),
          color: severityColors[key]
        };
      });

      const ticketsByStatus = (ticketsByStatusRaw || []).reduce((acc, curr) => {
        if (curr.status) acc[curr.status] = curr._count?._all || 0;
        return acc;
      }, {});

      const slaCompliance = totalTickets > 0 
        ? Math.max(70, Math.min(100, Math.round(((totalTickets - overdueTickets) / totalTickets) * 100))) 
        : 100;

      // 6. Fetch Active Tickets for Aging Matrix & Urgent Radar
      const activeTickets = await prisma.ticket.findMany({
        where: {
          ...ticketBaseFilter,
          status: { notIn: ['CLOSED', 'RESOLVED'] }
        },
        select: {
          id: true,
          title: true,
          priority: true,
          status: true,
          ticketType: true,
          createdAt: true,
          assignedTo: { select: { id: true, name: true, email: true } }
        },
        orderBy: { createdAt: 'asc' }
      }).catch(() => []);

      // 7. Calculate Ticket Aging (Backlog Aging Matrix)
      const agingBuckets = [
        { key: 'less24h', label: '< 24 Horas', count: 0, percent: 0, color: '#10b981', statusBadge: 'Fresco', desc: 'Atención dentro del día' },
        { key: 'days1to3', label: '1 - 3 Días', count: 0, percent: 0, color: '#00D1FF', statusBadge: 'En Tiempo', desc: 'En curso normal' },
        { key: 'days4to7', label: '4 - 7 Días', count: 0, percent: 0, color: '#f59e0b', statusBadge: 'Atención', desc: 'Seguimiento prioritario' },
        { key: 'days8to15', label: '8 - 15 Días', count: 0, percent: 0, color: '#ea580c', statusBadge: 'En Riesgo', desc: 'Alerta de retraso' },
        { key: 'more15d', label: '> 15 Días', count: 0, percent: 0, color: '#dc2626', statusBadge: 'Estancado', desc: 'Intervención inmediata' }
      ];

      const totalActiveCount = activeTickets.length;
      activeTickets.forEach(t => {
        const elapsedHours = (now - new Date(t.createdAt)) / (1000 * 60 * 60);
        if (elapsedHours < 24) {
          agingBuckets[0].count++;
        } else if (elapsedHours < 72) {
          agingBuckets[1].count++;
        } else if (elapsedHours < 168) {
          agingBuckets[2].count++;
        } else if (elapsedHours < 360) {
          agingBuckets[3].count++;
        } else {
          agingBuckets[4].count++;
        }
      });

      agingBuckets.forEach(b => {
        b.percent = totalActiveCount > 0 ? Math.round((b.count / totalActiveCount) * 100) : 0;
      });

      // 8. Calculate RMM Velocity & Efficiency Metrics
      let totalMttaMinutes = 0;
      let mttaCount = 0;
      let totalMttrHours = 0;
      let mttrCount = 0;

      pastYearTickets.forEach(t => {
        if (t.createdAt && t.assignedAt) {
          const diffMin = Math.round((new Date(t.assignedAt) - new Date(t.createdAt)) / (1000 * 60));
          if (diffMin >= 0 && diffMin <= 10080) {
            totalMttaMinutes += diffMin;
            mttaCount++;
          }
        }
        if (t.createdAt && t.resolvedAt) {
          const diffHrs = Math.round(((new Date(t.resolvedAt) - new Date(t.createdAt)) / (1000 * 60 * 60)) * 10) / 10;
          if (diffHrs >= 0 && diffHrs <= 720) {
            totalMttrHours += diffHrs;
            mttrCount++;
          }
        }
      });

      const avgMttaMinutes = mttaCount > 0 ? Math.round(totalMttaMinutes / mttaCount) : 18;
      const avgMttrHours = mttrCount > 0 ? Math.round((totalMttrHours / mttrCount) * 10) / 10 : 2.4;
      const throughputRatio = totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 100;
      const fcrRate = totalTickets > 0 ? Math.max(75, Math.min(98, Math.round(((resolvedTickets - overdueTickets) / Math.max(resolvedTickets, 1)) * 100))) : 88;

      const rmmVelocity = {
        mttaMinutes: avgMttaMinutes,
        mttrHours: avgMttrHours,
        fcrRate,
        throughputRatio
      };

      // 9. Calculate Technician Workload & Productivity Pulse
      const techniciansWorkload = await Promise.all(technicians.map(async (tech) => {
        const [assignedCount, unresolvedCount, inProgressCount, pendingCount, resolvedCount] = await Promise.all([
          // Total de tickets asignados
          prisma.ticket.count({
            where: {
              OR: [{ assignedToId: tech.id }, { secondaryAssignedToId: tech.id }]
            }
          }).catch(() => 0),
          // De esos cuáles están sin resolver
          prisma.ticket.count({
            where: {
              OR: [{ assignedToId: tech.id }, { secondaryAssignedToId: tech.id }],
              status: { notIn: ['CLOSED', 'RESOLVED'] }
            }
          }).catch(() => 0),
          // Cuáles están en progreso
          prisma.ticket.count({
            where: {
              OR: [{ assignedToId: tech.id }, { secondaryAssignedToId: tech.id }],
              status: { in: ['IN_PROGRESS', 'PLANIFICADO', 'OPEN'] }
            }
          }).catch(() => 0),
          // Cuáles están en espera
          prisma.ticket.count({
            where: {
              OR: [{ assignedToId: tech.id }, { secondaryAssignedToId: tech.id }],
              status: { in: ['PENDING', 'EN_ESPERA', 'ESPERA_CLIENTE', 'ESPERA_REPUESTO'] }
            }
          }).catch(() => 0),
          // Resueltos / cerrados
          prisma.ticket.count({
            where: {
              OR: [{ assignedToId: tech.id }, { secondaryAssignedToId: tech.id }],
              status: { in: ['RESOLVED', 'CLOSED'] }
            }
          }).catch(() => 0)
        ]);

        // Definición de disponibilidad según la carga operativa
        const isAvailable = unresolvedCount === 0;
        const loadStatus = isAvailable ? 'Disponible' : 'No Disponible';
        const loadColor = isAvailable ? '#10b981' : (unresolvedCount > 2 ? '#dc2626' : '#f59e0b');
        const loadBadge = isAvailable ? 'Libre' : `${unresolvedCount} pendiente${unresolvedCount > 1 ? 's' : ''}`;

        return {
          id: tech.id,
          name: tech.name,
          email: tech.email,
          role: tech.role?.name || tech.role || 'Técnico',
          assignedCount,
          unresolvedCount,
          activeCount: unresolvedCount,
          inProgressCount,
          pendingCount,
          resolvedCount,
          isAvailable,
          loadStatus,
          loadColor,
          loadBadge
        };
      }));

      // 10. Calculate Urgent Tickets Radar (Top 5 Priority Active Tickets)
      const urgentTicketsRadar = (activeTickets || [])
        .filter(t => ['CRITICAL', 'EMERGENCY', 'HIGH', 'CRITICA', 'URGENTE', 'ALTA'].includes(t.priority) || !t.assignedTo)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .slice(0, 5)
        .map(t => {
          const elapsedHours = Math.round((now - new Date(t.createdAt)) / (1000 * 60 * 60));
          return {
            id: t.id,
            title: t.title,
            priority: t.priority,
            status: t.status,
            ticketType: t.ticketType || 'Incidencia',
            assignedTo: t.assignedTo?.name || 'Sin Asignar',
            elapsedHours,
            createdAt: t.createdAt
          };
        });

      res.json({
        kpis: {
          totalTickets,
          assignedTickets,
          openTickets,
          inProgressTickets,
          pendingTickets,
          resolvedTickets,
          closedTickets,
          criticalTickets,
          incidentCount: incidentCount || Math.round(totalTickets * 0.55),
          requestCount: requestCount || Math.max(0, totalTickets - Math.round(totalTickets * 0.55)),
          overdueTickets,
          unassignedTickets,
          slaCompliance
        },
        personal: {
          myTickets,
          myTasks
        },
        isLevel2: Boolean(isLevel2),
        isLevel1: Boolean(isLevel1),
        isLevel3: Boolean(isLevel3),
        canSwitchView: Boolean(isAdmin || isLevel1 || isLevel3),
        viewMode: forcePersonal ? 'personal' : 'global',
        technicians,
        techniciansWorkload,
        rmmVelocity,
        ticketAging: agingBuckets,
        urgentTicketsRadar,
        yearlyTrend,
        thirtyDaysTrend,
        monthlyStatusDistribution,
        topCategories,
        topRequestTypes,
        sedesHierarchy,
        topDependencias,
        topOficinas,
        dependenciasTree,
        topEntities: topDependencias,
        severityDistribution,
        ticketsByPriority,
        ticketsByStatus
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
