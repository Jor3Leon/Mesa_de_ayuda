const express = require('express');
const { 
  requireNonEmptyString, 
  normalizeOptionalString, 
  normalizeOptionalPositiveInt,
  createHttpError,
  createValidationError
} = require('../lib/utils');
const { requireAuth, requirePermission, requireAnyPermission } = require('../lib/middleware');

function getOrgStructureRoutes(prisma) {
  const router = express.Router();

  router.use(requireAuth(prisma));

  // Helper to sync canonical location string into Location table for legacy views
  async function syncCanonicalLocation(sedeName, depName = '', ofiName = '', orgId = null) {
    try {
      const parts = [sedeName];
      if (depName) parts.push(depName);
      if (ofiName) parts.push(ofiName);
      const canonicalName = parts.join(' - ');

      const existing = await prisma.location.findFirst({
        where: {
          name: canonicalName,
          ...(orgId ? { organizationId: orgId } : {})
        }
      });

      if (!existing) {
        await prisma.location.create({
          data: {
            name: canonicalName,
            description: `Ubicación generada automáticamente desde Estructura Organizacional: ${parts.join(' > ')}`,
            organizationId: orgId,
            isActive: true
          }
        });
      }
    } catch (err) {
      console.warn('Could not sync canonical location:', err.message);
    }
  }

  // 1. GET /api/organization-structure - Full hierarchical tree with counts
  router.get('/', async (req, res, next) => {
    try {
      const orgFilter = req.auth.organizationId ? { organizationId: req.auth.organizationId } : {};

      const [sedes, dependencias, oficinas, assets, users] = await Promise.all([
        prisma.sede.findMany({
          where: orgFilter,
          orderBy: { name: 'asc' },
          include: {
            dependencias: {
              include: {
                oficinas: true
              },
              orderBy: { name: 'asc' }
            },
            oficinas: {
              where: { dependenciaId: null },
              orderBy: { name: 'asc' }
            }
          }
        }),
        prisma.dependencia.findMany({
          where: { ...orgFilter, sedeId: null },
          include: { oficinas: true },
          orderBy: { name: 'asc' }
        }),
        prisma.oficina.findMany({
          where: { ...orgFilter, sedeId: null, dependenciaId: null },
          orderBy: { name: 'asc' }
        }),
        prisma.asset.findMany({
          where: orgFilter,
          select: { id: true, hostname: true, location: true, deviceType: true, status: true, brand: true, model: true }
        }),
        prisma.user.findMany({
          where: orgFilter,
          select: { id: true, name: true, email: true, locationId: true, location: { select: { name: true } } }
        })
      ]);

      // Calculate asset counts matching locations
      const enrichedSedes = sedes.map(sede => {
        const sedeAssets = assets.filter(a => a.location && a.location.toLowerCase().includes(sede.name.toLowerCase()));
        
        const enrichedDeps = (sede.dependencias || []).map(dep => {
          const depAssets = sedeAssets.filter(a => a.location && a.location.toLowerCase().includes(dep.name.toLowerCase()));
          
          const enrichedOfis = (dep.oficinas || []).map(ofi => {
            const ofiAssets = depAssets.filter(a => a.location && a.location.toLowerCase().includes(ofi.name.toLowerCase()));
            return {
              ...ofi,
              assetCount: ofiAssets.length,
              assets: ofiAssets.slice(0, 10)
            };
          });

          return {
            ...dep,
            oficinas: enrichedOfis,
            assetCount: depAssets.length
          };
        });

        const unassignedOfis = (sede.oficinas || []).map(ofi => {
          const ofiAssets = sedeAssets.filter(a => a.location && a.location.toLowerCase().includes(ofi.name.toLowerCase()));
          return {
            ...ofi,
            assetCount: ofiAssets.length
          };
        });

        return {
          ...sede,
          dependencias: enrichedDeps,
          oficinasDirectas: unassignedOfis,
          totalOficinas: enrichedDeps.reduce((acc, d) => acc + d.oficinas.length, 0) + unassignedOfis.length,
          assetCount: sedeAssets.length
        };
      });

      res.json({
        tree: enrichedSedes,
        unassignedDependencias: dependencias,
        unassignedOficinas: oficinas,
        stats: {
          totalSedes: sedes.length,
          totalDependencias: sedes.reduce((acc, s) => acc + (s.dependencias?.length || 0), 0) + dependencias.length,
          totalOficinas: sedes.reduce((acc, s) => acc + (s.totalOficinas || 0), 0) + oficinas.length,
          totalAssets: assets.length,
          totalUsers: users.length
        }
      });
    } catch (error) {
      next(error);
    }
  });

  // -------------------------
  // SEDES CRUD
  // -------------------------
  router.get('/sedes', async (req, res, next) => {
    try {
      const orgFilter = req.auth.organizationId ? { organizationId: req.auth.organizationId } : {};
      const sedes = await prisma.sede.findMany({
        where: orgFilter,
        include: {
          dependencias: true,
          oficinas: true
        },
        orderBy: { name: 'asc' }
      });
      res.json(sedes);
    } catch (error) {
      next(error);
    }
  });

  router.post('/sedes', requirePermission('ASSETS_MANAGE'), async (req, res, next) => {
    try {
      const name = requireNonEmptyString(req.body.name, 'name');
      const code = normalizeOptionalString(req.body.code);
      const address = normalizeOptionalString(req.body.address);
      const city = normalizeOptionalString(req.body.city) || 'Yopal';
      const phone = normalizeOptionalString(req.body.phone);
      const managerName = normalizeOptionalString(req.body.managerName);
      const orgId = req.auth.organizationId || null;

      const sede = await prisma.sede.create({
        data: {
          name,
          code,
          address,
          city,
          phone,
          managerName,
          organizationId: orgId,
          isActive: req.body.isActive !== false
        }
      });

      await syncCanonicalLocation(name, '', '', orgId);

      res.status(201).json(sede);
    } catch (error) {
      next(error);
    }
  });

  router.put('/sedes/:id', requirePermission('ASSETS_MANAGE'), async (req, res, next) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      const { name, code, address, city, phone, managerName, isActive } = req.body;

      const sede = await prisma.sede.update({
        where: { id },
        data: {
          name: name ? requireNonEmptyString(name, 'name') : undefined,
          code: code !== undefined ? normalizeOptionalString(code) : undefined,
          address: address !== undefined ? normalizeOptionalString(address) : undefined,
          city: city !== undefined ? normalizeOptionalString(city) : undefined,
          phone: phone !== undefined ? normalizeOptionalString(phone) : undefined,
          managerName: managerName !== undefined ? normalizeOptionalString(managerName) : undefined,
          isActive: isActive !== undefined ? Boolean(isActive) : undefined
        }
      });

      if (sede.name) {
        await syncCanonicalLocation(sede.name, '', '', req.auth.organizationId);
      }

      res.json(sede);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/sedes/:id', requirePermission('ASSETS_MANAGE'), async (req, res, next) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      await prisma.sede.delete({ where: { id } });
      res.json({ success: true, message: 'Sede eliminada correctamente.' });
    } catch (error) {
      next(error);
    }
  });

  // -------------------------
  // DEPENDENCIAS / AREAS CRUD
  // -------------------------
  router.get('/dependencias', async (req, res, next) => {
    try {
      const orgFilter = req.auth.organizationId ? { organizationId: req.auth.organizationId } : {};
      const dependencias = await prisma.dependencia.findMany({
        where: orgFilter,
        include: {
          sede: true,
          oficinas: true
        },
        orderBy: { name: 'asc' }
      });
      res.json(dependencias);
    } catch (error) {
      next(error);
    }
  });

  router.post('/dependencias', requirePermission('ASSETS_MANAGE'), async (req, res, next) => {
    try {
      const name = requireNonEmptyString(req.body.name, 'name');
      const code = normalizeOptionalString(req.body.code);
      const managerName = normalizeOptionalString(req.body.managerName);
      const email = normalizeOptionalString(req.body.email);
      const sedeId = normalizeOptionalPositiveInt(req.body.sedeId);
      const orgId = req.auth.organizationId || null;

      const dep = await prisma.dependencia.create({
        data: {
          name,
          code,
          managerName,
          email,
          sedeId,
          organizationId: orgId,
          isActive: req.body.isActive !== false
        },
        include: { sede: true }
      });

      if (dep.sede?.name) {
        await syncCanonicalLocation(dep.sede.name, name, '', orgId);
      }

      res.status(201).json(dep);
    } catch (error) {
      next(error);
    }
  });

  router.put('/dependencias/:id', requirePermission('ASSETS_MANAGE'), async (req, res, next) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      const { name, code, managerName, email, sedeId, isActive } = req.body;

      const dep = await prisma.dependencia.update({
        where: { id },
        data: {
          name: name ? requireNonEmptyString(name, 'name') : undefined,
          code: code !== undefined ? normalizeOptionalString(code) : undefined,
          managerName: managerName !== undefined ? normalizeOptionalString(managerName) : undefined,
          email: email !== undefined ? normalizeOptionalString(email) : undefined,
          sedeId: sedeId !== undefined ? normalizeOptionalPositiveInt(sedeId) : undefined,
          isActive: isActive !== undefined ? Boolean(isActive) : undefined
        },
        include: { sede: true }
      });

      if (dep.sede?.name && dep.name) {
        await syncCanonicalLocation(dep.sede.name, dep.name, '', req.auth.organizationId);
      }

      res.json(dep);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/dependencias/:id', requirePermission('ASSETS_MANAGE'), async (req, res, next) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      await prisma.dependencia.delete({ where: { id } });
      res.json({ success: true, message: 'Dependencia eliminada correctamente.' });
    } catch (error) {
      next(error);
    }
  });

  // -------------------------
  // OFICINAS / ESPACIOS CRUD
  // -------------------------
  router.get('/oficinas', async (req, res, next) => {
    try {
      const orgFilter = req.auth.organizationId ? { organizationId: req.auth.organizationId } : {};
      const oficinas = await prisma.oficina.findMany({
        where: orgFilter,
        include: {
          sede: true,
          dependencia: true
        },
        orderBy: { name: 'asc' }
      });
      res.json(oficinas);
    } catch (error) {
      next(error);
    }
  });

  router.post('/oficinas', requirePermission('ASSETS_MANAGE'), async (req, res, next) => {
    try {
      const name = requireNonEmptyString(req.body.name, 'name');
      const code = normalizeOptionalString(req.body.code);
      const floor = normalizeOptionalString(req.body.floor);
      const responsibleUser = normalizeOptionalString(req.body.responsibleUser);
      const dependenciaId = normalizeOptionalPositiveInt(req.body.dependenciaId);
      let sedeId = normalizeOptionalPositiveInt(req.body.sedeId);
      const orgId = req.auth.organizationId || null;

      // If sedeId not passed but dependenciaId is passed, inherit sedeId from dependencia
      if (!sedeId && dependenciaId) {
        const dep = await prisma.dependencia.findUnique({ where: { id: dependenciaId } });
        if (dep?.sedeId) sedeId = dep.sedeId;
      }

      const ofi = await prisma.oficina.create({
        data: {
          name,
          code,
          floor,
          responsibleUser,
          dependenciaId,
          sedeId,
          organizationId: orgId,
          isActive: req.body.isActive !== false
        },
        include: {
          sede: true,
          dependencia: true
        }
      });

      const sedeName = ofi.sede?.name || ofi.dependencia?.sede?.name || 'Sede Principal';
      const depName = ofi.dependencia?.name || '';
      await syncCanonicalLocation(sedeName, depName, name, orgId);

      res.status(201).json(ofi);
    } catch (error) {
      next(error);
    }
  });

  router.put('/oficinas/:id', requirePermission('ASSETS_MANAGE'), async (req, res, next) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      const { name, code, floor, responsibleUser, dependenciaId, sedeId, isActive } = req.body;

      const ofi = await prisma.oficina.update({
        where: { id },
        data: {
          name: name ? requireNonEmptyString(name, 'name') : undefined,
          code: code !== undefined ? normalizeOptionalString(code) : undefined,
          floor: floor !== undefined ? normalizeOptionalString(floor) : undefined,
          responsibleUser: responsibleUser !== undefined ? normalizeOptionalString(responsibleUser) : undefined,
          dependenciaId: dependenciaId !== undefined ? normalizeOptionalPositiveInt(dependenciaId) : undefined,
          sedeId: sedeId !== undefined ? normalizeOptionalPositiveInt(sedeId) : undefined,
          isActive: isActive !== undefined ? Boolean(isActive) : undefined
        },
        include: {
          sede: true,
          dependencia: true
        }
      });

      const sedeName = ofi.sede?.name || ofi.dependencia?.sede?.name || 'Sede Principal';
      const depName = ofi.dependencia?.name || '';
      await syncCanonicalLocation(sedeName, depName, ofi.name, req.auth.organizationId);

      res.json(ofi);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/oficinas/:id', requirePermission('ASSETS_MANAGE'), async (req, res, next) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      await prisma.oficina.delete({ where: { id } });
      res.json({ success: true, message: 'Oficina eliminada correctamente.' });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = getOrgStructureRoutes;
