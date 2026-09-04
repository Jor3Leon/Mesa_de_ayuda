const express = require('express');
const { requireAuth, requirePermission, getEffectiveRole } = require('../lib/middleware');
const { getTicketPerformanceMetrics } = require('../lib/ticket-analytics-service');

function getAnalyticsRoutes(prisma) {
  const router = express.Router();

  router.use(requireAuth(prisma));

  /**
   * Endpoint oficial de desempeño analítico de tickets y ANS
   * (Directiva Sección 8 de la Auditoría)
   */
  router.get('/tickets/performance', requirePermission('ANALYTICS_VIEW'), async (req, res, next) => {
    try {
      const user = req.auth.user;
      const effectiveRole = getEffectiveRole(req);
      const isLevel2 = effectiveRole.includes('NIVEL 2') || effectiveRole.includes('LEVEL_2');
      const isStandard = effectiveRole.includes('ESTANDAR') || effectiveRole.includes('STANDARD');

      const requestedViewMode = req.query.viewMode || 'global';
      const forcePersonal = isLevel2 || isStandard || requestedViewMode === 'personal';

      const metrics = await getTicketPerformanceMetrics(prisma, {
        organizationId: req.auth.organizationId,
        startDate: req.query.from || req.query.startDate,
        endDate: req.query.to || req.query.endDate,
        ticketType: req.query.ticketType || 'all',
        category: req.query.categoryId || req.query.category || req.query.department || 'all',
        priority: req.query.priority || 'all',
        technicianId: req.query.technicianId || 'all',
        status: req.query.status || 'all',
        viewMode: forcePersonal ? 'personal' : 'global',
        user
      });

      res.json(metrics);
    } catch (error) {
      next(error);
    }
  });

  /**
   * Endpoint para vista gerencial / BI Analytics Dashboard
   */
  router.get('/dashboard', requirePermission('ANALYTICS_VIEW'), async (req, res, next) => {
    try {
      const { 
        department = 'all', 
        ticketType = 'all',
        technicianId = 'all',
        viewMode = 'global',
        startDate: customStart,
        endDate: customEnd
      } = req.query;
      const user = req.auth.user;

      const effectiveRole = getEffectiveRole(req);
      const isLevel2 = effectiveRole.includes('NIVEL 2') || effectiveRole.includes('LEVEL_2');
      const isLevel1 = effectiveRole.includes('NIVEL 1') || effectiveRole.includes('LEVEL_1');
      const isLevel3 = effectiveRole.includes('NIVEL 3') || effectiveRole.includes('LEVEL_3') || effectiveRole.includes('SUPERVISOR');
      const isAdmin = effectiveRole.includes('ADMIN') || effectiveRole.includes('ADMINISTRADOR');
      const isStandard = effectiveRole.includes('ESTANDAR') || effectiveRole.includes('STANDARD');

      const forcePersonal = isLevel2 || isStandard || (viewMode === 'personal');

      const orgFilter = req.auth.organizationId ? { organizationId: req.auth.organizationId } : {};

      // 1. Obtener métricas centralizadas desde TicketAnalyticsService
      const metrics = await getTicketPerformanceMetrics(prisma, {
        organizationId: req.auth.organizationId,
        startDate: customStart,
        endDate: customEnd,
        ticketType,
        category: department,
        technicianId,
        viewMode: forcePersonal ? 'personal' : 'global',
        user
      });

      // 2. Activos de la organización
      const [totalAssets, onlineAssets] = await Promise.all([
        prisma.asset.count({ where: orgFilter }).catch(() => 0),
        prisma.asset.count({ where: { ...orgFilter, status: 'ONLINE' } }).catch(() => 0)
      ]);

      // 3. Actividades recientes
      const recentActivity = await prisma.ticketActivity.findMany({
        where: forcePersonal
          ? { ticket: { OR: [{ assignedToId: user.id }, { secondaryAssignedToId: user.id }, { createdById: user.id }] } }
          : (req.auth.organizationId ? { ticket: { organizationId: req.auth.organizationId } } : {}),
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          ticket: { select: { id: true, title: true, priority: true, status: true, ticketType: true } }
        }
      }).catch(() => []);

      const sparklineArray = (metrics.timeline || []).map(d => d.created);

      res.json({
        summary: {
          totalTickets: metrics.summary.total,
          openTickets: metrics.summary.open,
          inProgressTickets: metrics.summary.inProgress,
          resolvedTickets: metrics.summary.resolved,
          closedTickets: metrics.summary.closed,
          incidentCount: metrics.summary.incidents,
          requestCount: metrics.summary.requests,
          slaCompliance: metrics.summary.globalAnsCompliance,
          ansResponseCompliance: metrics.summary.responseAnsCompliance,
          ansResolutionCompliance: metrics.summary.resolutionAnsCompliance,
          overdueCount: metrics.summary.overdueTickets,
          mttaMinutes: metrics.summary.avgMttaMinutes,
          mttaP50Minutes: metrics.summary.mttaP50Minutes,
          mttaP90Minutes: metrics.summary.mttaP90Minutes,
          mttrHours: metrics.summary.avgMttrHours,
          mttrP50Hours: metrics.summary.mttrP50Hours,
          mttrP90Hours: metrics.summary.mttrP90Hours,
          fcrRate: metrics.summary.fcrRate,
          reopenRate: metrics.summary.reopenRate,
          throughputRatio: metrics.summary.total > 0 
            ? Math.round(((metrics.summary.resolved + metrics.summary.closed) / metrics.summary.total) * 100) 
            : 100,
          totalAssets,
          onlineAssets,
          trends: {
            totalTickets: 0,
            openTickets: 0
          },
          sparklines: {
            totalTickets: sparklineArray,
            openTickets: sparklineArray.map(v => Math.floor(v * 0.4))
          }
        },
        isLevel2: Boolean(isLevel2),
        isLevel1: Boolean(isLevel1),
        isLevel3: Boolean(isLevel3),
        isAdmin: Boolean(isAdmin),
        canSwitchView: Boolean(isAdmin || isLevel1 || isLevel3),
        viewMode: forcePersonal ? 'personal' : 'global',
        ticketsByPriority: metrics.priorities.map(p => ({ label: p.label, value: p.count })),
        ticketsByStatus: metrics.statuses.map(s => ({ label: s.label, value: s.count })),
        ticketsByCategory: metrics.categories.map(c => ({ label: c.label, value: c.count })),
        dailyEvolution: metrics.timeline,
        techniciansPerformance: metrics.techniciansWorkload,
        techWorkload: metrics.techniciansWorkload.map(t => ({
          id: t.id,
          name: t.name,
          count: t.inProgressCount + t.assignedCount
        })),
        hourlyHeatmap: metrics.hourlyHeatmap,
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
