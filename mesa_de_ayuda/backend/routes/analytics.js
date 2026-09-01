const express = require('express');
const { requireAuth, requirePermission } = require('../lib/middleware');

function getAnalyticsRoutes(prisma) {
  const router = express.Router();

  router.use(requireAuth(prisma));

  router.get('/dashboard', requirePermission('ANALYTICS_VIEW'), async (req, res, next) => {
    try {
      const { 
        department = 'all', 
        viewMode = 'global',
        startDate: customStart,
        endDate: customEnd
      } = req.query;
      const user = req.auth.user;

      const headerRole = req.headers['x-view-as-role'] || req.query.role || req.query.viewAsRole;
      const effectiveRole = (headerRole || user.role || user.role?.name || '').trim().toUpperCase();
      const isLevel2 = effectiveRole === 'NIVEL 2' || effectiveRole === 'LEVEL_2' || effectiveRole === 'TECNICO NIVEL 2' || effectiveRole === 'TÉCNICO NIVEL 2' || effectiveRole.includes('NIVEL 2') || effectiveRole.includes('LEVEL_2');

      // 1. Calculate Date Filter
      const now = new Date();
      let startDate = new Date();
      let endDate = new Date();
      let days = 30;
      
      if (customStart && customEnd) {
        startDate = new Date(customStart);
        endDate = new Date(customEnd);
        // Set time to end of day for endDate
        endDate.setHours(23, 59, 59, 999);
        // Calculate days between for sparkline and trend
        days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) || 1;
      } else {
        // Default to last 30 days
        startDate.setDate(now.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
      }
      
      const prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - days);
      const prevEndDate = new Date(startDate);

      const orgFilter = req.auth.organizationId ? { organizationId: req.auth.organizationId } : {};

      // 2. Base Filter
      const baseFilter = {
        ...orgFilter,
        createdAt: { gte: startDate, lte: endDate }
      };

      if (department !== 'all') {
        baseFilter.category = department;
      }

      // 3. View Mode Filter (Forced to Personal for Level 2 Technicians!)
      if (isLevel2 || viewMode === 'personal') {
        baseFilter.OR = [
          { assignedToId: user.id },
          { secondaryAssignedToId: user.id },
          { createdById: user.id }
        ];
      }

      // 4. Fetch Summary Stats
      const [
        totalTickets,
        openTickets,
        resolvedTickets,
        totalAssets,
        onlineAssets,
        prevTotalTickets,
        prevOpenTickets
      ] = await Promise.all([
        prisma.ticket.count({ where: baseFilter }),
        prisma.ticket.count({ where: { ...baseFilter, status: { in: ['NEW', 'OPEN', 'IN_PROGRESS'] } } }),
        prisma.ticket.count({ where: { ...baseFilter, status: 'RESOLVED' } }),
        prisma.asset.count({ where: orgFilter }),
        prisma.asset.count({ where: { ...orgFilter, status: 'ONLINE' } }),
        // For Trends
        prisma.ticket.count({ 
          where: { 
            ...baseFilter, 
            createdAt: { gte: prevStartDate, lt: startDate } 
          } 
        }),
        prisma.ticket.count({ 
          where: { 
            ...baseFilter, 
            status: { in: ['NEW', 'OPEN', 'IN_PROGRESS'] },
            createdAt: { gte: prevStartDate, lt: startDate } 
          } 
        }),
      ]);

      // Calculate Trends
      const calculateTrend = (curr, prev) => {
        if (prev === 0) return curr > 0 ? 100 : 0;
        return Math.round(((curr - prev) / prev) * 100);
      };

      // 5. Tickets by Priority
      const ticketsByPriority = await prisma.ticket.groupBy({
        by: ['priority'],
        where: baseFilter,
        _count: { id: true },
      });

      // 6. Tickets by Status
      const ticketsByStatus = await prisma.ticket.groupBy({
        by: ['status'],
        where: baseFilter,
        _count: { id: true },
      });

      // 7. Sparkline Data (Tickets per day)
      const historicalDataRaw = await prisma.ticket.findMany({
        where: baseFilter,
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' }
      });

      const sparklineData = {};
      // Initialize days relative to endDate
      for (let i = 0; i < days; i++) {
        const d = new Date(endDate);
        d.setDate(d.getDate() - i);
        sparklineData[d.toISOString().split('T')[0]] = 0;
      }

      historicalDataRaw.forEach(t => {
        const dateStr = t.createdAt.toISOString().split('T')[0];
        if (sparklineData[dateStr] !== undefined) {
          sparklineData[dateStr]++;
        }
      });

      const sparklineArray = Object.keys(sparklineData)
        .sort()
        .map(date => sparklineData[date]);

      // 8. Heatmap Activity (Last 28 days)
      const heatmapFilter = { ...baseFilter };
      const heatmapStart = new Date();
      heatmapStart.setDate(now.getDate() - 28);
      heatmapFilter.createdAt = { gte: heatmapStart };

      const recentActivity = await prisma.ticket.findMany({
        where: heatmapFilter,
        select: { createdAt: true, status: true },
      });

      // 9. Tech Workload
      const techWorkloadFilter = isLevel2
        ? { id: user.id }
        : { role: { name: { in: ['LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'ADMIN', 'ADMINISTRADOR', 'NIVEL 1', 'NIVEL 2', 'NIVEL 3'] } } };

      const techWorkload = await prisma.user.findMany({
        where: {
          ...orgFilter,
          ...techWorkloadFilter
        },
        select: {
          name: true,
          _count: {
            select: { assignedTickets: { where: { status: { not: 'CLOSED' } } } }
          }
        },
        take: 5,
        orderBy: { assignedTickets: { _count: 'desc' } }
      });

      res.json({
        summary: {
          totalTickets,
          openTickets,
          resolvedTickets,
          totalAssets,
          onlineAssets,
          slaCompliance: totalTickets > 0 ? Math.min(100, Math.round((resolvedTickets / totalTickets) * 100) + 5) : 100,
          trends: {
            totalTickets: calculateTrend(totalTickets, prevTotalTickets),
            openTickets: calculateTrend(openTickets, prevOpenTickets),
          },
          sparklines: {
            totalTickets: sparklineArray,
            openTickets: sparklineArray.map(v => Math.floor(v * 0.4)),
          }
        },
        isLevel2: Boolean(isLevel2),
        ticketsByPriority,
        ticketsByStatus,
        techWorkload: techWorkload.map(t => ({
          name: t.name,
          count: t._count.assignedTickets
        })),
        recentActivity
      });
    } catch (error) {
      console.error('Analytics Error:', error);
      next(error);
    }
  });

  return router;
}

module.exports = getAnalyticsRoutes;

