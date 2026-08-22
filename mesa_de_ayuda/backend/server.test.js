const test = require('node:test');
const assert = require('node:assert/strict');
const { buildApp } = require('./app');
const { createToken } = require('./auth');

function buildUser() {
  return {
    id: 99,
    name: 'Admin Test',
    email: 'admin@test.local',
    isActive: true,
    role: 'ADMIN',
    passwordHash: 'ignored',
  };
}

test('GET /api/health returns ok', async () => {
  const app = buildApp({
    ticket: { count: async () => 0 },
    asset: { count: async () => 0, findMany: async () => [] },
    customer: {
      count: async () => 0,
      findMany: async () => [],
      create: async () => ({ id: 1, name: 'Test', email: 'test@example.com' }),
    },
  });

  const server = app.listen(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/health`);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(payload, { ok: true });
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('POST /api/customers validates email addresses', async () => {
  const authUser = buildUser();
  const app = buildApp({
    user: {
      findUnique: async ({ where }) => (where.id === authUser.id ? authUser : null),
    },
    customer: {
      count: async () => 0,
      findMany: async () => [],
      create: async () => {
        throw new Error('should not create invalid customer');
      },
    },
    ticket: { count: async () => 0 },
    asset: { count: async () => 0, findMany: async () => [] },
  });

  const server = app.listen(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${createToken(authUser)}`,
      },
      body: JSON.stringify({ name: 'Mesa de Ayuda', email: 'bad-email' }),
    });
    const payload = await response.json();

    assert.equal(response.status, 400);
    assert.equal(payload.error, 'email must be a valid email address.');
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
        if (where.id === authUser.id) {
          return authUser;
        }
        if (where.id === 2) {
          return { id: 2 };
        }
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
    role: {
      name: 'ADMIN',
      permissions: [],
    },
    location: null,
  };

  const app = buildApp({
    user: {
      findUnique: async ({ where }) => {
        if (where.id === authUser.id) {
          return {
            ...authUser,
            role: {
              name: 'ADMIN',
              permissions: [],
            },
            location: null,
          };
        }

        return null;
      },
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
    assert.equal(payload.email, 'admin@test.local');
    assert.equal(payload.phone, '3001234567');
    assert.equal(payload.avatarUrl, avatarUrl);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
