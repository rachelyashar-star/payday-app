/**
 * middleware/tenant.js
 * Resolves tenantId for multi-tenant scoping.
 *
 * - Admin: uses tenantId from query, body, or route param.
 * - Client: forced to their own tenantId from custom claims.
 */

function resolveTenant(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { role, tenantId: claimTenantId } = req.user;

  // Gather tenantId from all possible sources
  const fromParam = req.params.tenantId;
  const fromQuery = req.query.tenantId;
  const fromBody = req.body && req.body.tenantId;
  const provided = fromParam || fromQuery || fromBody;

  if (role === 'admin') {
    // Admin can specify any tenant, but one must be provided
    const resolved = provided || claimTenantId;
    if (!resolved) {
      return res.status(400).json({ error: 'tenantId is required' });
    }
    req.tenantId = resolved;
  } else {
    // Client: always use their own tenantId from claims
    if (!claimTenantId) {
      return res.status(403).json({ error: 'No tenant assigned to this user' });
    }
    req.tenantId = claimTenantId;
  }

  return next();
}

module.exports = { resolveTenant };
