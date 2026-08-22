const express = require('express');
const { 
  requireNonEmptyString, 
  normalizeOptionalString, 
  normalizeOptionalPositiveInt,
  normalizeOptionalDate,
  createHttpError,
  createValidationError
} = require('../lib/utils');
const { requireAuth, requirePermission, requireAnyPermission } = require('../lib/middleware');

function getAssetRoutes(prisma) {
  const router = express.Router();

  router.post('/sync', async (req, res, next) => {
    try {
      const { 
        hostname, serialNumber, ipAddress, osType, osVersion, 
        brand, model, deviceType, cpuModel, ramSummary, 
        storageSummary, networkSummary, motherboard, graphicsInfo, displayInfo
      } = req.body;

      if (!hostname) {
        throw createValidationError('Hostname is required for synchronization.');
      }

      const orgSlug = req.body.organizationSlug || req.headers['x-organization-slug'];
      let orgId = null;
      if (orgSlug) {
        const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
        if (org) orgId = org.id;
      }

      // Upsert logic: find by serialNumber or hostname scoped to organization
      let asset = null;
      
      if (serialNumber) {
        asset = await prisma.asset.findFirst({ 
          where: { 
            serialNumber,
            ...(orgId ? { organizationId: orgId } : {})
          } 
        });
      }
      
      if (!asset) {
        asset = await prisma.asset.findFirst({ 
          where: { 
            hostname,
            ...(orgId ? { organizationId: orgId } : {})
          } 
        });
      }

      const data = {
        hostname,
        serialNumber: serialNumber || undefined,
        ipAddress: ipAddress || '0.0.0.0',
        osType: osType || 'Windows',
        osVersion: osVersion || 'Unknown',
        status: 'ONLINE',
        brand: brand || undefined,
        model: model || undefined,
        deviceType: deviceType || 'Unknown',
        cpuModel: cpuModel || undefined,
        ramSummary: ramSummary || undefined,
        storageSummary: storageSummary || undefined,
        networkSummary: networkSummary || undefined,
        motherboard: motherboard || undefined,
        graphicsInfo: graphicsInfo || undefined,
        displayInfo: displayInfo || undefined,
        lastSeenAt: new Date(),
        agentVersion: req.body.agentVersion || '1.0.0',
        organizationId: orgId || asset?.organizationId || null,
        customerId: asset ? undefined : 1, 
      };

      if (asset) {
        asset = await prisma.asset.update({
          where: { id: asset.id },
          data
        });
      } else {
        asset = await prisma.asset.create({ data });
      }

      res.json({ success: true, assetId: asset.id });
    } catch (error) {
      next(error);
    }
  });

  router.use(requireAuth(prisma));

  router.get('/recent', requireAnyPermission('ASSETS_VIEW', 'TICKETS_VIEW'), async (req, res, next) => {
    try {
      const orgFilter = req.auth.organizationId ? { organizationId: req.auth.organizationId } : {};
      const assets = await prisma.asset.findMany({
        where: orgFilter,
        take: 5,
        orderBy: { lastSeenAt: 'desc' },
        include: { customer: true }
      });
      res.json(assets);
    } catch (error) {
      next(error);
    }
  });

  async function ensureUniqueAssetIdentifiers(identifiers, currentAssetId = null, organizationId = null) {
    const hostname = requireNonEmptyString(identifiers.hostname, 'hostname');
    const serialNumber = normalizeOptionalString(identifiers.serialNumber);
    const existingAssets = await prisma.asset.findMany({
      where: {
        ...(organizationId ? { organizationId } : {}),
        OR: [
          { hostname },
          ...(serialNumber ? [{ serialNumber }] : []),
        ],
      },
      select: { id: true, hostname: true, serialNumber: true },
    });

    const conflictingAsset = existingAssets.find((asset) => asset.id !== currentAssetId);
    if (!conflictingAsset) return;

    if (conflictingAsset.hostname === hostname) {
      throw createValidationError('Ya existe un dispositivo con ese hostname o placa.');
    }
    if (serialNumber && conflictingAsset.serialNumber === serialNumber) {
      throw createValidationError('Ya existe un dispositivo con ese serial o ID device.');
    }
  }

  router.get('/', requireAnyPermission('ASSETS_VIEW', 'TICKETS_VIEW', 'TICKETS_CREATE'), async (req, res, next) => {
    try {
      const orgFilter = req.auth.organizationId ? { organizationId: req.auth.organizationId } : {};
      const assets = await prisma.asset.findMany({
        where: orgFilter,
        orderBy: { hostname: 'asc' },
        include: { customer: true },
      });
      res.json(assets);
    } catch (error) {
      next(error);
    }
  });

  router.post('/', requirePermission('ASSETS_MANAGE'), async (req, res, next) => {
    try {
      await ensureUniqueAssetIdentifiers(req.body, null, req.auth.organizationId);

      const asset = await prisma.asset.create({
        data: {
          hostname: requireNonEmptyString(req.body.hostname, 'hostname'),
          ipAddress: normalizeOptionalString(req.body.ipAddress) || '0.0.0.0',
          osType: normalizeOptionalString(req.body.osType) || 'Windows',
          osVersion: normalizeOptionalString(req.body.osVersion),
          status: normalizeOptionalString(req.body.status) || 'ONLINE',
          organizationId: req.auth.organizationId || null,
          customerId: normalizeOptionalPositiveInt(req.body.customerId) || 1,
          serialNumber: normalizeOptionalString(req.body.serialNumber),
          brand: normalizeOptionalString(req.body.brand),
          model: normalizeOptionalString(req.body.model),
          deviceType: normalizeOptionalString(req.body.deviceType) || 'All in One',
          assignedUser: normalizeOptionalString(req.body.assignedUser),
          location: normalizeOptionalString(req.body.location),
          agentVersion: normalizeOptionalString(req.body.agentVersion),
          lastSeenAt: normalizeOptionalDate(req.body.lastSeenAt, 'lastSeenAt'),
          motherboard: normalizeOptionalString(req.body.motherboard),
          cpuModel: normalizeOptionalString(req.body.cpuModel),
          ramSummary: normalizeOptionalString(req.body.ramSummary),
          storageSummary: normalizeOptionalString(req.body.storageSummary),
          networkSummary: normalizeOptionalString(req.body.networkSummary),
          graphicsInfo: normalizeOptionalString(req.body.graphicsInfo),
          displayInfo: normalizeOptionalString(req.body.displayInfo),
          notes: normalizeOptionalString(req.body.notes),
        },
      });

      res.status(201).json(asset);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', requirePermission('ASSETS_VIEW'), async (req, res, next) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      const asset = await prisma.asset.findUnique({ where: { id } });
      if (!asset) throw createHttpError(404, 'Asset not found.');
      res.json(asset);
    } catch (error) {
      next(error);
    }
  });

  router.put('/:id', requirePermission('ASSETS_MANAGE'), async (req, res, next) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (req.body.hostname !== undefined || req.body.serialNumber !== undefined) {
        await ensureUniqueAssetIdentifiers(req.body, id);
      }

      const updateData = {};
      const fields = [
        'hostname', 'ipAddress', 'osType', 'osVersion', 'status', 'customerId', 
        'serialNumber', 'brand', 'model', 'deviceType', 'assignedUser', 
        'location', 'agentVersion', 'motherboard', 'cpuModel', 'ramSummary', 
        'storageSummary', 'networkSummary', 'graphicsInfo', 'displayInfo', 'notes'
      ];

      fields.forEach(field => {
        if (req.body[field] !== undefined) {
          if (field === 'customerId') updateData[field] = normalizeOptionalPositiveInt(req.body[field]);
          else updateData[field] = normalizeOptionalString(req.body[field]);
        }
      });

      if (req.body.lastSeenAt !== undefined) {
        updateData.lastSeenAt = normalizeOptionalDate(req.body.lastSeenAt, 'lastSeenAt');
      }

      const asset = await prisma.asset.update({
        where: { id },
        data: updateData,
      });

      res.json(asset);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id/history', requirePermission('ASSETS_VIEW'), async (req, res, next) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      const asset = await prisma.asset.findUnique({ where: { id } });
      if (!asset) throw createHttpError(404, 'Asset not found.');

      const tickets = await prisma.ticket.findMany({
        where: {
          OR: [
            { subject: { contains: asset.hostname } },
            { description: { contains: asset.hostname } },
            { description: { contains: asset.serialNumber || '---' } }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });

      const maintenances = await prisma.maintenance.findMany({
        where: { assetId: id },
        orderBy: { date: 'desc' }
      });

      res.json({ tickets, maintenances });
    } catch (error) {
      next(error);
    }
  });



  return router;
}

module.exports = getAssetRoutes;
