const crypto = require('crypto');

function authMiddleware(req, res, next) {
  const token = req.headers['x-bridge-token'];
  const expected = process.env.BRIDGE_TOKEN;

  if (!expected) {
    console.error('BRIDGE_TOKEN no definido en .env');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  if (!token) {
    return res.status(401).json({ error: 'Missing X-Bridge-Token header' });
  }

  if (!crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
    return res.status(403).json({ error: 'Invalid token' });
  }

  next();
}

module.exports = authMiddleware;
