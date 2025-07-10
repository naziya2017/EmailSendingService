// scripts/emailTester.js
const axios = require('axios');

const testEmail = {
  to: 'recipient@example.com',
  subject: 'Test Email',
  body: 'This is a test email sent using the EmailService.'
};

axios.post('http://localhost:3001/api/email/send', testEmail)
  .then(response => {
    console.log('✅ Email Sent:', response.data);
  })
  .catch(error => {
    console.error('❌ Error Sending Email:', error.response?.data || error.message);
  });
