import jwt from 'jsonwebtoken';

export function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    issuer: process.env.JWT_ISSUER || 'bioguard-api',
    audience: process.env.JWT_AUDIENCE || 'bioguard-client',
    algorithm: 'HS256',
  });
}

export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET, {
    issuer: process.env.JWT_ISSUER || 'bioguard-api',
    audience: process.env.JWT_AUDIENCE || 'bioguard-client',
    algorithms: ['HS256'],
  });
}
