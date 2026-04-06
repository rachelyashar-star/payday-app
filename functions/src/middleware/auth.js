/**
 * middleware/auth.js
 * Firebase Auth middleware - verifies ID tokens and enforces roles.
 */

const admin = require('firebase-admin');

/**
 * Verify Firebase Auth ID token from the Authorization header.
 * Attaches decoded user info to req.user:
 *   { uid, email, role, tenantId }
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  if (!idToken) {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = {
      uid: decoded.uid,
      email: decoded.email || '',
      role: decoded.role || 'client',
      tenantId: decoded.tenantId || null,
    };
    return next();
  } catch (err) {
    console.error('Auth token verification failed:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Require the authenticated user to have admin role.
 * Must be used after requireAuth.
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  return next();
}

module.exports = { requireAuth, requireAdmin };
