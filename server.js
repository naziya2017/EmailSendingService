require('dotenv').config();

const express = require('express');
const app = express();
const emailRoutes = require('./routes/emailRoute');
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Add root route to avoid 502/404 on GET /
app.get('/', (req, res) => {
  res.send('Email Sending Service is running ✅');
});

app.use('/api', emailRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
