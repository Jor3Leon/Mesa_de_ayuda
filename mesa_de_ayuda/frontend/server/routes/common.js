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
      const locations = await prisma.location.findMany({ 
        where: orgFilter,
        orderBy: { name: 'asc' } 
      });
      res.json(locations);
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

      // 1. Get global summary with fail-safes
      const [
        openTickets, 
        criticalTickets, 
        totalAssets, 
        onlineAssets, 
        unassignedTickets,
        recentActivitiesRaw,
        offlineAssets,
        warningAssets,
        ticketsByPriorityRaw,
        ticketsByStatusRaw,
        slaRiskCount,
        longOfflineAssets
      ] = await Promise.all([
        prisma.ticket.count({ where: { ...orgFilter, status: { in: ['NEW', 'OPEN', 'IN_PROGRESS'] } } }).catch(() => 0),
        prisma.ticket.count({ where: { ...orgFilter, priority: { in: ['CRITICAL', 'EMERGENCY', 'CRITICA', 'URGENTE'] }, status: { not: 'CLOSED' } } }).catch(() => 0),
        prisma.asset.count({ where: orgFilter }).catch(() => 0),
        prisma.asset.count({ where: { ...orgFilter, status: 'ONLINE' } }).catch(() => 0),
        prisma.ticket.count({ where: { ...orgFilter, assignedToId: null, status: { in: ['NEW', 'OPEN'] } } }).catch(() => 0),
        prisma.ticketActivity.findMany({
          where: req.auth.organizationId ? { ticket: { organizationId: req.auth.organizationId } } : {},
          take: 8,
          orderBy: { createdAt: 'desc' },
          include: { 
            ticket: { select: { title: true } }
          }
        }).catch(() => []),
        prisma.asset.count({ where: { ...orgFilter, status: 'OFFLINE' } }).catch(() => 0),
        prisma.asset.count({ where: { ...orgFilter, status: 'WARNING' } }).catch(() => 0),
        prisma.ticket.groupBy({
          by: ['priority'],
          _count: { _all: true },
          where: { ...orgFilter, status: { not: 'CLOSED' } }
        }).catch(() => []),
        prisma.ticket.groupBy({
          by: ['status'],
          _count: { _all: true },
          where: orgFilter
        }).catch(() => []),
        // Tickets in SLA risk (e.g., Critical tickets older than 4 hours)
        prisma.ticket.count({
          where: {
            ...orgFilter,
            priority: { in: ['CRITICAL', 'CRITICA'] },
            status: { not: 'CLOSED' },
            createdAt: { lt: new Date(Date.now() - 4 * 60 * 60 * 1000) }
          }
        }).catch(() => 0),
        // Assets offline for more than 24 hours
        prisma.asset.count({
          where: {
            ...orgFilter,
            status: 'OFFLINE',
            lastSeenAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          }
        }).catch(() => 0)
      ]);

      // 2. Get user-specific stats
      const isStandard = user.role === 'USUARIO ESTANDAR';
      const [myTickets, myTasks] = await Promise.all([
        prisma.ticket.count({ 
          where: isStandard 
            ? { createdById: userId, status: { notIn: ['CLOSED', 'RESOLVED'] } }
            : { assignedToId: userId, status: { in: ['OPEN', 'IN_PROGRESS'] } } 
        }).catch(() => 0),
        prisma.ticket.count({ 
          where: isStandard
            ? { createdById: userId, status: 'RESOLVED' } // For users, "Tasks" could be "Pending Approval" (Resolved)
            : { assignedToId: userId, status: 'IN_PROGRESS' } 
        }).catch(() => 0)
      ]);

      // 3. Get historical data for charts (Last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const ticketsHistory = await prisma.ticket.findMany({
        where: {
          ...orgFilter,
          createdAt: { gte: sevenDaysAgo }
        },
        select: { createdAt: true, status: true }
      }).catch(() => []);

      // Group by day with robustness
      const chartData = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const count = ticketsHistory.filter(t => t.createdAt && t.createdAt.toISOString().split('T')[0] === dateStr).length;
        chartData.push({ 
          name: d.toLocaleDateString([], { weekday: 'short' }), 
          fullDate: dateStr,
          tickets: count 
        });
      }

      // Format activities to ensure they are safe for frontend
      const recentActivities = (recentActivitiesRaw || []).map(act => ({
        ...act,
        user: act.user || 'Sistema',
        ticket: act.ticket || { title: 'Ticket no encontrado' }
      }));

      // Safely reduce groups
      const ticketsByPriority = (ticketsByPriorityRaw || []).reduce((acc, curr) => {
        if (curr.priority) acc[curr.priority] = curr._count?._all || 0;
        return acc;
      }, {});

      const ticketsByStatus = (ticketsByStatusRaw || []).reduce((acc, curr) => {
        if (curr.status) acc[curr.status] = curr._count?._all || 0;
        return acc;
      }, {});

      res.json({
        global: {
          openTickets,
          criticalTickets,
          totalAssets,
          onlineAssets,
          offlineAssets,
          warningAssets,
          unassignedTickets,
          healthScore: totalAssets > 0 ? Math.round((onlineAssets / totalAssets) * 100) : 100,
          ticketsByPriority,
          ticketsByStatus,
          slaRiskCount,
          longOfflineAssets
        },
        personal: {
          myTickets,
          myTasks
        },
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
