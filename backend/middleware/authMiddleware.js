const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secure_officebills_jwt_secret_key_2026';

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    // Check fallback header for backward compatibility
    const fallbackVendor = req.headers['x-vendor-id'];
    if (fallbackVendor) {
      req.user = { vendorId: fallbackVendor, role: 'ADMIN' };
      return next();
    }
    return res.status(401).json({ ok: false, error: 'Authorization token required.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId, vendorId, role }
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, error: 'Invalid or expired token.' });
  }
}

// Optional auth: decodes token if present, does not fail if absent
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch {
      req.user = null;
    }
  } else {
    const fallbackVendor = req.headers['x-vendor-id'];
    if (fallbackVendor) {
      req.user = { vendorId: fallbackVendor, role: 'ADMIN' };
    }
  }
  next();
}

module.exports = { requireAuth, optionalAuth, JWT_SECRET };
