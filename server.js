// server.js
const express = require('express');
const bodyParser = require('body-parser');
const emailRoutes = require('./routes/emailRoute');

const app = express();
const PORT = 3001;

app.use(bodyParser.json());
app.use('/api/email', emailRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
