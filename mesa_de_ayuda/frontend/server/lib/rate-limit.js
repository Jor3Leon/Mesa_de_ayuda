const requestCounts = new Map();

// Periodic cleanup to avoid memory leak
if (typeof setInterval !== 'undefined') {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of requestCounts.entries()) {
      if (record.resetTime <= now) {
        requestCounts.delete(key);
      }
    }
  }, 60000);
  if (timer && timer.unref) timer.unref();
}

function rateLimit({ windowMs = 60000, max = 60, message = 'Demasiadas solicitudes. Por favor intente más tarde.' } = {}) {
  return (req, res, next) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '') || req.socket?.remoteAddress || 'unknown';
    const key = `${req.baseUrl || ''}:${req.path}:${ip}`;
    const now = Date.now();

    let record = requestCounts.get(key);
    if (!record || record.resetTime <= now) {
      record = { count: 1, resetTime: now + windowMs };
      requestCounts.set(key, record);
    } else {
      record.count++;
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > max) {
      res.status(429).json({
        error: message,
        statusCode: 429,
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      });
      return;
    }

    next();
  };
}

module.exports = { rateLimit };
