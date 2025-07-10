// routes/emailRoute.js
const express = require('express');
const router = express.Router();
const { EmailService } = require('../src/EmailService');

const emailService = new EmailService();

router.post('/send', async (req, res) => {
  try {
    const result = await emailService.sendEmail(req.body);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
