const BASE_URL = 'http://localhost:5000/api';

const USERS = [
  { username: 'jherson.rivera', password: 'Admin12345!', expected: { roles: 200, users: 200 } },
  { username: 'tecnico.n1', password: 'SoporteN1!', expected: { roles: 403, users: 403 } },
  { username: 'tecnico.n2', password: 'SoporteN2!', expected: { roles: 403, users: 403 } },
  { username: 'tecnico.n3', password: 'SoporteN3!', expected: { roles: 200, users: 200 } },
  { username: 'usuario.test', password: 'User1234!', expected: { roles: 403, users: 403 } },
];

async function testUser(user) {
  console.log(`\nTesting user: ${user.username}`);
  try {
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: user.username,
        password: user.password
      })
    });

    if (!loginRes.ok) {
      console.log(`  - Login failed: ${loginRes.status}`);
      return;
    }

    const { token } = await loginRes.json();
    const headers = { Authorization: `Bearer ${token}` };

    // Test Roles
    const rolesRes = await fetch(`${BASE_URL}/roles`, { headers });
    console.log(`  - /api/roles: ${rolesRes.status} (Expected ${user.expected.roles})`);

    // Test Users
    const usersRes = await fetch(`${BASE_URL}/users`, { headers });
    console.log(`  - /api/users: ${usersRes.status} (Expected ${user.expected.users})`);

  } catch (err) {
    console.log(`  - Error: ${err.message}`);
  }
}

async function main() {
  for (const user of USERS) {
    await testUser(user);
  }
}

main();
