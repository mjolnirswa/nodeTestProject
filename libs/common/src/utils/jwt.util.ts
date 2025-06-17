import * as jwt from 'jsonwebtoken';

export function verifyJwt(token: string, secret: string): { sub: number } {
  try {
    return jwt.verify(token, secret) as unknown as { sub: number };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    throw new Error('Invalid access token');
  }
}
