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
    email: 'nivel1@yopal.gov.co',
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
        if (where.id === 2) return { id: 2, role: { name: 'LEVEL_1', permissions: [] } };
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

test('POST /api/discovery/scan validates IPv4 addresses and returns device profile', async () => {
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
    // 1. Invalid IP test
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

    // 2. Valid IP test
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
    assert.ok(goodPayload.brand);
    assert.ok(goodPayload.model);
    assert.ok(goodPayload.mac);
    assert.ok(Array.isArray(goodPayload.consumables));
    assert.ok(goodPayload.capabilities.printing);
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
      city: 'Yopal',
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
