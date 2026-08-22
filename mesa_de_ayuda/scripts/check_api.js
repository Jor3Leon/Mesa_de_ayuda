
const axios = require('axios');

async function checkDashboardAPI() {
  const baseUrl = 'http://localhost:5000/api';
  
  try {
    // 1. Login to get token
    console.log('Logging in...');
    const loginRes = await axios.post(`${baseUrl}/auth/login`, {
      username: 'jherson.rivera',
      password: 'Admin12345!'
    });
    
    const token = loginRes.data.token;
    console.log('Login successful. Token acquired.');
    
    // 2. Fetch dashboard data
    console.log('Fetching dashboard data...');
    const dashboardRes = await axios.get(`${baseUrl}/dashboard/data`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Dashboard Data Response:');
    console.log(JSON.stringify(dashboardRes.data, null, 2));
    
    // 3. Fetch assets recent
    console.log('Fetching assets recent...');
    const assetsRes = await axios.get(`${baseUrl}/assets/recent`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Assets Recent Response:');
    console.log(JSON.stringify(assetsRes.data, null, 2));
    
  } catch (error) {
    console.error('Error checking API:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

checkDashboardAPI();
