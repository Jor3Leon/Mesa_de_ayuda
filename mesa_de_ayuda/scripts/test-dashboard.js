

async function testDashboard() {
  const baseUrl = 'http://localhost:5000/api';
  
  // Login
  console.log('Logging in...');
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'jherson.rivera', password: 'Admin12345!' })
  });
  
  if (!loginRes.ok) {
    console.error('Login failed:', await loginRes.text());
    return;
  }
  
  const { token } = await loginRes.json();
  console.log('Login successful. Token acquired.');
  
  // Test /dashboard/data
  console.log('Testing /dashboard/data...');
  const start = Date.now();
  const dataRes = await fetch(`${baseUrl}/dashboard/data`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const end = Date.now();
  
  if (!dataRes.ok) {
    console.error('Dashboard data failed:', await dataRes.text());
  } else {
    const data = await dataRes.json();
    console.log('Dashboard data successful in', end - start, 'ms');
    console.log('Global Stats:', JSON.stringify(data.global, null, 2));
  }
  
  // Test /assets/recent
  console.log('Testing /assets/recent...');
  const assetsRes = await fetch(`${baseUrl}/assets/recent`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!assetsRes.ok) {
    console.error('Assets recent failed:', await assetsRes.text());
  } else {
    const assets = await assetsRes.json();
    console.log('Assets recent successful. Count:', assets.length);
  }
}

testDashboard();
