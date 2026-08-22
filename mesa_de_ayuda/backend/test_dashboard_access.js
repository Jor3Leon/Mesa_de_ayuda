
async function main() {
  const baseURL = 'http://localhost:5000/api';
  
  try {
    console.log('Logging in as usuario.test...');
    const loginRes = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'usuario.test',
        password: 'User1234!'
      })
    });
    
    const loginData = await loginRes.json();
    const token = loginData.token;
    
    if (!token) {
      console.log('Login failed:', loginData);
      return;
    }

    console.log('Fetching dashboard data...');
    const dashRes = await fetch(`${baseURL}/dashboard/data`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const dashData = await dashRes.json();
    console.log('Status:', dashRes.status);
    console.log('Data:', JSON.stringify(dashData, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
