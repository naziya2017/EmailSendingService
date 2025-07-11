const express = require('express');
const app = express();
const emailRoutes = require('./routes/emailRoute');
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use('/', emailRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
