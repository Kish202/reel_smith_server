import jwt from 'jsonwebtoken';


const EXPIRES = '7d'; // token valid for 7 days

export function signToken(payload) {
return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: EXPIRES });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}
