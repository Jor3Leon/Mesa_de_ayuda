
const axios = require('axios');

async function main() {
  const baseURL = 'http://localhost:5000/api';
  
  try {
    // 1. Login as usuario.test
    console.log('Logging in as usuario.test...');
    const loginRes = await axios.post(`${baseURL}/auth/login`, {
      username: 'usuario.test',
      password: 'User1234!'
    });
    
    const token = loginRes.data.token;
    console.log('Login successful. Token obtained.');
    console.log('User role:', loginRes.data.user.role);
    console.log('User permissions:', loginRes.data.user.permissions);

    const config = {
      headers: { Authorization: `Bearer ${token}` }
    };

    // 2. Create a ticket
    console.log('Creating a ticket...');
    const ticketRes = await axios.post(`${baseURL}/tickets`, {
      title: 'TICKET DE PRUEBA USUARIO ESTANDAR',
      description: 'Esta es una prueba de visibilidad de tickets para el usuario estandar.',
      priority: 'BAJA',
      category: 'General'
    }, config);
    
    console.log('Ticket created successfully. ID:', ticketRes.data.id);

    // 3. List tickets
    console.log('Listing tickets...');
    const listRes = await axios.get(`${baseURL}/tickets`, config);
    console.log('Tickets found:', listRes.data.length);
    console.log('Ticket list:', JSON.stringify(listRes.data, null, 2));

  } catch (error) {
    console.error('Error:', error.response ? error.response.status : error.message);
    if (error.response && error.response.data) {
      console.error('Error data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

main();
