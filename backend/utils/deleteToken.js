import crypto from 'crypto';

export function generateDeleteToken() {
  return crypto.randomBytes(24).toString('hex');
}
