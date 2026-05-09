import { verifyToken } from '../utils/jwt.js';
import User from '../models/User.js';

// Requires valid JWT — returns 401 if missing or invalid
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = header.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  req.user = user;
  next();
}

// Optional auth — attaches user if token present, continues either way
export async function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const token = header.split(' ')[1];
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = await User.findById(decoded.id);
    }
  }
  next();
}
