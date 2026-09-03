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

function requireAgentApiKey(req, res, next) {
  const orgSlug = String(req.headers['x-organization-slug'] || req.body?.organizationSlug || '').toLowerCase().trim();
  const orgEnvVar = orgSlug ? `AGENT_API_KEY_${orgSlug.toUpperCase().replace(/[^A-Z0-9]/g, '_')}` : null;
  const expectedKey = (orgEnvVar && process.env[orgEnvVar]) ? process.env[orgEnvVar] : process.env.AGENT_API_KEY;

  if (!expectedKey) {
    return res.status(503).json({ error: 'Agent API Key no configurada en el servidor.' });
  }

  const providedKey = req.headers['x-agent-key'];
  if (!providedKey || providedKey !== expectedKey) {
    return res.status(401).json({ error: 'Invalid or missing Agent API Key (X-Agent-Key header).' });
  }
  next();
}

function getAssetRoutes(prisma) {
  const router = express.Router();

  router.post('/sync', requireAgentApiKey, async (req, res, next) => {
    try {
      const { 
        hostname, serialNumber, ipAddress, osType, osVersion, 
        brand, model, deviceType, cpuModel, ramSummary, 
        storageSummary, networkSummary, motherboard, graphicsInfo, displayInfo,
        installedSoftware, assignedUser
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

      // Upsert logic: find by serialNumber, MAC in networkSummary, or hostname scoped to organization
      let asset = null;
      
      if (serialNumber) {
        asset = await prisma.asset.findFirst({ 
          where: { 
            serialNumber,
            ...(orgId ? { organizationId: orgId } : {})
          } 
        });
      }
      
      let extractedMac = req.body.macAddress || req.body.mac || null;
      if (!extractedMac && networkSummary) {
        const macMatch = String(networkSummary).match(/([0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2})/i);
        if (macMatch) extractedMac = macMatch[1].toUpperCase();
      }

      if (!asset && extractedMac) {
        asset = await prisma.asset.findFirst({
          where: {
            OR: [
              { macAddress: extractedMac },
              { networkSummary: { contains: extractedMac } }
            ],
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

      // Ensure a valid customerId exists
      let customerId = asset?.customerId;
      if (!customerId) {
        const existingCustomer = await prisma.customer.findFirst({
          where: orgId ? { organizationId: orgId } : {}
        });
        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          const defaultCustomer = await prisma.customer.create({
            data: {
              name: 'General / Interno',
              code: 'GEN-01',
              organizationId: orgId || null
            }
          });
          customerId = defaultCustomer.id;
        }
      }

      const serializedSoftware = typeof installedSoftware === 'object' && installedSoftware !== null
        ? JSON.stringify(installedSoftware)
        : installedSoftware;

      const data = {
        // Regla general: Si el activo ya existe y tiene un hostname configurado (modificado por Administrador o Técnico Nivel 3),
        // mantener el cambio realizado sin que la sincronización automática del sistema lo deshaga.
        hostname: asset ? (asset.hostname || hostname) : hostname,
        serialNumber: serialNumber || asset?.serialNumber || undefined,
        ipAddress: ipAddress || asset?.ipAddress || '0.0.0.0',
        osType: osType || asset?.osType || 'Windows',
        osVersion: osVersion || asset?.osVersion || 'Unknown',
        status: 'ONLINE',
        brand: asset?.brand || brand || undefined,
        model: asset?.model || model || undefined,
        deviceType: (asset?.deviceType && asset.deviceType !== 'Unknown' && asset.deviceType !== 'Equipo de Cómputo' && asset.deviceType !== 'Dispositivo') 
          ? asset.deviceType 
          : (deviceType || 'PC de Escritorio (Desktop)'),
        cpuModel: cpuModel || asset?.cpuModel || undefined,
        ramSummary: ramSummary || asset?.ramSummary || undefined,
        storageSummary: storageSummary || asset?.storageSummary || undefined,
        networkSummary: networkSummary || asset?.networkSummary || undefined,
        motherboard: motherboard || asset?.motherboard || undefined,
        graphicsInfo: graphicsInfo || asset?.graphicsInfo || undefined,
        displayInfo: displayInfo || asset?.displayInfo || undefined,
        assignedUser: asset?.assignedUser || (assignedUser 
          ? String(assignedUser).replace(/^[^\\]*\\/, '').replace(/^[^\/]*\//, '').trim() 
          : undefined),
        location: asset?.location || undefined,
        installedSoftware: serializedSoftware || asset?.installedSoftware || undefined,
        macAddress: extractedMac || asset?.macAddress || undefined,
        lastSeenAt: new Date(),
        agentVersion: req.body.agentVersion || asset?.agentVersion || '1.0.0',
        organizationId: orgId || asset?.organizationId || null,
        customerId: customerId,
      };

      if (asset) {
        asset = await prisma.asset.update({
          where: { id: asset.id },
          data
        });
      } else {
        asset = await prisma.asset.create({ data });
      }

      console.log(`[SYNC SUCCESS] Asset synchronized: ${hostname} (ID: ${asset.id})`);
      res.json({ success: true, assetId: asset.id });
    } catch (error) {
      console.error('[SYNC ERROR]', error);
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
      console.error('Error fetching recent assets:', error);
      res.json([]);
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
          installedSoftware: normalizeOptionalString(req.body.installedSoftware),
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
      const asset = await prisma.asset.findFirst({
        where: {
          id,
          ...(req.auth.organizationId ? { organizationId: req.auth.organizationId } : {}),
        }
      });
      if (!asset) throw createHttpError(404, 'Asset not found.');
      res.json(asset);
    } catch (error) {
      next(error);
    }
  });

  router.put('/:id', requirePermission('ASSETS_MANAGE'), async (req, res, next) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      const targetAsset = await prisma.asset.findFirst({
        where: {
          id,
          ...(req.auth.organizationId ? { organizationId: req.auth.organizationId } : {}),
        }
      });
      if (!targetAsset) throw createHttpError(404, 'Asset not found.');

      if (req.body.hostname !== undefined || req.body.serialNumber !== undefined) {
        await ensureUniqueAssetIdentifiers(req.body, id, req.auth.organizationId);
      }

      const updateData = {};
      const fields = [
        'hostname', 'ipAddress', 'osType', 'osVersion', 'status', 'customerId', 
        'serialNumber', 'brand', 'model', 'deviceType', 'assignedUser', 
        'location', 'agentVersion', 'motherboard', 'cpuModel', 'ramSummary', 
        'storageSummary', 'networkSummary', 'graphicsInfo', 'displayInfo', 'installedSoftware', 'notes'
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

  router.get('/:id/history', requireAnyPermission('ASSETS_VIEW', 'TICKETS_VIEW'), async (req, res, next) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      const asset = await prisma.asset.findFirst({
        where: {
          id,
          ...(req.auth.organizationId ? { organizationId: req.auth.organizationId } : {}),
        }
      });
      if (!asset) throw createHttpError(404, 'Asset not found.');

      const orConditions = [{ assetId: id }];
      
      if (asset.hostname && asset.hostname.trim()) {
        const cleanHost = asset.hostname.trim();
        orConditions.push({ title: { contains: cleanHost, mode: 'insensitive' } });
        orConditions.push({ description: { contains: cleanHost, mode: 'insensitive' } });
      }
      if (asset.serialNumber && asset.serialNumber.trim()) {
        const cleanSerial = asset.serialNumber.trim();
        orConditions.push({ title: { contains: cleanSerial, mode: 'insensitive' } });
        orConditions.push({ description: { contains: cleanSerial, mode: 'insensitive' } });
      }

      const orgFilter = req.auth.organizationId ? { organizationId: req.auth.organizationId } : {};

      const [tickets, maintenances] = await Promise.all([
        prisma.ticket.findMany({
          where: {
            ...orgFilter,
            OR: orConditions
          },
          include: {
            assignedTo: { select: { id: true, name: true, username: true } },
            createdBy: { select: { id: true, name: true, username: true } }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.maintenance.findMany({
          where: { assetId: id },
          orderBy: { date: 'desc' }
        })
      ]);

      res.json({ tickets: tickets || [], maintenances: maintenances || [] });
    } catch (error) {
      console.error('Error in /assets/:id/history:', error);
      next(error);
    }
  });



  return router;
}

module.exports = getAssetRoutes;
