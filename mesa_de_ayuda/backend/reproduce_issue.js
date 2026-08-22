async function test() {
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'usuario.test', password: 'User1234!' })
  });
  const loginData = await loginRes.json();
  console.log('Login Response:', JSON.stringify(loginData, null, 2));

  if (!loginData.token) {
    console.error('Login failed');
    return;
  }

  const ticketsRes = await fetch('http://localhost:5000/api/tickets', {
    headers: { 'Authorization': `Bearer ${loginData.token}` }
  });
  const ticketsData = await ticketsRes.json();
  console.log('Tickets Response:', JSON.stringify(ticketsData, null, 2));
}

test().catch(console.error);
