# Email Service

A fault-tolerant email delivery system built with **Node.js** and **Express**, designed to handle provider failures with automatic retries, fallback mechanisms, and detailed logging.

---

## 🔧 Features

- ✅ Send emails using multiple providers with priority order
- 🔁 Built-in retry logic on failure
- 🛡️ Automatic fallback to next available provider
- 📜 Execution logs with timestamps and attempt tracking
- 🔌 Easy to extend with new email providers
- 🧪 Simulated providers for testing without real API keys

---

## 📁 Project Structure

```
EmailService/
├── node_modules/
├── routes/
│ └── emailRoute.js # API route to trigger email sending
├── scripts/
│ └── emailTester.js # CLI script to manually test email delivery
├── src/
│ └── EmailService.js # Core logic: retry, fallback, logging
├── server.js # Express server entry point
├── package.json # Project metadata and scripts
├── package-lock.json
└── README.md # Project documentation

````
---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/resilient-email-service.git
cd resilient-email-service
````

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the Server

```bash
npm start
```

> Server will start on `http://localhost:3001`

---

## 🧪 Testing Email Sending

You can test the email service using the included script:

```bash
node scripts/emailTester.js
```

This will simulate sending an email and output logs like:

```bash
✅ Email Sent: {
  id: 'providerb_1752174382022_f6inpp8vn',
  status: 'sent',
  provider: 'ProviderB'
}
```

---

## 🧠 How It Works

* The service attempts to send an email using **Provider A**.
* If it fails (simulated or real), it **retries** a few times.
* If still unsuccessful, it **falls back** to **Provider B**.
* Logs include:

  * Start timestamp
  * Attempt number
  * Provider used
  * Final status

---

## ⚙️ Configuration

No API keys are required — providers are currently mocked for local development. You can plug in real provider APIs easily by modifying the `providers/*.js` files.

---

## 📌 Future Improvements

* Add real provider integrations (SendGrid, Mailgun, SES, etc.)
* Store logs in a database (MongoDB or PostgreSQL)
* Add rate limiting or queuing support
* Implement a REST API for fetching past logs
* Add email validation and rate-limiting middleware

---

## 📝 License

This project is licensed under the [MIT License](LICENSE).

```
