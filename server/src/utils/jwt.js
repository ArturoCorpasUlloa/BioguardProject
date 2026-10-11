import jwt from 'jsonwebtoken';

function getSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET no está configurada');
  }
  return process.env.JWT_SECRET;
}

export function signToken(payload) {
  return jwt.sign(payload, getSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    issuer: process.env.JWT_ISSUER || 'bioguard-api',
    audience: process.env.JWT_AUDIENCE || 'bioguard-client',
    algorithm: 'HS256',
  });
}

export function verifyToken(token) {
  return jwt.verify(token, getSecret(), {
    issuer: process.env.JWT_ISSUER || 'bioguard-api',
    audience: process.env.JWT_AUDIENCE || 'bioguard-client',
    algorithms: ['HS256'],
  });
}
