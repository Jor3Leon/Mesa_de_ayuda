
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

    console.log('Fetching tickets...');
    const ticketsRes = await fetch(`${baseURL}/tickets`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const tickets = await ticketsRes.json();
    console.log('Status:', ticketsRes.status);
    console.log('Tickets returned:', tickets.length);
    console.log('Data:', JSON.stringify(tickets, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
