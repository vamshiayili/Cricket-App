const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'village_cricket_super_secret_key_2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required. Please log in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
}

function requireScorerOrAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required.' });
  }
  if (req.user.role !== 'SCORER' && req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Access denied. Scorer or Admin privileges required.' });
  }
  next();
}

module.exports = {
  JWT_SECRET,
  authenticateToken,
  requireScorerOrAdmin
};
