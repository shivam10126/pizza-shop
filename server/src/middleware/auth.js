const { ApiError } = require('../utils/errors');
const authService = require('../services/authService');

/** Requires a valid "Authorization: Bearer <token>" header. */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) return next(ApiError.unauthorized());
  try {
    const payload = authService.verifyToken(token);
    req.user = { id: payload.sub, username: payload.username, role: payload.role };
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Only users with one of the given roles may continue. */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return next(ApiError.forbidden());
  return next();
};

module.exports = { requireAuth, requireRole };
