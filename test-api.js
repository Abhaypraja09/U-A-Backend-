require('dotenv').config();
const jwt = require('jsonwebtoken');
const token = jwt.sign({ id: 'admin-dummy-id', role: 'admin' }, process.env.JWT_SECRET || 'secret');

fetch('http://localhost:5000/api/dashboard/summary', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(res => res.text()).then(text => console.log('Summary:', text)).catch(console.error);

fetch('http://localhost:5000/api/live-feed', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(res => res.text()).then(text => console.log('Live Feed:', text)).catch(console.error);
