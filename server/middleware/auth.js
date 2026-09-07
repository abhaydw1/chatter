const jwt = require('jsonwebtoken');

/**
 * Express middleware that verifies a Bearer JWT token.
 * On success, attaches `req.user = { id, username, email }` and calls `next()`.
 * On failure, responds with 401 Unauthorized.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or malformed.' });
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach only safe fields (never attach password_hash)
    req.user = { id: decoded.id, username: decoded.username, email: decoded.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = authMiddleware;
