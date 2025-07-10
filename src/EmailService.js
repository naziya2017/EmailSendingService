// src/EmailService.js
const crypto = require('crypto');
const EventEmitter = require('events');

// Status enumerations
const EmailStatus = {
  PENDING: 'pending',
  SENT: 'sent',
  FAILED: 'failed',
  RETRYING: 'retrying',
  RATE_LIMITED: 'rate_limited'
};

const ProviderStatus = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  CIRCUIT_OPEN: 'circuit_open'
};

// Mock Providers
class MockProvider {
  constructor(name, failureRate, delay = 100) {
    this.name = name;
    this.failureRate = failureRate;
    this.delay = delay;
    this.requestCount = 0;
  }

  async send(email) {
    this.requestCount++;
    await new Promise(resolve => setTimeout(resolve, Math.random() * this.delay));
    if (Math.random() < this.failureRate) {
      throw new Error(`${this.name}: Failure`);
    }
    return {
      id: `${this.name.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'sent',
      timestamp: new Date().toISOString(),
      provider: this.name
    };
  }
}

// Circuit Breaker
class CircuitBreaker {
  constructor(provider, options = {}) {
    this.provider = provider;
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000;
    this.monitoringPeriod = options.monitoringPeriod || 300000;
    this.state = ProviderStatus.HEALTHY;
    this.failures = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
    this.totalRequests = 0;

    setInterval(() => {
      this.failures = Math.max(0, this.failures - 1);
    }, this.monitoringPeriod);
  }

  async execute(email) {
    this.totalRequests++;
    if (this.state === ProviderStatus.CIRCUIT_OPEN && (Date.now() - this.lastFailureTime < this.resetTimeout)) {
      throw new Error(`Circuit open for ${this.provider.name}`);
    } else if (this.state === ProviderStatus.CIRCUIT_OPEN) {
      this.state = ProviderStatus.DEGRADED;
      this.failures = 0;
    }

    try {
      const result = await this.provider.send(email);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.successCount++;
    this.failures = 0;
    if (this.state === ProviderStatus.DEGRADED) this.state = ProviderStatus.HEALTHY;
  }

  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.failureThreshold) this.state = ProviderStatus.CIRCUIT_OPEN;
  }
}

// Rate Limiter
class RateLimiter {
  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }

  isAllowed(key = 'default') {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    if (!this.requests.has(key)) this.requests.set(key, []);
    const valid = this.requests.get(key).filter(t => t > windowStart);
    this.requests.set(key, valid);
    if (valid.length >= this.maxRequests) return false;
    valid.push(now);
    return true;
  }

  getStats(key = 'default') {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const reqs = this.requests.get(key) || [];
    const valid = reqs.filter(t => t > windowStart);
    return {
      current: valid.length,
      remaining: this.maxRequests - valid.length,
      windowMs: this.windowMs
    };
  }
}

// Logger
class Logger {
  constructor(level = 'info') {
    this.level = level;
    this.levels = { error: 0, warn: 1, info: 2, debug: 3 };
  }

  log(level, message, data = {}) {
    if (this.levels[level] <= this.levels[this.level]) {
      console.log(JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...data }));
    }
  }

  error(msg, data) { this.log('error', msg, data); }
  warn(msg, data) { this.log('warn', msg, data); }
  info(msg, data) { this.log('info', msg, data); }
  debug(msg, data) { this.log('debug', msg, data); }
}

// Email Queue
class EmailQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  enqueue(email, priority = 0) {
    const item = { email, priority, timestamp: Date.now(), attempts: 0 };
    this.queue.push(item);
    this.queue.sort((a, b) => b.priority - a.priority);
    return item;
  }

  dequeue() { return this.queue.shift(); }
  size() { return this.queue.length; }
}

// Email Service
class EmailService extends EventEmitter {
  constructor(options = {}) {
    super();
    this.providers = options.providers || [
      new CircuitBreaker(new MockProvider('ProviderA', 0.25)),
      new CircuitBreaker(new MockProvider('ProviderB', 0.15))
    ];
    this.rateLimiter = new RateLimiter(100, 60000);
    this.queue = new EmailQueue();
    this.logger = new Logger('info');
    this.retryConfig = { max: 3, delay: 1000, factor: 2, ...options.retry };
    this.idempotency = new Map();
    this.startQueueProcessor();
  }

  generateKey(email) {
    return crypto.createHash('sha256').update(JSON.stringify(email)).digest('hex');
  }

  async sendEmail(email, options = {}) {
    const key = this.generateKey(email);
    if (this.idempotency.has(key)) return this.idempotency.get(key);
    if (!this.rateLimiter.isAllowed(email.to)) {
      this.logger.warn('Rate limit exceeded', { to: email.to });
      throw new Error('Rate limited');
    }
    const queued = this.queue.enqueue(email);
    return new Promise((resolve, reject) => {
      queued.resolve = resolve;
      queued.reject = reject;
    });
  }

  async processEmail(item) {
    for (let i = 0; i < this.providers.length; i++) {
      try {
        const result = await this.providers[i].execute(item.email);
        this.idempotency.set(this.generateKey(item.email), result);
        return item.resolve(result);
      } catch (err) {
        this.logger.warn('Send failed, trying next', { provider: this.providers[i].provider.name });
      }
    }
    item.reject(new Error('All providers failed'));
  }

  startQueueProcessor() {
    if (this.queue.processing) return;
    this.queue.processing = true;
    const loop = async () => {
      while (this.queue.size() > 0) {
        const item = this.queue.dequeue();
        await this.processEmail(item);
        await new Promise(r => setTimeout(r, 100));
      }
      setTimeout(loop, 100);
    };
    loop();
  }
}

module.exports = { EmailService, MockProvider, CircuitBreaker, RateLimiter, Logger, EmailQueue };
